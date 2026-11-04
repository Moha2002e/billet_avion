package com.billetavion.repo;

import com.billetavion.model.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ReservationRepository extends JpaRepository<Reservation, Long> {
    Optional<Reservation> findByReference(String reference);
    boolean existsByReference(String reference);
    boolean existsByVolId(Long volId);
    List<Reservation> findByVolId(Long volId);
    List<Reservation> findByUtilisateurIdOrderByCreeLeDesc(Long utilisateurId);
    List<Reservation> findAllByOrderByCreeLeDesc();

    /** Passagers qui occupent le vol : réservations confirmées ou en attente dont le délai n'est pas dépassé. */
    @Query("select p from ReservationPassager p where p.reservation.vol.id = :volId and "
            + "(p.reservation.statut = com.billetavion.model.StatutReservation.CONFIRMEE or "
            + "(p.reservation.statut = com.billetavion.model.StatutReservation.EN_ATTENTE and p.reservation.expireLe > :now))")
    List<ReservationPassager> occupants(@Param("volId") Long volId, @Param("now") LocalDateTime now);
}
