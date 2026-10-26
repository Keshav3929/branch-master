package branchmaster.repository;

import branchmaster.entity.Branch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface BranchRepository extends JpaRepository<Branch, Long>,
        JpaSpecificationExecutor<Branch> {

    boolean existsByBranchCode(String branchCode);

    boolean existsByBranchNameAndOrganizationId(String branchName, Long organizationId);

    boolean existsByBranchCodeAndIdNot(String branchCode, Long id);

    boolean existsByBranchNameAndOrganizationIdAndIdNot(
            String branchName, Long organizationId, Long id
    );

    @Query("""
    SELECT r.name, 
           SUM(CASE WHEN b.status = true THEN 1 ELSE 0 END),
           SUM(CASE WHEN b.status = false THEN 1 ELSE 0 END)
    FROM Branch b JOIN Region r ON r.id = b.regionId
    WHERE b.isDeleted = false
    GROUP BY r.name
    """)
    List<Object[]> countByRegion();

    @Query("""
    SELECT b.branchType, COUNT(b)
    FROM Branch b
    WHERE b.isDeleted = false
    GROUP BY b.branchType
    """)
    List<Object[]> countByBranchType();

    @Query("""
    SELECT o.name, COUNT(b)
    FROM Branch b JOIN Organization o ON o.id = b.organizationId
    WHERE b.isDeleted = false
    GROUP BY o.name
    """)
    List<Object[]> countByOrganization();

    @Query(value = """
    SELECT DATE_FORMAT(created_at, '%Y-%m-%d'), COUNT(*)
    FROM branch
    WHERE created_at IS NOT NULL
      AND is_deleted = false
    GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
    ORDER BY DATE_FORMAT(created_at, '%Y-%m-%d')
    """, nativeQuery = true)
    List<Object[]> countByCreationDay();

}