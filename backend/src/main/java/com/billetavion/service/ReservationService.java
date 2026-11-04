package com.billetavion.service;

import com.billetavion.model.*;
import com.billetavion.repo.ReservationRepository;
import com.billetavion.web.Dtos.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Cœur du métier : création, passagers, options, paiement fictif, modification de vol, enregistrement et annulation.
 */
@Service
@Transactional
public class ReservationService {
    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final BigDecimal CENT = BigDecimal.valueOf(100);

    private final ReservationRepository repo;
    private final VolService volService;
    private final AuthService auth;
    private final PromotionService promotions;
    private final DisponibiliteService dispo;
    private final CarteService cartes;
    private final Mapper mapper;
    private final SecureRandom random = new SecureRandom();

    public ReservationService(ReservationRepository repo, VolService volService, AuthService auth, PromotionService promotions,
                              DisponibiliteService dispo, CarteService cartes, Mapper mapper) {
        this.repo = repo; this.volService = volService; this.auth = auth; this.promotions = promotions;
        this.dispo = dispo; this.cartes = cartes; this.mapper = mapper;
    }

    /**
     * Calcule le montant réellement payé (paiements moins remboursements).
     *
     * @param r la réservation
     * @return le total payé
     */
    public static BigDecimal paye(Reservation r) {
        return r.getPaiements().stream().map(Paiement::getMontant).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    // ---------------------------------------------------------------- lecture

    /**
     * Passe la réservation à « expirée » si le délai de paiement est dépassé.
     *
     * @param r la réservation
     */
    private void rafraichir(Reservation r) {
        if (r.getStatut() == StatutReservation.EN_ATTENTE && r.getExpireLe() != null && r.getExpireLe().isBefore(LocalDateTime.now()))
            r.setStatut(StatutReservation.EXPIREE);
    }

    /**
     * Charge une réservation et met à jour son statut si elle a expiré.
     *
     * @param id l'identifiant
     * @return la réservation
     */
    private Reservation charger(Long id) {
        Reservation r = repo.findById(id).orElseThrow(() -> new Errors.NotFound("Réservation introuvable"));
        rafraichir(r);
        return r;
    }

    /** Une réservation n'est visible que par son propriétaire (404 sinon, pour ne rien révéler). */
    private Reservation chargerProprietaire(Long utilisateurId, Long id) {
        Reservation r = charger(id);
        if (!r.getUtilisateur().getId().equals(utilisateurId)) throw new Errors.NotFound("Réservation introuvable");
        return r;
    }

    /**
     * Renvoie une réservation du client (404 si elle appartient à un autre compte).
     *
     * @param utilisateurId l'identifiant du client connecté
     * @param id l'identifiant
     * @return la réservation
     */
    public ReservationDto obtenir(Long utilisateurId, Long id) { return dto(chargerProprietaire(utilisateurId, id)); }

    /**
     * Liste les réservations du client connecté.
     *
     * @param utilisateurId l'identifiant du client connecté
     * @return ses réservations
     */
    public List<ReservationDto> mesReservations(Long utilisateurId) {
        return repo.findByUtilisateurIdOrderByCreeLeDesc(utilisateurId).stream().peek(this::rafraichir).map(this::dto).toList();
    }

    /**
     * Liste toutes les réservations (administrateur), filtrables par statut et par texte (référence ou e-mail).
     *
     * @param statut le statut voulu, ou null
     * @param q le texte recherché, ou null
     * @return les réservations trouvées
     */
    public List<ReservationDto> toutes(StatutReservation statut, String q) {
        String f = q == null ? "" : q.trim().toLowerCase();
        return repo.findAllByOrderByCreeLeDesc().stream().peek(this::rafraichir)
                .filter(r -> statut == null || r.getStatut() == statut)
                .filter(r -> f.isEmpty() || r.getReference().toLowerCase().contains(f)
                        || r.getUtilisateur().getEmail().toLowerCase().contains(f))
                .map(this::dto).toList();
    }

    // ---------------------------------------------------------------- création

    /**
     * Crée une réservation gardée 15 minutes : contrôle le vol, les places et la promotion, crée les passagers et calcule les prix.
     *
     * @param utilisateurId l'identifiant du client connecté
     * @param req le vol, le nombre de passagers par type et le code promo
     * @return la réservation créée (en attente de paiement)
     */
    public ReservationDto creer(Long utilisateurId, ReservationCreate req) {
        int n = req.adultes() + req.enfants() + req.bebes();
        if (req.adultes() < 1) throw new Errors.Business("Au moins un adulte est requis");
        if (req.bebes() > req.adultes()) throw new Errors.Business("Un adulte ne peut accompagner qu'un seul bébé");
        if (n > 30) throw new Errors.Business("Maximum 30 passagers par réservation");
        Vol vol = volService.trouver(req.volId());
        verifierReservable(vol);
        if (dispo.placesRestantes(vol) < req.adultes() + req.enfants())
            throw new Errors.Business("Pas assez de places sur ce vol : " + dispo.placesRestantes(vol) + " restante(s)");

        Utilisateur u = auth.utilisateur(utilisateurId);
        Reservation r = new Reservation();
        r.setReference(nouvelleReference());
        r.setUtilisateur(u); r.setVol(vol);
        r.setExpireLe(LocalDateTime.now().plusMinutes(Catalogue.DELAI_PAIEMENT_MINUTES));
        PromotionService.Remise remise = promotions.remisePour(vol, req.codePromo());
        r.setCodePromo(remise.code()); r.setRemisePromo(remise.pourcentage());
        ajouter(r, TypePassager.ADULTE, req.adultes());
        ajouter(r, TypePassager.ENFANT, req.enfants());
        ajouter(r, TypePassager.BEBE, req.bebes());
        // Le premier adulte est pré-rempli avec le profil du client
        ReservationPassager premier = r.getPassagers().get(0);
        premier.setNom(u.getNom()); premier.setPrenom(u.getPrenom());
        if (u.getDateNaissance() != null && typeCompatible(TypePassager.ADULTE, Categorie.pour(u.getDateNaissance(), vol.getDateDepart().toLocalDate())))
            premier.setDateNaissance(u.getDateNaissance());
        recalculer(r);
        return dto(repo.save(r));
    }

    /**
     * Ajoute des passagers vides d'un type à la réservation.
     *
     * @param r la réservation
     * @param type le type de passager
     * @param nb le nombre à ajouter
     */
    private void ajouter(Reservation r, TypePassager type, int nb) {
        for (int i = 0; i < nb; i++) {
            ReservationPassager p = new ReservationPassager();
            p.setReservation(r); p.setType(type);
            r.getPassagers().add(p);
        }
    }

    /**
     * Génère une référence unique de 6 caractères.
     *
     * @return la référence
     */
    private String nouvelleReference() {
        String ref;
        do {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < 6; i++) sb.append(ALPHABET.charAt(random.nextInt(ALPHABET.length())));
            ref = sb.toString();
        } while (repo.existsByReference(ref));
        return ref;
    }

    /**
     * Vérifie que le vol est programmé et pas encore parti.
     *
     * @param vol le vol
     */
    private void verifierReservable(Vol vol) {
        if (vol.getStatut() != StatutVol.PROGRAMME) throw new Errors.Business("Ce vol est annulé");
        if (!vol.getDateDepart().isAfter(LocalDateTime.now())) throw new Errors.Business("Ce vol est déjà parti");
    }

    /**
     * Vérifie qu'une catégorie d'âge correspond au type de passager (adulte, enfant, bébé).
     *
     * @param t le type de passager
     * @param c la catégorie d'âge
     * @return vrai si compatible
     */
    private static boolean typeCompatible(TypePassager t, Categorie c) {
        return switch (t) {
            case ADULTE -> c == Categorie.JEUNE || c == Categorie.ADULTE || c == Categorie.SENIOR;
            case ENFANT -> c == Categorie.ENFANT;
            case BEBE -> c == Categorie.BEBE;
        };
    }

    /** Prix de chaque billet = prix du vol x coefficient d'âge x remise de groupe x remise promotionnelle. */
    private void recalculer(Reservation r) {
        r.setRemiseGroupe(Tarif.remiseGroupePourcent(r.getPassagers().size()));
        LocalDate dateVol = r.getVol().getDateDepart().toLocalDate();
        for (ReservationPassager p : r.getPassagers()) {
            p.setCategorie(Mapper.categorie(p, dateVol));
            p.setPrixBillet(Tarif.prix(r.getVol().getPrix(), p.getCategorie(), r.getRemiseGroupe(), r.getRemisePromo()));
        }
    }

    /**
     * Cherche la meilleure remise ; un code invalide est ignoré sans erreur.
     *
     * @param vol le vol
     * @param code le code
     * @return la remise retenue
     */
    private PromotionService.Remise promoSansErreur(Vol vol, String code) {
        try { return promotions.remisePour(vol, code); }
        catch (Errors.Business e) { return promotions.remisePour(vol, null); }
    }

    // ---------------------------------------------------------------- passagers & options

    /**
     * Met à jour nom, prénom et date de naissance des passagers, contrôle l'âge et recalcule les prix.
     *
     * @param utilisateurId l'identifiant du client connecté
     * @param id l'identifiant
     * @param req les passagers saisis
     * @return la réservation mise à jour
     */
    public ReservationDto majPassagers(Long utilisateurId, Long id, PassagersRequest req) {
        Reservation r = chargerProprietaire(utilisateurId, id);
        verifierModifiable(r);
        LocalDate dateVol = r.getVol().getDateDepart().toLocalDate();
        boolean confirmee = r.getStatut() == StatutReservation.CONFIRMEE;
        for (PassagerSaisie s : req.passagers()) {
            ReservationPassager p = passager(r, s.id());
            p.setNom(s.nom().trim()); p.setPrenom(s.prenom().trim());
            if (confirmee) continue;   // après paiement : seules les corrections de nom sont possibles
            if (s.dateNaissance() == null) throw new Errors.Business("Date de naissance requise pour " + s.prenom());
            if (!s.dateNaissance().isBefore(LocalDate.now())) throw new Errors.Business("Date de naissance invalide pour " + s.prenom());
            Categorie c = Categorie.pour(s.dateNaissance(), dateVol);
            if (!typeCompatible(p.getType(), c))
                throw new Errors.Business("L'âge de " + s.prenom() + " ne correspond pas à un passager de type " + p.getType().name().toLowerCase());
            p.setDateNaissance(s.dateNaissance());
        }
        recalculer(r);
        return dto(r);
    }

    /**
     * Met à jour sièges, bagages, options et assurance après contrôle (siège libre, pas de sortie de secours pour un enfant, rien pour un bébé).
     *
     * @param utilisateurId l'identifiant du client connecté
     * @param id l'identifiant
     * @param req les choix par passager
     * @return la réservation mise à jour
     */
    public ReservationDto majOptions(Long utilisateurId, Long id, OptionsRequest req) {
        Reservation r = chargerProprietaire(utilisateurId, id);
        verifierModifiable(r);
        r.setAssurance(req.assurance());
        Set<String> pris = dispo.siegesPris(r.getVol(), r.getId());
        Set<String> miens = new HashSet<>();
        for (OptionPassager o : req.passagers()) {
            ReservationPassager p = passager(r, o.id());
            String siege = o.siege() == null || o.siege().isBlank() ? null : o.siege().trim().toUpperCase();
            Bagage bagage = o.bagage() == null ? Bagage.AUCUN : o.bagage();
            if (p.getType() == TypePassager.BEBE && (siege != null || bagage != Bagage.AUCUN || o.prioritaire() || o.repas()))
                throw new Errors.Business("Un bébé voyage sur les genoux d'un adulte : pas de siège ni d'option");
            if (siege != null) {
                ClasseSiege c = verifierSiege(r.getVol(), siege, pris);
                if (p.getType() == TypePassager.ENFANT && c == ClasseSiege.ESPACE)
                    throw new Errors.Business("Les enfants ne peuvent pas s'asseoir près d'une sortie de secours (" + siege + ")");
                if (!miens.add(siege)) throw new Errors.Business("Le siège " + siege + " est choisi deux fois");
                p.setSiegePrix(c.getPrix());
            } else p.setSiegePrix(BigDecimal.ZERO);
            p.setSiege(siege);
            p.setBagage(bagage); p.setPrioritaire(o.prioritaire()); p.setRepas(o.repas());
        }
        return dto(r);
    }

    /**
     * Vérifie qu'un siège existe et est libre.
     *
     * @param vol le vol
     * @param code le siège (ex. 12A)
     * @param pris les sièges déjà pris
     * @return la catégorie du siège (donc son prix)
     */
    private ClasseSiege verifierSiege(Vol vol, String code, Set<String> pris) {
        if (!code.matches("\\d{1,2}[A-F]")) throw new Errors.Business("Siège invalide : " + code);
        int rang = Integer.parseInt(code.substring(0, code.length() - 1));
        int col = Catalogue.LETTRES.indexOf(code.charAt(code.length() - 1));
        if (rang < 1 || (rang - 1) * Catalogue.LETTRES.length() + col >= vol.getCapacite())
            throw new Errors.Business("Ce siège n'existe pas dans l'appareil : " + code);
        if (pris.contains(code)) throw new Errors.Business("Le siège " + code + " est déjà pris");
        return ClasseSiege.duRang(rang);
    }

    /**
     * Retrouve un passager de la réservation.
     *
     * @param r la réservation
     * @param id l'identifiant
     * @return le passager
     */
    private ReservationPassager passager(Reservation r, Long id) {
        return r.getPassagers().stream().filter(p -> p.getId().equals(id)).findFirst()
                .orElseThrow(() -> new Errors.NotFound("Passager introuvable dans cette réservation"));
    }

    /**
     * Vérifie que la réservation peut encore être modifiée (ni expirée, ni annulée, vol à venir).
     *
     * @param r la réservation
     */
    private void verifierModifiable(Reservation r) {
        if (r.getStatut() == StatutReservation.EXPIREE) throw new Errors.Business("Le délai de paiement est dépassé : refaites une recherche");
        if (r.getStatut() == StatutReservation.ANNULEE) throw new Errors.Business("Cette réservation est annulée");
        if (r.getVol().getStatut() != StatutVol.PROGRAMME) throw new Errors.Business("Ce vol est annulé");
        if (!r.getVol().getDateDepart().isAfter(LocalDateTime.now())) throw new Errors.Business("Ce vol est déjà parti");
    }

    // ---------------------------------------------------------------- paiement fictif

    /**
     * Paie le solde (paiement fictif) : valide la carte, enregistre le paiement et confirme la réservation.
     *
     * @param utilisateurId l'identifiant du client connecté
     * @param id l'identifiant
     * @param req la carte saisie ou la carte enregistrée
     * @return la réservation confirmée
     */
    public ReservationDto payer(Long utilisateurId, Long id, PaiementRequest req) {
        Reservation r = chargerProprietaire(utilisateurId, id);
        verifierModifiable(r);
        if (r.getPassagers().stream().anyMatch(p -> !p.estComplet()))
            throw new Errors.Business("Renseignez le nom, le prénom et la date de naissance de chaque passager avant de payer");
        BigDecimal solde = totaux(r).solde();
        if (solde.signum() <= 0) throw new Errors.Business("Il n'y a rien à payer");
        CarteService.Carte carte = cartes.debiter(auth.utilisateur(utilisateurId), req);
        boolean premier = r.getStatut() == StatutReservation.EN_ATTENTE;
        r.getPaiements().add(new Paiement(r, solde, TypePaiement.PAIEMENT, carte.marque(), carte.fin(),
                premier ? "Paiement de la réservation" : "Paiement des options ajoutées"));
        r.setStatut(StatutReservation.CONFIRMEE);
        r.setExpireLe(null);
        return dto(r);
    }

    // ---------------------------------------------------------------- annulation

    /** Annulation par le client (ou l'administrateur). Remboursement intégral uniquement avec l'assurance annulation. */
    public ReservationDto annuler(Long utilisateurId, Long id, boolean admin) {
        Reservation r = admin ? charger(id) : chargerProprietaire(utilisateurId, id);
        if (r.getStatut() == StatutReservation.ANNULEE || r.getStatut() == StatutReservation.EXPIREE)
            throw new Errors.Business("Cette réservation n'est plus active");
        if (!r.getVol().getDateDepart().isAfter(LocalDateTime.now())) throw new Errors.Business("Ce vol est déjà parti");
        BigDecimal paye = paye(r);
        r.setStatut(StatutReservation.ANNULEE);
        r.setExpireLe(null);
        if (paye.signum() > 0 && (r.isAssurance() || admin))
            r.getPaiements().add(new Paiement(r, paye.negate(), TypePaiement.REMBOURSEMENT, null, null,
                    admin ? "Annulation par l'administrateur" : "Remboursement (assurance annulation)"));
        return dto(r);
    }

    // ---------------------------------------------------------------- modification du vol (+10 %)

    /**
     * Calcule le coût d'un changement de vol sans l'appliquer.
     *
     * @param utilisateurId l'identifiant du client connecté
     * @param id l'identifiant
     * @param nouveauVolId l'identifiant du nouveau vol
     * @return le détail : différence de prix, frais de 10 % et total à payer
     */
    public ApercuModification apercuModification(Long utilisateurId, Long id, Long nouveauVolId) {
        return calculerApercu(chargerProprietaire(utilisateurId, id), nouveauVolId).apercu();
    }

    /**
     * Résultat d'un calcul de modification : aperçu, nouveau vol et remise applicable.
     *
     * @param apercu la valeur « apercu »
     * @param vol le vol
     * @param remise la valeur « remise »
     */
    private record Calcul(ApercuModification apercu, Vol vol, PromotionService.Remise remise) {}

    /**
     * Calcule le coût d'un changement de vol : frais de 10 % du prix des billets + différence si le nouveau vol est plus cher.
     *
     * @param r la réservation
     * @param nouveauVolId l'identifiant du nouveau vol
     * @return le calcul complet
     */
    private Calcul calculerApercu(Reservation r, Long nouveauVolId) {
        if (r.getStatut() != StatutReservation.CONFIRMEE) throw new Errors.Business("Seule une réservation payée peut être modifiée");
        verifierModifiable(r);
        if (totaux(r).solde().signum() > 0) throw new Errors.Business("Réglez d'abord le solde de la réservation avant de modifier le vol");
        Vol nv = volService.trouver(nouveauVolId);
        if (nv.getId().equals(r.getVol().getId())) throw new Errors.Business("Choisissez un autre vol");
        verifierReservable(nv);
        long sieges = r.getPassagers().stream().filter(p -> p.getType() != TypePassager.BEBE).count();
        if (dispo.placesRestantes(nv) < sieges) throw new Errors.Business("Pas assez de places sur le vol choisi");
        PromotionService.Remise remise = promoSansErreur(nv, r.getCodePromo());
        LocalDate dateNv = nv.getDateDepart().toLocalDate();
        BigDecimal ancien = r.getPassagers().stream().map(ReservationPassager::getPrixBillet).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal nouveau = r.getPassagers().stream()
                .map(p -> Tarif.prix(nv.getPrix(), Mapper.categorie(p, dateNv), r.getRemiseGroupe(), remise.pourcentage()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal frais = ancien.multiply(BigDecimal.valueOf(Catalogue.FRAIS_MODIFICATION_POURCENT)).divide(CENT, 2, RoundingMode.HALF_UP);
        BigDecimal difference = nouveau.subtract(ancien).max(BigDecimal.ZERO);
        return new Calcul(new ApercuModification(mapper.vol(nv), ancien, nouveau, difference, frais,
                Catalogue.FRAIS_MODIFICATION_POURCENT, frais.add(difference)), nv, remise);
    }

    /**
     * Change le vol d'une réservation payée : encaisse frais et différence, garde les sièges encore libres.
     *
     * @param utilisateurId l'identifiant du client connecté
     * @param id l'identifiant
     * @param req le nouveau vol et la carte
     * @return la réservation modifiée
     */
    public ReservationDto modifierVol(Long utilisateurId, Long id, ModificationRequest req) {
        Reservation r = chargerProprietaire(utilisateurId, id);
        Calcul c = calculerApercu(r, req.nouveauVolId());
        CarteService.Carte carte = cartes.debiter(auth.utilisateur(utilisateurId), req.paiement());
        Vol ancienVol = r.getVol();
        r.getPaiements().add(new Paiement(r, c.apercu().aPayer(), TypePaiement.MODIFICATION, carte.marque(), carte.fin(),
                "Modification du vol " + ancienVol.getNumeroVol() + " vers " + c.vol().getNumeroVol()
                        + " (frais " + Catalogue.FRAIS_MODIFICATION_POURCENT + " %)"));
        r.setVol(c.vol());
        r.setFraisModification(r.getFraisModification().add(c.apercu().frais()));
        r.setRemisePromo(c.remise().pourcentage());
        recalculer(r);
        // Les sièges sont conservés s'ils sont libres sur le nouveau vol, sinon à re-choisir
        Set<String> pris = dispo.siegesPris(c.vol(), r.getId());
        for (ReservationPassager p : r.getPassagers()) {
            if (p.getSiege() == null) continue;
            try { p.setSiegePrix(verifierSiege(c.vol(), p.getSiege(), pris).getPrix()); }
            catch (Errors.Business e) { p.setSiege(null); p.setSiegePrix(BigDecimal.ZERO); }
            p.setEnregistre(false);
        }
        return dto(r);
    }

    // ---------------------------------------------------------------- enregistrement en ligne

    /**
     * Indique si l'enregistrement en ligne est ouvert (de 48 h à 1 h avant le départ).
     *
     * @param r la réservation
     * @return vrai si ouvert
     */
    private boolean enregistrementOuvert(Reservation r) {
        if (r.getStatut() != StatutReservation.CONFIRMEE) return false;
        LocalDateTime d = r.getVol().getDateDepart(), now = LocalDateTime.now();
        return now.isAfter(d.minusHours(Catalogue.ENREGISTREMENT_OUVERT_HEURES)) && now.isBefore(d.minusHours(Catalogue.ENREGISTREMENT_FERME_HEURES));
    }

    /**
     * Enregistre en ligne : attribue un siège gratuit aux passagers qui n'en ont pas et les marque enregistrés.
     *
     * @param utilisateurId l'identifiant du client connecté
     * @param id l'identifiant
     * @return la réservation avec cartes d'embarquement
     */
    public ReservationDto enregistrement(Long utilisateurId, Long id) {
        Reservation r = chargerProprietaire(utilisateurId, id);
        if (!enregistrementOuvert(r))
            throw new Errors.Business("L'enregistrement est ouvert de " + Catalogue.ENREGISTREMENT_OUVERT_HEURES + " h à "
                    + Catalogue.ENREGISTREMENT_FERME_HEURES + " h avant le départ, pour une réservation payée");
        if (totaux(r).solde().signum() > 0) throw new Errors.Business("Réglez le solde de la réservation avant l'enregistrement");
        Set<String> pris = new HashSet<>(dispo.siegesPris(r.getVol(), r.getId()));
        r.getPassagers().stream().map(ReservationPassager::getSiege).filter(Objects::nonNull).forEach(pris::add);
        // Siège gratuit attribué automatiquement aux passagers qui n'en ont pas choisi
        for (ReservationPassager p : r.getPassagers()) {
            if (p.getSiege() == null && p.getType() != TypePassager.BEBE) {
                String libre = premierSiegeLibre(r.getVol(), pris, p.getType());
                if (libre == null) throw new Errors.Business("Plus de siège disponible");
                p.setSiege(libre); p.setSiegePrix(BigDecimal.ZERO); pris.add(libre);
            }
            p.setEnregistre(true);
        }
        return dto(r);
    }

    /**
     * Cherche le premier siège libre (standard d'abord).
     *
     * @param vol le vol
     * @param pris les sièges déjà pris
     * @param type le type de passager
     * @return le code du siège, ou null s'il n'y en a plus
     */
    private String premierSiegeLibre(Vol vol, Set<String> pris, TypePassager type) {
        for (ClasseSiege voulue : List.of(ClasseSiege.STANDARD, ClasseSiege.AVANT, ClasseSiege.PREMIUM, ClasseSiege.ESPACE)) {
            if (voulue == ClasseSiege.ESPACE && type == TypePassager.ENFANT) continue;
            for (int rang = 1; rang <= Catalogue.rangees(vol.getCapacite()); rang++) {
                if (ClasseSiege.duRang(rang) != voulue) continue;
                for (int i = 0; i < Catalogue.LETTRES.length(); i++) {
                    if ((rang - 1) * Catalogue.LETTRES.length() + i >= vol.getCapacite()) break;
                    String code = rang + String.valueOf(Catalogue.LETTRES.charAt(i));
                    if (!pris.contains(code)) return code;
                }
            }
        }
        return null;
    }

    // ---------------------------------------------------------------- DTO

    /**
     * Calcule les totaux : billets, sièges, bagages, options, assurance, frais, total, payé et solde.
     *
     * @param r la réservation
     * @return les totaux
     */
    TotauxDto totaux(Reservation r) {
        BigDecimal billets = somme(r, ReservationPassager::getPrixBillet);
        BigDecimal sieges = somme(r, ReservationPassager::getSiegePrix);
        BigDecimal bagages = somme(r, p -> p.getBagage().getPrix());
        BigDecimal options = somme(r, p -> (p.isPrioritaire() ? Catalogue.EMBARQUEMENT_PRIORITAIRE : BigDecimal.ZERO)
                .add(p.isRepas() ? Catalogue.REPAS : BigDecimal.ZERO));
        long assures = r.getPassagers().stream().filter(p -> p.getType() != TypePassager.BEBE).count();
        BigDecimal assurance = r.isAssurance() ? Catalogue.ASSURANCE_PAR_PASSAGER.multiply(BigDecimal.valueOf(assures)) : BigDecimal.ZERO;
        BigDecimal frais = r.getFraisModification();
        BigDecimal total = billets.add(sieges).add(bagages).add(options).add(assurance).add(frais);
        BigDecimal paye = paye(r);
        boolean active = r.getStatut() == StatutReservation.EN_ATTENTE || r.getStatut() == StatutReservation.CONFIRMEE;
        BigDecimal solde = active ? total.subtract(paye).max(BigDecimal.ZERO) : BigDecimal.ZERO;
        return new TotauxDto(billets, sieges, bagages, options, assurance, frais, total, paye, solde);
    }

    /**
     * Additionne une valeur sur tous les passagers.
     *
     * @param r la réservation
     * @param f la fonction qui extrait la valeur à additionner
     * @return la somme
     */
    private BigDecimal somme(Reservation r, java.util.function.Function<ReservationPassager, BigDecimal> f) {
        return r.getPassagers().stream().map(f).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /**
     * Convertit une réservation en objet de réponse complet.
     *
     * @param r la réservation
     * @return la réservation à envoyer au front
     */
    ReservationDto dto(Reservation r) {
        List<PassagerDto> passagers = r.getPassagers().stream().map(p -> new PassagerDto(p.getId(), p.getType(), p.getNom(),
                p.getPrenom(), p.getDateNaissance(), p.getCategorie(), p.getPrixBillet(), p.getSiege(), p.getSiegePrix(),
                p.getBagage(), p.isPrioritaire(), p.isRepas(), p.isEnregistre())).toList();
        List<PaiementDto> paiements = r.getPaiements().stream().map(p -> new PaiementDto(p.getMontant(), p.getType(),
                p.getCarteMarque(), p.getCarteFin(), p.getMotif(), p.getCreeLe())).toList();
        Vol v = r.getVol();
        boolean modifiable = r.getStatut() == StatutReservation.CONFIRMEE && v.getDateDepart().isAfter(LocalDateTime.now())
                && v.getStatut() == StatutVol.PROGRAMME;
        Utilisateur u = r.getUtilisateur();
        return new ReservationDto(r.getId(), r.getReference(), r.getStatut(), mapper.vol(v), r.getCreeLe(), r.getExpireLe(),
                r.isAssurance(), r.getCodePromo(), r.getRemisePromo(), r.getRemiseGroupe(), passagers, totaux(r), paiements,
                r.getPassagers().stream().allMatch(ReservationPassager::estComplet), enregistrementOuvert(r), modifiable,
                "B" + (10 + v.getId() % 20), v.getDateDepart().minusMinutes(40), (u.getPrenom() + " " + u.getNom()).trim() + " (" + u.getEmail() + ")");
    }
}
