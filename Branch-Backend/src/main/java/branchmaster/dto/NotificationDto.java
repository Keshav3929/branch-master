package branchmaster.dto;

import branchmaster.entity.BranchNotification;
import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.LocalDateTime;

public record NotificationDto(Long id,
                              String operation,
                              Long branchId,
                              String branchCode,
                              String branchName,
                              String message,
                              boolean seen,
                              @JsonFormat(pattern = "dd/MM/yyyy hh:mm a", locale = "en")
                              LocalDateTime createdAt) {
    public static NotificationDto from(BranchNotification n) {
        return new NotificationDto(n.getId(), n.getOperation(), n.getBranchId(), n.getBranchCode(),
                n.getBranchName(), n.getMessage(), n.isSeen(), n.getCreatedAt());
    }
}