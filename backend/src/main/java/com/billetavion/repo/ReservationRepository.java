package com.billetavion.repo;

import com.billetavion.model.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Accès aux réservations en base de données (et aux places occupées d'un vol).
 */
public interface ReservationRepository extends JpaRepository<Reservation, Long> {
    /**
     * Retrouve une réservation par sa référence.
     *
     * @param reference la référence à 6 caractères
     * @return la réservation, si elle existe
     */
    Optional<Reservation> findByReference(String reference);
    /**
     * Indique si une référence de réservation est déjà utilisée.
     *
     * @param reference la référence testée
     * @return vrai si elle existe
     */
    boolean existsByReference(String reference);
    /**
     * Indique si un vol a déjà des réservations (quel que soit leur statut).
     *
     * @param volId l'identifiant du vol
     * @return vrai si au moins une réservation existe
     */
    boolean existsByVolId(Long volId);
    /**
     * Liste toutes les réservations d'un vol.
     *
     * @param volId l'identifiant du vol
     * @return les réservations du vol
     */
    List<Reservation> findByVolId(Long volId);
    /**
     * Liste les réservations d'un client, des plus récentes aux plus anciennes.
     *
     * @param utilisateurId l'identifiant du client connecté
     * @return les réservations du client
     */
    List<Reservation> findByUtilisateurIdOrderByCreeLeDesc(Long utilisateurId);
    /**
     * Liste toutes les réservations, des plus récentes aux plus anciennes.
     *
     * @return toutes les réservations
     */
    List<Reservation> findAllByOrderByCreeLeDesc();

    /** Passagers qui occupent le vol : réservations confirmées ou en attente dont le délai n'est pas dépassé. */
    @Query("select p from ReservationPassager p where p.reservation.vol.id = :volId and "
            + "(p.reservation.statut = com.billetavion.model.StatutReservation.CONFIRMEE or "
            + "(p.reservation.statut = com.billetavion.model.StatutReservation.EN_ATTENTE and p.reservation.expireLe > :now))")
    List<ReservationPassager> occupants(@Param("volId") Long volId, @Param("now") LocalDateTime now);
}
