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

    public Paiement() {}
    public Paiement(Reservation r, BigDecimal montant, TypePaiement type, String marque, String fin, String motif) {
        this.reservation = r; this.montant = montant; this.type = type;
        this.carteMarque = marque; this.carteFin = fin; this.motif = motif;
    }

    public Long getId() { return id; }
    public BigDecimal getMontant() { return montant; }
    public TypePaiement getType() { return type; }
    public String getCarteMarque() { return carteMarque; }
    public String getCarteFin() { return carteFin; }
    public String getMotif() { return motif; }
    public LocalDateTime getCreeLe() { return creeLe; }
}
