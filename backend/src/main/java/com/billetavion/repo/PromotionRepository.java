package com.billetavion.repo;

import com.billetavion.model.Promotion;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

/**
 * Accès aux promotions en base de données.
 */
public interface PromotionRepository extends JpaRepository<Promotion, Long> {
    /**
     * Retrouve une promotion par son code, sans tenir compte de la casse.
     *
     * @param code le code
     * @return la promotion, si elle existe
     */
    Optional<Promotion> findByCodeIgnoreCase(String code);
}
