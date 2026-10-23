
package branchmaster.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;
import java.util.List;

@Getter
@AllArgsConstructor
public class BranchImportRowValidationDto {

    private List<BranchImportRowDto> validRows;
    private List<BranchImportRowDto> invalidRows;

    @Getter
    @Setter
    public static class BranchImportRowDto {
        private int row;
        private BranchRequestDto data;
        private List<String> errors;

        public BranchImportRowDto(int row, BranchRequestDto data, List<String> errors) {
            this.row = row;
            this.data = data;
            this.errors = errors;
        }
    }
}
