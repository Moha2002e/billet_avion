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
    /**
     * Session ouverte : compte, rôle et fin de validité du jeton.
     *
     * @param utilisateurId l'identifiant du client connecté
     * @param role le rôle (client ou administrateur)
     * @param fin la valeur « fin »
     */
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

    /**
     * Inscrit un nouveau client puis ouvre sa session.
     *
     * @param r les informations d'inscription
     * @return le jeton de session et le compte créé
     * @throws Errors.Business si l'e-mail est déjà utilisé
     */
    public AuthReponse inscrire(RegisterRequest r) {
        return ouvrir(creerClient(r));
    }

    /**
     * Crée un compte client (mot de passe haché) sans ouvrir de session.
     *
     * @param r les informations du client
     * @return le compte enregistré
     * @throws Errors.Business si l'e-mail est déjà utilisé
     */
    public Utilisateur creerClient(RegisterRequest r) {
        String email = r.email().trim().toLowerCase();
        if (utilisateurs.findByEmailIgnoreCase(email).isPresent())
            throw new Errors.Business("Un compte existe déjà avec cet e-mail");
        Utilisateur u = new Utilisateur();
        u.setEmail(email);
        u.setMotDePasse(encoder.encode(r.motDePasse()));
        u.setNom(r.nom().trim()); u.setPrenom(r.prenom().trim());
        u.setTelephone(r.telephone() == null ? "" : r.telephone().trim());
        u.setDateNaissance(r.dateNaissance());
        return utilisateurs.save(u);
    }

    /**
     * Connecte un utilisateur : vérifie le mot de passe haché puis ouvre une session.
     *
     * @param identifiant l'identifiant de connexion (e-mail)
     * @param motDePasse le mot de passe
     * @return le jeton de session et le compte
     */
    public AuthReponse connecter(String identifiant, String motDePasse) {
        Utilisateur u = utilisateurs.findByEmailIgnoreCase(identifiant.trim()).orElse(null);
        if (u == null || !encoder.matches(motDePasse, u.getMotDePasse())) throw new Errors.Unauthorized("Identifiants incorrects");
        return ouvrir(u);
    }

    /**
     * Ouvre une session (jeton aléatoire de 8 heures) pour un compte.
     *
     * @param u le compte utilisateur
     * @return le jeton de session et le compte
     */
    private AuthReponse ouvrir(Utilisateur u) {
        byte[] octets = new byte[32];
        random.nextBytes(octets);
        String jeton = HexFormat.of().formatHex(octets);
        sessions.put(jeton, new Session(u.getId(), u.getRole(), Instant.now().plusSeconds(DUREE_SECONDES)));
        return new AuthReponse(jeton, mapper.utilisateur(u));
    }

    /**
     * Retrouve la session d'un jeton, si elle est encore valide.
     *
     * @param jeton le jeton de session
     * @return la session, ou vide si le jeton est inconnu ou expiré
     */
    public Optional<Session> session(String jeton) {
        if (jeton == null) return Optional.empty();
        Session s = sessions.get(jeton);
        if (s == null) return Optional.empty();
        if (s.fin().isBefore(Instant.now())) { sessions.remove(jeton); return Optional.empty(); }
        return Optional.of(s);
    }

    /**
     * Ferme la session d'un jeton.
     *
     * @param jeton le jeton de session
     */
    public void deconnecter(String jeton) { if (jeton != null) sessions.remove(jeton); }

    /**
     * Charge un compte par son identifiant.
     *
     * @param id l'identifiant
     * @return le compte
     */
    @Transactional(readOnly = true)
    public Utilisateur utilisateur(Long id) {
        return utilisateurs.findById(id).orElseThrow(() -> new Errors.NotFound("Compte introuvable"));
    }

    /**
     * Renvoie le profil d'un compte.
     *
     * @param id l'identifiant
     * @return le profil
     */
    @Transactional(readOnly = true)
    public UtilisateurDto profil(Long id) { return mapper.utilisateur(utilisateur(id)); }

    /**
     * Modifie le nom, le prénom, le téléphone et la date de naissance d'un compte.
     *
     * @param id l'identifiant
     * @param r les nouvelles informations
     * @return le profil mis à jour
     */
    public UtilisateurDto modifierProfil(Long id, ProfilRequest r) {
        Utilisateur u = utilisateur(id);
        u.setNom(r.nom().trim()); u.setPrenom(r.prenom().trim());
        u.setTelephone(r.telephone() == null ? "" : r.telephone().trim());
        u.setDateNaissance(r.dateNaissance());
        return mapper.utilisateur(u);
    }

    /**
     * Supprime la carte bancaire enregistrée d'un compte.
     *
     * @param id l'identifiant
     * @return le profil mis à jour
     */
    public UtilisateurDto supprimerCarte(Long id) {
        Utilisateur u = utilisateur(id);
        u.setCarteMarque(null); u.setCarteFin(null); u.setCarteTitulaire(null); u.setCarteExpiration(null);
        return mapper.utilisateur(u);
    }
}
