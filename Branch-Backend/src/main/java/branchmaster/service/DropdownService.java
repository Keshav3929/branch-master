
package branchmaster.service;

import branchmaster.dto.DropdownOptionsDto;
import branchmaster.dto.DropdownOptionsDto.DropdownOptionDto;
import branchmaster.entity.*;
import branchmaster.repository.DropdownRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DropdownService {

    private final DropdownRepository dropdownRepository;

    public DropdownOptionsDto getDropdownOptions() {
        return new DropdownOptionsDto(
                dropdownRepository.findAll(Organization.class).stream()
                        .filter(Organization::isActive)
                        .map(o -> new DropdownOptionDto(o.getId(), o.getName())).toList(),
                dropdownRepository.findAll(BranchType.class).stream()
                        .map(BranchType::getName).toList(),
                dropdownRepository.findAll(Region.class).stream()
                        .map(o -> new DropdownOptionDto(o.getId(), o.getName())).toList(),
                dropdownRepository.findAll(Country.class).stream()
                        .map(o -> new DropdownOptionDto(o.getId(), o.getName())).toList(),
                dropdownRepository.findAll(State.class).stream()
                        .map(o -> new DropdownOptionDto(o.getId(), o.getName())).toList(),
                dropdownRepository.findAll(City.class).stream()
                        .map(o -> new DropdownOptionDto(o.getId(), o.getName())).toList(),
                dropdownRepository.findAll(ContactPerson.class).stream()
                        .map(o -> new DropdownOptionDto(o.getId(), o.getName())).toList(),
                dropdownRepository.findAll(WorkingHours.class).stream()
                        .map(o -> new DropdownOptionDto(o.getId(), o.getName())).toList()
        );
    }
}
