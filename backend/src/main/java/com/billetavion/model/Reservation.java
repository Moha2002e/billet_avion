package com.billetavion.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/** Une réservation = un vol, un ou plusieurs passagers, des options, des paiements. */
@Entity
@Table(name = "reservations_voyage")
public class Reservation {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(unique = true, nullable = false)
    private String reference;
    @ManyToOne(optional = false)
    private Utilisateur utilisateur;
    @ManyToOne(optional = false)
    private Vol vol;
    @Enumerated(EnumType.STRING)
    private StatutReservation statut = StatutReservation.EN_ATTENTE;
    private LocalDateTime creeLe = LocalDateTime.now();
    /** Fin du délai de paiement tant que la réservation est EN_ATTENTE. */
    private LocalDateTime expireLe;
    private boolean assurance;
    private String codePromo;
    private int remisePromo;
    private int remiseGroupe;
    @Column(precision = 10, scale = 2)
    private BigDecimal fraisModification = BigDecimal.ZERO;

    @OneToMany(mappedBy = "reservation", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id")
    private List<ReservationPassager> passagers = new ArrayList<>();
    @OneToMany(mappedBy = "reservation", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id")
    private List<Paiement> paiements = new ArrayList<>();

    public Long getId() { return id; }
    public String getReference() { return reference; }
    public void setReference(String v) { this.reference = v; }
    public Utilisateur getUtilisateur() { return utilisateur; }
    public void setUtilisateur(Utilisateur v) { this.utilisateur = v; }
    public Vol getVol() { return vol; }
    public void setVol(Vol v) { this.vol = v; }
    public StatutReservation getStatut() { return statut; }
    public void setStatut(StatutReservation v) { this.statut = v; }
    public LocalDateTime getCreeLe() { return creeLe; }
    public LocalDateTime getExpireLe() { return expireLe; }
    public void setExpireLe(LocalDateTime v) { this.expireLe = v; }
    public boolean isAssurance() { return assurance; }
    public void setAssurance(boolean v) { this.assurance = v; }
    public String getCodePromo() { return codePromo; }
    public void setCodePromo(String v) { this.codePromo = v; }
    public int getRemisePromo() { return remisePromo; }
    public void setRemisePromo(int v) { this.remisePromo = v; }
    public int getRemiseGroupe() { return remiseGroupe; }
    public void setRemiseGroupe(int v) { this.remiseGroupe = v; }
    public BigDecimal getFraisModification() { return fraisModification; }
    public void setFraisModification(BigDecimal v) { this.fraisModification = v; }
    public List<ReservationPassager> getPassagers() { return passagers; }
    public List<Paiement> getPaiements() { return paiements; }
}
