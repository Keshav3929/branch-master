package branchmaster.repository;

import branchmaster.entity.BranchHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface BranchHistoryRepository extends JpaRepository<BranchHistory, Long> {
    List<BranchHistory> findByBranchIdOrderByUpdatedAtDesc(Long branchId);
}