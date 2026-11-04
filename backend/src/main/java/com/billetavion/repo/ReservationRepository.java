package com.billetavion.repo;

import com.billetavion.model.Reservation;
import com.billetavion.model.StatutReservation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ReservationRepository extends JpaRepository<Reservation, Long> {
    long countByVolIdAndStatut(Long volId, StatutReservation statut);
    boolean existsByVolIdAndPassagerIdAndStatut(Long volId, Long passagerId, StatutReservation statut);
    boolean existsByPassagerIdAndStatut(Long passagerId, StatutReservation statut);
    boolean existsByVolIdAndStatut(Long volId, StatutReservation statut);
    List<Reservation> findByVolIdAndStatut(Long volId, StatutReservation statut);
    List<Reservation> findByPassagerIdOrderByDateReservationDesc(Long passagerId);
    List<Reservation> findByGroupeIdAndStatut(Long groupeId, StatutReservation statut);
    List<Reservation> findByStatut(StatutReservation statut);
    List<Reservation> findAllByOrderByDateReservationDesc();
}
