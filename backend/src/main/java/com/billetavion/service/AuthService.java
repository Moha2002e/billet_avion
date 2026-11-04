package com.billetavion.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/** Authentification administrateur par jeton (en mémoire, valable 8 h). */
@Service
public class AuthService {
    private static final long DUREE_SECONDES = 8 * 3600;
    private final String username;
    private final String password;
    private final Map<String, Instant> jetons = new ConcurrentHashMap<>();
    private final SecureRandom random = new SecureRandom();

    public AuthService(@Value("${app.admin.username}") String username, @Value("${app.admin.password}") String password) {
        this.username = username; this.password = password;
    }

    public String connecter(String user, String pass) {
        boolean ok = egal(username, user) & egal(password, pass);
        if (!ok) throw new Errors.Unauthorized("Identifiants incorrects");
        byte[] octets = new byte[32];
        random.nextBytes(octets);
        String jeton = HexFormat.of().formatHex(octets);
        jetons.put(jeton, Instant.now().plusSeconds(DUREE_SECONDES));
        return jeton;
    }

    public boolean estAdmin(String jeton) {
        if (jeton == null) return false;
        Instant fin = jetons.get(jeton);
        if (fin == null) return false;
        if (fin.isBefore(Instant.now())) { jetons.remove(jeton); return false; }
        return true;
    }

    public void deconnecter(String jeton) { if (jeton != null) jetons.remove(jeton); }
    public String username() { return username; }

    private static boolean egal(String a, String b) {
        return MessageDigest.isEqual(a.getBytes(StandardCharsets.UTF_8), (b == null ? "" : b).getBytes(StandardCharsets.UTF_8));
    }
}
