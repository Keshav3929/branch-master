package branchmaster.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Table(name = "branch_notification")
@Getter
@Setter
@NoArgsConstructor
public class BranchNotification {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 20)
    private String operation;

    private Long branchId;

    @Column(length = 20)
    private String branchCode;

    @Column(length = 200)
    private String branchName;

    @Column(nullable = false, length = 500)
    private String message;

    @Column(nullable = false)
    private boolean seen;

    @Column(nullable = false)
    private LocalDateTime createdAt;
}