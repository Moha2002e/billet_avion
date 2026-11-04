package com.billetavion.service;

import com.billetavion.model.*;
import com.billetavion.repo.VolRepository;
import com.billetavion.web.Dtos.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.text.Normalizer;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Assistant virtuel gratuit : détection d'intentions par mots-clés (français), sans IA externe ni clé d'API.
 * Il répond avec les vraies données (vols, prix, promotions) de la base.
 */
@Service
@Transactional(readOnly = true)
public class ChatService {
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final List<String> SUGGESTIONS = List.of("Quels vols sont disponibles ?", "Quelles promotions ?",
            "Tarifs par âge", "Voyage en groupe", "Comment réserver ?");

    private final VolRepository vols;
    private final PromotionService promotions;
    private final Mapper mapper;

    public ChatService(VolRepository vols, PromotionService promotions, Mapper mapper) {
        this.vols = vols; this.promotions = promotions; this.mapper = mapper;
    }

    static String normaliser(String s) {
        return Normalizer.normalize(s, Normalizer.Form.NFD).replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT);
    }

    private static boolean a(String t, String... mots) {
        for (String m : mots) if (t.contains(m)) return true;
        return false;
    }

    public ChatReponse repondre(String message) {
        String t = normaliser(message);
        List<Vol> avenir = vols.findAll().stream()
                .filter(v -> v.getStatut() == StatutVol.PROGRAMME && v.getDateDepart().isAfter(LocalDateTime.now()))
                .sorted(Comparator.comparing(Vol::getDateDepart)).toList();
        List<String> villes = villesCitees(t, avenir);

        if (a(t, "merci")) return new ChatReponse("Avec plaisir ! Autre question ?", SUGGESTIONS);
        if (a(t, "promo", "reduc", "code", "solde", "bon plan", "offre", "moins cher")) return promos();
        if (a(t, "groupe", "groupes", "famille", "equipe", "ecole", "entre amis")) return groupe();
        if (a(t, "bebe", "enfant", "jeune", "senior", "adulte", "age", "tarif", "etudiant")) return tarifs(t, villes, avenir);
        if (a(t, "reserv", "annul", "billet a reserver", "comment acheter")) return new ChatReponse(
                "Pour réserver : onglet « Réservations », choisissez le passager et le vol (vous pouvez saisir un code promo), puis « Réserver ». "
                + "Le prix est calculé automatiquement selon l'âge. Pour annuler, utilisez le bouton « Annuler » dans la liste des réservations.", SUGGESTIONS);
        if (a(t, "admin", "ajouter un vol", "creer un vol")) return new ChatReponse(
                "Seul l'administrateur peut ajouter ou modifier des vols et des promotions. Il se connecte via le bouton « Admin » du menu.", SUGGESTIONS);
        if (!villes.isEmpty() || a(t, "vol", "voyage", "billet", "trajet", "destination", "partir", "disponib", "place", "prix", "depart", "aller"))
            return recherche(villes, avenir);
        if (a(t, "bonjour", "salut", "hello", "bonsoir", "coucou", "aide", "help", "?"))
            return new ChatReponse("Bonjour ! Je suis l'assistant de réservation. Je peux vous renseigner sur les vols, les prix selon l'âge, les promotions et les voyages groupés.", SUGGESTIONS);
        return new ChatReponse("Je n'ai pas bien compris. Je peux vous aider sur : les vols disponibles (ex. « vols de Bruxelles à Paris »), "
                + "les promotions, les tarifs selon l'âge, ou les voyages en groupe.", SUGGESTIONS);
    }

    /** Villes de la base mentionnées dans le message, dans l'ordre d'apparition. */
    private List<String> villesCitees(String t, List<Vol> vols) {
        Set<String> toutes = new LinkedHashSet<>();
        vols.forEach(v -> { toutes.add(v.getOrigine()); toutes.add(v.getDestination()); });
        return toutes.stream().filter(v -> t.contains(normaliser(v)))
                .sorted(Comparator.comparingInt(v -> t.indexOf(normaliser(v)))).toList();
    }

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
        if (r.isEmpty()) return new ChatReponse("Je ne trouve aucun vol à venir pour cette recherche. Essayez une autre ville ou date.", SUGGESTIONS);
        StringBuilder sb = new StringBuilder("Voici les prochains vols (" + Math.min(5, r.size()) + " sur " + r.size() + ") :");
        for (Vol v : r.stream().limit(5).toList()) {
            VolDto d = mapper.vol(v);
            sb.append("\n• ").append(Mapper.libelle(v)).append(" — ").append(v.getDateDepart().format(FMT))
              .append(" — ").append(d.prixPromo().stripTrailingZeros().toPlainString()).append(" € adulte");
            if (d.promoPourcent() > 0) sb.append(" (-").append(d.promoPourcent()).append(" % promo)");
            sb.append(" — ").append(d.placesRestantes()).append(" place(s)");
        }
        return new ChatReponse(sb.toString(), SUGGESTIONS);
    }

    private ChatReponse promos() {
        List<PromotionDto> p = promotions.enCours();
        if (p.isEmpty()) return new ChatReponse("Aucune promotion en cours pour le moment.", SUGGESTIONS);
        StringBuilder sb = new StringBuilder("Promotions en cours :");
        for (PromotionDto x : p) {
            sb.append("\n• -").append(x.pourcentage()).append(" % — ").append(x.description());
            sb.append(x.automatique() ? " (appliquée automatiquement)" : " (code : " + x.code() + ")");
            sb.append(x.volLibelle() == null ? ", tous les vols" : ", " + x.volLibelle());
            sb.append(", jusqu'au ").append(x.dateFin().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));
        }
        sb.append("\nLes promotions ne se cumulent pas : la meilleure est retenue.");
        return new ChatReponse(sb.toString(), SUGGESTIONS);
    }

    private ChatReponse groupe() {
        return new ChatReponse("Voyages groupés : réunissez plusieurs passagers sur un même vol. Remise de 5 % dès 5 passagers, 10 % dès 10 et 15 % dès 20 "
                + "(cumulable avec le tarif selon l'âge). Créez le groupe dans l'onglet « Voyages groupés ».", SUGGESTIONS);
    }

    private ChatReponse tarifs(String t, List<String> villes, List<Vol> avenir) {
        StringBuilder sb = new StringBuilder("Tarifs selon l'âge (en % du prix du vol) :");
        for (Categorie c : Categorie.values())
            sb.append("\n• ").append(c.getLibelle()).append(" : ").append(c.getCoefficient().multiply(java.math.BigDecimal.valueOf(100)).stripTrailingZeros().toPlainString()).append(" %");
        sb.append("\nL'âge est celui du passager le jour du vol.");
        if (!villes.isEmpty() && !avenir.isEmpty()) {
            Categorie cat = a(t, "bebe") ? Categorie.BEBE : a(t, "enfant") ? Categorie.ENFANT : a(t, "senior") ? Categorie.SENIOR
                    : a(t, "jeune", "etudiant") ? Categorie.JEUNE : null;
            Optional<Vol> vol = avenir.stream().filter(v -> villes.stream().anyMatch(c -> c.equalsIgnoreCase(v.getOrigine()) || c.equalsIgnoreCase(v.getDestination()))).findFirst();
            if (cat != null && vol.isPresent())
                sb.append("\nExemple : ").append(Mapper.libelle(vol.get())).append(" → ")
                  .append(Tarif.prix(vol.get().getPrix(), cat, 0)).append(" € pour la catégorie ").append(cat.getLibelle()).append(".");
        }
        return new ChatReponse(sb.toString(), SUGGESTIONS);
    }
}
