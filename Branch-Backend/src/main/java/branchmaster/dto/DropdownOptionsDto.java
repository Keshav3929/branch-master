
package branchmaster.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import java.util.List;

@Getter
@AllArgsConstructor
public class DropdownOptionsDto {

    private List<DropdownOptionDto> organizations;
    private List<String> branchTypes;
    private List<DropdownOptionDto> regions;
    private List<DropdownOptionDto> countries;
    private List<DropdownOptionDto> states;
    private List<DropdownOptionDto> cities;
    private List<DropdownOptionDto> contactPersons;
    private List<DropdownOptionDto> workingHours;

    @Getter
    @AllArgsConstructor
    public static class DropdownOptionDto {
        private Long id;
        private String name;
    }
}
