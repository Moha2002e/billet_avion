package com.billetavion.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Vol programmé : compagnie, trajet, horaires, nombre de places et prix de base d'un billet adulte.
 */
@Entity
public class Vol {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String compagnie;
    private String numeroVol;
    private String origine;
    private String destination;
    private LocalDateTime dateDepart;
    private LocalDateTime dateArrivee;
    private int capacite;
    @Column(precision = 10, scale = 2)
    private BigDecimal prix;
    @Enumerated(EnumType.STRING)
    private StatutVol statut = StatutVol.PROGRAMME;

    /**
     * Renvoie l'identifiant technique.
     *
     * @return l'identifiant technique
     */
    public Long getId() { return id; }
    /**
     * Renvoie la compagnie aérienne.
     *
     * @return la compagnie aérienne
     */
    public String getCompagnie() { return compagnie; }
    /**
     * Définit la compagnie aérienne.
     *
     * @param v la compagnie aérienne
     */
    public void setCompagnie(String v) { this.compagnie = v; }
    /**
     * Renvoie le numéro de vol.
     *
     * @return le numéro de vol
     */
    public String getNumeroVol() { return numeroVol; }
    /**
     * Définit le numéro de vol.
     *
     * @param v le numéro de vol
     */
    public void setNumeroVol(String v) { this.numeroVol = v; }
    /**
     * Renvoie la ville de départ.
     *
     * @return la ville de départ
     */
    public String getOrigine() { return origine; }
    /**
     * Définit la ville de départ.
     *
     * @param v la ville de départ
     */
    public void setOrigine(String v) { this.origine = v; }
    /**
     * Renvoie la ville d'arrivée.
     *
     * @return la ville d'arrivée
     */
    public String getDestination() { return destination; }
    /**
     * Définit la ville d'arrivée.
     *
     * @param v la ville d'arrivée
     */
    public void setDestination(String v) { this.destination = v; }
    /**
     * Renvoie la date et l'heure de départ.
     *
     * @return la date et l'heure de départ
     */
    public LocalDateTime getDateDepart() { return dateDepart; }
    /**
     * Définit la date et l'heure de départ.
     *
     * @param v la date et l'heure de départ
     */
    public void setDateDepart(LocalDateTime v) { this.dateDepart = v; }
    /**
     * Renvoie la date et l'heure d'arrivée.
     *
     * @return la date et l'heure d'arrivée
     */
    public LocalDateTime getDateArrivee() { return dateArrivee; }
    /**
     * Définit la date et l'heure d'arrivée.
     *
     * @param v la date et l'heure d'arrivée
     */
    public void setDateArrivee(LocalDateTime v) { this.dateArrivee = v; }
    /**
     * Renvoie le nombre de places de l'appareil.
     *
     * @return le nombre de places de l'appareil
     */
    public int getCapacite() { return capacite; }
    /**
     * Définit le nombre de places de l'appareil.
     *
     * @param v le nombre de places de l'appareil
     */
    public void setCapacite(int v) { this.capacite = v; }
    /**
     * Renvoie le prix de base d'un billet adulte.
     *
     * @return le prix de base d'un billet adulte
     */
    public BigDecimal getPrix() { return prix; }
    /**
     * Définit le prix de base d'un billet adulte.
     *
     * @param v le prix de base d'un billet adulte
     */
    public void setPrix(BigDecimal v) { this.prix = v; }
    /**
     * Renvoie le statut.
     *
     * @return le statut
     */
    public StatutVol getStatut() { return statut; }
    /**
     * Définit le statut.
     *
     * @param v le statut
     */
    public void setStatut(StatutVol v) { this.statut = v; }
}
