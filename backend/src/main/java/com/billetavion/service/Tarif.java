package com.billetavion.service;

import com.billetavion.model.Categorie;
import java.math.BigDecimal;
import java.math.RoundingMode;

/** Règles de prix : coefficient par catégorie d'âge, puis remise de groupe. */
public final class Tarif {
    private Tarif() {}

    /** Remise (en %) selon le nombre de passagers du groupe. */
    public static int remiseGroupePourcent(int nbPassagers) {
        if (nbPassagers >= 20) return 15;
        if (nbPassagers >= 10) return 10;
        if (nbPassagers >= 5) return 5;
        return 0;
    }

    public static BigDecimal prix(BigDecimal prixVol, Categorie categorie, int remisePourcent) {
        return prixVol.multiply(categorie.getCoefficient())
                .multiply(BigDecimal.valueOf(100 - remisePourcent))
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    }
}
