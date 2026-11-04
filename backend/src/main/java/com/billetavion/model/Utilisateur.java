package com.billetavion.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

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

    public Long getId() { return id; }
    public String getEmail() { return email; }
    public void setEmail(String v) { this.email = v; }
    public String getMotDePasse() { return motDePasse; }
    public void setMotDePasse(String v) { this.motDePasse = v; }
    public Role getRole() { return role; }
    public void setRole(Role v) { this.role = v; }
    public String getNom() { return nom; }
    public void setNom(String v) { this.nom = v; }
    public String getPrenom() { return prenom; }
    public void setPrenom(String v) { this.prenom = v; }
    public String getTelephone() { return telephone; }
    public void setTelephone(String v) { this.telephone = v; }
    public LocalDate getDateNaissance() { return dateNaissance; }
    public void setDateNaissance(LocalDate v) { this.dateNaissance = v; }
    public String getCarteMarque() { return carteMarque; }
    public void setCarteMarque(String v) { this.carteMarque = v; }
    public String getCarteFin() { return carteFin; }
    public void setCarteFin(String v) { this.carteFin = v; }
    public String getCarteTitulaire() { return carteTitulaire; }
    public void setCarteTitulaire(String v) { this.carteTitulaire = v; }
    public String getCarteExpiration() { return carteExpiration; }
    public void setCarteExpiration(String v) { this.carteExpiration = v; }
    public LocalDateTime getCreeLe() { return creeLe; }
}
