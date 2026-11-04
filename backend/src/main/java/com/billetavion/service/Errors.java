package com.billetavion.service;

/**
 * Exceptions métier de l'application, converties en réponses HTTP par ApiExceptionHandler.
 */
public final class Errors {
    /**
     * Classe utilitaire : ne s'instancie pas.
     */
    private Errors() {}

    /**
     * Élément introuvable (HTTP 404).
     */
    public static class NotFound extends RuntimeException {
        /**
         * Crée l'exception.
         *
         * @param message le message affiché à l'utilisateur
         */
        public NotFound(String message) { super(message); }
    }

    /** Règle métier non respectée (vol complet, doublon, suppression impossible...). */
    public static class Business extends RuntimeException {
        /**
         * Crée l'exception.
         *
         * @param message le message affiché à l'utilisateur
         */
        public Business(String message) { super(message); }
    }

    /**
     * Authentification requise ou identifiants incorrects (HTTP 401).
     */
    public static class Unauthorized extends RuntimeException {
        /**
         * Crée l'exception.
         *
         * @param message le message affiché à l'utilisateur
         */
        public Unauthorized(String message) { super(message); }
    }

    /**
     * Accès refusé à ce compte (HTTP 403).
     */
    public static class Forbidden extends RuntimeException {
        /**
         * Crée l'exception.
         *
         * @param message le message affiché à l'utilisateur
         */
        public Forbidden(String message) { super(message); }
    }
}
