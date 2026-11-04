package com.billetavion.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "reservation_passagers")
public class ReservationPassager {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(optional = false)
    private Reservation reservation;
    @Enumerated(EnumType.STRING)
    private TypePassager type;
    private String nom;
    private String prenom;
    private LocalDate dateNaissance;
    @Enumerated(EnumType.STRING)
    private Categorie categorie;
    @Column(precision = 10, scale = 2)
    private BigDecimal prixBillet = BigDecimal.ZERO;
    private String siege;
    @Column(precision = 10, scale = 2)
    private BigDecimal siegePrix = BigDecimal.ZERO;
    @Enumerated(EnumType.STRING)
    private Bagage bagage = Bagage.AUCUN;
    private boolean prioritaire;
    private boolean repas;
    private boolean enregistre;

    public boolean estComplet() { return nom != null && !nom.isBlank() && prenom != null && !prenom.isBlank() && dateNaissance != null; }

    public Long getId() { return id; }
    public Reservation getReservation() { return reservation; }
    public void setReservation(Reservation v) { this.reservation = v; }
    public TypePassager getType() { return type; }
    public void setType(TypePassager v) { this.type = v; }
    public String getNom() { return nom; }
    public void setNom(String v) { this.nom = v; }
    public String getPrenom() { return prenom; }
    public void setPrenom(String v) { this.prenom = v; }
    public LocalDate getDateNaissance() { return dateNaissance; }
    public void setDateNaissance(LocalDate v) { this.dateNaissance = v; }
    public Categorie getCategorie() { return categorie; }
    public void setCategorie(Categorie v) { this.categorie = v; }
    public BigDecimal getPrixBillet() { return prixBillet; }
    public void setPrixBillet(BigDecimal v) { this.prixBillet = v; }
    public String getSiege() { return siege; }
    public void setSiege(String v) { this.siege = v; }
    public BigDecimal getSiegePrix() { return siegePrix; }
    public void setSiegePrix(BigDecimal v) { this.siegePrix = v; }
    public Bagage getBagage() { return bagage; }
    public void setBagage(Bagage v) { this.bagage = v; }
    public boolean isPrioritaire() { return prioritaire; }
    public void setPrioritaire(boolean v) { this.prioritaire = v; }
    public boolean isRepas() { return repas; }
    public void setRepas(boolean v) { this.repas = v; }
    public boolean isEnregistre() { return enregistre; }
    public void setEnregistre(boolean v) { this.enregistre = v; }
}
