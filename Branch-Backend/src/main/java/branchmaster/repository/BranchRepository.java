package branchmaster.repository;

import branchmaster.entity.Branch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface BranchRepository extends JpaRepository<Branch, Long>,
        JpaSpecificationExecutor<Branch> {

    boolean existsByBranchCode(String branchCode);

    boolean existsByBranchNameAndOrganizationId(String branchName, Long organizationId);

    boolean existsByBranchCodeAndIdNot(String branchCode, Long id);

    boolean existsByBranchNameAndOrganizationIdAndIdNot(
            String branchName, Long organizationId, Long id
    );
}