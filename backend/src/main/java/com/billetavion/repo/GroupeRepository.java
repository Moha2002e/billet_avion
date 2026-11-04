package com.billetavion.repo;

import com.billetavion.model.GroupeVoyage;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GroupeRepository extends JpaRepository<GroupeVoyage, Long> {
    boolean existsByVolId(Long volId);
}
