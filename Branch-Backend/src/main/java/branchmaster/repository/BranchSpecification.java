package branchmaster.repository;

import branchmaster.dto.BranchSearchRequestDto;
import branchmaster.entity.Branch;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;

public class BranchSpecification {

    public static Specification<Branch> search(BranchSearchRequestDto r) {
        return (root, query, cb) -> {
            List<Predicate> p = new ArrayList<>();

            if (StringUtils.hasText(r.getSearch())) {
                String s = r.getSearch().trim().toLowerCase();
                p.add(cb.or(
                        cb.equal(cb.lower(root.get("branchCode")), s),
                        cb.equal(cb.lower(root.get("branchName")), s)
                ));
            }

            if (StringUtils.hasText(r.getBranchCode()))
                p.add(cb.equal(cb.lower(root.get("branchCode")), r.getBranchCode().trim().toLowerCase()));

            if (StringUtils.hasText(r.getBranchName()))
                p.add(cb.equal(cb.lower(root.get("branchName")), r.getBranchName().trim().toLowerCase()));

            if (r.getBranchType() != null && !r.getBranchType().isEmpty())
                p.add(root.get("branchType").in(r.getBranchType()));

            addIds(p, root, "organizationId", r.getOrganizationId());
            addIds(p, root, "regionId", r.getRegionId());
            addIds(p, root, "countryId", r.getCountryId());

            if (r.getStatus() != null)
                p.add(cb.equal(root.get("status"), r.getStatus()));

            if (r.getCreatedDateFrom() != null)
                p.add(cb.greaterThanOrEqualTo(root.get("createdAt"), r.getCreatedDateFrom().atStartOfDay()));

            if (r.getCreatedDateTo() != null)
                p.add(cb.lessThan(root.get("createdAt"), r.getCreatedDateTo().plusDays(1).atStartOfDay()));

            return cb.and(p.toArray(new Predicate[0]));
        };
    }

    private static void addIds(List<Predicate> p, Root<Branch> root, String field, List<Long> ids) {
        if (ids != null && !ids.isEmpty())
            p.add(root.get(field).in(ids));
    }
}