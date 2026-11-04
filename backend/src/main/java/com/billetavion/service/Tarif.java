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

    public static BigDecimal prix(BigDecimal prixVol, Categorie categorie, int remiseGroupePourcent) {
        return prix(prixVol, categorie, remiseGroupePourcent, 0);
    }

    /** Prix = prix du vol x coefficient d'âge x (1 - remise de groupe) x (1 - remise promotionnelle). */
    public static BigDecimal prix(BigDecimal prixVol, Categorie categorie, int remiseGroupePourcent, int remisePromoPourcent) {
        return prixVol.multiply(categorie.getCoefficient())
                .multiply(BigDecimal.valueOf(100 - remiseGroupePourcent))
                .multiply(BigDecimal.valueOf(100 - remisePromoPourcent))
                .divide(BigDecimal.valueOf(10000), 2, RoundingMode.HALF_UP);
    }
}
