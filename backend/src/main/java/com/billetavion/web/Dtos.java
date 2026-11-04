package com.billetavion.web;

import com.billetavion.model.*;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/** Objets échangés avec le front Angular. */
public final class Dtos {
    private Dtos() {}

    // ---- Requêtes ----
    public record VolRequest(
            @NotBlank String compagnie, @NotBlank String numeroVol,
            @NotBlank String origine, @NotBlank String destination,
            @NotNull LocalDateTime dateDepart, @NotNull LocalDateTime dateArrivee,
            @Min(1) int capacite, @NotNull @DecimalMin("0.01") BigDecimal prix) {}

    public record PassagerRequest(
            @NotBlank String nom, @NotBlank String prenom,
            @NotNull @Past LocalDate dateNaissance,
            @NotBlank @Pattern(regexp = "^[0-9]{10,15}$", message = "Numéro de téléphone invalide (10 à 15 chiffres)") String telephone,
            @Email String email) {}

    public record ReservationRequest(@NotNull Long passagerId, @NotNull Long volId) {}

    public record GroupeRequest(
            @NotBlank String nom, @NotBlank String responsable, @NotNull Long volId,
            @NotEmpty List<Long> passagerIds) {}

    public record MembresRequest(@NotEmpty List<Long> passagerIds) {}

    // ---- Réponses ----
    public record VolDto(Long id, String compagnie, String numeroVol, String origine, String destination,
                         LocalDateTime dateDepart, LocalDateTime dateArrivee, int capacite, BigDecimal prix,
                         StatutVol statut, long placesRestantes) {}

    public record PassagerDto(Long id, String nom, String prenom, LocalDate dateNaissance, int age,
                              Categorie categorie, String categorieLibelle, String telephone, String email) {}

    public record ReservationDto(Long id, Long volId, String volLibelle, LocalDateTime dateDepart,
                                 Long passagerId, String passagerNom, Categorie categorie,
                                 Long groupeId, String groupeNom, BigDecimal prix,
                                 StatutReservation statut, LocalDateTime dateReservation) {}

    public record GroupeDto(Long id, String nom, String responsable, Long volId, String volLibelle,
                            boolean actif, int nbPassagers, int remisePourcent, BigDecimal total,
                            List<ReservationDto> membres) {}

    public record StatsDto(long totalVols, long volsAVenir, long totalPassagers,
                           java.util.Map<Categorie, Long> passagersParCategorie,
                           long reservationsActives, long groupesActifs,
                           BigDecimal revenuTotal, int tauxRemplissagePourcent) {}
}
