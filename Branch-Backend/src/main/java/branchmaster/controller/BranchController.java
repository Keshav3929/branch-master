package branchmaster.controller;

import branchmaster.dto.BranchAnalyticsDto;
import branchmaster.dto.BranchHistoryDto;
import branchmaster.dto.BranchRequestDto;
import branchmaster.dto.BranchResponseDto;
import branchmaster.dto.BranchSearchRequestDto;
import branchmaster.dto.DropdownOptionsDto;
import branchmaster.dto.NotificationDto;
import branchmaster.service.BranchExcelService;
import branchmaster.service.BranchService;
import branchmaster.service.DropdownService;
import branchmaster.service.NotificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@CrossOrigin(origins = "http://localhost:5173")
@RequestMapping
@RequiredArgsConstructor
public class BranchController {
    private final BranchService branchService;
    private final BranchExcelService branchExcelService;
    private final DropdownService dropdownService;
    private final NotificationService notificationService;

    @PostMapping("branch/save-multiple")
    public ResponseEntity<?> saveMultiple(
            @Valid @RequestBody List<@Valid BranchRequestDto> requests,
            @RequestParam(defaultValue = "false") boolean validateOnly) {
        return ResponseEntity.ok(validateOnly ? branchExcelService.validateMultiple(requests) : branchService.saveMultiple(requests));
    }

    @GetMapping("branch/list")
    public Page<BranchResponseDto> getAll(Pageable pageable) {
        return branchService.getAll(pageable);
    }

    @PutMapping("branch/update")
    public BranchResponseDto update(@Valid @RequestBody BranchRequestDto request) {
        return branchService.update(request);
    }

    @DeleteMapping("branch/delete/{id}")
    public String deleteById(@PathVariable Long id) {
        return branchService.deleteById(id);
    }

    @GetMapping("branch/search")
    public Page<BranchResponseDto> search(
            BranchSearchRequestDto request,
            @PageableDefault(size = 10) Pageable pageable) {
        return branchService.search(request, pageable);
    }

    @GetMapping("branch/counts")
    public Map<String, Long> counts(BranchSearchRequestDto request) {
        return branchService.counts(request);
    }

    @GetMapping("branch/history/{branchId}")
    public List<BranchHistoryDto> getHistory(@PathVariable Long branchId) {
        return branchService.getHistory(branchId);
    }

    @GetMapping("branch/template")
    public ResponseEntity<byte[]> downloadTemplate() throws IOException {
        return branchExcelService.downloadTemplate();
    }

    @GetMapping("branch/dropdown-options")
    public DropdownOptionsDto getDropdownOptions() {
        return dropdownService.getDropdownOptions();
    }

    @GetMapping("notifications")
    public Page<NotificationDto> listNotifications(
            @PageableDefault(size = 5, sort = "createdAt",
                    direction = Sort.Direction.DESC) Pageable pageable) {
        return notificationService.list(pageable);
    }

    @PutMapping("notifications/{id}/seen")
    public void markSeen(@PathVariable Long id) { notificationService.markSeen(id); }

    @PutMapping("notifications/seen-all")
    public void markAllSeen() {
        notificationService.markAllSeen();
    }

    @GetMapping("notifications/unread-count")
    public long unreadCount() { return notificationService.unreadCount(); }

    @GetMapping("branch/analytics")
    public BranchAnalyticsDto getAnalytics() {return branchService.getAnalytics();}

}