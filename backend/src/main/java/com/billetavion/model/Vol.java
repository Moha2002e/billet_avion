package com.billetavion.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

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

    public Long getId() { return id; }
    public String getCompagnie() { return compagnie; }
    public void setCompagnie(String v) { this.compagnie = v; }
    public String getNumeroVol() { return numeroVol; }
    public void setNumeroVol(String v) { this.numeroVol = v; }
    public String getOrigine() { return origine; }
    public void setOrigine(String v) { this.origine = v; }
    public String getDestination() { return destination; }
    public void setDestination(String v) { this.destination = v; }
    public LocalDateTime getDateDepart() { return dateDepart; }
    public void setDateDepart(LocalDateTime v) { this.dateDepart = v; }
    public LocalDateTime getDateArrivee() { return dateArrivee; }
    public void setDateArrivee(LocalDateTime v) { this.dateArrivee = v; }
    public int getCapacite() { return capacite; }
    public void setCapacite(int v) { this.capacite = v; }
    public BigDecimal getPrix() { return prix; }
    public void setPrix(BigDecimal v) { this.prix = v; }
    public StatutVol getStatut() { return statut; }
    public void setStatut(StatutVol v) { this.statut = v; }
}
