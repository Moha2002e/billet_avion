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
    /**
     * Classe utilitaire : ne s'instancie pas.
     */
    private Dtos() {}

    // ================= Requêtes =================
    /**
     * Informations pour ajouter ou modifier un vol.
     *
     * @param compagnie la compagnie aérienne
     * @param numeroVol le numéro de vol
     * @param origine la ville de départ
     * @param destination la ville d'arrivée
     * @param dateDepart la date et l'heure de départ
     * @param dateArrivee la date et l'heure d'arrivée
     * @param capacite le nombre de places
     * @param prix le prix
     */
    public record VolRequest(
            @NotBlank String compagnie, @NotBlank String numeroVol,
            @NotBlank String origine, @NotBlank String destination,
            @NotNull LocalDateTime dateDepart, @NotNull LocalDateTime dateArrivee,
            @Min(1) int capacite, @NotNull @DecimalMin("0.01") BigDecimal prix) {}

    /**
     * Informations pour ajouter ou modifier une promotion.
     *
     * @param code le code
     * @param description la description
     * @param pourcentage le pourcentage de remise
     * @param dateDebut le premier jour de validité
     * @param dateFin le dernier jour de validité
     * @param automatique vrai si la promotion s'applique sans code
     * @param volId l'identifiant du vol
     * @param actif vrai si la promotion est activée
     */
    public record PromotionRequest(
            @NotBlank @Pattern(regexp = "^[A-Za-z0-9_-]{3,30}$", message = "3 à 30 caractères (lettres, chiffres, - _)") String code,
            @NotBlank String description,
            @Min(1) @Max(90) int pourcentage,
            @NotNull LocalDate dateDebut, @NotNull LocalDate dateFin,
            boolean automatique, Long volId, boolean actif) {}

    /**
     * Informations d'inscription d'un client.
     *
     * @param email l'adresse e-mail (identifiant de connexion)
     * @param motDePasse le mot de passe
     * @param nom le nom de famille
     * @param prenom le prénom
     * @param telephone le numéro de téléphone
     * @param dateNaissance la date de naissance
     */
    public record RegisterRequest(
            @NotBlank @Email String email,
            @NotBlank @Size(min = 8, max = 72, message = "8 caractères minimum") String motDePasse,
            @NotBlank String nom, @NotBlank String prenom,
            @Pattern(regexp = "^$|^[0-9+ ]{8,20}$", message = "Téléphone invalide") String telephone,
            @NotNull @Past LocalDate dateNaissance) {}

    /**
     * Identifiant et mot de passe de connexion.
     *
     * @param identifiant l'identifiant de connexion (e-mail)
     * @param motDePasse le mot de passe
     */
    public record LoginRequest(@NotBlank String identifiant, @NotBlank String motDePasse) {}

    /**
     * Nouvelles informations de profil d'un client.
     *
     * @param nom le nom de famille
     * @param prenom le prénom
     * @param telephone le numéro de téléphone
     * @param dateNaissance la date de naissance
     */
    public record ProfilRequest(
            @NotBlank String nom, @NotBlank String prenom,
            @Pattern(regexp = "^$|^[0-9+ ]{8,20}$", message = "Téléphone invalide") String telephone,
            @NotNull @Past LocalDate dateNaissance) {}

    /**
     * Demande de création d'une réservation : vol, passagers par type, code promo.
     *
     * @param volId l'identifiant du vol
     * @param adultes le nombre d'adultes
     * @param enfants le nombre d'enfants
     * @param bebes le nombre de bébés
     * @param codePromo le code promo appliqué
     */
    public record ReservationCreate(@NotNull Long volId, @Min(0) int adultes, @Min(0) int enfants, @Min(0) int bebes, String codePromo) {}

    /**
     * Identité saisie pour un passager d'une réservation.
     *
     * @param id l'identifiant
     * @param nom le nom de famille
     * @param prenom le prénom
     * @param dateNaissance la date de naissance
     */
    public record PassagerSaisie(@NotNull Long id, @NotBlank String nom, @NotBlank String prenom, LocalDate dateNaissance) {}
    /**
     * Liste des passagers saisis.
     *
     * @param passagers la liste des passagers
     */
    public record PassagersRequest(@NotEmpty @Valid List<PassagerSaisie> passagers) {}

    /**
     * Choix d'un passager : siège, bagage, embarquement prioritaire, repas.
     *
     * @param id l'identifiant
     * @param siege le siège choisi (ex. 12A)
     * @param bagage le bagage choisi
     * @param prioritaire l'option d'embarquement prioritaire
     * @param repas l'option repas à bord
     */
    public record OptionPassager(@NotNull Long id, String siege, Bagage bagage, boolean prioritaire, boolean repas) {}
    /**
     * Choix de toute la réservation : assurance et options par passager.
     *
     * @param assurance l'assurance annulation
     * @param passagers la liste des passagers
     */
    public record OptionsRequest(boolean assurance, @NotEmpty @Valid List<OptionPassager> passagers) {}

    /** Carte bancaire fictive. Si carteEnregistree est vrai, les autres champs sont ignorés. */
    public record PaiementRequest(String numeroCarte, String titulaire, String expiration, String cvv,
                                  boolean enregistrer, boolean carteEnregistree) {}

    /**
     * Demande de changement de vol : nouveau vol et carte pour payer les frais.
     *
     * @param nouveauVolId l'identifiant du nouveau vol
     * @param paiement la valeur « paiement »
     */
    public record ModificationRequest(@NotNull Long nouveauVolId, @NotNull @Valid PaiementRequest paiement) {}

    /**
     * Question posée au chatbot.
     *
     * @param message le message
     */
    public record ChatRequest(@NotBlank @Size(max = 500) String message) {}

    // ================= Réponses =================
    /**
     * Vol envoyé au front, avec places restantes et prix promotionnel.
     *
     * @param id l'identifiant
     * @param compagnie la compagnie aérienne
     * @param numeroVol le numéro de vol
     * @param origine la ville de départ
     * @param destination la ville d'arrivée
     * @param dateDepart la date et l'heure de départ
     * @param dateArrivee la date et l'heure d'arrivée
     * @param capacite le nombre de places
     * @param prix le prix
     * @param statut le statut
     * @param placesRestantes la valeur « placesRestantes »
     * @param promoPourcent la valeur « promoPourcent »
     * @param prixPromo la valeur « prixPromo »
     */
    public record VolDto(Long id, String compagnie, String numeroVol, String origine, String destination,
                         LocalDateTime dateDepart, LocalDateTime dateArrivee, int capacite, BigDecimal prix,
                         StatutVol statut, long placesRestantes, int promoPourcent, BigDecimal prixPromo) {}

    /**
     * Résultat d'une recherche : vol et prix total estimé pour tous les passagers.
     *
     * @param vol le vol
     * @param prixTotalEstime la valeur « prixTotalEstime »
     */
    public record ResultatVolDto(VolDto vol, BigDecimal prixTotalEstime) {}

    /**
     * Carte enregistrée (marque et 4 derniers chiffres seulement).
     *
     * @param marque la valeur « marque »
     * @param fin la valeur « fin »
     * @param titulaire la valeur « titulaire »
     * @param expiration la valeur « expiration »
     */
    public record CarteDto(String marque, String fin, String titulaire, String expiration) {}

    /**
     * Compte envoyé au front (jamais le mot de passe).
     *
     * @param id l'identifiant
     * @param email l'adresse e-mail (identifiant de connexion)
     * @param nom le nom de famille
     * @param prenom le prénom
     * @param telephone le numéro de téléphone
     * @param dateNaissance la date de naissance
     * @param role le rôle (client ou administrateur)
     * @param carte la valeur « carte »
     */
    public record UtilisateurDto(Long id, String email, String nom, String prenom, String telephone,
                                 LocalDate dateNaissance, Role role, CarteDto carte) {}

    /**
     * Réponse de connexion : jeton de session et compte.
     *
     * @param token la valeur « token »
     * @param utilisateur le client propriétaire
     */
    public record AuthReponse(String token, UtilisateurDto utilisateur) {}

    /**
     * Passager d'une réservation avec son prix, son siège et ses options.
     *
     * @param id l'identifiant
     * @param type le type de passager
     * @param nom le nom de famille
     * @param prenom le prénom
     * @param dateNaissance la date de naissance
     * @param categorie la catégorie d'âge
     * @param prixBillet le prix du billet après remises
     * @param siege le siège choisi (ex. 12A)
     * @param siegePrix le supplément payé pour le siège
     * @param bagage le bagage choisi
     * @param prioritaire l'option d'embarquement prioritaire
     * @param repas l'option repas à bord
     * @param enregistre l'état d'enregistrement en ligne
     */
    public record PassagerDto(Long id, TypePassager type, String nom, String prenom, LocalDate dateNaissance,
                              Categorie categorie, BigDecimal prixBillet, String siege, BigDecimal siegePrix,
                              Bagage bagage, boolean prioritaire, boolean repas, boolean enregistre) {}

    /**
     * Opération de paiement ou de remboursement.
     *
     * @param montant le montant (négatif pour un remboursement)
     * @param type le type de passager
     * @param carteMarque la marque de la carte enregistrée
     * @param carteFin les 4 derniers chiffres de la carte enregistrée
     * @param motif le motif du paiement
     * @param date la valeur « date »
     */
    public record PaiementDto(BigDecimal montant, TypePaiement type, String carteMarque, String carteFin,
                              String motif, LocalDateTime date) {}

    /**
     * Totaux d'une réservation : billets, sièges, bagages, options, assurance, frais, total, payé et solde.
     *
     * @param billets la valeur « billets »
     * @param sieges la valeur « sieges »
     * @param bagages la valeur « bagages »
     * @param options la valeur « options »
     * @param assurance l'assurance annulation
     * @param frais la valeur « frais »
     * @param total la valeur « total »
     * @param paye la valeur « paye »
     * @param solde la valeur « solde »
     */
    public record TotauxDto(BigDecimal billets, BigDecimal sieges, BigDecimal bagages, BigDecimal options,
                            BigDecimal assurance, BigDecimal frais, BigDecimal total, BigDecimal paye, BigDecimal solde) {}

    /**
     * Réservation complète envoyée au front (vol, passagers, totaux, paiements, états).
     *
     * @param id l'identifiant
     * @param reference la référence de réservation à 6 caractères
     * @param statut le statut
     * @param vol le vol
     * @param creeLe la date de création
     * @param expireLe la fin du délai de paiement
     * @param assurance l'assurance annulation
     * @param codePromo le code promo appliqué
     * @param remisePromo la remise promotionnelle (en pourcentage)
     * @param remiseGroupe la remise de groupe en pourcentage
     * @param passagers la liste des passagers
     * @param totaux la valeur « totaux »
     * @param paiements la liste des paiements
     * @param detailsComplets la valeur « detailsComplets »
     * @param enregistrementOuvert la valeur « enregistrementOuvert »
     * @param modifiable la valeur « modifiable »
     * @param porte la valeur « porte »
     * @param heureEmbarquement la valeur « heureEmbarquement »
     * @param client la valeur « client »
     */
    public record ReservationDto(Long id, String reference, StatutReservation statut, VolDto vol,
                                 LocalDateTime creeLe, LocalDateTime expireLe, boolean assurance,
                                 String codePromo, int remisePromo, int remiseGroupe,
                                 List<PassagerDto> passagers, TotauxDto totaux, List<PaiementDto> paiements,
                                 boolean detailsComplets, boolean enregistrementOuvert, boolean modifiable,
                                 String porte, LocalDateTime heureEmbarquement, String client) {}

    /**
     * Aperçu du coût d'un changement de vol : différence de prix, frais et total à payer.
     *
     * @param nouveauVol la valeur « nouveauVol »
     * @param ancienBillets la valeur « ancienBillets »
     * @param nouveauBillets la valeur « nouveauBillets »
     * @param difference la valeur « difference »
     * @param frais la valeur « frais »
     * @param fraisPourcent la valeur « fraisPourcent »
     * @param aPayer la valeur « aPayer »
     */
    public record ApercuModification(VolDto nouveauVol, BigDecimal ancienBillets, BigDecimal nouveauBillets,
                                     BigDecimal difference, BigDecimal frais, int fraisPourcent, BigDecimal aPayer) {}

    /**
     * Siège du plan de cabine et sa disponibilité.
     *
     * @param code le code
     * @param libre la valeur « libre »
     */
    public record SiegeDto(String code, boolean libre) {}
    /**
     * Rangée du plan de cabine : catégorie, prix et sièges.
     *
     * @param rang la valeur « rang »
     * @param classe la valeur « classe »
     * @param prix le prix
     * @param sieges la valeur « sieges »
     */
    public record RangeeDto(int rang, ClasseSiege classe, BigDecimal prix, List<SiegeDto> sieges) {}
    /**
     * Plan de cabine d'un vol.
     *
     * @param volId l'identifiant du vol
     * @param rangees la valeur « rangees »
     * @param plan la valeur « plan »
     */
    public record PlanDto(Long volId, int rangees, List<RangeeDto> plan) {}

    /**
     * Ligne du manifeste d'un vol (un passager).
     *
     * @param reference la référence de réservation à 6 caractères
     * @param passager la valeur « passager »
     * @param categorie la catégorie d'âge
     * @param siege le siège choisi (ex. 12A)
     * @param bagage le bagage choisi
     * @param statut le statut
     */
    public record ManifesteDto(String reference, String passager, Categorie categorie, String siege,
                               Bagage bagage, StatutReservation statut) {}

    /**
     * Promotion envoyée au front.
     *
     * @param id l'identifiant
     * @param code le code
     * @param description la description
     * @param pourcentage le pourcentage de remise
     * @param dateDebut le premier jour de validité
     * @param dateFin le dernier jour de validité
     * @param automatique vrai si la promotion s'applique sans code
     * @param volId l'identifiant du vol
     * @param volLibelle la valeur « volLibelle »
     * @param actif vrai si la promotion est activée
     * @param enCours la valeur « enCours »
     */
    public record PromotionDto(Long id, String code, String description, int pourcentage, LocalDate dateDebut,
                               LocalDate dateFin, boolean automatique, Long volId, String volLibelle,
                               boolean actif, boolean enCours) {}

    /**
     * Remise d'un code promo vérifié.
     *
     * @param code le code
     * @param pourcentage le pourcentage de remise
     * @param description la description
     */
    public record RemiseDto(String code, int pourcentage, String description) {}

    /**
     * Réponse du chatbot et suggestions de questions.
     *
     * @param reponse la valeur « reponse »
     * @param suggestions la valeur « suggestions »
     */
    public record ChatReponse(String reponse, List<String> suggestions) {}

    /** Bilan de l'insertion des données de démonstration : ce qui a été ajouté et ce qui existait déjà. */
    public record DonneesDto(int volsAjoutes, int volsExistants, int promotionsAjoutees, int promotionsExistantes,
                             int clientsAjoutes, int clientsExistants, int reservationsAjoutees) {}

    /**
     * Statistiques du tableau de bord de l'administrateur.
     *
     * @param totalVols la valeur « totalVols »
     * @param volsAVenir la valeur « volsAVenir »
     * @param clients la valeur « clients »
     * @param reservationsConfirmees la valeur « reservationsConfirmees »
     * @param reservationsEnAttente la valeur « reservationsEnAttente »
     * @param passagersParCategorie la valeur « passagersParCategorie »
     * @param revenuTotal la valeur « revenuTotal »
     * @param tauxRemplissagePourcent la valeur « tauxRemplissagePourcent »
     */
    public record StatsDto(long totalVols, long volsAVenir, long clients, long reservationsConfirmees,
                           long reservationsEnAttente, Map<Categorie, Long> passagersParCategorie,
                           BigDecimal revenuTotal, int tauxRemplissagePourcent) {}
}
