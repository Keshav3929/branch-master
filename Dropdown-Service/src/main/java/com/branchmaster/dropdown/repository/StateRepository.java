package com.branchmaster.dropdown.repository;

import com.branchmaster.dropdown.entity.State;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StateRepository extends JpaRepository<State, Long> {
}