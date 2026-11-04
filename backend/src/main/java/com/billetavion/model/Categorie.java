package com.billetavion.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Period;

/** Catégorie d'âge d'un passager, avec le coefficient de tarif appliqué au prix du vol. */
public enum Categorie {
    BEBE("Bébé (0-1 an)", "0.10"),
    ENFANT("Enfant (2-11 ans)", "0.50"),
    JEUNE("Jeune (12-25 ans)", "0.75"),
    ADULTE("Adulte (26-64 ans)", "1.00"),
    SENIOR("Senior (65 ans et +)", "0.80");

    private final String libelle;
    private final BigDecimal coefficient;

    /**
     * Construit une catégorie d'âge.
     *
     * @param libelle le texte affiché
     * @param coefficient le coefficient de prix (texte décimal)
     */
    Categorie(String libelle, String coefficient) {
        this.libelle = libelle;
        this.coefficient = new BigDecimal(coefficient);
    }

    /**
     * Renvoie le libellé affiché.
     *
     * @return le libellé affiché
     */
    public String getLibelle() { return libelle; }
    /**
     * Renvoie le coefficient de prix.
     *
     * @return le coefficient de prix
     */
    public BigDecimal getCoefficient() { return coefficient; }

    /**
     * Détermine la catégorie d'âge d'un passager à une date donnée.
     *
     * @param naissance la date de naissance
     * @param aLaDate la date de référence (jour du vol)
     * @return la catégorie (bébé, enfant, jeune, adulte ou senior)
     */
    public static Categorie pour(LocalDate naissance, LocalDate aLaDate) {
        int age = Period.between(naissance, aLaDate).getYears();
        if (age < 2) return BEBE;
        if (age < 12) return ENFANT;
        if (age < 26) return JEUNE;
        if (age < 65) return ADULTE;
        return SENIOR;
    }
}
