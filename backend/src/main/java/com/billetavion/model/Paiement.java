package com.billetavion.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Paiement fictif : on ne conserve que la marque et les 4 derniers chiffres de la carte. */
@Entity
@Table(name = "paiements")
public class Paiement {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(optional = false)
    private Reservation reservation;
    @Column(precision = 10, scale = 2)
    private BigDecimal montant;
    @Enumerated(EnumType.STRING)
    private TypePaiement type;
    private String carteMarque;
    private String carteFin;
    private String motif;
    private LocalDateTime creeLe = LocalDateTime.now();

    /**
     * Crée un paiement.
     */
    public Paiement() {}
    /**
     * Crée un paiement.
     *
     * @param r la réservation
     * @param montant le montant (négatif pour un remboursement)
     * @param type le type d'opération
     * @param marque la marque de la carte
     * @param fin les 4 derniers chiffres
     * @param motif le motif
     */
    public Paiement(Reservation r, BigDecimal montant, TypePaiement type, String marque, String fin, String motif) {
        this.reservation = r; this.montant = montant; this.type = type;
        this.carteMarque = marque; this.carteFin = fin; this.motif = motif;
    }

    /**
     * Renvoie l'identifiant technique.
     *
     * @return l'identifiant technique
     */
    public Long getId() { return id; }
    /**
     * Renvoie le montant (négatif pour un remboursement).
     *
     * @return le montant (négatif pour un remboursement)
     */
    public BigDecimal getMontant() { return montant; }
    /**
     * Renvoie le type.
     *
     * @return le type
     */
    public TypePaiement getType() { return type; }
    /**
     * Renvoie la marque de la carte enregistrée.
     *
     * @return la marque de la carte enregistrée
     */
    public String getCarteMarque() { return carteMarque; }
    /**
     * Renvoie les 4 derniers chiffres de la carte enregistrée.
     *
     * @return les 4 derniers chiffres de la carte enregistrée
     */
    public String getCarteFin() { return carteFin; }
    /**
     * Renvoie le motif du paiement.
     *
     * @return le motif du paiement
     */
    public String getMotif() { return motif; }
    /**
     * Renvoie la date de création.
     *
     * @return la date de création
     */
    public LocalDateTime getCreeLe() { return creeLe; }
}
