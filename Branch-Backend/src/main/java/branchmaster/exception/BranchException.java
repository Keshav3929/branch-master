package branchmaster.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
public class BranchException extends RuntimeException {

    @Getter
    @RequiredArgsConstructor
    public enum Type {
        CODE_EXISTS("Branch code already exists", HttpStatus.CONFLICT),
        NAME_EXISTS("Branch name already exists for this organization", HttpStatus.CONFLICT),
        NOT_FOUND("Branch not found", HttpStatus.NOT_FOUND);

        private final String message;
        private final HttpStatus status;
    }

    private final HttpStatus status;

    public BranchException(Type type) {
        super(type.getMessage());
        this.status = type.getStatus();
    }
}