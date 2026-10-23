
package branchmaster.service;

import branchmaster.dto.BranchResponseDto;
import branchmaster.dto.DropdownOptionsDto;
import branchmaster.dto.DropdownOptionsDto.DropdownOptionDto;
import com.lowagie.text.Document;
import com.lowagie.text.FontFactory;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanWrapper;
import org.springframework.beans.BeanWrapperImpl;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.io.ByteArrayOutputStream;
import java.lang.reflect.Field;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailNotificationService {

    private static final DateTimeFormatter DATE_TIME =
            DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm:ss");

    private final JavaMailSender mailSender;
    private final DropdownService dropdownService;

    @Value("${spring.mail.username}")
    private String senderEmail;

    @Value("${branch.notification.email}")
    private String recipientEmail;

    @Async
    public void sendNotification(String operation, BranchResponseDto branch) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(senderEmail);
            helper.setTo(recipientEmail);
            helper.setSubject("Branch Master Notification: " + operation + " - " + branch.getBranchCode());
            helper.setText("Hello,\n\n"
                    + "A branch operation was completed in Branch Master.\n\n"
                    + "Branch Code: " + branch.getBranchCode() + "\n"
                    + "Branch Name: " + branch.getBranchName() + "\n"
                    + "Operation: " + operation + "\n"
                    + "Date and Time: " + LocalDateTime.now() + "\n\n"
                    + "The complete branch details are attached as a PDF.\n\n"
                    + "Regards,\nBranch Master Team");

            helper.addAttachment(
                    branch.getBranchCode() + "-" + operation.toLowerCase() + ".pdf",
                    new ByteArrayResource(buildPdf(branch, operation)),
                    "application/pdf"
            );

            mailSender.send(message);
        } catch (Exception e) {
            log.error("Branch notification email failed for {}", branch.getBranchCode(), e);
        }
    }

    private byte[] buildPdf(BranchResponseDto branch, String operation) throws Exception {
        DropdownOptionsDto options = dropdownService.getDropdownOptions();

        Map<String, List<DropdownOptionDto>> lookups = Map.of(
                "organizationId", options.getOrganizations(),
                "regionId", options.getRegions(),
                "countryId", options.getCountries(),
                "stateId", options.getStates(),
                "cityId", options.getCities(),
                "contactPerson", options.getContactPersons(),
                "workingHoursId", options.getWorkingHours()
        );

        BeanWrapper bean = new BeanWrapperImpl(branch);
        PdfPTable table = new PdfPTable(new float[]{1f, 2f});
        table.setWidthPercentage(100);
        table.setSpacingBefore(12);

        for (Field field : BranchResponseDto.class.getDeclaredFields()) {
            String key = field.getName();
            Object value = bean.getPropertyValue(key);

            if (lookups.containsKey(key) && value != null) {
                Object id = value;
                value = lookups.get(key).stream()
                        .filter(option -> id.equals(option.getId()))
                        .map(DropdownOptionDto::getName)
                        .findFirst()
                        .orElse(String.valueOf(value));
            } else if (value instanceof Boolean active) {
                value = active ? "Active" : "Inactive";
            } else if (value instanceof LocalDateTime time) {
                value = time.format(DATE_TIME);
            }

            table.addCell(StringUtils.capitalize(
                    key.replaceAll("([a-z])([A-Z0-9])", "$1 $2")
                            .replaceFirst(" Id$", "")
            ));
            table.addCell(value == null || value.toString().isBlank()
                    ? "N/A" : value.toString());
        }

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document document = new Document();
        PdfWriter.getInstance(document, out);
        document.open();
        document.add(new Paragraph("Branch Details",
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16)));
        document.add(new Paragraph(operation + " | " + branch.getBranchCode()
                + " | " + LocalDateTime.now().format(DATE_TIME)));
        document.add(table);
        document.close();

        return out.toByteArray();
    }
}
