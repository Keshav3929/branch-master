package branchmaster.service;

import branchmaster.dto.BranchAnalyticsDto;
import branchmaster.dto.BranchHistoryDto;
import branchmaster.dto.BranchImportRowValidationDto;
import branchmaster.dto.BranchRequestDto;
import branchmaster.dto.BranchResponseDto;
import branchmaster.dto.BranchSearchRequestDto;
import branchmaster.entity.Branch;
import branchmaster.exception.BranchException;
import branchmaster.repository.BranchRepository;
import branchmaster.repository.BranchSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RequiredArgsConstructor
@Service
public class BranchService {

    private static final Long CURRENT_USER = 1L;
    private final BranchRepository branchRepository;
    private final BranchHistoryService branchHistoryService;
    private final BranchExcelService branchExcelService; // batch validation only
    private final EmailNotificationService emailNotificationService;
    private final NotificationService notificationService;

    private Branch getBranch(Long id) {
        return branchRepository.findById(id).orElseThrow(() -> new BranchException(BranchException.Type.NOT_FOUND));
    }

    private <T> T copy(Object source, T target) {
        BeanUtils.copyProperties(source, target);
        return target;
    }

    private BranchResponseDto toResponse(Branch branch) {
        return copy(branch, new BranchResponseDto());
    }

    public Map<String, Long> counts(BranchSearchRequestDto r) {
        BranchSearchRequestDto scope = new BranchSearchRequestDto();
        scope.setCreatedDateFrom(r.getCreatedDateFrom());
        scope.setCreatedDateTo(r.getCreatedDateTo());
        long total = branchRepository.count(BranchSpecification.search(scope));
        scope.setStatus(true);
        long active = branchRepository.count(BranchSpecification.search(scope));
        return Map.of("total", total, "active", active, "inactive", total - active);
    }

    private void validateDuplicate(BranchRequestDto request, Long id) {
        boolean codeExists = id == null ? branchRepository.existsByBranchCode(request.getBranchCode()) : branchRepository.existsByBranchCodeAndIdNot(request.getBranchCode(), id);
        boolean nameExists = id == null
                ? branchRepository.existsByBranchNameAndOrganizationId(request.getBranchName(), request.getOrganizationId())
                : branchRepository.existsByBranchNameAndOrganizationIdAndIdNot(request.getBranchName(), request.getOrganizationId(), id);
        if (codeExists) throw new BranchException(BranchException.Type.CODE_EXISTS);
        if (nameExists) throw new BranchException(BranchException.Type.NAME_EXISTS);
    }

    private void notifyChange(Branch saved, String operation) {
        BranchResponseDto details = toResponse(saved);
        notificationService.record(operation, details);
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {emailNotificationService.sendNotification(operation, details);}
        });
    }

    private BranchResponseDto saveOne(BranchRequestDto request) {
        validateDuplicate(request, null);

        Branch branch = copy(request, new Branch());
        branch.setCreatedBy(CURRENT_USER);
        branch.setCreatedAt(LocalDateTime.now());

        Branch saved = branchRepository.save(branch);
        branchHistoryService.saveHistory(saved, "CREATE");
        notifyChange(saved, "CREATE");
        return toResponse(saved);
    }

    @Transactional
    public List<BranchResponseDto> saveMultiple(List<BranchRequestDto> requests) {
        BranchImportRowValidationDto result = branchExcelService.validateMultiple(requests);
        if (!result.getInvalidRows().isEmpty())
            throw new BranchException(result);
        return requests.stream().map(this::saveOne).toList();
    }

    public Page<BranchResponseDto> getAll(Pageable pageable) {return branchRepository.findAll(pageable).map(this::toResponse);}

    @Transactional
    public BranchResponseDto update(BranchRequestDto request) {
        Branch branch = getBranch(request.getId());
        boolean wasActive = branch.isStatus();

        validateDuplicate(request, request.getId());
        BeanUtils.copyProperties(request, branch);

        branch.setDeleted(!branch.isStatus());
        branch.setUpdatedBy(CURRENT_USER);
        branch.setUpdatedAt(LocalDateTime.now());

        Branch saved = branchRepository.save(branch);
        branchHistoryService.saveHistory(saved, "UPDATE");

        String operation = wasActive == saved.isStatus() ? "UPDATE" : saved.isStatus() ? "ACTIVATE" : "DEACTIVATE";
        notifyChange(saved, operation);
        return toResponse(saved);
    }

    @Transactional
    public String deleteById(Long id) {
        Branch branch = getBranch(id);
        branch.setStatus(false);
        branch.setDeleted(true);
        branch.setUpdatedBy(CURRENT_USER);
        branch.setUpdatedAt(LocalDateTime.now());

        Branch saved = branchRepository.save(branch);
        branchHistoryService.saveHistory(saved, "DELETE");
        notifyChange(saved, "DELETE");
        return "Branch deactivated successfully";
    }

    public Page<BranchResponseDto> search(BranchSearchRequestDto request, Pageable pageable) {
        return branchRepository.findAll(BranchSpecification.search(request), pageable).map(this::toResponse);
    }

    public List<BranchHistoryDto> getHistory(Long branchId) {
        return branchHistoryService.getHistory(branchId);
    }

    public BranchAnalyticsDto getAnalytics() {
        var regions = branchRepository.countByRegion().stream().map(row -> new BranchAnalyticsDto.RegionStats(
                        (String) row[0], ((Number) row[1]).longValue(), ((Number) row[2]).longValue())).toList();
        var types = branchRepository.countByBranchType().stream().map(row -> new BranchAnalyticsDto.TypeStats(
                        (String) row[0], ((Number) row[1]).longValue())).toList();
        var organizations = branchRepository.countByOrganization().stream().map(row -> new BranchAnalyticsDto.OrganizationStats(
                        (String) row[0], ((Number) row[1]).longValue())).toList();
        var days = branchRepository.countByCreationDay().stream().map(row -> new BranchAnalyticsDto.MonthlyStats(
                        row[0].toString(), ((Number) row[1]).longValue())).toList();
        Map<String, Long> counts = counts(new BranchSearchRequestDto());

        return new BranchAnalyticsDto( counts.get("total"), counts.get("active"), counts.get("inactive"), regions, types, organizations, days);
    }

}