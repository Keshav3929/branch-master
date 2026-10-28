package branchmaster.service;

import branchmaster.client.DropdownClient;
import branchmaster.dto.DropdownOptionsDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DropdownService {

    private final DropdownClient dropdownClient;

    public DropdownOptionsDto getDropdownOptions() {
        var organizations = dropdownClient.getOrganizations();
        var locations = dropdownClient.getLocations();
        var addresses = dropdownClient.getAddresses();
        var contacts = dropdownClient.getContacts();

        return new DropdownOptionsDto(
                organizations.organizations(),
                organizations.branchTypes(),
                locations.regions(),
                locations.countries(),
                addresses.states(),
                addresses.cities(),
                contacts.contactPersons(),
                contacts.workingHours()
        );
    }
}