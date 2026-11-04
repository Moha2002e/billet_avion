package com.billetavion.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Compte d'un client ou de l'administrateur (mot de passe haché ; carte enregistrée : marque et 4 derniers chiffres seulement).
 */
@Entity
@Table(name = "utilisateurs")
public class Utilisateur {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(unique = true, nullable = false)
    private String email;
    @Column(nullable = false)
    private String motDePasse;
    @Enumerated(EnumType.STRING)
    private Role role = Role.CLIENT;
    private String nom;
    private String prenom;
    private String telephone;
    private LocalDate dateNaissance;
    // Carte enregistrée (fictive) : jamais le numéro complet ni le CVV
    private String carteMarque;
    private String carteFin;
    private String carteTitulaire;
    private String carteExpiration;
    private LocalDateTime creeLe = LocalDateTime.now();

    /**
     * Renvoie l'identifiant technique.
     *
     * @return l'identifiant technique
     */
    public Long getId() { return id; }
    /**
     * Renvoie l'adresse e-mail (identifiant de connexion).
     *
     * @return l'adresse e-mail (identifiant de connexion)
     */
    public String getEmail() { return email; }
    /**
     * Définit l'adresse e-mail (identifiant de connexion).
     *
     * @param v l'adresse e-mail (identifiant de connexion)
     */
    public void setEmail(String v) { this.email = v; }
    /**
     * Renvoie le mot de passe haché (BCrypt).
     *
     * @return le mot de passe haché (BCrypt)
     */
    public String getMotDePasse() { return motDePasse; }
    /**
     * Définit le mot de passe haché (BCrypt).
     *
     * @param v le mot de passe haché (BCrypt)
     */
    public void setMotDePasse(String v) { this.motDePasse = v; }
    /**
     * Renvoie le rôle (client ou administrateur).
     *
     * @return le rôle (client ou administrateur)
     */
    public Role getRole() { return role; }
    /**
     * Définit le rôle (client ou administrateur).
     *
     * @param v le rôle (client ou administrateur)
     */
    public void setRole(Role v) { this.role = v; }
    /**
     * Renvoie le nom de famille.
     *
     * @return le nom de famille
     */
    public String getNom() { return nom; }
    /**
     * Définit le nom de famille.
     *
     * @param v le nom de famille
     */
    public void setNom(String v) { this.nom = v; }
    /**
     * Renvoie le prénom.
     *
     * @return le prénom
     */
    public String getPrenom() { return prenom; }
    /**
     * Définit le prénom.
     *
     * @param v le prénom
     */
    public void setPrenom(String v) { this.prenom = v; }
    /**
     * Renvoie le numéro de téléphone.
     *
     * @return le numéro de téléphone
     */
    public String getTelephone() { return telephone; }
    /**
     * Définit le numéro de téléphone.
     *
     * @param v le numéro de téléphone
     */
    public void setTelephone(String v) { this.telephone = v; }
    /**
     * Renvoie la date de naissance.
     *
     * @return la date de naissance
     */
    public LocalDate getDateNaissance() { return dateNaissance; }
    /**
     * Définit la date de naissance.
     *
     * @param v la date de naissance
     */
    public void setDateNaissance(LocalDate v) { this.dateNaissance = v; }
    /**
     * Renvoie la marque de la carte enregistrée.
     *
     * @return la marque de la carte enregistrée
     */
    public String getCarteMarque() { return carteMarque; }
    /**
     * Définit la marque de la carte enregistrée.
     *
     * @param v la marque de la carte enregistrée
     */
    public void setCarteMarque(String v) { this.carteMarque = v; }
    /**
     * Renvoie les 4 derniers chiffres de la carte enregistrée.
     *
     * @return les 4 derniers chiffres de la carte enregistrée
     */
    public String getCarteFin() { return carteFin; }
    /**
     * Définit les 4 derniers chiffres de la carte enregistrée.
     *
     * @param v les 4 derniers chiffres de la carte enregistrée
     */
    public void setCarteFin(String v) { this.carteFin = v; }
    /**
     * Renvoie le titulaire de la carte enregistrée.
     *
     * @return le titulaire de la carte enregistrée
     */
    public String getCarteTitulaire() { return carteTitulaire; }
    /**
     * Définit le titulaire de la carte enregistrée.
     *
     * @param v le titulaire de la carte enregistrée
     */
    public void setCarteTitulaire(String v) { this.carteTitulaire = v; }
    /**
     * Renvoie la date d'expiration de la carte enregistrée.
     *
     * @return la date d'expiration de la carte enregistrée
     */
    public String getCarteExpiration() { return carteExpiration; }
    /**
     * Définit la date d'expiration de la carte enregistrée.
     *
     * @param v la date d'expiration de la carte enregistrée
     */
    public void setCarteExpiration(String v) { this.carteExpiration = v; }
    /**
     * Renvoie la date de création.
     *
     * @return la date de création
     */
    public LocalDateTime getCreeLe() { return creeLe; }
}
