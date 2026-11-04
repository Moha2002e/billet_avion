package com.billetavion.web;

import com.billetavion.model.*;
import com.billetavion.service.*;
import com.billetavion.web.Dtos.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.*;

/**
 * Contrôleurs REST de l'API (regroupés dans une seule classe, un sous-ensemble par domaine).
 */
public final class Controllers {
    /**
     * Classe utilitaire : ne s'instancie pas.
     */
    private Controllers() {}

    /**
     * Lit l'identifiant du client connecté placé dans la requête par l'intercepteur.
     *
     * @param req la requête HTTP (porte l'identifiant du client connecté)
     * @return l'identifiant du client
     */
    static Long utilisateur(HttpServletRequest req) { return (Long) req.getAttribute(AdminInterceptor.ATTR_UTILISATEUR); }

    // ---------------------------------------------------------------- public : vols
    /**
     * Routes /api/vols : recherche publique, plan de cabine, et gestion des vols (administrateur).
     */
    @RestController @RequestMapping("/api/vols")
    public static class VolController {
        private final VolService service;
        /**
         * Construit le contrôleur avec le service dont il dépend.
         *
         * @param service le service associé
         */
        public VolController(VolService service) { this.service = service; }

        @GetMapping
        public List<VolDto> lister(@RequestParam(required = false) String origine, @RequestParam(required = false) String destination,
                                   @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
                                   @RequestParam(defaultValue = "false") boolean disponibles) {
            return service.lister(origine, destination, date, disponibles);
        }
        /** Barre de recherche de l'accueil : publique, sans connexion. */
        @GetMapping("/recherche")
        public List<ResultatVolDto> rechercher(@RequestParam(required = false) String origine, @RequestParam(required = false) String destination,
                                               @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
                                               @RequestParam(defaultValue = "0") int flexibilite,
                                               @RequestParam(defaultValue = "1") int adultes, @RequestParam(defaultValue = "0") int enfants,
                                               @RequestParam(defaultValue = "0") int bebes) {
            return service.rechercher(origine, destination, date, Math.max(0, Math.min(flexibilite, 7)),
                    Math.max(1, adultes), Math.max(0, enfants), Math.max(0, bebes));
        }
        /**
         * Liste les villes de la barre de recherche (public).
         *
         * @return les villes
         */
        @GetMapping("/villes") public List<String> villes() { return service.villes(); }
        /**
         * Renvoie un vol (public).
         *
         * @param id l'identifiant
         * @return le vol
         */
        @GetMapping("/{id}") public VolDto obtenir(@PathVariable Long id) { return service.obtenir(id); }
        /** Plan de cabine (sièges libres/occupés et prix). */
        @GetMapping("/{id}/sieges")
        public PlanDto plan(@PathVariable Long id, @RequestParam(required = false) Long reservationId) { return service.plan(id, reservationId); }

        /**
         * Ajoute un vol (administrateur).
         *
         * @param r les informations du vol
         * @return le vol créé (201)
         */
        @PostMapping @ResponseStatus(HttpStatus.CREATED)
        public VolDto creer(@Valid @RequestBody VolRequest r) { return service.creer(r); }
        /**
         * Modifie un vol (administrateur).
         *
         * @param id l'identifiant
         * @param r les nouvelles informations
         * @return le vol modifié
         */
        @PutMapping("/{id}") public VolDto modifier(@PathVariable Long id, @Valid @RequestBody VolRequest r) { return service.modifier(id, r); }
        /**
         * Supprime un vol sans réservation (administrateur).
         *
         * @param id l'identifiant
         */
        @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
        public void supprimer(@PathVariable Long id) { service.supprimer(id); }
        /**
         * Annule un vol et rembourse ses passagers (administrateur).
         *
         * @param id l'identifiant
         * @return le vol annulé
         */
        @PostMapping("/{id}/annuler") public VolDto annuler(@PathVariable Long id) { return service.annuler(id); }
    }

    /**
     * Route /api/catalogue : tarifs et règles commerciales.
     */
    @RestController @RequestMapping("/api/catalogue")
    public static class CatalogueController {
        /**
         * Renvoie les tarifs : bagages, sièges, catégories d'âge, assurance, frais de modification.
         *
         * @return le catalogue
         */
        @GetMapping
        public Map<String, Object> catalogue() {
            List<Map<String, Object>> bagages = Arrays.stream(Bagage.values())
                    .map(b -> Map.<String, Object>of("code", b.name(), "libelle", b.getLibelle(), "prix", b.getPrix())).toList();
            List<Map<String, Object>> sieges = Arrays.stream(ClasseSiege.values())
                    .map(c -> Map.<String, Object>of("code", c.name(), "libelle", c.getLibelle(), "prix", c.getPrix())).toList();
            List<Map<String, Object>> categories = Arrays.stream(Categorie.values())
                    .map(c -> Map.<String, Object>of("code", c.name(), "libelle", c.getLibelle(), "coefficient", c.getCoefficient())).toList();
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("bagages", bagages); m.put("classesSiege", sieges); m.put("categories", categories);
            m.put("assurance", Catalogue.ASSURANCE_PAR_PASSAGER); m.put("embarquementPrioritaire", Catalogue.EMBARQUEMENT_PRIORITAIRE);
            m.put("repas", Catalogue.REPAS); m.put("fraisModificationPourcent", Catalogue.FRAIS_MODIFICATION_POURCENT);
            m.put("delaiPaiementMinutes", Catalogue.DELAI_PAIEMENT_MINUTES);
            return m;
        }
    }

    /**
     * Routes /api/promotions : promotions en cours, vérification d'un code, gestion (administrateur).
     */
    @RestController @RequestMapping("/api/promotions")
    public static class PromotionController {
        private final PromotionService service;
        /**
         * Construit le contrôleur avec le service dont il dépend.
         *
         * @param service le service associé
         */
        public PromotionController(PromotionService service) { this.service = service; }

        /**
         * Liste les promotions en cours (public).
         *
         * @return les promotions en cours
         */
        @GetMapping public List<PromotionDto> enCours() { return service.enCours(); }
        /**
         * Vérifie un code promo pour un vol (public).
         *
         * @param code le code saisi
         * @param volId le vol concerné
         * @return la remise du code
         */
        @GetMapping("/verifier")
        public RemiseDto verifier(@RequestParam String code, @RequestParam Long volId) { return service.verifier(code, volId); }
        /**
         * Ajoute une promotion (administrateur).
         *
         * @param r les informations de la promotion
         * @return la promotion créée (201)
         */
        @PostMapping @ResponseStatus(HttpStatus.CREATED)
        public PromotionDto creer(@Valid @RequestBody PromotionRequest r) { return service.creer(r); }
        /**
         * Modifie une promotion (administrateur).
         *
         * @param id l'identifiant
         * @param r les nouvelles informations
         * @return la promotion modifiée
         */
        @PutMapping("/{id}") public PromotionDto modifier(@PathVariable Long id, @Valid @RequestBody PromotionRequest r) { return service.modifier(id, r); }
        /**
         * Supprime une promotion (administrateur).
         *
         * @param id l'identifiant
         */
        @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
        public void supprimer(@PathVariable Long id) { service.supprimer(id); }
    }

    /**
     * Route /api/chat : assistant virtuel gratuit.
     */
    @RestController @RequestMapping("/api/chat")
    public static class ChatController {
        private final ChatService service;
        /**
         * Construit le contrôleur avec le service dont il dépend.
         *
         * @param service le service associé
         */
        public ChatController(ChatService service) { this.service = service; }
        /**
         * Répond à une question du chatbot.
         *
         * @param r la question
         * @return la réponse et des suggestions
         */
        @PostMapping public ChatReponse chat(@Valid @RequestBody ChatRequest r) { return service.repondre(r.message()); }
    }

    // ---------------------------------------------------------------- comptes
    /**
     * Routes /api/auth : inscription, connexion, déconnexion, compte courant.
     */
    @RestController @RequestMapping("/api/auth")
    public static class AuthController {
        private final AuthService auth;
        /**
         * Construit le contrôleur avec le service dont il dépend.
         *
         * @param auth le service d'authentification
         */
        public AuthController(AuthService auth) { this.auth = auth; }

        /**
         * Crée un compte client et ouvre sa session.
         *
         * @param r les informations d'inscription
         * @return le jeton et le compte (201)
         */
        @PostMapping("/inscription") @ResponseStatus(HttpStatus.CREATED)
        public AuthReponse inscription(@Valid @RequestBody RegisterRequest r) { return auth.inscrire(r); }
        /**
         * Connecte un client ou l'administrateur.
         *
         * @param r l'identifiant et le mot de passe
         * @return le jeton et le compte
         */
        @PostMapping("/login") public AuthReponse login(@Valid @RequestBody LoginRequest r) { return auth.connecter(r.identifiant(), r.motDePasse()); }
        /**
         * Ferme la session du jeton fourni.
         *
         * @param req la requête HTTP (porte l'identifiant du client connecté)
         */
        @PostMapping("/logout") public void logout(HttpServletRequest req) { auth.deconnecter(AdminInterceptor.jeton(req)); }
        /** Protégé par l'intercepteur : renvoie le compte du jeton (sert à restaurer la session). */
        @GetMapping("/me") public UtilisateurDto me(HttpServletRequest req) { return auth.profil(utilisateur(req)); }
    }

    /**
     * Routes /api/compte : profil et carte enregistrée du client connecté.
     */
    @RestController @RequestMapping("/api/compte")
    public static class CompteController {
        private final AuthService auth;
        /**
         * Construit le contrôleur avec le service dont il dépend.
         *
         * @param auth le service d'authentification
         */
        public CompteController(AuthService auth) { this.auth = auth; }

        /**
         * Modifie le profil du client connecté.
         *
         * @param req la requête HTTP (porte l'identifiant du client connecté)
         * @param r les nouvelles informations
         * @return le profil mis à jour
         */
        @PutMapping public UtilisateurDto modifier(HttpServletRequest req, @Valid @RequestBody ProfilRequest r) { return auth.modifierProfil(utilisateur(req), r); }
        /**
         * Supprime la carte enregistrée du client connecté.
         *
         * @param req la requête HTTP (porte l'identifiant du client connecté)
         * @return le profil mis à jour
         */
        @DeleteMapping("/carte") public UtilisateurDto supprimerCarte(HttpServletRequest req) { return auth.supprimerCarte(utilisateur(req)); }
    }

    // ---------------------------------------------------------------- réservations (compte connecté)
    /**
     * Routes /api/reservations : réservations du client connecté (création, options, paiement, modification, annulation).
     */
    @RestController @RequestMapping("/api/reservations")
    public static class ReservationController {
        private final ReservationService service;
        /**
         * Construit le contrôleur avec le service dont il dépend.
         *
         * @param service le service associé
         */
        public ReservationController(ReservationService service) { this.service = service; }

        /**
         * Liste les réservations du client connecté.
         *
         * @param req la requête HTTP (porte l'identifiant du client connecté)
         * @return ses réservations
         */
        @GetMapping public List<ReservationDto> mesReservations(HttpServletRequest req) { return service.mesReservations(utilisateur(req)); }
        /**
         * Renvoie une réservation du client connecté.
         *
         * @param req la requête HTTP (porte l'identifiant du client connecté)
         * @param id l'identifiant
         * @return la réservation
         */
        @GetMapping("/{id}") public ReservationDto obtenir(HttpServletRequest req, @PathVariable Long id) { return service.obtenir(utilisateur(req), id); }
        /**
         * Crée une réservation (gardée 15 minutes avant paiement).
         *
         * @param req la requête HTTP (porte l'identifiant du client connecté)
         * @param r le vol, les passagers et le code promo
         * @return la réservation créée (201)
         */
        @PostMapping @ResponseStatus(HttpStatus.CREATED)
        public ReservationDto creer(HttpServletRequest req, @Valid @RequestBody ReservationCreate r) { return service.creer(utilisateur(req), r); }
        /**
         * Met à jour les passagers de la réservation.
         *
         * @param req la requête HTTP (porte l'identifiant du client connecté)
         * @param id l'identifiant
         * @param r les passagers saisis
         * @return la réservation mise à jour
         */
        @PutMapping("/{id}/passagers")
        public ReservationDto passagers(HttpServletRequest req, @PathVariable Long id, @Valid @RequestBody PassagersRequest r) { return service.majPassagers(utilisateur(req), id, r); }
        /**
         * Met à jour sièges, bagages, options et assurance.
         *
         * @param req la requête HTTP (porte l'identifiant du client connecté)
         * @param id l'identifiant
         * @param r les choix par passager
         * @return la réservation mise à jour
         */
        @PutMapping("/{id}/options")
        public ReservationDto options(HttpServletRequest req, @PathVariable Long id, @Valid @RequestBody OptionsRequest r) { return service.majOptions(utilisateur(req), id, r); }
        /**
         * Paie le solde de la réservation (paiement fictif).
         *
         * @param req la requête HTTP (porte l'identifiant du client connecté)
         * @param id l'identifiant
         * @param r la carte
         * @return la réservation confirmée
         */
        @PostMapping("/{id}/paiement")
        public ReservationDto payer(HttpServletRequest req, @PathVariable Long id, @RequestBody PaiementRequest r) { return service.payer(utilisateur(req), id, r); }
        /**
         * Annule la réservation (remboursée seulement avec l'assurance).
         *
         * @param req la requête HTTP (porte l'identifiant du client connecté)
         * @param id l'identifiant
         * @return la réservation annulée
         */
        @PostMapping("/{id}/annuler") public ReservationDto annuler(HttpServletRequest req, @PathVariable Long id) { return service.annuler(utilisateur(req), id, false); }
        /**
         * Calcule le coût d'un changement de vol (frais de 10 %).
         *
         * @param req la requête HTTP (porte l'identifiant du client connecté)
         * @param id l'identifiant
         * @param nouveauVolId le nouveau vol
         * @return l'aperçu de la modification
         */
        @GetMapping("/{id}/modification")
        public ApercuModification apercu(HttpServletRequest req, @PathVariable Long id, @RequestParam Long nouveauVolId) { return service.apercuModification(utilisateur(req), id, nouveauVolId); }
        /**
         * Change le vol de la réservation et paie les frais.
         *
         * @param req la requête HTTP (porte l'identifiant du client connecté)
         * @param id l'identifiant
         * @param r le nouveau vol et la carte
         * @return la réservation modifiée
         */
        @PostMapping("/{id}/modification")
        public ReservationDto modifier(HttpServletRequest req, @PathVariable Long id, @Valid @RequestBody ModificationRequest r) { return service.modifierVol(utilisateur(req), id, r); }
        /**
         * Effectue l'enregistrement en ligne.
         *
         * @param req la requête HTTP (porte l'identifiant du client connecté)
         * @param id l'identifiant
         * @return la réservation avec cartes d'embarquement
         */
        @PostMapping("/{id}/enregistrement") public ReservationDto enregistrement(HttpServletRequest req, @PathVariable Long id) { return service.enregistrement(utilisateur(req), id); }
    }

    // ---------------------------------------------------------------- administration
    /**
     * Routes /api/admin : statistiques, réservations, promotions, passagers d'un vol et données de démonstration.
     */
    @RestController @RequestMapping("/api/admin")
    public static class AdminController {
        private final PromotionService promotions;
        private final ReservationService reservations;
        private final VolService vols;
        private final StatsService stats;
        private final DonneesService donnees;

        /**
         * Construit le contrôleur avec le service dont il dépend.
         *
         * @param promotions le dépôt ou service des promotions
         * @param reservations le dépôt des réservations
         * @param vols le dépôt des vols
         * @param stats le paramètre « stats »
         * @param donnees le paramètre « donnees »
         */
        public AdminController(PromotionService promotions, ReservationService reservations, VolService vols, StatsService stats, DonneesService donnees) {
            this.promotions = promotions; this.reservations = reservations; this.vols = vols; this.stats = stats; this.donnees = donnees;
        }

        /**
         * Liste toutes les promotions, y compris expirées (administrateur).
         *
         * @return toutes les promotions
         */
        @GetMapping("/promotions") public List<PromotionDto> promotions() { return promotions.toutes(); }
        /**
         * Renvoie les statistiques du tableau de bord (administrateur).
         *
         * @return les statistiques
         */
        @GetMapping("/stats") public StatsDto stats() { return stats.calculer(); }
        /** Insère les données de démonstration : ce qui existe déjà est ignoré (jamais de doublon). */
        @PostMapping("/donnees") public DonneesDto insererDonnees() { return donnees.inserer(); }
        @GetMapping("/reservations")
        public List<ReservationDto> reservations(@RequestParam(required = false) StatutReservation statut, @RequestParam(required = false) String q) {
            return reservations.toutes(statut, q);
        }
        /**
         * Annule une réservation avec remboursement intégral (administrateur).
         *
         * @param req la requête HTTP (porte l'identifiant du client connecté)
         * @param id l'identifiant
         * @return la réservation annulée
         */
        @PostMapping("/reservations/{id}/annuler")
        public ReservationDto annuler(HttpServletRequest req, @PathVariable Long id) { return reservations.annuler(utilisateur(req), id, true); }
        /** Passagers d'un vol, filtrables par catégorie d'âge (ex. JEUNE). */
        @GetMapping("/vols/{id}/passagers")
        public List<ManifesteDto> manifeste(@PathVariable Long id, @RequestParam(required = false) Categorie categorie) { return vols.manifeste(id, categorie); }
    }
}
