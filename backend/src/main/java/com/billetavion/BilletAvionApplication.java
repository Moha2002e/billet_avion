package com.billetavion;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Point d'entrée de l'application Spring Boot (back-end de réservation de billets d'avion).
 */
@SpringBootApplication
public class BilletAvionApplication {
    /**
     * Démarre l'application.
     *
     * @param args les arguments de la ligne de commande
     */
    public static void main(String[] args) {
        SpringApplication.run(BilletAvionApplication.class, args);
    }
}
