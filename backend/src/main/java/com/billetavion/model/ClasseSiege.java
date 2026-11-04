package com.billetavion.model;

import java.math.BigDecimal;

/** Catégories de sièges : les sièges avec plus de place sont plus chers, les sièges standard sont gratuits. */
public enum ClasseSiege {
    PREMIUM("Premium - grand confort", "35"),
    AVANT("Avant de l'appareil", "15"),
    ESPACE("Grand espace jambes (sortie de secours)", "20"),
    STANDARD("Standard (gratuit)", "0");

    private final String libelle;
    private final BigDecimal prix;

    /**
     * Construit une catégorie de sièges.
     *
     * @param libelle le texte affiché
     * @param prix le supplément en euros (texte décimal)
     */
    ClasseSiege(String libelle, String prix) { this.libelle = libelle; this.prix = new BigDecimal(prix); }

    /**
     * Renvoie le libellé affiché.
     *
     * @return le libellé affiché
     */
    public String getLibelle() { return libelle; }
    /**
     * Renvoie le prix de base d'un billet adulte.
     *
     * @return le prix de base d'un billet adulte
     */
    public BigDecimal getPrix() { return prix; }

    /** Rangs 1-2 : premium ; 3-6 : avant ; 11-12 : grand espace ; le reste : standard. */
    public static ClasseSiege duRang(int rang) {
        if (rang <= 2) return PREMIUM;
        if (rang <= 6) return AVANT;
        if (rang == 11 || rang == 12) return ESPACE;
        return STANDARD;
    }
}
