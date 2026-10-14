package branchmaster.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "branch_history")
public class BranchHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long historyId;

    private Long branchId;
    private String action;

    @Column(length = 20)
    private String branchCode;

    @Column(length = 200)
    private String branchName;

    @Column(length = 200)
    private String communicationName;

    private Long organizationId;
    private String branchType;
    private Long regionId;
    private Long countryId;
    private Long stateId;
    private Long cityId;
    private String area;
    private String zipCode;

    @Column(columnDefinition = "TEXT")
    private String address1;

    @Column(columnDefinition = "TEXT")
    private String address2;

    @Column(precision = 10, scale = 6)
    private BigDecimal latitude;

    @Column(precision = 10, scale = 6)
    private BigDecimal longitude;

    private Long contactPerson;
    private String mobile;
    private String telephone;
    private String email;
    private String workingDays;
    private Long workingHoursId;

    @Column(columnDefinition = "JSON")
    private String departmentIds;

    @Column(columnDefinition = "JSON")
    private String serviceIds;

    private Boolean status;
    private String branchLogo;
    private String documentPath;

    @Column(columnDefinition = "TEXT")
    private String remarks;

    private Long createdBy;
    private LocalDateTime createdAt;
    private Long updatedBy;
    private LocalDateTime updatedAt;
}