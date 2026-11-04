package com.billetavion.web;

import com.billetavion.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import java.nio.charset.StandardCharsets;

/** Réserve certaines routes à l'administrateur (en-tête Authorization: Bearer <jeton>). */
@Component
public class AdminInterceptor implements HandlerInterceptor {
    private final AuthService auth;

    public AdminInterceptor(AuthService auth) { this.auth = auth; }

    public static String jeton(HttpServletRequest req) {
        String h = req.getHeader("Authorization");
        return h != null && h.startsWith("Bearer ") ? h.substring(7).trim() : null;
    }

    static boolean reserveAdmin(String methode, String chemin) {
        boolean ecriture = !methode.equals("GET") && !methode.equals("HEAD") && !methode.equals("OPTIONS");
        return chemin.startsWith("/api/admin")
                || chemin.equals("/api/auth/me")
                || (ecriture && (chemin.startsWith("/api/vols") || chemin.startsWith("/api/promotions")));
    }

    @Override
    public boolean preHandle(HttpServletRequest req, HttpServletResponse res, Object handler) throws Exception {
        if (!reserveAdmin(req.getMethod(), req.getRequestURI()) || auth.estAdmin(jeton(req))) return true;
        res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        res.setContentType("application/json;charset=UTF-8");
        res.getOutputStream().write("{\"message\":\"Accès réservé à l'administrateur : connectez-vous\"}".getBytes(StandardCharsets.UTF_8));
        return false;
    }
}
