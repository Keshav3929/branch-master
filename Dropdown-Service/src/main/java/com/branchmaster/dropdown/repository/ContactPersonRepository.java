package com.branchmaster.dropdown.repository;

import com.branchmaster.dropdown.entity.ContactPerson;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ContactPersonRepository extends JpaRepository<ContactPerson, Long> {
}
