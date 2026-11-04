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

    Categorie(String libelle, String coefficient) {
        this.libelle = libelle;
        this.coefficient = new BigDecimal(coefficient);
    }

    public String getLibelle() { return libelle; }
    public BigDecimal getCoefficient() { return coefficient; }

    public static Categorie pour(LocalDate naissance, LocalDate aLaDate) {
        int age = Period.between(naissance, aLaDate).getYears();
        if (age < 2) return BEBE;
        if (age < 12) return ENFANT;
        if (age < 26) return JEUNE;
        if (age < 65) return ADULTE;
        return SENIOR;
    }
}
