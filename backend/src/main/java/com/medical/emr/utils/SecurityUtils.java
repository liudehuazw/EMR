package com.medical.emr.utils;

import com.medical.emr.security.UserPrincipal;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;

public final class SecurityUtils {

    private SecurityUtils() {
    }

    /**
     * 当前登录用户 ID。
     * <p>
     * 由 {@code JwtAuthenticationFilter} 从 JWT claims 解析后放入 {@link UserPrincipal}，
     * 因此无需再查用户表。仅在主体不是 UserPrincipal 时返回 null（由调用方决定兜底策略）。
     */
    public static Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return null;
        }
        Object principal = auth.getPrincipal();
        if (principal instanceof UserPrincipal up) {
            return up.getUserId();
        }
        return null;
    }

    public static String getCurrentUsername() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return null;
        }
        Object principal = auth.getPrincipal();
        if (principal instanceof UserDetails ud) {
            return ud.getUsername();
        }
        if (principal instanceof String username && !"anonymousUser".equals(username)) {
            return username;
        }
        String name = auth.getName();
        if (name == null || "anonymousUser".equals(name)) {
            return null;
        }
        return name;
    }

    public static boolean isAdmin() {
        return "admin".equals(getCurrentUsername());
    }
}
