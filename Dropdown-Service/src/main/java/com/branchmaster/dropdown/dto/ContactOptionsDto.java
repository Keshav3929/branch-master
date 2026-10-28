package com.branchmaster.dropdown.dto;

import java.util.List;

public record ContactOptionsDto(
        List<DropdownOptionDto> contactPersons,
        List<DropdownOptionDto> workingHours
) {}