package com.billetavion.web;

import com.billetavion.model.Role;
import com.billetavion.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import java.nio.charset.StandardCharsets;
import java.util.Optional;

/**
 * Contrôle d'accès : routes publiques (recherche, consultation), routes réservées aux comptes connectés
 * (réservations, compte) et routes réservées à l'administrateur (écriture des vols/promotions, /api/admin).
 * Le jeton est lu dans l'en-tête Authorization: Bearer <jeton>.
 */
@Component
public class AdminInterceptor implements HandlerInterceptor {
    public static final String ATTR_UTILISATEUR = "utilisateurId";
    private final AuthService auth;

    public AdminInterceptor(AuthService auth) { this.auth = auth; }

    public static String jeton(HttpServletRequest req) {
        String h = req.getHeader("Authorization");
        return h != null && h.startsWith("Bearer ") ? h.substring(7).trim() : null;
    }

    enum Acces { PUBLIC, CONNECTE, ADMIN }

    static Acces requis(String methode, String chemin) {
        boolean ecriture = !methode.equals("GET") && !methode.equals("HEAD") && !methode.equals("OPTIONS");
        if (chemin.startsWith("/api/admin") || (ecriture && (chemin.startsWith("/api/vols") || chemin.startsWith("/api/promotions"))))
            return Acces.ADMIN;
        if (chemin.startsWith("/api/reservations") || chemin.startsWith("/api/compte") || chemin.equals("/api/auth/me"))
            return Acces.CONNECTE;
        return Acces.PUBLIC;
    }

    @Override
    public boolean preHandle(HttpServletRequest req, HttpServletResponse res, Object handler) throws Exception {
        Optional<AuthService.Session> s = auth.session(jeton(req));
        s.ifPresent(x -> req.setAttribute(ATTR_UTILISATEUR, x.utilisateurId()));
        Acces acces = requis(req.getMethod(), req.getRequestURI());
        if (acces == Acces.PUBLIC) return true;
        if (s.isEmpty()) return refuser(res, 401, "Connectez-vous pour continuer");
        if (acces == Acces.ADMIN && s.get().role() != Role.ADMIN) return refuser(res, 403, "Accès réservé à l'administrateur");
        return true;
    }

    private boolean refuser(HttpServletResponse res, int code, String message) throws Exception {
        res.setStatus(code);
        res.setContentType("application/json;charset=UTF-8");
        res.getOutputStream().write(("{\"message\":\"" + message + "\"}").getBytes(StandardCharsets.UTF_8));
        return false;
    }
}
