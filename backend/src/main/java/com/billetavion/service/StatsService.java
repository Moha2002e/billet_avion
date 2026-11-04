package com.billetavion.service;

import com.billetavion.model.*;
import com.billetavion.repo.*;
import com.billetavion.web.Dtos.StatsDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class StatsService {
    private final VolRepository vols;
    private final PassagerRepository passagers;
    private final ReservationRepository reservations;
    private final GroupeRepository groupes;

    public StatsService(VolRepository vols, PassagerRepository passagers, ReservationRepository reservations, GroupeRepository groupes) {
        this.vols = vols; this.passagers = passagers; this.reservations = reservations; this.groupes = groupes;
    }

    public StatsDto calculer() {
        List<Vol> tous = vols.findAll();
        List<Reservation> actives = reservations.findByStatut(StatutReservation.CONFIRMEE);
        Map<Categorie, Long> parCategorie = new EnumMap<>(Categorie.class);
        for (Categorie c : Categorie.values()) parCategorie.put(c, 0L);
        LocalDate today = LocalDate.now();
        passagers.findAll().forEach(p -> parCategorie.merge(Categorie.pour(p.getDateNaissance(), today), 1L, Long::sum));

        List<Vol> programmes = tous.stream().filter(v -> v.getStatut() == StatutVol.PROGRAMME).toList();
        long capacite = programmes.stream().mapToLong(Vol::getCapacite).sum();
        long occupees = actives.stream().filter(r -> r.getVol().getStatut() == StatutVol.PROGRAMME).count();

        return new StatsDto(tous.size(),
                programmes.stream().filter(v -> v.getDateDepart().isAfter(LocalDateTime.now())).count(),
                passagers.count(), parCategorie, actives.size(),
                groupes.findAll().stream().filter(GroupeVoyage::isActif).count(),
                actives.stream().map(Reservation::getPrix).reduce(BigDecimal.ZERO, BigDecimal::add),
                capacite == 0 ? 0 : (int) Math.round(100.0 * occupees / capacite));
    }
}
