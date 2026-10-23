
package branchmaster.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.LinkedHashMap;
import java.util.Map;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    public record ApiError(String message, Map<String, String> errors) {}

    @ExceptionHandler(BranchException.class)
    public ResponseEntity<?> handle(BranchException e) {
        if (e.getResult() != null) {
            return ResponseEntity.unprocessableContent().body(e.getResult());
        }
        return ResponseEntity.status(e.getStatus()).body(new ApiError(e.getMessage(),
                        e.getField() == null ? Map.of() : Map.of(e.getField(), e.getMessage())));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handle(MethodArgumentNotValidException e) {
        Map<String, String> errors = new LinkedHashMap<>();
        e.getBindingResult().getFieldErrors()
                .forEach(f -> errors.putIfAbsent(f.getField(), f.getDefaultMessage()));
        return ResponseEntity.badRequest()
                .body(new ApiError("Please correct the highlighted fields", errors));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiError> handleUnreadable(HttpMessageNotReadableException e) {
        return ResponseEntity.badRequest()
                .body(new ApiError("Malformed request data", Map.of()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handle(Exception e) {
        log.error("Unhandled error", e);
        return ResponseEntity.status(500)
                .body(new ApiError("Internal server error", Map.of()));
    }
}
