package com.billetavion.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/** Voyage groupé : plusieurs passagers sur un même vol, avec une remise selon la taille du groupe. */
@Entity
public class GroupeVoyage {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String nom;
    private String responsable;
    @ManyToOne(optional = false)
    private Vol vol;
    private boolean actif = true;
    private LocalDateTime dateCreation = LocalDateTime.now();

    public Long getId() { return id; }
    public String getNom() { return nom; }
    public void setNom(String v) { this.nom = v; }
    public String getResponsable() { return responsable; }
    public void setResponsable(String v) { this.responsable = v; }
    public Vol getVol() { return vol; }
    public void setVol(Vol v) { this.vol = v; }
    public boolean isActif() { return actif; }
    public void setActif(boolean v) { this.actif = v; }
    public LocalDateTime getDateCreation() { return dateCreation; }
}
