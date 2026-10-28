package branchmaster.controller;

import branchmaster.entity.AppUser;
import branchmaster.entity.AppUser.Role;
import branchmaster.exception.BranchException;
import branchmaster.repository.UserRepository;
import branchmaster.security.JwtService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    public record LoginRequest(@NotBlank(message = "Username is required") String username,
                               @NotBlank(message = "Password is required") String password) {}

    public record RegisterRequest(
            @NotBlank(message = "Username is required")
            @Size(min = 3, max = 30, message = "Username must be 3 to 30 characters")
            @Pattern(regexp = "^[a-zA-Z0-9_.]*$", message = "Username can contain only letters, numbers, dots and underscores")
            String username,
            @NotBlank(message = "Password is required")
            @Size(min = 6, max = 72, message = "Password must be 6 to 72 characters")
            String password) {}

    public record AuthResponse(String token, String username, String role) {}

    private final JwtService jwtService;
    private final UserRepository users;
    private final PasswordEncoder encoder;

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        AppUser user = users.findByUsername(request.username().trim())
                .orElseThrow(() -> new BranchException(BranchException.Type.USER_NOT_FOUND));
        if (!encoder.matches(request.password(), user.getPassword()))
            throw new BranchException(BranchException.Type.WRONG_PASSWORD);
        return new AuthResponse(jwtService.generateToken(user.getUsername(), "ROLE_" + user.getRole()),
                user.getUsername(), user.getRole().name());
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public void register(@Valid @RequestBody RegisterRequest request) {
        String username = request.username().trim();
        if (users.existsByUsername(username))
            throw new BranchException(BranchException.Type.USERNAME_EXISTS);

        AppUser user = new AppUser();
        user.setUsername(username);
        user.setPassword(encoder.encode(request.password()));
        user.setRole(Role.USER);
        users.save(user);
    }
}