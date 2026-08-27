package com.medical.emr.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.medical.emr.entity.User;
import com.medical.emr.mapper.UserMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.ArrayList;

@Service
public class UserService extends ServiceImpl<UserMapper, User> implements UserDetailsService {

    private static final String CACHE_PREFIX = "users";

    private final PasswordEncoder passwordEncoder;

    @Autowired(required = false)
    private CacheService cacheService;

    public UserService(PasswordEncoder passwordEncoder) {
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = getOne(new LambdaQueryWrapper<User>()
                .eq(User::getUsername, username)
                .eq(User::getStatus, 1));

        if (user == null) {
            throw new UsernameNotFoundException("用户不存在: " + username);
        }

        return org.springframework.security.core.userdetails.User.builder()
                .username(user.getUsername())
                .password(user.getPassword())
                .authorities(new ArrayList<>())
                .build();
    }

    public User findByUsername(String username) {
        // 尝试从缓存读取
        if (cacheService != null) {
            User cached = cacheService.get(CACHE_PREFIX + ":" + username);
            if (cached != null) {
                return cached;
            }
        }
        // 缓存未命中，查数据库
        User user = getOne(new LambdaQueryWrapper<User>()
                .eq(User::getUsername, username)
                .eq(User::getStatus, 1));
        // 写入缓存（30分钟过期）
        if (user != null && cacheService != null) {
            cacheService.set(CACHE_PREFIX + ":" + username, user, 1800L);
        }
        return user;
    }

    public boolean authenticate(String username, String password) {
        User user = findByUsername(username);
        if (user == null) {
            return false;
        }
        return passwordEncoder.matches(password, user.getPassword());
    }

    /**
     * Change user password after verifying old password
     * @return true if password changed successfully
     */
    public boolean changePassword(String username, String oldPassword, String newPassword) {
        User user = findByUsername(username);
        if (user == null) {
            return false;
        }
        if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
            return false;
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        boolean updated = updateById(user);
        // 更新后清除缓存
        if (updated && cacheService != null) {
            cacheService.delete(CACHE_PREFIX + ":" + username);
        }
        return updated;
    }
}
