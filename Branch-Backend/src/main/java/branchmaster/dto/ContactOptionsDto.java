package branchmaster.dto;

import java.util.List;

public record ContactOptionsDto(
        List<DropdownOptionsDto.DropdownOptionDto> contactPersons,
        List<DropdownOptionsDto.DropdownOptionDto> workingHours
) {}