package com.branchmaster.dropdown.dto;

import java.util.List;

public record OrganizationOptionsDto(
        List<DropdownOptionDto> organizations,
        List<String> branchTypes
) {}