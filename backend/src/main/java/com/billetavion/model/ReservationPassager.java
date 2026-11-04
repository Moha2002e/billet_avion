package com.billetavion.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Passager d'une réservation : identité, catégorie d'âge, prix du billet, siège, bagage et options.
 */
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

    /**
     * Indique si nom, prénom et date de naissance sont renseignés.
     *
     * @return vrai si le passager est complet
     */
    public boolean estComplet() { return nom != null && !nom.isBlank() && prenom != null && !prenom.isBlank() && dateNaissance != null; }

    /**
     * Renvoie l'identifiant technique.
     *
     * @return l'identifiant technique
     */
    public Long getId() { return id; }
    /**
     * Renvoie la réservation à laquelle appartient l'élément.
     *
     * @return la réservation à laquelle appartient l'élément
     */
    public Reservation getReservation() { return reservation; }
    /**
     * Définit la réservation à laquelle appartient l'élément.
     *
     * @param v la réservation à laquelle appartient l'élément
     */
    public void setReservation(Reservation v) { this.reservation = v; }
    /**
     * Renvoie le type.
     *
     * @return le type
     */
    public TypePassager getType() { return type; }
    /**
     * Définit le type.
     *
     * @param v le type
     */
    public void setType(TypePassager v) { this.type = v; }
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
     * Renvoie la catégorie d'âge au jour du vol.
     *
     * @return la catégorie d'âge au jour du vol
     */
    public Categorie getCategorie() { return categorie; }
    /**
     * Définit la catégorie d'âge au jour du vol.
     *
     * @param v la catégorie d'âge au jour du vol
     */
    public void setCategorie(Categorie v) { this.categorie = v; }
    /**
     * Renvoie le prix du billet après remises.
     *
     * @return le prix du billet après remises
     */
    public BigDecimal getPrixBillet() { return prixBillet; }
    /**
     * Définit le prix du billet après remises.
     *
     * @param v le prix du billet après remises
     */
    public void setPrixBillet(BigDecimal v) { this.prixBillet = v; }
    /**
     * Renvoie le siège choisi (ex. 12A).
     *
     * @return le siège choisi (ex. 12A)
     */
    public String getSiege() { return siege; }
    /**
     * Définit le siège choisi (ex. 12A).
     *
     * @param v le siège choisi (ex. 12A)
     */
    public void setSiege(String v) { this.siege = v; }
    /**
     * Renvoie le supplément payé pour le siège.
     *
     * @return le supplément payé pour le siège
     */
    public BigDecimal getSiegePrix() { return siegePrix; }
    /**
     * Définit le supplément payé pour le siège.
     *
     * @param v le supplément payé pour le siège
     */
    public void setSiegePrix(BigDecimal v) { this.siegePrix = v; }
    /**
     * Renvoie le bagage choisi.
     *
     * @return le bagage choisi
     */
    public Bagage getBagage() { return bagage; }
    /**
     * Définit le bagage choisi.
     *
     * @param v le bagage choisi
     */
    public void setBagage(Bagage v) { this.bagage = v; }
    /**
     * Renvoie l'option d'embarquement prioritaire.
     *
     * @return l'option d'embarquement prioritaire
     */
    public boolean isPrioritaire() { return prioritaire; }
    /**
     * Définit l'option d'embarquement prioritaire.
     *
     * @param v l'option d'embarquement prioritaire
     */
    public void setPrioritaire(boolean v) { this.prioritaire = v; }
    /**
     * Renvoie l'option repas à bord.
     *
     * @return l'option repas à bord
     */
    public boolean isRepas() { return repas; }
    /**
     * Définit l'option repas à bord.
     *
     * @param v l'option repas à bord
     */
    public void setRepas(boolean v) { this.repas = v; }
    /**
     * Renvoie l'état d'enregistrement en ligne.
     *
     * @return l'état d'enregistrement en ligne
     */
    public boolean isEnregistre() { return enregistre; }
    /**
     * Définit l'état d'enregistrement en ligne.
     *
     * @param v l'état d'enregistrement en ligne
     */
    public void setEnregistre(boolean v) { this.enregistre = v; }
}
