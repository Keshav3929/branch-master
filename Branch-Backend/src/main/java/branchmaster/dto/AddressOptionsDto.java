package branchmaster.dto;

import java.util.List;

public record AddressOptionsDto(
        List<DropdownOptionsDto.DropdownOptionDto> states,
        List<DropdownOptionsDto.DropdownOptionDto> cities
) {}