package com.billetavion.web;

import com.billetavion.service.Errors;
import org.springframework.http.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Transforme les exceptions en réponses JSON {"message": …} avec le bon code HTTP.
 */
@RestControllerAdvice
public class ApiExceptionHandler {
    /**
     * Réponse 404 pour un élément introuvable.
     *
     * @param e l'exception interceptée
     * @return la réponse 404 avec le message
     */
    @ExceptionHandler(Errors.NotFound.class)
    ResponseEntity<Map<String, String>> notFound(Errors.NotFound e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
    }

    /**
     * Réponse 401 : connexion requise ou identifiants incorrects.
     *
     * @param e l'exception interceptée
     * @return la réponse 401 avec le message
     */
    @ExceptionHandler(Errors.Unauthorized.class)
    ResponseEntity<Map<String, String>> unauthorized(Errors.Unauthorized e) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", e.getMessage()));
    }

    /**
     * Réponse 403 : accès refusé.
     *
     * @param e l'exception interceptée
     * @return la réponse 403 avec le message
     */
    @ExceptionHandler(Errors.Forbidden.class)
    ResponseEntity<Map<String, String>> forbidden(Errors.Forbidden e) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
    }

    /**
     * Réponse 409 pour une règle métier non respectée.
     *
     * @param e l'exception interceptée
     * @return la réponse 409 avec le message
     */
    @ExceptionHandler(Errors.Business.class)
    ResponseEntity<Map<String, String>> business(Errors.Business e) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", e.getMessage()));
    }

    /**
     * Réponse 400 listant les champs invalides.
     *
     * @param e l'exception interceptée
     * @return la réponse 400 avec les erreurs de validation
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<Map<String, String>> invalid(MethodArgumentNotValidException e) {
        String msg = e.getBindingResult().getFieldErrors().stream()
                .map(f -> f.getField() + " : " + f.getDefaultMessage()).collect(Collectors.joining(" ; "));
        return ResponseEntity.badRequest().body(Map.of("message", msg));
    }

    /**
     * Réponse 400 pour une requête illisible.
     *
     * @param e l'exception interceptée
     * @return la réponse 400
     */
    @ExceptionHandler({MethodArgumentTypeMismatchException.class, org.springframework.http.converter.HttpMessageNotReadableException.class})
    ResponseEntity<Map<String, String>> badRequest(Exception e) {
        return ResponseEntity.badRequest().body(Map.of("message", "Requête invalide"));
    }
}
