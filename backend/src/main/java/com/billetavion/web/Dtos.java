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

    public record ReservationRequest(@NotNull Long passagerId, @NotNull Long volId, String codePromo) {}

    public record GroupeRequest(
            @NotBlank String nom, @NotBlank String responsable, @NotNull Long volId,
            @NotEmpty List<Long> passagerIds, String codePromo) {}

    public record MembresRequest(@NotEmpty List<Long> passagerIds, String codePromo) {}

    public record LoginRequest(@NotBlank String username, @NotBlank String password) {}

    public record PromotionRequest(
            @NotBlank @Pattern(regexp = "^[A-Za-z0-9_-]{3,30}$", message = "3 à 30 caractères (lettres, chiffres, - _)") String code,
            @NotBlank String description,
            @Min(1) @Max(90) int pourcentage,
            @NotNull LocalDate dateDebut, @NotNull LocalDate dateFin,
            boolean automatique, Long volId, boolean actif) {}

    public record ChatRequest(@NotBlank @Size(max = 500) String message) {}

    // ---- Réponses ----
    public record VolDto(Long id, String compagnie, String numeroVol, String origine, String destination,
                         LocalDateTime dateDepart, LocalDateTime dateArrivee, int capacite, BigDecimal prix,
                         StatutVol statut, long placesRestantes, int promoPourcent, BigDecimal prixPromo) {}

    public record PassagerDto(Long id, String nom, String prenom, LocalDate dateNaissance, int age,
                              Categorie categorie, String categorieLibelle, String telephone, String email) {}

    public record ReservationDto(Long id, Long volId, String volLibelle, LocalDateTime dateDepart,
                                 Long passagerId, String passagerNom, Categorie categorie,
                                 Long groupeId, String groupeNom, BigDecimal prix,
                                 String codePromo, int remisePromo, StatutReservation statut, LocalDateTime dateReservation) {}

    public record GroupeDto(Long id, String nom, String responsable, Long volId, String volLibelle,
                            boolean actif, int nbPassagers, int remisePourcent, BigDecimal total,
                            List<ReservationDto> membres) {}

    public record PromotionDto(Long id, String code, String description, int pourcentage, LocalDate dateDebut,
                               LocalDate dateFin, boolean automatique, Long volId, String volLibelle,
                               boolean actif, boolean enCours) {}

    public record RemiseDto(String code, int pourcentage, String description) {}

    public record ChatReponse(String reponse, List<String> suggestions) {}

    public record StatsDto(long totalVols, long volsAVenir, long totalPassagers,
                           java.util.Map<Categorie, Long> passagersParCategorie,
                           long reservationsActives, long groupesActifs,
                           BigDecimal revenuTotal, int tauxRemplissagePourcent) {}
}
