package com.branchmaster.dropdown.controller;

import com.branchmaster.dropdown.dto.ContactOptionsDto;
import com.branchmaster.dropdown.service.DropdownService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/dropdown/contacts")
@RequiredArgsConstructor
public class ContactController {

    private final DropdownService service;

    @GetMapping
    public ContactOptionsDto getOptions() {
        return service.getContactOptions();
    }
}