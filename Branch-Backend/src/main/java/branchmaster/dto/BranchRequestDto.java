package branchmaster.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;

@Getter
@Setter
public class BranchRequestDto {
    private Long id;

    @NotBlank(message = "Branch code is mandatory")
    @Size(max = 20, message = "Branch code must not exceed 20 characters")
    @Pattern(regexp = "^[a-zA-Z0-9]+$", message = "Branch code must contain only letters and numbers")
    private String branchCode;

    @NotBlank(message = "Branch name is mandatory")
    @Size(max = 200, message = "Branch name must not exceed 200 characters")
    @Pattern(regexp = "^[a-zA-Z0-9 ]+$", message = "Branch name must contain only letters, numbers, and spaces")
    private String branchName;

    @Size(max = 200, message = "Communication name must not exceed 200 characters")
    private String communicationName;

    @NotNull(message = "Organization is mandatory")
    private Long organizationId;

    @NotBlank(message = "Branch type is mandatory")
    @Size(max = 50, message = "Branch type must not exceed 50 characters")
    private String branchType;

    @NotNull(message = "Region is mandatory")
    private Long regionId;

    @NotNull(message = "Country is mandatory")
    private Long countryId;

    @NotNull(message = "State is mandatory")
    private Long stateId;

    @NotNull(message = "City is mandatory")
    private Long cityId;

    @Size(max = 150, message = "Area must not exceed 150 characters")
    private String area;

    @Size(max = 10, message = "Zip code must not exceed 10 characters")
    @Pattern(regexp = "^[0-9]*$", message = "Zip code must contain only numbers")
    private String zipCode;

    @NotBlank(message = "Address is mandatory")
    @Size(max = 500, message = "Address must not exceed 500 characters")
    private String address1;

    @Size(max = 500, message = "Address 2 must not exceed 500 characters")
    private String address2;

    @DecimalMin(value = "-90.0", message = "Latitude must be between -90 and 90")
    @DecimalMax(value = "90.0", message = "Latitude must be between -90 and 90")
    private BigDecimal latitude;

    @DecimalMin(value = "-180.0", message = "Longitude must be between -180 and 180")
    @DecimalMax(value = "180.0", message = "Longitude must be between -180 and 180")
    private BigDecimal longitude;

    private Long contactPerson;

    @Pattern(regexp = "^([6-9][0-9]{9})?$", message = "Mobile number must be 10 digits and start with 6, 7, 8, or 9")
    private String mobile;

    @Size(max = 20, message = "Telephone must not exceed 20 characters")
    @Pattern(regexp = "^[0-9]*$", message = "Telephone must contain only numbers")
    private String telephone;

    @Email(message = "Please provide a valid email address")
    @Size(max = 150, message = "Email must not exceed 150 characters")
    private String email;

    @Size(max = 100, message = "Working days must not exceed 100 characters")
    private String workingDays;

    private Long workingHoursId;
    private String departmentIds;
    private String serviceIds;

    @NotNull(message = "Status is mandatory")
    private Boolean status;

    @Size(max = 255, message = "Branch logo path must not exceed 255 characters")
    private String branchLogo;

    @Size(max = 255, message = "Document path must not exceed 255 characters")
    private String documentPath;

    @Size(max = 1000, message = "Remarks must not exceed 1000 characters")
    private String remarks;
}