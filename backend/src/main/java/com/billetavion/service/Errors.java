package com.billetavion.service;

public final class Errors {
    private Errors() {}

    public static class NotFound extends RuntimeException {
        public NotFound(String message) { super(message); }
    }

    /** Règle métier non respectée (vol complet, doublon, suppression impossible...). */
    public static class Business extends RuntimeException {
        public Business(String message) { super(message); }
    }
}
