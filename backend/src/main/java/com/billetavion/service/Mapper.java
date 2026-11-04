package com.billetavion.service;

import com.billetavion.model.*;
import com.billetavion.web.Dtos.*;
import org.springframework.stereotype.Component;
import java.time.LocalDate;

@Component
public class Mapper {
    private final DisponibiliteService dispo;
    private final PromotionService promotions;

    public Mapper(DisponibiliteService dispo, PromotionService promotions) {
        this.dispo = dispo; this.promotions = promotions;
    }

    public static String libelle(Vol v) {
        return v.getCompagnie() + " " + v.getNumeroVol() + " : " + v.getOrigine() + " → " + v.getDestination();
    }

    public VolDto vol(Vol v) {
        int promo = promotions.promoAutomatique(v);
        return new VolDto(v.getId(), v.getCompagnie(), v.getNumeroVol(), v.getOrigine(), v.getDestination(),
                v.getDateDepart(), v.getDateArrivee(), v.getCapacite(), v.getPrix(), v.getStatut(),
                dispo.placesRestantes(v), promo, Tarif.prix(v.getPrix(), Categorie.ADULTE, 0, promo));
    }

    public UtilisateurDto utilisateur(Utilisateur u) {
        CarteDto carte = u.getCarteFin() == null ? null
                : new CarteDto(u.getCarteMarque(), u.getCarteFin(), u.getCarteTitulaire(), u.getCarteExpiration());
        return new UtilisateurDto(u.getId(), u.getEmail(), u.getNom(), u.getPrenom(), u.getTelephone(),
                u.getDateNaissance(), u.getRole(), carte);
    }

    public static Categorie categorieDefaut(TypePassager t) {
        return switch (t) { case ADULTE -> Categorie.ADULTE; case ENFANT -> Categorie.ENFANT; case BEBE -> Categorie.BEBE; };
    }

    public static Categorie categorie(ReservationPassager p, LocalDate aLaDate) {
        return p.getDateNaissance() == null ? categorieDefaut(p.getType()) : Categorie.pour(p.getDateNaissance(), aLaDate);
    }
}
