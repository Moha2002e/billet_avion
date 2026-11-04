package com.billetavion.model;

import jakarta.persistence.*;
import java.time.LocalDate;

/**
 * Promotion en pourcentage. Soit automatique (appliquée à toute réservation concernée),
 * soit sur code (le client saisit le code). Valable sur un vol précis ou sur tous les vols.
 */
@Entity
public class Promotion {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(unique = true)
    private String code;
    private String description;
    private int pourcentage;
    private LocalDate dateDebut;
    private LocalDate dateFin;
    private boolean automatique;
    private boolean actif = true;
    @ManyToOne
    private Vol vol;

    public boolean enCours(LocalDate jour) {
        return actif && !jour.isBefore(dateDebut) && !jour.isAfter(dateFin);
    }
    public boolean concerne(Vol v) { return vol == null || vol.getId().equals(v.getId()); }

    public Long getId() { return id; }
    public String getCode() { return code; }
    public void setCode(String v) { this.code = v; }
    public String getDescription() { return description; }
    public void setDescription(String v) { this.description = v; }
    public int getPourcentage() { return pourcentage; }
    public void setPourcentage(int v) { this.pourcentage = v; }
    public LocalDate getDateDebut() { return dateDebut; }
    public void setDateDebut(LocalDate v) { this.dateDebut = v; }
    public LocalDate getDateFin() { return dateFin; }
    public void setDateFin(LocalDate v) { this.dateFin = v; }
    public boolean isAutomatique() { return automatique; }
    public void setAutomatique(boolean v) { this.automatique = v; }
    public boolean isActif() { return actif; }
    public void setActif(boolean v) { this.actif = v; }
    public Vol getVol() { return vol; }
    public void setVol(Vol v) { this.vol = v; }
}
