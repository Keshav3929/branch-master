package com.branchmaster.dropdown.repository;

import com.branchmaster.dropdown.entity.Region;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RegionRepository extends JpaRepository<Region, Long> {
}