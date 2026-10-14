package branchmaster.controller;

import branchmaster.dto.BranchHistoryDto;
import branchmaster.dto.BranchRequestDto;
import branchmaster.dto.BranchResponseDto;
import branchmaster.dto.BranchSearchRequestDto;
import branchmaster.service.BranchService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@CrossOrigin(origins = "http://localhost:5173")
@RequestMapping("branch")
public class BranchController {

    @Autowired
    private BranchService branchService;

    @PostMapping("save")
    public BranchResponseDto save(@Valid @RequestBody BranchRequestDto request) {
        return branchService.save(request);
    }

    @PostMapping("save-multiple")
    public List<BranchResponseDto> saveMultiple(
            @RequestBody @Valid List<@Valid BranchRequestDto> requests) {
        return branchService.saveMultiple(requests);
    }

    @GetMapping("/list")
    public Page<BranchResponseDto> getAll(Pageable pageable) {
        return branchService.getAll(pageable);
    }

    @GetMapping("{id}")
    public BranchResponseDto getById(@PathVariable Long id) {
        return branchService.getById(id);
    }

    @PutMapping("update")
    public BranchResponseDto update(@Valid @RequestBody BranchRequestDto request) {
        return branchService.update(request);
    }

    @DeleteMapping("delete/{id}")
    public String deleteById(@PathVariable Long id) {
        return branchService.deleteById(id);
    }

    @PostMapping("/search")
    public Page<BranchResponseDto> search(
            @RequestBody BranchSearchRequestDto request,
            @PageableDefault(size = 10) Pageable pageable) {
        return branchService.search(request, pageable);
    }

    @GetMapping("history/{branchId}")
    public List<BranchHistoryDto> getHistory(@PathVariable Long branchId) {
        return branchService.getHistory(branchId);
    }
}