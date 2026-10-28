package branchmaster.service;

import branchmaster.dto.DropdownOptionsDto;
import branchmaster.dto.DropdownOptionsDto.DropdownOptionDto;
import branchmaster.entity.BranchType;
import branchmaster.entity.Organization;
import branchmaster.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DropdownService {

    private final OrganizationRepository organizationRepository;
    private final BranchTypeRepository branchTypeRepository;
    private final RegionRepository regionRepository;
    private final CountryRepository countryRepository;
    private final StateRepository stateRepository;
    private final CityRepository cityRepository;
    private final ContactPersonRepository contactPersonRepository;
    private final WorkingHoursRepository workingHoursRepository;

    public DropdownOptionsDto getDropdownOptions() {
        return new DropdownOptionsDto(
                organizationRepository.findAll().stream()
                        .filter(Organization::isActive)
                        .map(o -> new DropdownOptionDto(o.getId(), o.getName()))
                        .toList(),

                branchTypeRepository.findAll().stream()
                        .map(BranchType::getName).toList(),

                regionRepository.findAll().stream()
                        .map(o -> new DropdownOptionDto(o.getId(), o.getName()))
                        .toList(),

                countryRepository.findAll().stream()
                        .map(o -> new DropdownOptionDto(o.getId(), o.getName()))
                        .toList(),

                stateRepository.findAll().stream()
                        .map(o -> new DropdownOptionDto(o.getId(), o.getName()))
                        .toList(),

                cityRepository.findAll().stream()
                        .map(o -> new DropdownOptionDto(o.getId(), o.getName()))
                        .toList(),

                contactPersonRepository.findAll().stream()
                        .map(o -> new DropdownOptionDto(o.getId(), o.getName()))
                        .toList(),

                workingHoursRepository.findAll().stream()
                        .map(o -> new DropdownOptionDto(o.getId(), o.getName()))
                        .toList()
        );
    }
}
