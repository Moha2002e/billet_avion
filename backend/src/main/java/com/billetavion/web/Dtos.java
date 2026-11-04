package com.billetavion.web;

import com.billetavion.model.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/** Objets échangés avec le front Angular. */
public final class Dtos {
    private Dtos() {}

    // ================= Requêtes =================
    public record VolRequest(
            @NotBlank String compagnie, @NotBlank String numeroVol,
            @NotBlank String origine, @NotBlank String destination,
            @NotNull LocalDateTime dateDepart, @NotNull LocalDateTime dateArrivee,
            @Min(1) int capacite, @NotNull @DecimalMin("0.01") BigDecimal prix) {}

    public record PromotionRequest(
            @NotBlank @Pattern(regexp = "^[A-Za-z0-9_-]{3,30}$", message = "3 à 30 caractères (lettres, chiffres, - _)") String code,
            @NotBlank String description,
            @Min(1) @Max(90) int pourcentage,
            @NotNull LocalDate dateDebut, @NotNull LocalDate dateFin,
            boolean automatique, Long volId, boolean actif) {}

    public record RegisterRequest(
            @NotBlank @Email String email,
            @NotBlank @Size(min = 8, max = 72, message = "8 caractères minimum") String motDePasse,
            @NotBlank String nom, @NotBlank String prenom,
            @Pattern(regexp = "^$|^[0-9+ ]{8,20}$", message = "Téléphone invalide") String telephone,
            @NotNull @Past LocalDate dateNaissance) {}

    public record LoginRequest(@NotBlank String identifiant, @NotBlank String motDePasse) {}

    public record ProfilRequest(
            @NotBlank String nom, @NotBlank String prenom,
            @Pattern(regexp = "^$|^[0-9+ ]{8,20}$", message = "Téléphone invalide") String telephone,
            @NotNull @Past LocalDate dateNaissance) {}

    public record ReservationCreate(@NotNull Long volId, @Min(0) int adultes, @Min(0) int enfants, @Min(0) int bebes, String codePromo) {}

    public record PassagerSaisie(@NotNull Long id, @NotBlank String nom, @NotBlank String prenom, LocalDate dateNaissance) {}
    public record PassagersRequest(@NotEmpty @Valid List<PassagerSaisie> passagers) {}

    public record OptionPassager(@NotNull Long id, String siege, Bagage bagage, boolean prioritaire, boolean repas) {}
    public record OptionsRequest(boolean assurance, @NotEmpty @Valid List<OptionPassager> passagers) {}

    /** Carte bancaire fictive. Si carteEnregistree est vrai, les autres champs sont ignorés. */
    public record PaiementRequest(String numeroCarte, String titulaire, String expiration, String cvv,
                                  boolean enregistrer, boolean carteEnregistree) {}

    public record ModificationRequest(@NotNull Long nouveauVolId, @NotNull @Valid PaiementRequest paiement) {}

    public record ChatRequest(@NotBlank @Size(max = 500) String message) {}

    // ================= Réponses =================
    public record VolDto(Long id, String compagnie, String numeroVol, String origine, String destination,
                         LocalDateTime dateDepart, LocalDateTime dateArrivee, int capacite, BigDecimal prix,
                         StatutVol statut, long placesRestantes, int promoPourcent, BigDecimal prixPromo) {}

    public record ResultatVolDto(VolDto vol, BigDecimal prixTotalEstime) {}

    public record CarteDto(String marque, String fin, String titulaire, String expiration) {}

    public record UtilisateurDto(Long id, String email, String nom, String prenom, String telephone,
                                 LocalDate dateNaissance, Role role, CarteDto carte) {}

    public record AuthReponse(String token, UtilisateurDto utilisateur) {}

    public record PassagerDto(Long id, TypePassager type, String nom, String prenom, LocalDate dateNaissance,
                              Categorie categorie, BigDecimal prixBillet, String siege, BigDecimal siegePrix,
                              Bagage bagage, boolean prioritaire, boolean repas, boolean enregistre) {}

    public record PaiementDto(BigDecimal montant, TypePaiement type, String carteMarque, String carteFin,
                              String motif, LocalDateTime date) {}

    public record TotauxDto(BigDecimal billets, BigDecimal sieges, BigDecimal bagages, BigDecimal options,
                            BigDecimal assurance, BigDecimal frais, BigDecimal total, BigDecimal paye, BigDecimal solde) {}

    public record ReservationDto(Long id, String reference, StatutReservation statut, VolDto vol,
                                 LocalDateTime creeLe, LocalDateTime expireLe, boolean assurance,
                                 String codePromo, int remisePromo, int remiseGroupe,
                                 List<PassagerDto> passagers, TotauxDto totaux, List<PaiementDto> paiements,
                                 boolean detailsComplets, boolean enregistrementOuvert, boolean modifiable,
                                 String porte, LocalDateTime heureEmbarquement, String client) {}

    public record ApercuModification(VolDto nouveauVol, BigDecimal ancienBillets, BigDecimal nouveauBillets,
                                     BigDecimal difference, BigDecimal frais, int fraisPourcent, BigDecimal aPayer) {}

    public record SiegeDto(String code, boolean libre) {}
    public record RangeeDto(int rang, ClasseSiege classe, BigDecimal prix, List<SiegeDto> sieges) {}
    public record PlanDto(Long volId, int rangees, List<RangeeDto> plan) {}

    public record ManifesteDto(String reference, String passager, Categorie categorie, String siege,
                               Bagage bagage, StatutReservation statut) {}

    public record PromotionDto(Long id, String code, String description, int pourcentage, LocalDate dateDebut,
                               LocalDate dateFin, boolean automatique, Long volId, String volLibelle,
                               boolean actif, boolean enCours) {}

    public record RemiseDto(String code, int pourcentage, String description) {}

    public record ChatReponse(String reponse, List<String> suggestions) {}

    public record StatsDto(long totalVols, long volsAVenir, long clients, long reservationsConfirmees,
                           long reservationsEnAttente, Map<Categorie, Long> passagersParCategorie,
                           BigDecimal revenuTotal, int tauxRemplissagePourcent) {}
}
