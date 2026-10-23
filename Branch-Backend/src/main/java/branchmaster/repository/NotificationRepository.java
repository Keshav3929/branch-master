package branchmaster.repository;

import branchmaster.entity.BranchNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface NotificationRepository extends JpaRepository<BranchNotification, Long> {
    long countBySeenFalse();

    @Modifying(clearAutomatically = true)
    @Query("update BranchNotification n set n.seen = true where n.seen = false")
    void markAllSeen();
}