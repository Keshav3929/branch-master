package branchmaster.client;

import branchmaster.dto.AddressOptionsDto;
import branchmaster.dto.ContactOptionsDto;
import branchmaster.dto.LocationOptionsDto;
import branchmaster.dto.OrganizationOptionsDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;

@FeignClient(name = "dropdown-service", url = "${services.dropdown.url}")
public interface DropdownClient {

    @GetMapping("/dropdown/organizations")
    OrganizationOptionsDto getOrganizations();

    @GetMapping("/dropdown/locations")
    LocationOptionsDto getLocations();

    @GetMapping("/dropdown/addresses")
    AddressOptionsDto getAddresses();

    @GetMapping("/dropdown/contacts")
    ContactOptionsDto getContacts();
}