package com.billetavion.service;

import com.billetavion.model.*;
import com.billetavion.web.Dtos.*;
import org.springframework.stereotype.Component;
import java.time.LocalDate;

/**
 * Convertit les entités en objets de réponse (DTO) envoyés au front Angular.
 */
@Component
public class Mapper {
    private final DisponibiliteService dispo;
    private final PromotionService promotions;

    /**
     * Construit le convertisseur.
     *
     * @param dispo le service de disponibilité
     * @param promotions le dépôt ou service des promotions
     */
    public Mapper(DisponibiliteService dispo, PromotionService promotions) {
        this.dispo = dispo; this.promotions = promotions;
    }

    /**
     * Texte lisible d'un vol (« Compagnie N° : départ → arrivée »).
     *
     * @param v le vol
     * @return le libellé du vol
     */
    public static String libelle(Vol v) {
        return v.getCompagnie() + " " + v.getNumeroVol() + " : " + v.getOrigine() + " → " + v.getDestination();
    }

    /**
     * Convertit un vol en objet de réponse, avec places restantes et prix promotionnel.
     *
     * @param v le vol
     * @return le vol à envoyer au front
     */
    public VolDto vol(Vol v) {
        int promo = promotions.promoAutomatique(v);
        return new VolDto(v.getId(), v.getCompagnie(), v.getNumeroVol(), v.getOrigine(), v.getDestination(),
                v.getDateDepart(), v.getDateArrivee(), v.getCapacite(), v.getPrix(), v.getStatut(),
                dispo.placesRestantes(v), promo, Tarif.prix(v.getPrix(), Categorie.ADULTE, 0, promo));
    }

    /**
     * Convertit un compte en objet de réponse (sans mot de passe ni numéro de carte).
     *
     * @param u le compte utilisateur
     * @return le compte à envoyer au front
     */
    public UtilisateurDto utilisateur(Utilisateur u) {
        CarteDto carte = u.getCarteFin() == null ? null
                : new CarteDto(u.getCarteMarque(), u.getCarteFin(), u.getCarteTitulaire(), u.getCarteExpiration());
        return new UtilisateurDto(u.getId(), u.getEmail(), u.getNom(), u.getPrenom(), u.getTelephone(),
                u.getDateNaissance(), u.getRole(), carte);
    }

    /**
     * Catégorie d'âge supposée avant la saisie de la date de naissance.
     *
     * @param t le type de passager
     * @return la catégorie par défaut du type
     */
    public static Categorie categorieDefaut(TypePassager t) {
        return switch (t) { case ADULTE -> Categorie.ADULTE; case ENFANT -> Categorie.ENFANT; case BEBE -> Categorie.BEBE; };
    }

    /**
     * Catégorie d'âge d'un passager à la date du vol (ou catégorie par défaut sans date de naissance).
     *
     * @param p le passager
     * @param aLaDate la date de référence (jour du vol)
     * @return la catégorie d'âge
     */
    public static Categorie categorie(ReservationPassager p, LocalDate aLaDate) {
        return p.getDateNaissance() == null ? categorieDefaut(p.getType()) : Categorie.pour(p.getDateNaissance(), aLaDate);
    }
}
