package com.branchmaster.dropdown.dto;

import java.util.List;

public record AddressOptionsDto(
        List<DropdownOptionDto> states,
        List<DropdownOptionDto> cities
) {}