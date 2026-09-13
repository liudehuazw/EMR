package com.medical.emr.utils;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class SecurityUtils {

    private SecurityUtils() {
    }

    public static String getCurrentUsername() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return null;
        }
        Object principal = auth.getPrincipal();
        if (principal instanceof String username && !"anonymousUser".equals(username)) {
            return username;
        }
        return auth.getName();
    }

    public static boolean isAdmin() {
        return "admin".equals(getCurrentUsername());
    }
}
