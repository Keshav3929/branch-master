package branchmaster.service;

import branchmaster.dto.BranchImportRowValidationDto;
import branchmaster.dto.BranchImportRowValidationDto.BranchImportRowDto;
import branchmaster.dto.BranchRequestDto;
import branchmaster.exception.BranchException;
import branchmaster.repository.BranchRepository;
import jakarta.validation.Validator;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.*;

@Service
@RequiredArgsConstructor
public class BranchExcelService {

    private static final String[] HEADERS = {
            "Branch Code*", "Branch Name*", "Communication Name",
            "Organization*", "Branch Type*", "Region*", "Country*", "State*", "City*",
            "Area", "Zip Code", "Address Line 1*", "Address Line 2",
            "Latitude", "Longitude", "Contact Person", "Mobile Number", "Telephone",
            "Email ID", "Working Days", "Working Hours", "Departments", "Services",
            "Status*", "Branch Logo", "Supporting Documents", "Remarks"
    };

    private final BranchRepository branchRepository;
    private final Validator validator;

    public ResponseEntity<byte[]> downloadTemplate() throws IOException {
        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("Branch Template");
            Row headerRow = sheet.createRow(0);

            CellStyle style = workbook.createCellStyle();
            Font font = workbook.createFont();
            font.setBold(true);
            style.setFont(font);

            for (int i = 0; i < HEADERS.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(HEADERS[i]);
                cell.setCellStyle(style);
                sheet.setColumnWidth(i, 20 * 256);
            }
            workbook.write(output);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=branch-template.xlsx")
                    .contentType(MediaType.parseMediaType(
                            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(output.toByteArray());
        }
    }

    public BranchImportRowValidationDto validateMultiple(List<BranchRequestDto> requests) {
        if (requests == null || requests.isEmpty())
            throw new BranchException(BranchException.Type.INVALID_ROW);

        List<BranchImportRowDto> valid = new ArrayList<>();
        List<BranchImportRowDto> invalid = new ArrayList<>();
        Set<String> codes = new HashSet<>();
        Set<String> names = new HashSet<>();

        for (int i = 0; i < requests.size(); i++) {
            BranchRequestDto request = requests.get(i);
            List<String> errors = new ArrayList<>();

            if (request == null) {
                errors.add("Row: Record is empty");
            } else {
                validator.validate(request).forEach(v ->
                        errors.add(v.getPropertyPath() + ": " + v.getMessage()));
                checkDuplicates(request, codes, names, errors);
            }
            (errors.isEmpty() ? valid : invalid).add(new BranchImportRowDto(i + 3, request, errors));
        }
        return new BranchImportRowValidationDto(valid, invalid);
    }

    private void checkDuplicates(BranchRequestDto r, Set<String> codes, Set<String> names, List<String> errors) {
        String code = r.getBranchCode() == null ? "" : r.getBranchCode().trim();
        String name = r.getBranchName() == null ? "" : r.getBranchName().trim();
        Long org = r.getOrganizationId();

        if (!code.isEmpty()) {
            if (!codes.add(code.toLowerCase(Locale.ROOT)))
                errors.add("branchCode: Duplicate Branch Code in uploaded file");
            if (branchRepository.existsByBranchCode(code))
                errors.add("branchCode: Branch Code already exists");
        }
        if (!name.isEmpty() && org != null) {
            if (!names.add(org + "|" + name.toLowerCase(Locale.ROOT)))
                errors.add("branchName: Duplicate Branch Name within the same Organization");
            if (branchRepository.existsByBranchNameAndOrganizationId(name, org))
                errors.add("branchName: Branch Name already exists in this Organization");
        }
    }
}