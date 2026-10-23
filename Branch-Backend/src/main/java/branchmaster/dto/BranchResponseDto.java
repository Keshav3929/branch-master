package branchmaster.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
public class BranchResponseDto {
    private Long id;
    private String branchCode;
    private String branchName;
    private String communicationName;
    private Long organizationId;
    private String branchType;
    private Long regionId;
    private Long countryId;
    private Long stateId;
    private Long cityId;
    private String area;
    private String zipCode;
    private String address1;
    private String address2;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private Long contactPerson;
    private String mobile;
    private String telephone;
    private String email;
    private String workingDays;
    private Long workingHoursId;
    private String departmentIds;
    private String serviceIds;
    private Boolean status;
    private String branchLogo;
    private String documentPath;
    private String remarks;
    private Long createdBy;
    @JsonFormat(pattern = "dd/MM/yyyy hh:mm a", locale = "en")
    private LocalDateTime createdAt;
    private Long updatedBy;
    @JsonFormat(pattern = "dd/MM/yyyy hh:mm a", locale = "en")
    private LocalDateTime updatedAt;
}