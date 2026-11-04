package com.billetavion.model;

import java.math.BigDecimal;

/** Le petit sac sous le siège est toujours inclus ; les autres bagages sont payants. */
public enum Bagage {
    AUCUN("Petit sac sous le siège (inclus)", "0"),
    CABINE_10KG("Bagage cabine 10 kg", "15"),
    SOUTE_20KG("Bagage en soute 20 kg", "25"),
    SOUTE_32KG("Bagage en soute 32 kg", "40");

    private final String libelle;
    private final BigDecimal prix;

    /**
     * Construit un type de bagage.
     *
     * @param libelle le texte affiché
     * @param prix le prix en euros (texte décimal)
     */
    Bagage(String libelle, String prix) { this.libelle = libelle; this.prix = new BigDecimal(prix); }

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
}
