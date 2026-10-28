package com.branchmaster.dropdown.repository;

import com.branchmaster.dropdown.entity.Country;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CountryRepository extends JpaRepository<Country, Long> {
}
