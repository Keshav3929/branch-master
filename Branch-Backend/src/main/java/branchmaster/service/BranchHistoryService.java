package branchmaster.service;

import branchmaster.dto.BranchHistoryDto;
import branchmaster.entity.Branch;
import branchmaster.entity.BranchHistory;
import branchmaster.exception.BranchException;
import branchmaster.repository.BranchHistoryRepository;
import branchmaster.repository.BranchRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@RequiredArgsConstructor
@Service
public class BranchHistoryService {

    private final BranchHistoryRepository historyRepository;
    private final BranchRepository branchRepository;

    @Transactional
    public void saveHistory(Branch current, String action) {
        BranchHistory history = new BranchHistory();
        BeanUtils.copyProperties(current, history);
        history.setBranchId(current.getId());
        history.setAction(action);
        historyRepository.save(history);
    }

    @Transactional(readOnly = true)
    public List<BranchHistoryDto> getHistory(Long branchId) {
        if (!branchRepository.existsById(branchId))
            throw new BranchException(BranchException.Type.NOT_FOUND);

        return historyRepository.findByBranchIdOrderByUpdatedAtDesc(branchId)
                .stream().map(history -> {
                    BranchHistoryDto dto = new BranchHistoryDto();
                    BeanUtils.copyProperties(history, dto);
                    return dto;
                }).toList();
    }
}