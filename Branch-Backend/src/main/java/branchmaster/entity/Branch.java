package branchmaster.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Entity
public class Branch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 20, nullable = false, unique = true)
    private String branchCode;

    @Column(length = 200, nullable = false)
    private String branchName;

    @Column(length = 200)
    private String communicationName;

    @Column(nullable = false)
    private Long organizationId;

    @Column(length = 50, nullable = false)
    private String branchType;

    @Column(nullable = false)
    private Long regionId;

    @Column(nullable = false)
    private Long countryId;

    @Column(nullable = false)
    private Long stateId;

    @Column(nullable = false)
    private Long cityId;

    @Column(length = 150)
    private String area;

    @Column(length = 10)
    private String zipCode;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String address1;

    @Column(columnDefinition = "TEXT")
    private String address2;

    @Column(precision = 10, scale = 6)
    private BigDecimal latitude;

    @Column(precision = 10, scale = 6)
    private BigDecimal longitude;

    private Long contactPerson;

    @Column(length = 15)
    private String mobile;

    @Column(length = 20)
    private String telephone;

    @Column(length = 150)
    private String email;

    @Column(length = 100)
    private String workingDays;

    private Long workingHoursId;

    @Column(columnDefinition = "JSON")
    private String departmentIds;

    @Column(columnDefinition = "JSON")
    private String serviceIds;

    private boolean status;
    private String branchLogo;
    private String documentPath;

    @Column(columnDefinition = "TEXT")
    private String remarks;

    private Long createdBy;
    private LocalDateTime createdAt;
    private Long updatedBy;
    private LocalDateTime updatedAt;
    private boolean isDeleted;
}