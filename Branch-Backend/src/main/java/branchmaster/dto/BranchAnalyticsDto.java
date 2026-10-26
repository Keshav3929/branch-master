
package branchmaster.dto;

import java.util.List;

public record BranchAnalyticsDto(
        long total,
        long active,
        long inactive,
        List<RegionStats> branchesByRegion,
        List<TypeStats> branchesByType,
        List<OrganizationStats> branchesByOrganization,
        List<MonthlyStats> monthlyCreations
) {
    public record RegionStats(String name, long active, long inactive) {}
    public record TypeStats(String name, long count) {}
    public record OrganizationStats(String name, long count) {}
    public record MonthlyStats(String month, long count) {}
}
