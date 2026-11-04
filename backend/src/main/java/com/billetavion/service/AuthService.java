package com.billetavion.service;

import com.billetavion.model.*;
import com.billetavion.repo.UtilisateurRepository;
import com.billetavion.web.Dtos.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/** Comptes clients et administrateur ; jeton de session en mémoire (valable 8 h). */
@Service
@Transactional
public class AuthService {
    public record Session(Long utilisateurId, Role role, Instant fin) {}

    private static final long DUREE_SECONDES = 8 * 3600;
    private final UtilisateurRepository utilisateurs;
    private final Mapper mapper;
    private final String adminId;
    private final String adminMotDePasse;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
    private final Map<String, Session> sessions = new ConcurrentHashMap<>();
    private final SecureRandom random = new SecureRandom();

    public AuthService(UtilisateurRepository utilisateurs, Mapper mapper,
                       @Value("${app.admin.username}") String adminId, @Value("${app.admin.password}") String adminMotDePasse) {
        this.utilisateurs = utilisateurs; this.mapper = mapper; this.adminId = adminId; this.adminMotDePasse = adminMotDePasse;
    }

    /** Crée (ou met à jour) le compte administrateur défini dans application.properties. */
    public void initialiserAdmin() {
        Utilisateur a = utilisateurs.findByEmailIgnoreCase(adminId).orElseGet(Utilisateur::new);
        a.setEmail(adminId.toLowerCase());
        a.setRole(Role.ADMIN);
        a.setNom("Administrateur"); a.setPrenom("");
        a.setMotDePasse(encoder.encode(adminMotDePasse));
        utilisateurs.save(a);
    }

    public AuthReponse inscrire(RegisterRequest r) {
        String email = r.email().trim().toLowerCase();
        if (utilisateurs.findByEmailIgnoreCase(email).isPresent())
            throw new Errors.Business("Un compte existe déjà avec cet e-mail");
        Utilisateur u = new Utilisateur();
        u.setEmail(email);
        u.setMotDePasse(encoder.encode(r.motDePasse()));
        u.setNom(r.nom().trim()); u.setPrenom(r.prenom().trim());
        u.setTelephone(r.telephone() == null ? "" : r.telephone().trim());
        u.setDateNaissance(r.dateNaissance());
        utilisateurs.save(u);
        return ouvrir(u);
    }

    public AuthReponse connecter(String identifiant, String motDePasse) {
        Utilisateur u = utilisateurs.findByEmailIgnoreCase(identifiant.trim()).orElse(null);
        if (u == null || !encoder.matches(motDePasse, u.getMotDePasse())) throw new Errors.Unauthorized("Identifiants incorrects");
        return ouvrir(u);
    }

    private AuthReponse ouvrir(Utilisateur u) {
        byte[] octets = new byte[32];
        random.nextBytes(octets);
        String jeton = HexFormat.of().formatHex(octets);
        sessions.put(jeton, new Session(u.getId(), u.getRole(), Instant.now().plusSeconds(DUREE_SECONDES)));
        return new AuthReponse(jeton, mapper.utilisateur(u));
    }

    public Optional<Session> session(String jeton) {
        if (jeton == null) return Optional.empty();
        Session s = sessions.get(jeton);
        if (s == null) return Optional.empty();
        if (s.fin().isBefore(Instant.now())) { sessions.remove(jeton); return Optional.empty(); }
        return Optional.of(s);
    }

    public void deconnecter(String jeton) { if (jeton != null) sessions.remove(jeton); }

    @Transactional(readOnly = true)
    public Utilisateur utilisateur(Long id) {
        return utilisateurs.findById(id).orElseThrow(() -> new Errors.NotFound("Compte introuvable"));
    }

    @Transactional(readOnly = true)
    public UtilisateurDto profil(Long id) { return mapper.utilisateur(utilisateur(id)); }

    public UtilisateurDto modifierProfil(Long id, ProfilRequest r) {
        Utilisateur u = utilisateur(id);
        u.setNom(r.nom().trim()); u.setPrenom(r.prenom().trim());
        u.setTelephone(r.telephone() == null ? "" : r.telephone().trim());
        u.setDateNaissance(r.dateNaissance());
        return mapper.utilisateur(u);
    }

    public UtilisateurDto supprimerCarte(Long id) {
        Utilisateur u = utilisateur(id);
        u.setCarteMarque(null); u.setCarteFin(null); u.setCarteTitulaire(null); u.setCarteExpiration(null);
        return mapper.utilisateur(u);
    }
}
