package com.billetavion.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
public class Reservation {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(optional = false)
    private Vol vol;
    @ManyToOne(optional = false)
    private Passager passager;
    /** Renseigné si la réservation fait partie d'un voyage groupé. */
    @ManyToOne
    private GroupeVoyage groupe;
    @Enumerated(EnumType.STRING)
    private Categorie categorie;
    @Column(precision = 10, scale = 2)
    private BigDecimal prix;
    @Enumerated(EnumType.STRING)
    private StatutReservation statut = StatutReservation.CONFIRMEE;
    private LocalDateTime dateReservation = LocalDateTime.now();

    public Long getId() { return id; }
    public Vol getVol() { return vol; }
    public void setVol(Vol v) { this.vol = v; }
    public Passager getPassager() { return passager; }
    public void setPassager(Passager v) { this.passager = v; }
    public GroupeVoyage getGroupe() { return groupe; }
    public void setGroupe(GroupeVoyage v) { this.groupe = v; }
    public Categorie getCategorie() { return categorie; }
    public void setCategorie(Categorie v) { this.categorie = v; }
    public BigDecimal getPrix() { return prix; }
    public void setPrix(BigDecimal v) { this.prix = v; }
    public StatutReservation getStatut() { return statut; }
    public void setStatut(StatutReservation v) { this.statut = v; }
    public LocalDateTime getDateReservation() { return dateReservation; }
}
