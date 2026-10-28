package com.branchmaster.dropdown.dto;

import java.util.List;

public record LocationOptionsDto(
        List<DropdownOptionDto> regions,
        List<DropdownOptionDto> countries
) {}