package com.billetavion.service;

import com.billetavion.model.*;
import com.billetavion.repo.VolRepository;
import com.billetavion.web.Dtos.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Assistant virtuel gratuit : détection d'intentions par mots-clés (français), sans IA externe ni clé d'API.
 * Il répond avec les vraies données (vols, prix, promotions) et les vraies règles du site (catalogue).
 */
@Service
@Transactional(readOnly = true)
public class ChatService {
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final List<String> SUGGESTIONS = List.of("Quels vols sont disponibles ?", "Quelles promotions ?", "Tarifs par âge",
            "Bagages et sièges", "Modifier ou annuler", "Enregistrement en ligne");

    private final VolRepository vols;
    private final PromotionService promotions;
    private final Mapper mapper;

    /**
     * Construit l'assistant avec les données dont il a besoin.
     *
     * @param vols le dépôt des vols
     * @param promotions le dépôt ou service des promotions
     * @param mapper le convertisseur en objets de réponse
     */
    public ChatService(VolRepository vols, PromotionService promotions, Mapper mapper) {
        this.vols = vols; this.promotions = promotions; this.mapper = mapper;
    }

    /**
     * Met un texte en minuscules sans accents pour comparer des mots-clés.
     *
     * @param s le texte
     * @return le texte normalisé
     */
    static String normaliser(String s) {
        return Normalizer.normalize(s, Normalizer.Form.NFD).replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT);
    }

    /**
     * Indique si le texte contient l'un des mots-clés.
     *
     * @param t le texte normalisé
     * @param mots les mots-clés
     * @return vrai si un mot-clé est présent
     */
    private static boolean a(String t, String... mots) {
        for (String m : mots) if (t.contains(m)) return true;
        return false;
    }

    /**
     * Construit une réponse avec les suggestions habituelles.
     *
     * @param texte le texte de la réponse
     * @return la réponse
     */
    private static ChatReponse rep(String texte) { return new ChatReponse(texte, SUGGESTIONS); }

    /**
     * Formate un montant en euros.
     *
     * @param b le montant
     * @return le montant suivi de « € »
     */
    private static String eur(BigDecimal b) { return b.stripTrailingZeros().toPlainString() + " €"; }

    /**
     * Comprend la question (mots-clés français) et répond avec les vraies données du site : vols, prix, promotions, règles.
     *
     * @param message la question de l'utilisateur
     * @return la réponse et des suggestions
     */
    public ChatReponse repondre(String message) {
        String t = normaliser(message);
        List<Vol> avenir = vols.findAll().stream()
                .filter(v -> v.getStatut() == StatutVol.PROGRAMME && v.getDateDepart().isAfter(LocalDateTime.now()))
                .sorted(Comparator.comparing(Vol::getDateDepart)).toList();
        List<String> villes = villesCitees(t, avenir);

        if (a(t, "merci")) return rep("Avec plaisir ! Autre question ?");
        if (a(t, "promo", "reduc", "code", "solde", "bon plan", "offre", "moins cher")) return promos();
        if (a(t, "modifi", "changer", "decaler", "changement de vol")) return rep("Modifier votre vol : ouvrez « Mes voyages », choisissez la réservation puis « Modifier le vol ». "
                + "Des frais de " + Catalogue.FRAIS_MODIFICATION_POURCENT + " % du prix de vos billets s'appliquent (ex. 10 € pour un billet à 100 €), "
                + "plus la différence de prix si le nouveau vol est plus cher. Vos sièges sont conservés s'ils sont libres.");
        if (a(t, "annul", "rembours")) return rep("Vous pouvez annuler depuis « Mes voyages ». Le remboursement intégral est garanti avec l'assurance annulation ("
                + eur(Catalogue.ASSURANCE_PAR_PASSAGER) + " par passager) ; sans assurance, le billet n'est pas remboursé. Si c'est la compagnie qui annule le vol, vous êtes toujours remboursé.");
        if (a(t, "bagage", "valise", "soute", "cabine", "caddie", "sac")) return bagages();
        if (a(t, "siege", "place a cote", "hublot", "couloir", "jambes", "confort", "premium")) return sieges();
        if (a(t, "assurance")) return rep("L'assurance annulation coûte " + eur(Catalogue.ASSURANCE_PAR_PASSAGER) + " par passager et permet d'être remboursé si vous annulez. Vous pouvez l'ajouter pendant la réservation ou plus tard dans « Mes voyages ».");
        if (a(t, "enregistrement", "check-in", "checkin", "embarquement", "carte d'embarquement", "porte")) return rep("L'enregistrement en ligne ouvre " + Catalogue.ENREGISTREMENT_OUVERT_HEURES
                + " h avant le départ et ferme " + Catalogue.ENREGISTREMENT_FERME_HEURES + " h avant. Un siège gratuit vous est attribué si vous n'en avez pas choisi, puis vous obtenez votre carte d'embarquement (porte et heure d'embarquement).");
        if (a(t, "paiement", "payer", "carte bancaire", "carte de credit", "visa")) return rep("Le paiement se fait par carte bancaire en fin de réservation, dans un délai de "
                + Catalogue.DELAI_PAIEMENT_MINUTES + " minutes (votre vol est mis de côté pendant ce temps). Vous pouvez enregistrer votre carte. Attention : le paiement est fictif sur ce site de démonstration.");
        if (a(t, "compte", "connexion", "connecter", "inscri", "mot de passe")) return rep("Vous pouvez chercher des vols sans compte. Pour réserver, il faut se connecter ou s'inscrire (bouton « Se connecter » en haut) ; votre recherche est conservée.");
        if (a(t, "groupe", "famille", "equipe", "ecole", "entre amis")) return rep("Voyage en groupe : à partir de 5 passagers dans une même réservation, une remise automatique s'applique sur chaque billet (5 % dès 5, 10 % dès 10, 15 % dès 20), cumulable avec le tarif selon l'âge.");
        if (a(t, "bebe", "enfant", "jeune", "senior", "adulte", "age", "tarif", "etudiant")) return tarifs(t, villes, avenir);
        if (a(t, "reserv", "comment acheter", "acheter")) return rep("Pour réserver : 1) cherchez un vol sur l'accueil, 2) cliquez « Réserver » (connexion demandée), 3) renseignez les passagers, 4) choisissez sièges, bagages et options, 5) payez. "
                + "Votre réservation est gardée " + Catalogue.DELAI_PAIEMENT_MINUTES + " minutes avant paiement.");
        if (a(t, "admin", "ajouter un vol", "creer un vol")) return rep("Seul l'administrateur peut ajouter ou modifier des vols et des promotions (espace « Admin »).");
        if (!villes.isEmpty() || a(t, "vol", "voyage", "billet", "trajet", "destination", "partir", "disponib", "place", "prix", "depart", "aller"))
            return recherche(villes, avenir);
        if (a(t, "bonjour", "salut", "hello", "bonsoir", "coucou", "aide", "help", "?"))
            return rep("Bonjour ! Je suis l'assistant de réservation. Je peux vous renseigner sur les vols, les prix, les bagages, les sièges, les promotions, la modification et l'annulation d'un billet.");
        return rep("Je n'ai pas bien compris. Je peux vous aider sur : les vols (ex. « vols de Bruxelles à Paris »), les promotions, les tarifs selon l'âge, les bagages, les sièges, l'assurance, la modification ou l'annulation.");
    }

    /**
     * Trouve les villes du site citées dans le message (mots entiers), dans l'ordre d'apparition.
     *
     * @param t le texte du message (normalisé)
     * @param vols les vols à venir
     * @return les villes citées
     */
    private List<String> villesCitees(String t, List<Vol> vols) {
        Set<String> toutes = new LinkedHashSet<>();
        vols.forEach(v -> { toutes.add(v.getOrigine()); toutes.add(v.getDestination()); });
        // Mot entier uniquement, pour qu'une ville courte (« Pau », « A ») ne soit pas reconnue au milieu d'un autre mot
        return toutes.stream().filter(v -> position(t, v) >= 0)
                .sorted(Comparator.comparingInt(v -> position(t, v))).toList();
    }

    /**
     * Cherche une ville comme mot entier dans le texte.
     *
     * @param texte le texte
     * @param ville la ville
     * @return la position de la ville, ou -1
     */
    private static int position(String texte, String ville) {
        java.util.regex.Matcher m = java.util.regex.Pattern
                .compile("(?<![a-z0-9])" + java.util.regex.Pattern.quote(normaliser(ville)) + "(?![a-z0-9])").matcher(texte);
        return m.find() ? m.start() : -1;
    }

    /**
     * Liste les prochains vols correspondant aux villes citées.
     *
     * @param villes les villes citées
     * @param avenir les vols à venir
     * @return la réponse avec jusqu'à 5 vols
     */
    private ChatReponse recherche(List<String> villes, List<Vol> avenir) {
        List<Vol> r = avenir;
        if (villes.size() >= 2) {
            String de = villes.get(0), vers = villes.get(1);
            r = avenir.stream().filter(v -> v.getOrigine().equalsIgnoreCase(de) && v.getDestination().equalsIgnoreCase(vers)).toList();
            if (r.isEmpty()) r = avenir.stream().filter(v -> v.getOrigine().equalsIgnoreCase(vers) && v.getDestination().equalsIgnoreCase(de)).toList();
        } else if (villes.size() == 1) {
            String c = villes.get(0);
            r = avenir.stream().filter(v -> v.getOrigine().equalsIgnoreCase(c) || v.getDestination().equalsIgnoreCase(c)).toList();
        }
        if (r.isEmpty()) return rep("Je ne trouve aucun vol à venir pour cette recherche. Essayez une autre ville ou date.");
        StringBuilder sb = new StringBuilder("Voici les prochains vols (" + Math.min(5, r.size()) + " sur " + r.size() + ") :");
        for (Vol v : r.stream().limit(5).toList()) {
            VolDto d = mapper.vol(v);
            sb.append("\n• ").append(Mapper.libelle(v)).append(" — ").append(v.getDateDepart().format(FMT))
              .append(" — ").append(eur(d.prixPromo())).append(" adulte");
            if (d.promoPourcent() > 0) sb.append(" (-").append(d.promoPourcent()).append(" % promo)");
            sb.append(" — ").append(d.placesRestantes()).append(" place(s)");
        }
        sb.append("\nCherchez et réservez depuis la barre de recherche de l'accueil.");
        return rep(sb.toString());
    }

    /**
     * Décrit les promotions en cours.
     *
     * @return la réponse
     */
    private ChatReponse promos() {
        List<PromotionDto> p = promotions.enCours();
        if (p.isEmpty()) return rep("Aucune promotion en cours pour le moment.");
        StringBuilder sb = new StringBuilder("Promotions en cours :");
        for (PromotionDto x : p) {
            sb.append("\n• -").append(x.pourcentage()).append(" % — ").append(x.description());
            sb.append(x.automatique() ? " (appliquée automatiquement)" : " (code : " + x.code() + ")");
            sb.append(x.volLibelle() == null ? ", tous les vols" : ", " + x.volLibelle());
            sb.append(", jusqu'au ").append(x.dateFin().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));
        }
        sb.append("\nLes promotions ne se cumulent pas entre elles : la meilleure est retenue.");
        return rep(sb.toString());
    }

    /**
     * Décrit les bagages et leurs prix.
     *
     * @return la réponse
     */
    private ChatReponse bagages() {
        StringBuilder sb = new StringBuilder("Bagages :");
        for (Bagage b : Bagage.values()) sb.append("\n• ").append(b.getLibelle()).append(" : ").append(b.getPrix().signum() == 0 ? "gratuit" : eur(b.getPrix()));
        sb.append("\nVous les choisissez pendant la réservation, par passager, ou plus tard dans « Mes voyages ».");
        return rep(sb.toString());
    }

    /**
     * Décrit les catégories de sièges et leurs prix.
     *
     * @return la réponse
     */
    private ChatReponse sieges() {
        StringBuilder sb = new StringBuilder("Sièges (par passager) :");
        for (ClasseSiege c : ClasseSiege.values()) sb.append("\n• ").append(c.getLibelle()).append(" : ").append(c.getPrix().signum() == 0 ? "gratuit" : eur(c.getPrix()));
        sb.append("\nLes sièges avec plus de place coûtent plus cher. Choisissez-les sur le plan de l'avion pendant la réservation. Sans choix, un siège gratuit vous est attribué à l'enregistrement.");
        return rep(sb.toString());
    }

    /**
     * Explique les tarifs selon l'âge, avec un exemple chiffré si un vol et une catégorie sont cités.
     *
     * @param t le texte normalisé
     * @param villes les villes citées
     * @param avenir les vols à venir
     * @return la réponse
     */
    private ChatReponse tarifs(String t, List<String> villes, List<Vol> avenir) {
        StringBuilder sb = new StringBuilder("Tarifs selon l'âge (en % du prix du vol) :");
        for (Categorie c : Categorie.values())
            sb.append("\n• ").append(c.getLibelle()).append(" : ").append(c.getCoefficient().multiply(BigDecimal.valueOf(100)).stripTrailingZeros().toPlainString()).append(" %");
        sb.append("\nL'âge est celui du passager le jour du vol.");
        if (!villes.isEmpty() && !avenir.isEmpty()) {
            Categorie cat = a(t, "bebe") ? Categorie.BEBE : a(t, "enfant") ? Categorie.ENFANT : a(t, "senior") ? Categorie.SENIOR
                    : a(t, "jeune", "etudiant") ? Categorie.JEUNE : null;
            Optional<Vol> vol = avenir.stream().filter(v -> villes.stream().anyMatch(c -> c.equalsIgnoreCase(v.getOrigine()) || c.equalsIgnoreCase(v.getDestination()))).findFirst();
            if (cat != null && vol.isPresent())
                sb.append("\nExemple : ").append(Mapper.libelle(vol.get())).append(" → ")
                  .append(eur(Tarif.prix(vol.get().getPrix(), cat, 0))).append(" pour la catégorie ").append(cat.getLibelle()).append(".");
        }
        return rep(sb.toString());
    }
}
