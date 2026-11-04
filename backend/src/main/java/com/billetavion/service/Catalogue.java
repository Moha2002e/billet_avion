package com.billetavion.service;

import java.math.BigDecimal;

/** Tarifs et règles commerciales (un seul endroit, exposé au front par /api/catalogue). */
public final class Catalogue {
    /**
     * Classe utilitaire : ne s'instancie pas.
     */
    private Catalogue() {}

    public static final int DELAI_PAIEMENT_MINUTES = 15;
    /** Frais de modification de vol : % du prix des billets. */
    public static final int FRAIS_MODIFICATION_POURCENT = 10;
    public static final BigDecimal ASSURANCE_PAR_PASSAGER = new BigDecimal("9.90");
    public static final BigDecimal EMBARQUEMENT_PRIORITAIRE = new BigDecimal("7.00");
    public static final BigDecimal REPAS = new BigDecimal("9.00");
    public static final int ENREGISTREMENT_OUVERT_HEURES = 48;
    public static final int ENREGISTREMENT_FERME_HEURES = 1;
    public static final String LETTRES = "ABCDEF";

    /**
     * Calcule le nombre de rangées de l'appareil (6 sièges par rangée).
     *
     * @param capacite le nombre de places
     * @return le nombre de rangées
     */
    public static int rangees(int capacite) { return (capacite + LETTRES.length() - 1) / LETTRES.length(); }
}
