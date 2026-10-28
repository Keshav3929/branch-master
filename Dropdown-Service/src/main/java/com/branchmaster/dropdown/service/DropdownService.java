
package com.branchmaster.dropdown.service;

import com.branchmaster.dropdown.dto.AddressOptionsDto;
import com.branchmaster.dropdown.dto.ContactOptionsDto;
import com.branchmaster.dropdown.dto.DropdownOptionDto;
import com.branchmaster.dropdown.dto.LocationOptionsDto;
import com.branchmaster.dropdown.dto.OrganizationOptionsDto;
import com.branchmaster.dropdown.entity.BranchType;
import com.branchmaster.dropdown.entity.Organization;
import com.branchmaster.dropdown.repository.BranchTypeRepository;
import com.branchmaster.dropdown.repository.CityRepository;
import com.branchmaster.dropdown.repository.ContactPersonRepository;
import com.branchmaster.dropdown.repository.CountryRepository;
import com.branchmaster.dropdown.repository.OrganizationRepository;
import com.branchmaster.dropdown.repository.RegionRepository;
import com.branchmaster.dropdown.repository.StateRepository;
import com.branchmaster.dropdown.repository.WorkingHoursRepository;
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

    public OrganizationOptionsDto getOrganizationOptions() {
        return new OrganizationOptionsDto(
                organizationRepository.findAll().stream()
                        .filter(Organization::isActive)
                        .map(o -> new DropdownOptionDto(o.getId(), o.getName()))
                        .toList(),
                branchTypeRepository.findAll().stream()
                        .map(BranchType::getName).toList()
        );
    }

    public LocationOptionsDto getLocationOptions() {
        return new LocationOptionsDto(
                regionRepository.findAll().stream()
                        .map(o -> new DropdownOptionDto(o.getId(), o.getName()))
                        .toList(),
                countryRepository.findAll().stream()
                        .map(o -> new DropdownOptionDto(o.getId(), o.getName()))
                        .toList()
        );
    }

    public AddressOptionsDto getAddressOptions() {
        return new AddressOptionsDto(
                stateRepository.findAll().stream()
                        .map(o -> new DropdownOptionDto(o.getId(), o.getName()))
                        .toList(),
                cityRepository.findAll().stream()
                        .map(o -> new DropdownOptionDto(o.getId(), o.getName()))
                        .toList()
        );
    }

    public ContactOptionsDto getContactOptions() {
        return new ContactOptionsDto(
                contactPersonRepository.findAll().stream()
                        .map(o -> new DropdownOptionDto(o.getId(), o.getName()))
                        .toList(),
                workingHoursRepository.findAll().stream()
                        .map(o -> new DropdownOptionDto(o.getId(), o.getName()))
                        .toList()
        );
    }
}
