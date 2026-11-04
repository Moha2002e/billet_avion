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

    Bagage(String libelle, String prix) { this.libelle = libelle; this.prix = new BigDecimal(prix); }

    public String getLibelle() { return libelle; }
    public BigDecimal getPrix() { return prix; }
}
