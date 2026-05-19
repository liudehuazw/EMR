package com.medical.emr.controller;

import com.medical.emr.entity.User;
import com.medical.emr.service.UserService;
import com.medical.emr.utils.JwtUtil;
import com.medical.emr.dto.ApiResponse;
import com.medical.emr.dto.ChangePasswordRequest;
import com.medical.emr.dto.LoginRequest;
import com.medical.emr.dto.LoginResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/auth")
@CrossOrigin(origins = "*", maxAge = 3600)
public class AuthController {
    
    @Autowired
    private UserService userService;
    
    @Autowired
    private JwtUtil jwtUtil;
    
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(@Valid @RequestBody LoginRequest loginRequest) {
        try {
            if (!userService.authenticate(loginRequest.getUsername(), loginRequest.getPassword())) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("用户名或密码错误"));
            }
            
            User user = userService.findByUsername(loginRequest.getUsername());
            String token = jwtUtil.generateToken(user.getUsername(), user.getId());
            
            LoginResponse loginResponse = new LoginResponse(
                    token,
                    user.getId(),
                    user.getUsername(),
                    user.getRealName()
            );
            
            return ResponseEntity.ok(ApiResponse.success("登录成功", loginResponse));
            
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("登录失败: " + e.getMessage()));
        }
    }
    
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<String>> logout() {
        return ResponseEntity.ok(ApiResponse.success("退出登录成功"));
    }
    
    @PostMapping("/change-password")
    public ResponseEntity<ApiResponse<String>> changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            HttpServletRequest httpRequest) {
        try {
            // Extract username from JWT token in Authorization header
            String authHeader = httpRequest.getHeader("Authorization");
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return ResponseEntity.status(401)
                        .body(ApiResponse.error("未登录，请先登录"));
            }
            String token = authHeader.substring(7);
            String username = jwtUtil.getUsernameFromToken(token);
            
            boolean success = userService.changePassword(username, request.getOldPassword(), request.getNewPassword());
            if (!success) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("原密码错误"));
            }
            return ResponseEntity.ok(ApiResponse.success("密码修改成功"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("密码修改失败: " + e.getMessage()));
        }
    }
    
    @GetMapping("/info")
    public ResponseEntity<ApiResponse<User>> getCurrentUser() {
        try {
            return ResponseEntity.ok(ApiResponse.success("获取用户信息成功"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("获取用户信息失败: " + e.getMessage()));
        }
    }
}
