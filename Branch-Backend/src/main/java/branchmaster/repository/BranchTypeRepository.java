package branchmaster.repository;

import branchmaster.entity.BranchType;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BranchTypeRepository extends JpaRepository<BranchType, Long> {
}
