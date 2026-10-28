package branchmaster.dto;

import java.util.List;

public record LocationOptionsDto(
        List<DropdownOptionsDto.DropdownOptionDto> regions,
        List<DropdownOptionsDto.DropdownOptionDto> countries
) {}