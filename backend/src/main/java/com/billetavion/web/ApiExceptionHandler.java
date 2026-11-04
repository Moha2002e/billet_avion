package com.billetavion.web;

import com.billetavion.service.Errors;
import org.springframework.http.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(Errors.NotFound.class)
    ResponseEntity<Map<String, String>> notFound(Errors.NotFound e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
    }

    @ExceptionHandler(Errors.Unauthorized.class)
    ResponseEntity<Map<String, String>> unauthorized(Errors.Unauthorized e) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", e.getMessage()));
    }

    @ExceptionHandler(Errors.Forbidden.class)
    ResponseEntity<Map<String, String>> forbidden(Errors.Forbidden e) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
    }

    @ExceptionHandler(Errors.Business.class)
    ResponseEntity<Map<String, String>> business(Errors.Business e) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", e.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<Map<String, String>> invalid(MethodArgumentNotValidException e) {
        String msg = e.getBindingResult().getFieldErrors().stream()
                .map(f -> f.getField() + " : " + f.getDefaultMessage()).collect(Collectors.joining(" ; "));
        return ResponseEntity.badRequest().body(Map.of("message", msg));
    }

    @ExceptionHandler({MethodArgumentTypeMismatchException.class, org.springframework.http.converter.HttpMessageNotReadableException.class})
    ResponseEntity<Map<String, String>> badRequest(Exception e) {
        return ResponseEntity.badRequest().body(Map.of("message", "Requête invalide"));
    }
}
