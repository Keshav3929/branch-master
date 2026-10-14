package branchmaster.service;

import branchmaster.dto.*;
import branchmaster.entity.Branch;
import branchmaster.exception.BranchException;
import branchmaster.repository.BranchRepository;
import branchmaster.repository.BranchSpecification;
import org.springframework.beans.BeanUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class BranchService {

    private final BranchRepository branchRepository;
    private final BranchHistoryService branchHistoryService;
    private static final Long CURRENT_USER = 1L;

    public BranchService(BranchRepository branchRepository, BranchHistoryService branchHistoryService) {
        this.branchRepository = branchRepository;
        this.branchHistoryService = branchHistoryService;
    }

    private Branch getBranch(Long id) {
        return branchRepository.findById(id)
                .orElseThrow(() -> new BranchException(BranchException.Type.NOT_FOUND));
    }

    private <T> T copy(Object source, T target) {
        BeanUtils.copyProperties(source, target);
        return target;
    }

    private BranchResponseDto toResponse(Branch branch) {
        return copy(branch, new BranchResponseDto());
    }

    private void validateDuplicate(BranchRequestDto request, Long id) {
        boolean codeExists = id == null
                ? branchRepository.existsByBranchCode(request.getBranchCode())
                : branchRepository.existsByBranchCodeAndIdNot(request.getBranchCode(), id);

        boolean nameExists = id == null
                ? branchRepository.existsByBranchNameAndOrganizationId(
                request.getBranchName(), request.getOrganizationId())
                : branchRepository.existsByBranchNameAndOrganizationIdAndIdNot(
                request.getBranchName(), request.getOrganizationId(), id);

        if (codeExists) throw new BranchException(BranchException.Type.CODE_EXISTS);
        if (nameExists) throw new BranchException(BranchException.Type.NAME_EXISTS);
    }

    @Transactional
    public BranchResponseDto save(BranchRequestDto request) {
        validateDuplicate(request, null);

        Branch branch = copy(request, new Branch());
        branch.setCreatedBy(CURRENT_USER);
        branch.setCreatedAt(LocalDateTime.now());

        Branch saved = branchRepository.save(branch);
        branchHistoryService.saveHistory(saved, "CREATE");
        return toResponse(saved);
    }

    @Transactional
    public List<BranchResponseDto> saveMultiple(List<BranchRequestDto> requests) {
        if (requests == null || requests.isEmpty())
            throw new IllegalArgumentException("At least one branch is required");

        return requests.stream().map(this::save).toList();
    }

    public Page<BranchResponseDto> getAll(Pageable pageable) {
        return branchRepository.findAll(pageable).map(this::toResponse);
    }

    public BranchResponseDto getById(Long id) {
        return toResponse(getBranch(id));
    }

    @Transactional
    public BranchResponseDto update(BranchRequestDto request) {
        Branch branch = getBranch(request.getId());
        validateDuplicate(request, request.getId());
        BeanUtils.copyProperties(request, branch);

        branch.setDeleted(!branch.isStatus());
        branch.setUpdatedBy(CURRENT_USER);
        branch.setUpdatedAt(LocalDateTime.now());

        Branch saved = branchRepository.save(branch);
        branchHistoryService.saveHistory(saved, "UPDATE");
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
        return "Branch deactivated successfully";
    }

    public Page<BranchResponseDto> search(BranchSearchRequestDto request, Pageable pageable) {
        return branchRepository.findAll(BranchSpecification.search(request), pageable)
                .map(this::toResponse);
    }

    public List<BranchHistoryDto> getHistory(Long branchId) {
        return branchHistoryService.getHistory(branchId);
    }
}