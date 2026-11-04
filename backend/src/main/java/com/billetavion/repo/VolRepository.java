package com.billetavion.repo;

import com.billetavion.model.Vol;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Accès aux vols en base de données.
 */
public interface VolRepository extends JpaRepository<Vol, Long> {
    /** Indique si un vol porte déjà ce numéro (sert à ne pas dupliquer les données de démonstration). */
    boolean existsByNumeroVol(String numeroVol);

    /** Retrouve un vol par son numéro. */
    java.util.Optional<Vol> findFirstByNumeroVol(String numeroVol);
}
