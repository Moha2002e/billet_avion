package com.billetavion.model;

/** EN_ATTENTE : vol réservé 15 min avant paiement ; EXPIREE : le délai est dépassé sans paiement. */
public enum StatutReservation { EN_ATTENTE, CONFIRMEE, ANNULEE, EXPIREE }
