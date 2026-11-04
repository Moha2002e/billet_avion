package com.billetavion.service;

import com.billetavion.model.*;
import com.billetavion.repo.*;
import com.billetavion.web.Dtos.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

/**
 * Données de démonstration insérées par le bouton « Insérer les données » de l'administrateur.
 *
 * <p>L'opération est <b>idempotente</b> : chaque donnée est identifiée par une clé naturelle
 * (numéro de vol, code promo, e-mail du client) ; si elle existe déjà, elle est ignorée. On peut donc
 * cliquer plusieurs fois sans créer de doublon. Les réservations de démonstration ne sont créées que
 * pour les clients de démonstration qui viennent d'être ajoutés.</p>
 */
@Service
@Transactional
public class DonneesService {
    /** Mot de passe commun des comptes de démonstration. */
    public static final String MOT_DE_PASSE_DEMO = "demo12345";

    /** Description d'un vol de démonstration (les dates sont calculées à partir d'aujourd'hui). */
    private record VolDemo(String numero, String compagnie, String origine, String destination,
                           int jours, int heure, int minute, int dureeMinutes, int capacite, int prix) {}

    /** Les 24 vols de démonstration, aller et retour sur 12 liaisons. */
    private static final List<VolDemo> VOLS = List.of(
            new VolDemo("SA1001", "Sky Air", "Bruxelles", "Marrakech", 10, 9, 15, 215, 120, 129),
            new VolDemo("SA1002", "Sky Air", "Marrakech", "Bruxelles", 17, 14, 40, 215, 120, 139),
            new VolDemo("SA1003", "Sky Air", "Bruxelles", "Marrakech", 24, 6, 30, 215, 120, 119),
            new VolDemo("SA1101", "Nordic Wings", "Bruxelles", "Madrid", 8, 7, 10, 150, 90, 79),
            new VolDemo("SA1102", "Nordic Wings", "Madrid", "Bruxelles", 15, 18, 20, 150, 90, 85),
            new VolDemo("SA1201", "Nordic Wings", "Bruxelles", "Barcelone", 12, 11, 0, 125, 90, 69),
            new VolDemo("SA1202", "Nordic Wings", "Barcelone", "Bruxelles", 19, 20, 5, 125, 90, 72),
            new VolDemo("SA1301", "Sky Air", "Bruxelles", "Lisbonne", 14, 13, 25, 180, 90, 99),
            new VolDemo("SA1302", "Sky Air", "Lisbonne", "Bruxelles", 21, 10, 45, 180, 90, 105),
            new VolDemo("SA1401", "Nordic Wings", "Bruxelles", "Rome", 9, 16, 50, 150, 90, 89),
            new VolDemo("SA1402", "Nordic Wings", "Rome", "Bruxelles", 16, 8, 35, 150, 90, 92),
            new VolDemo("SA1501", "Atlas Jet", "Paris", "Casablanca", 11, 12, 10, 200, 150, 109),
            new VolDemo("SA1502", "Atlas Jet", "Casablanca", "Paris", 18, 17, 30, 200, 150, 115),
            new VolDemo("SA1601", "Atlas Jet", "Bruxelles", "Casablanca", 13, 8, 5, 210, 150, 124),
            new VolDemo("SA1602", "Atlas Jet", "Casablanca", "Bruxelles", 20, 15, 15, 210, 150, 129),
            new VolDemo("SA1701", "Atlas Jet", "Bruxelles", "Rabat", 16, 10, 20, 215, 90, 134),
            new VolDemo("SA1702", "Atlas Jet", "Rabat", "Bruxelles", 23, 19, 10, 215, 90, 139),
            new VolDemo("SA1801", "Sky Air", "Bruxelles", "Londres", 7, 6, 55, 75, 90, 59),
            new VolDemo("SA1802", "Sky Air", "Londres", "Bruxelles", 10, 21, 20, 75, 90, 62),
            new VolDemo("SA1901", "Nordic Wings", "Bruxelles", "Amsterdam", 6, 8, 45, 60, 60, 49),
            new VolDemo("SA1902", "Nordic Wings", "Amsterdam", "Bruxelles", 9, 18, 0, 60, 60, 52),
            new VolDemo("SA2001", "Atlas Jet", "Bruxelles", "Tanger", 18, 7, 40, 210, 150, 119),
            new VolDemo("SA2002", "Atlas Jet", "Tanger", "Bruxelles", 26, 16, 25, 210, 150, 125),
            new VolDemo("SA2101", "Atlas Jet", "Paris", "Marrakech", 22, 9, 50, 200, 120, 114));

    private final VolRepository vols;
    private final PromotionRepository promotions;
    private final UtilisateurRepository utilisateurs;
    private final AuthService auth;
    private final ReservationService reservations;

    /** Construit le service avec les dépôts et services nécessaires. */
    public DonneesService(VolRepository vols, PromotionRepository promotions, UtilisateurRepository utilisateurs,
                          AuthService auth, ReservationService reservations) {
        this.vols = vols; this.promotions = promotions; this.utilisateurs = utilisateurs;
        this.auth = auth; this.reservations = reservations;
    }

    /**
     * Insère toutes les données de démonstration absentes : vols, promotions, clients, puis réservations
     * des clients nouvellement créés. Les données déjà présentes sont comptées mais jamais dupliquées.
     *
     * @return le bilan : nombre d'éléments ajoutés et déjà existants pour chaque type
     */
    public DonneesDto inserer() {
        int volsAjoutes = 0;
        for (VolDemo v : VOLS) if (ajouterVol(v)) volsAjoutes++;

        int promosAjoutees = 0;
        LocalDate auj = LocalDate.now();
        if (ajouterPromotion("ETE25", "Offre d'été : -15 % sur tous les vols", 15, auj, auj.plusDays(90), false, null)) promosAjoutees++;
        if (ajouterPromotion("BIENVENUE10", "Bienvenue : -10 % sur votre premier voyage", 10, auj, auj.plusDays(180), false, null)) promosAjoutees++;
        if (ajouterPromotion("FLASH-MARRAKECH", "Vente flash Bruxelles → Marrakech", 25, auj, auj.plusDays(20), true, "SA1003")) promosAjoutees++;
        if (ajouterPromotion("RABAT20", "Rabat à prix doux", 20, auj, auj.plusDays(60), false, "SA1701")) promosAjoutees++;
        if (ajouterPromotion("NOEL24", "Promotion de Noël (terminée)", 30, LocalDate.of(2024, 12, 1), LocalDate.of(2024, 12, 31), false, null)) promosAjoutees++;

        int clientsAjoutes = 0, reservationsAjoutees = 0;
        Utilisateur sara = ajouterClient("sara.benali@demo.be", "Benali", "Sara", "0470111111", LocalDate.of(1991, 4, 12));
        if (sara != null) { clientsAjoutes++; reservationsAjoutees += reserver(sara, "SA1001", 2, 1, 0, true) ? 1 : 0; }
        Utilisateur karim = ajouterClient("karim.janssens@demo.be", "Janssens", "Karim", "0470222222", LocalDate.of(1985, 9, 3));
        if (karim != null) { clientsAjoutes++; reservationsAjoutees += reserver(karim, "SA1101", 1, 0, 1, false) ? 1 : 0; }
        Utilisateur lea = ajouterClient("lea.dubois@demo.be", "Dubois", "Léa", "0470333333", LocalDate.of(1999, 1, 25));
        if (lea != null) { clientsAjoutes++; reservationsAjoutees += reserver(lea, "SA1201", 6, 0, 0, true) ? 1 : 0; }

        return new DonneesDto(volsAjoutes, VOLS.size() - volsAjoutes, promosAjoutees, 5 - promosAjoutees,
                clientsAjoutes, 3 - clientsAjoutes, reservationsAjoutees);
    }

    /**
     * Ajoute un vol de démonstration s'il n'existe pas encore (clé : numéro de vol).
     *
     * @param d la description du vol
     * @return true si le vol a été ajouté, false s'il existait déjà
     */
    private boolean ajouterVol(VolDemo d) {
        if (vols.existsByNumeroVol(d.numero())) return false;
        Vol v = new Vol();
        LocalDateTime depart = LocalDateTime.of(LocalDate.now().plusDays(d.jours()), LocalTime.of(d.heure(), d.minute()));
        v.setCompagnie(d.compagnie()); v.setNumeroVol(d.numero());
        v.setOrigine(d.origine()); v.setDestination(d.destination());
        v.setDateDepart(depart); v.setDateArrivee(depart.plusMinutes(d.dureeMinutes()));
        v.setCapacite(d.capacite()); v.setPrix(java.math.BigDecimal.valueOf(d.prix()));
        vols.save(v);
        return true;
    }

    /**
     * Ajoute une promotion si son code n'existe pas encore (clé : code, sans tenir compte de la casse).
     *
     * @param code le code promo
     * @param description le texte affiché
     * @param pourcentage la remise en pourcentage
     * @param debut le premier jour de validité
     * @param fin le dernier jour de validité
     * @param automatique vrai si la promotion s'applique sans code
     * @param numeroVol le numéro du vol concerné, ou null pour tous les vols
     * @return true si la promotion a été ajoutée, false si elle existait déjà
     */
    private boolean ajouterPromotion(String code, String description, int pourcentage, LocalDate debut, LocalDate fin,
                                     boolean automatique, String numeroVol) {
        if (promotions.findByCodeIgnoreCase(code).isPresent()) return false;
        Promotion p = new Promotion();
        p.setCode(code); p.setDescription(description); p.setPourcentage(pourcentage);
        p.setDateDebut(debut); p.setDateFin(fin); p.setAutomatique(automatique); p.setActif(true);
        if (numeroVol != null) p.setVol(vols.findFirstByNumeroVol(numeroVol).orElse(null));
        promotions.save(p);
        return true;
    }

    /**
     * Crée un client de démonstration s'il n'existe pas encore (clé : e-mail).
     *
     * @return le nouveau compte, ou null si l'e-mail existait déjà
     */
    private Utilisateur ajouterClient(String email, String nom, String prenom, String telephone, LocalDate naissance) {
        if (utilisateurs.findByEmailIgnoreCase(email).isPresent()) return null;
        return auth.creerClient(new RegisterRequest(email, MOT_DE_PASSE_DEMO, nom, prenom, telephone, naissance));
    }

    /**
     * Crée une réservation de démonstration pour un client : passagers, siège, bagage, assurance éventuelle,
     * puis paiement (carte de test) si demandé. Si le vol est introuvable ou complet, la réservation est simplement ignorée.
     *
     * @param client le client propriétaire
     * @param numeroVol le vol réservé
     * @param adultes nombre d'adultes (le premier est le client)
     * @param enfants nombre d'enfants
     * @param bebes nombre de bébés
     * @param payer vrai pour payer et confirmer la réservation
     * @return true si la réservation a été créée
     */
    private boolean reserver(Utilisateur client, String numeroVol, int adultes, int enfants, int bebes, boolean payer) {
        Optional<Vol> vol = vols.findFirstByNumeroVol(numeroVol);
        if (vol.isEmpty()) return false;
        try {
            ReservationDto r = reservations.creer(client.getId(), new ReservationCreate(vol.get().getId(), adultes, enfants, bebes, null));
            List<PassagerSaisie> saisies = new java.util.ArrayList<>();
            int i = 0;
            for (PassagerDto p : r.passagers()) {
                LocalDate naissance = switch (p.type()) {
                    case ADULTE -> i == 0 ? client.getDateNaissance() : LocalDate.of(1984 + i, 3, 10);
                    case ENFANT -> LocalDate.now().minusYears(8);
                    case BEBE -> LocalDate.now().minusMonths(8);
                };
                saisies.add(new PassagerSaisie(p.id(), client.getNom(), i == 0 ? client.getPrenom() : "Invité" + i, naissance));
                i++;
            }
            reservations.majPassagers(client.getId(), r.id(), new PassagersRequest(saisies));

            List<OptionPassager> options = new java.util.ArrayList<>();
            int rang = 3;
            for (PassagerDto p : r.passagers()) {
                boolean premier = options.isEmpty();
                String siege = p.type() == TypePassager.BEBE ? null : (rang++) + "A";
                options.add(new OptionPassager(p.id(), siege, premier && payer ? Bagage.SOUTE_20KG : Bagage.AUCUN, false, false));
            }
            reservations.majOptions(client.getId(), r.id(), new OptionsRequest(payer, options));
            if (payer)
                reservations.payer(client.getId(), r.id(), new PaiementRequest("4242424242424242", client.getPrenom() + " " + client.getNom(), "12/40", "123", false, false));
            return true;
        } catch (Errors.Business e) {
            return false;   // vol complet ou plus réservable : on ignore cette réservation de démonstration
        }
    }
}
