package com.billetavion.repo;

import com.billetavion.model.Utilisateur;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

/**
 * Accès aux comptes utilisateurs en base de données.
 */
public interface UtilisateurRepository extends JpaRepository<Utilisateur, Long> {
    /**
     * Retrouve un compte par son e-mail, sans tenir compte de la casse.
     *
     * @param email le paramètre « email »
     * @return le compte, s'il existe
     */
    Optional<Utilisateur> findByEmailIgnoreCase(String email);
}
