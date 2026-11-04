package com.billetavion.service;

import com.billetavion.model.*;
import com.billetavion.repo.ReservationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/** Places occupées d'un vol : réservations confirmées + réservations en attente non expirées. Les bébés n'occupent pas de siège. */
@Service
@Transactional(readOnly = true)
public class DisponibiliteService {
    private final ReservationRepository reservations;

    public DisponibiliteService(ReservationRepository reservations) { this.reservations = reservations; }

    public List<ReservationPassager> occupants(Vol vol) {
        return reservations.occupants(vol.getId(), LocalDateTime.now());
    }

    public long placesRestantes(Vol vol) {
        return vol.getCapacite() - occupants(vol).stream().filter(p -> p.getType() != TypePassager.BEBE).count();
    }

    /** Sièges déjà choisis, hors ceux de la réservation donnée. */
    public Set<String> siegesPris(Vol vol, Long sauf) {
        return occupants(vol).stream()
                .filter(p -> p.getSiege() != null && !p.getReservation().getId().equals(sauf))
                .map(ReservationPassager::getSiege).collect(Collectors.toSet());
    }
}
