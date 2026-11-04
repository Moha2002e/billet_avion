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

    /**
     * Renvoie l'identifiant technique.
     *
     * @return l'identifiant technique
     */
    public Long getId() { return id; }
    /**
     * Renvoie la référence de réservation à 6 caractères.
     *
     * @return la référence de réservation à 6 caractères
     */
    public String getReference() { return reference; }
    /**
     * Définit la référence de réservation à 6 caractères.
     *
     * @param v la référence de réservation à 6 caractères
     */
    public void setReference(String v) { this.reference = v; }
    /**
     * Renvoie le client propriétaire.
     *
     * @return le client propriétaire
     */
    public Utilisateur getUtilisateur() { return utilisateur; }
    /**
     * Définit le client propriétaire.
     *
     * @param v le client propriétaire
     */
    public void setUtilisateur(Utilisateur v) { this.utilisateur = v; }
    /**
     * Renvoie le vol.
     *
     * @return le vol
     */
    public Vol getVol() { return vol; }
    /**
     * Définit le vol.
     *
     * @param v le vol
     */
    public void setVol(Vol v) { this.vol = v; }
    /**
     * Renvoie le statut.
     *
     * @return le statut
     */
    public StatutReservation getStatut() { return statut; }
    /**
     * Définit le statut.
     *
     * @param v le statut
     */
    public void setStatut(StatutReservation v) { this.statut = v; }
    /**
     * Renvoie la date de création.
     *
     * @return la date de création
     */
    public LocalDateTime getCreeLe() { return creeLe; }
    /**
     * Renvoie la fin du délai de paiement.
     *
     * @return la fin du délai de paiement
     */
    public LocalDateTime getExpireLe() { return expireLe; }
    /**
     * Définit la fin du délai de paiement.
     *
     * @param v la fin du délai de paiement
     */
    public void setExpireLe(LocalDateTime v) { this.expireLe = v; }
    /**
     * Renvoie l'assurance annulation.
     *
     * @return l'assurance annulation
     */
    public boolean isAssurance() { return assurance; }
    /**
     * Définit l'assurance annulation.
     *
     * @param v l'assurance annulation
     */
    public void setAssurance(boolean v) { this.assurance = v; }
    /**
     * Renvoie le code promo appliqué.
     *
     * @return le code promo appliqué
     */
    public String getCodePromo() { return codePromo; }
    /**
     * Définit le code promo appliqué.
     *
     * @param v le code promo appliqué
     */
    public void setCodePromo(String v) { this.codePromo = v; }
    /**
     * Renvoie la remise promotionnelle (en pourcentage).
     *
     * @return la remise promotionnelle (en pourcentage)
     */
    public int getRemisePromo() { return remisePromo; }
    /**
     * Définit la remise promotionnelle (en pourcentage).
     *
     * @param v la remise promotionnelle (en pourcentage)
     */
    public void setRemisePromo(int v) { this.remisePromo = v; }
    /**
     * Renvoie la remise de groupe (en pourcentage).
     *
     * @return la remise de groupe (en pourcentage)
     */
    public int getRemiseGroupe() { return remiseGroupe; }
    /**
     * Définit la remise de groupe (en pourcentage).
     *
     * @param v la remise de groupe (en pourcentage)
     */
    public void setRemiseGroupe(int v) { this.remiseGroupe = v; }
    /**
     * Renvoie le total des frais de modification de vol.
     *
     * @return le total des frais de modification de vol
     */
    public BigDecimal getFraisModification() { return fraisModification; }
    /**
     * Définit le total des frais de modification de vol.
     *
     * @param v le total des frais de modification de vol
     */
    public void setFraisModification(BigDecimal v) { this.fraisModification = v; }
    /**
     * Renvoie la liste des passagers.
     *
     * @return la liste des passagers
     */
    public List<ReservationPassager> getPassagers() { return passagers; }
    /**
     * Renvoie la liste des paiements.
     *
     * @return la liste des paiements
     */
    public List<Paiement> getPaiements() { return paiements; }
}
