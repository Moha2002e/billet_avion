package com.billetavion.web;

import com.billetavion.model.Categorie;
import com.billetavion.model.StatutReservation;
import com.billetavion.service.*;
import com.billetavion.web.Dtos.*;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public final class Controllers {
    private Controllers() {}

    @RestController @RequestMapping("/api/vols")
    public static class VolController {
        private final VolService service;
        public VolController(VolService service) { this.service = service; }

        @GetMapping
        public List<VolDto> lister(@RequestParam(required = false) String origine,
                                   @RequestParam(required = false) String destination,
                                   @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
                                   @RequestParam(defaultValue = "false") boolean disponibles) {
            return service.lister(origine, destination, date, disponibles);
        }
        @GetMapping("/{id}") public VolDto obtenir(@PathVariable Long id) { return service.obtenir(id); }
        @PostMapping @ResponseStatus(HttpStatus.CREATED)
        public VolDto creer(@Valid @RequestBody VolRequest r) { return service.creer(r); }
        @PutMapping("/{id}") public VolDto modifier(@PathVariable Long id, @Valid @RequestBody VolRequest r) { return service.modifier(id, r); }
        @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
        public void supprimer(@PathVariable Long id) { service.supprimer(id); }
        @PostMapping("/{id}/annuler") public VolDto annuler(@PathVariable Long id) { return service.annuler(id); }
        @GetMapping("/{id}/passagers")
        public List<ReservationDto> manifeste(@PathVariable Long id, @RequestParam(required = false) Categorie categorie) {
            return service.manifeste(id, categorie);
        }
    }

    @RestController @RequestMapping("/api/passagers")
    public static class PassagerController {
        private final PassagerService service;
        public PassagerController(PassagerService service) { this.service = service; }

        @GetMapping
        public List<PassagerDto> lister(@RequestParam(required = false) String q,
                                        @RequestParam(required = false) Categorie categorie) {
            return service.lister(q, categorie);
        }
        @GetMapping("/categories")
        public List<Map<String, Object>> categories() {
            return java.util.Arrays.stream(Categorie.values())
                    .map(c -> Map.<String, Object>of("code", c.name(), "libelle", c.getLibelle(), "coefficient", c.getCoefficient()))
                    .toList();
        }
        @GetMapping("/{id}") public PassagerDto obtenir(@PathVariable Long id) { return service.obtenir(id); }
        @PostMapping @ResponseStatus(HttpStatus.CREATED)
        public PassagerDto creer(@Valid @RequestBody PassagerRequest r) { return service.creer(r); }
        @PutMapping("/{id}") public PassagerDto modifier(@PathVariable Long id, @Valid @RequestBody PassagerRequest r) { return service.modifier(id, r); }
        @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
        public void supprimer(@PathVariable Long id) { service.supprimer(id); }
        @GetMapping("/{id}/reservations") public List<ReservationDto> reservations(@PathVariable Long id) { return service.reservationsDe(id); }
    }

    @RestController @RequestMapping("/api/reservations")
    public static class ReservationController {
        private final ReservationService service;
        public ReservationController(ReservationService service) { this.service = service; }

        @GetMapping
        public List<ReservationDto> lister(@RequestParam(required = false) Long volId,
                                           @RequestParam(required = false) Long passagerId,
                                           @RequestParam(required = false) StatutReservation statut) {
            return service.lister(volId, passagerId, statut);
        }
        @PostMapping @ResponseStatus(HttpStatus.CREATED)
        public ReservationDto creer(@Valid @RequestBody ReservationRequest r) { return service.creer(r); }
        @PostMapping("/{id}/annuler") public ReservationDto annuler(@PathVariable Long id) { return service.annuler(id); }
    }

    @RestController @RequestMapping("/api/groupes")
    public static class GroupeController {
        private final GroupeService service;
        public GroupeController(GroupeService service) { this.service = service; }

        @GetMapping public List<GroupeDto> lister() { return service.lister(); }
        @GetMapping("/{id}") public GroupeDto obtenir(@PathVariable Long id) { return service.obtenir(id); }
        @PostMapping @ResponseStatus(HttpStatus.CREATED)
        public GroupeDto creer(@Valid @RequestBody GroupeRequest r) { return service.creer(r); }
        @PostMapping("/{id}/passagers") public GroupeDto ajouter(@PathVariable Long id, @Valid @RequestBody MembresRequest r) { return service.ajouterMembres(id, r); }
        @DeleteMapping("/{id}/passagers/{passagerId}")
        public GroupeDto retirer(@PathVariable Long id, @PathVariable Long passagerId) { return service.retirerMembre(id, passagerId); }
        @PostMapping("/{id}/annuler") public GroupeDto annuler(@PathVariable Long id) { return service.annuler(id); }
    }

    @RestController @RequestMapping("/api/stats")
    public static class StatsController {
        private final StatsService service;
        public StatsController(StatsService service) { this.service = service; }
        @GetMapping public StatsDto stats() { return service.calculer(); }
    }
}
