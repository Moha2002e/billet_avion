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

public final class Controllers {
    private Controllers() {}

    static Long utilisateur(HttpServletRequest req) { return (Long) req.getAttribute(AdminInterceptor.ATTR_UTILISATEUR); }

    // ---------------------------------------------------------------- public : vols
    @RestController @RequestMapping("/api/vols")
    public static class VolController {
        private final VolService service;
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
        @GetMapping("/villes") public List<String> villes() { return service.villes(); }
        @GetMapping("/{id}") public VolDto obtenir(@PathVariable Long id) { return service.obtenir(id); }
        /** Plan de cabine (sièges libres/occupés et prix). */
        @GetMapping("/{id}/sieges")
        public PlanDto plan(@PathVariable Long id, @RequestParam(required = false) Long reservationId) { return service.plan(id, reservationId); }

        @PostMapping @ResponseStatus(HttpStatus.CREATED)
        public VolDto creer(@Valid @RequestBody VolRequest r) { return service.creer(r); }
        @PutMapping("/{id}") public VolDto modifier(@PathVariable Long id, @Valid @RequestBody VolRequest r) { return service.modifier(id, r); }
        @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
        public void supprimer(@PathVariable Long id) { service.supprimer(id); }
        @PostMapping("/{id}/annuler") public VolDto annuler(@PathVariable Long id) { return service.annuler(id); }
    }

    @RestController @RequestMapping("/api/catalogue")
    public static class CatalogueController {
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

    @RestController @RequestMapping("/api/promotions")
    public static class PromotionController {
        private final PromotionService service;
        public PromotionController(PromotionService service) { this.service = service; }

        @GetMapping public List<PromotionDto> enCours() { return service.enCours(); }
        @GetMapping("/verifier")
        public RemiseDto verifier(@RequestParam String code, @RequestParam Long volId) { return service.verifier(code, volId); }
        @PostMapping @ResponseStatus(HttpStatus.CREATED)
        public PromotionDto creer(@Valid @RequestBody PromotionRequest r) { return service.creer(r); }
        @PutMapping("/{id}") public PromotionDto modifier(@PathVariable Long id, @Valid @RequestBody PromotionRequest r) { return service.modifier(id, r); }
        @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
        public void supprimer(@PathVariable Long id) { service.supprimer(id); }
    }

    @RestController @RequestMapping("/api/chat")
    public static class ChatController {
        private final ChatService service;
        public ChatController(ChatService service) { this.service = service; }
        @PostMapping public ChatReponse chat(@Valid @RequestBody ChatRequest r) { return service.repondre(r.message()); }
    }

    // ---------------------------------------------------------------- comptes
    @RestController @RequestMapping("/api/auth")
    public static class AuthController {
        private final AuthService auth;
        public AuthController(AuthService auth) { this.auth = auth; }

        @PostMapping("/inscription") @ResponseStatus(HttpStatus.CREATED)
        public AuthReponse inscription(@Valid @RequestBody RegisterRequest r) { return auth.inscrire(r); }
        @PostMapping("/login") public AuthReponse login(@Valid @RequestBody LoginRequest r) { return auth.connecter(r.identifiant(), r.motDePasse()); }
        @PostMapping("/logout") public void logout(HttpServletRequest req) { auth.deconnecter(AdminInterceptor.jeton(req)); }
        /** Protégé par l'intercepteur : renvoie le compte du jeton (sert à restaurer la session). */
        @GetMapping("/me") public UtilisateurDto me(HttpServletRequest req) { return auth.profil(utilisateur(req)); }
    }

    @RestController @RequestMapping("/api/compte")
    public static class CompteController {
        private final AuthService auth;
        public CompteController(AuthService auth) { this.auth = auth; }

        @PutMapping public UtilisateurDto modifier(HttpServletRequest req, @Valid @RequestBody ProfilRequest r) { return auth.modifierProfil(utilisateur(req), r); }
        @DeleteMapping("/carte") public UtilisateurDto supprimerCarte(HttpServletRequest req) { return auth.supprimerCarte(utilisateur(req)); }
    }

    // ---------------------------------------------------------------- réservations (compte connecté)
    @RestController @RequestMapping("/api/reservations")
    public static class ReservationController {
        private final ReservationService service;
        public ReservationController(ReservationService service) { this.service = service; }

        @GetMapping public List<ReservationDto> mesReservations(HttpServletRequest req) { return service.mesReservations(utilisateur(req)); }
        @GetMapping("/{id}") public ReservationDto obtenir(HttpServletRequest req, @PathVariable Long id) { return service.obtenir(utilisateur(req), id); }
        @PostMapping @ResponseStatus(HttpStatus.CREATED)
        public ReservationDto creer(HttpServletRequest req, @Valid @RequestBody ReservationCreate r) { return service.creer(utilisateur(req), r); }
        @PutMapping("/{id}/passagers")
        public ReservationDto passagers(HttpServletRequest req, @PathVariable Long id, @Valid @RequestBody PassagersRequest r) { return service.majPassagers(utilisateur(req), id, r); }
        @PutMapping("/{id}/options")
        public ReservationDto options(HttpServletRequest req, @PathVariable Long id, @Valid @RequestBody OptionsRequest r) { return service.majOptions(utilisateur(req), id, r); }
        @PostMapping("/{id}/paiement")
        public ReservationDto payer(HttpServletRequest req, @PathVariable Long id, @RequestBody PaiementRequest r) { return service.payer(utilisateur(req), id, r); }
        @PostMapping("/{id}/annuler") public ReservationDto annuler(HttpServletRequest req, @PathVariable Long id) { return service.annuler(utilisateur(req), id, false); }
        @GetMapping("/{id}/modification")
        public ApercuModification apercu(HttpServletRequest req, @PathVariable Long id, @RequestParam Long nouveauVolId) { return service.apercuModification(utilisateur(req), id, nouveauVolId); }
        @PostMapping("/{id}/modification")
        public ReservationDto modifier(HttpServletRequest req, @PathVariable Long id, @Valid @RequestBody ModificationRequest r) { return service.modifierVol(utilisateur(req), id, r); }
        @PostMapping("/{id}/enregistrement") public ReservationDto enregistrement(HttpServletRequest req, @PathVariable Long id) { return service.enregistrement(utilisateur(req), id); }
    }

    // ---------------------------------------------------------------- administration
    @RestController @RequestMapping("/api/admin")
    public static class AdminController {
        private final PromotionService promotions;
        private final ReservationService reservations;
        private final VolService vols;
        private final StatsService stats;

        public AdminController(PromotionService promotions, ReservationService reservations, VolService vols, StatsService stats) {
            this.promotions = promotions; this.reservations = reservations; this.vols = vols; this.stats = stats;
        }

        @GetMapping("/promotions") public List<PromotionDto> promotions() { return promotions.toutes(); }
        @GetMapping("/stats") public StatsDto stats() { return stats.calculer(); }
        @GetMapping("/reservations")
        public List<ReservationDto> reservations(@RequestParam(required = false) StatutReservation statut, @RequestParam(required = false) String q) {
            return reservations.toutes(statut, q);
        }
        @PostMapping("/reservations/{id}/annuler")
        public ReservationDto annuler(HttpServletRequest req, @PathVariable Long id) { return reservations.annuler(utilisateur(req), id, true); }
        /** Passagers d'un vol, filtrables par catégorie d'âge (ex. JEUNE). */
        @GetMapping("/vols/{id}/passagers")
        public List<ManifesteDto> manifeste(@PathVariable Long id, @RequestParam(required = false) Categorie categorie) { return vols.manifeste(id, categorie); }
    }
}
