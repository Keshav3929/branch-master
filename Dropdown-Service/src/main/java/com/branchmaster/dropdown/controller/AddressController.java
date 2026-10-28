package com.branchmaster.dropdown.controller;

import com.branchmaster.dropdown.dto.AddressOptionsDto;
import com.branchmaster.dropdown.service.DropdownService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/dropdown/addresses")
@RequiredArgsConstructor
public class AddressController {

    private final DropdownService service;

    @GetMapping
    public AddressOptionsDto getOptions() {
        return service.getAddressOptions();
    }
}