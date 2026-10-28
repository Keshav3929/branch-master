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
import lombok.extern.slf4j.Slf4j;
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

@Slf4j
@RequiredArgsConstructor
@Service
public class BranchService {

    private static final Long CURRENT_USER = 1L;
    private final BranchRepository branchRepository;
    private final BranchHistoryService branchHistoryService;
    private final BranchExcelService branchExcelService;
    private final EmailNotificationService emailNotificationService;
    private final NotificationService notificationService;

    private Branch getBranch(Long id) {
        return branchRepository.findById(id).orElseThrow(() -> new BranchException(BranchException.Type.NOT_FOUND));
    }

    private <T> T copy(Object source, T target) {
        BeanUtils.copyProperties(source, target);
        return target;
    }

    private BranchResponseDto toResponse(Branch branch) { return copy(branch, new BranchResponseDto()); }

    public Map<String, Long> counts(BranchSearchRequestDto r) {
        BranchSearchRequestDto scope = new BranchSearchRequestDto();
        scope.setCreatedDateFrom(r.getCreatedDateFrom());
        scope.setCreatedDateTo(r.getCreatedDateTo());
        long total = branchRepository.count(BranchSpecification.search(scope));
        scope.setStatus(true);
        long active = branchRepository.count(BranchSpecification.search(scope));
        return Map.of("total", total, "active", active, "inactive", total - active);
    }

    private void validateDuplicate(BranchRequestDto r) {
        if (branchRepository.existsByBranchCodeAndIdNot(r.getBranchCode(), r.getId()))
            throw new BranchException(BranchException.Type.CODE_EXISTS);
        if (branchRepository.existsByBranchNameAndOrganizationIdAndIdNot(r.getBranchName(), r.getOrganizationId(), r.getId()))
            throw new BranchException(BranchException.Type.NAME_EXISTS);
    }

    private void notifyChange(Branch saved, String operation) {
        BranchResponseDto details = toResponse(saved);
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                try {
                    notificationService.record(operation, details);
                } catch (RuntimeException e) {
                    log.warn("Could not record notification for {}: {}", details.getBranchCode(), e.getMessage());
                }
                emailNotificationService.sendNotification(operation, details);
            }
        });
    }

    @Transactional
    public List<BranchResponseDto> save(List<BranchRequestDto> requests) {
        BranchImportRowValidationDto result = branchExcelService.validateMultiple(requests);
        if (!result.getInvalidRows().isEmpty()) {
            throw new BranchException(result);
        }

        return requests.stream().map(request -> {
            boolean isNew = request.getId() == null;
            Branch branch = isNew ? new Branch() : getBranch(request.getId());
            boolean wasActive = !isNew && branch.isStatus();

            validateDuplicate(request);

            if (isNew) {
                copy(request, branch);
                branch.setCreatedBy(CURRENT_USER);
                branch.setCreatedAt(LocalDateTime.now());
            } else {
                BeanUtils.copyProperties(request, branch,
                        "id", "createdAt", "createdBy", "updatedAt", "updatedBy", "isDeleted");
                branch.setUpdatedBy(CURRENT_USER);
                branch.setUpdatedAt(LocalDateTime.now());
            }

            branch.setDeleted(!branch.isStatus());

            Branch saved = branchRepository.save(branch);
            String operation = isNew ? "CREATE" :
                    wasActive == saved.isStatus() ? "UPDATE" :
                    saved.isStatus() ? "ACTIVATE" : "DEACTIVATE";

            branchHistoryService.saveHistory(saved, operation);
            notifyChange(saved, operation);
            return toResponse(saved);
        }).toList();
    }

    public Page<BranchResponseDto> getAll(Pageable pageable) {
        return branchRepository.findAll(pageable).map(this::toResponse);
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

    public List<BranchHistoryDto> getHistory(Long branchId) { return branchHistoryService.getHistory(branchId); }

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
        return new BranchAnalyticsDto(counts.get("total"), counts.get("active"), counts.get("inactive"), regions, types, organizations, days);
    }
}