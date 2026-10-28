package com.branchmaster.dropdown.controller;

import com.branchmaster.dropdown.dto.OrganizationOptionsDto;
import com.branchmaster.dropdown.service.DropdownService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/dropdown/organizations")
@RequiredArgsConstructor
public class OrganizationController {

    private final DropdownService service;

    @GetMapping
    public OrganizationOptionsDto getOptions() {
        return service.getOrganizationOptions();
    }
}