package branchmaster.dto;

import lombok.Getter;
import lombok.Setter;
import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
public class BranchSearchRequestDto {
    private String search;
    private String branchCode;
    private String branchName;
    private List<Long> organizationId;
    private List<Long> regionId;
    private List<Long> countryId;
    private List<String> branchType;
    private Boolean status;
    private LocalDate createdDateFrom;
    private LocalDate createdDateTo;
}