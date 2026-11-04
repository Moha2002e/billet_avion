package com.billetavion.service;

import com.billetavion.model.*;
import com.billetavion.repo.*;
import com.billetavion.web.Dtos.StatsDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional
public class StatsService {
    private final VolRepository vols;
    private final UtilisateurRepository utilisateurs;
    private final ReservationRepository reservations;

    public StatsService(VolRepository vols, UtilisateurRepository utilisateurs, ReservationRepository reservations) {
        this.vols = vols; this.utilisateurs = utilisateurs; this.reservations = reservations;
    }

    public StatsDto calculer() {
        List<Vol> tous = vols.findAll();
        List<Reservation> toutes = reservations.findAll();
        LocalDateTime now = LocalDateTime.now();
        List<Reservation> confirmees = toutes.stream().filter(r -> r.getStatut() == StatutReservation.CONFIRMEE).toList();
        long enAttente = toutes.stream()
                .filter(r -> r.getStatut() == StatutReservation.EN_ATTENTE && r.getExpireLe() != null && r.getExpireLe().isAfter(now)).count();

        Map<Categorie, Long> parCategorie = new EnumMap<>(Categorie.class);
        for (Categorie c : Categorie.values()) parCategorie.put(c, 0L);
        confirmees.forEach(r -> r.getPassagers().forEach(p -> { if (p.getCategorie() != null) parCategorie.merge(p.getCategorie(), 1L, Long::sum); }));

        List<Vol> programmes = tous.stream().filter(v -> v.getStatut() == StatutVol.PROGRAMME).toList();
        long capacite = programmes.stream().mapToLong(Vol::getCapacite).sum();
        long occupees = confirmees.stream().filter(r -> r.getVol().getStatut() == StatutVol.PROGRAMME)
                .flatMap(r -> r.getPassagers().stream()).filter(p -> p.getType() != TypePassager.BEBE).count();
        BigDecimal revenu = toutes.stream().map(ReservationService::paye).reduce(BigDecimal.ZERO, BigDecimal::add);

        return new StatsDto(tous.size(), programmes.stream().filter(v -> v.getDateDepart().isAfter(now)).count(),
                utilisateurs.findAll().stream().filter(u -> u.getRole() == Role.CLIENT).count(),
                confirmees.size(), enAttente, parCategorie, revenu,
                capacite == 0 ? 0 : (int) Math.round(100.0 * occupees / capacite));
    }
}
