package branchmaster.service;

import branchmaster.dto.BranchResponseDto;
import branchmaster.dto.NotificationDto;
import branchmaster.entity.BranchNotification;
import branchmaster.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class NotificationService {
    private final NotificationRepository repository;

    @Transactional
    public void record(String operation, BranchResponseDto branch) {
        BranchNotification n = new BranchNotification();
        n.setOperation(operation);
        n.setBranchId(branch.getId());
        n.setBranchCode(branch.getBranchCode());
        n.setBranchName(branch.getBranchName());
        n.setMessage("Branch " + branch.getBranchCode() + " (" + branch.getBranchName() + ") was " + verb(operation));
        n.setCreatedAt(LocalDateTime.now());
        repository.save(n);
    }

    @Transactional(readOnly = true)
    public Page<NotificationDto> list(Pageable pageable) {
        return repository.findAll(pageable).map(NotificationDto::from);
    }

    @Transactional(readOnly = true)
    public long unreadCount() { return repository.countBySeenFalse(); }

    @Transactional
    public void markSeen(Long id) {
        repository.findById(id).ifPresent(n -> n.setSeen(true));
    }

    @Transactional
    public void markAllSeen() {
        repository.markAllSeen();
    }

    private static String verb(String operation) {
        return switch (operation) {
            case "CREATE" -> "created";
            case "UPDATE" -> "updated";
            case "ACTIVATE" -> "activated";
            case "DEACTIVATE" -> "deactivated";
            case "DELETE" -> "deleted";
            default -> operation.toLowerCase();
        };
    }
}