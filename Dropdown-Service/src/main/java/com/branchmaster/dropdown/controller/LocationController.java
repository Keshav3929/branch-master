package com.branchmaster.dropdown.controller;

import com.branchmaster.dropdown.dto.LocationOptionsDto;
import com.branchmaster.dropdown.service.DropdownService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/dropdown/locations")
@RequiredArgsConstructor
public class LocationController {

    private final DropdownService service;

    @GetMapping
    public LocationOptionsDto getOptions() {
        return service.getLocationOptions();
    }
}