package com.billetavion.service;

import com.billetavion.model.*;
import com.billetavion.repo.ReservationRepository;
import com.billetavion.web.Dtos.*;
import org.springframework.stereotype.Component;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Period;
import java.util.List;

@Component
public class Mapper {
    private final ReservationRepository reservations;
    private final PromotionService promotions;

    public Mapper(ReservationRepository reservations, PromotionService promotions) {
        this.reservations = reservations; this.promotions = promotions;
    }

    public long placesRestantes(Vol v) {
        return v.getCapacite() - reservations.countByVolIdAndStatut(v.getId(), StatutReservation.CONFIRMEE);
    }

    public static String libelle(Vol v) {
        return v.getCompagnie() + " " + v.getNumeroVol() + " : " + v.getOrigine() + " → " + v.getDestination();
    }

    public VolDto vol(Vol v) {
        int promo = promotions.promoAutomatique(v);
        return new VolDto(v.getId(), v.getCompagnie(), v.getNumeroVol(), v.getOrigine(), v.getDestination(),
                v.getDateDepart(), v.getDateArrivee(), v.getCapacite(), v.getPrix(), v.getStatut(), placesRestantes(v),
                promo, Tarif.prix(v.getPrix(), Categorie.ADULTE, 0, promo));
    }

    public PassagerDto passager(Passager p) {
        LocalDate now = LocalDate.now();
        Categorie c = Categorie.pour(p.getDateNaissance(), now);
        return new PassagerDto(p.getId(), p.getNom(), p.getPrenom(), p.getDateNaissance(),
                Period.between(p.getDateNaissance(), now).getYears(), c, c.getLibelle(), p.getTelephone(), p.getEmail());
    }

    public ReservationDto reservation(Reservation r) {
        GroupeVoyage g = r.getGroupe();
        return new ReservationDto(r.getId(), r.getVol().getId(), libelle(r.getVol()), r.getVol().getDateDepart(),
                r.getPassager().getId(), r.getPassager().getNom() + " " + r.getPassager().getPrenom(),
                r.getCategorie(), g == null ? null : g.getId(), g == null ? null : g.getNom(),
                r.getPrix(), r.getCodePromo(), r.getRemisePromo(), r.getStatut(), r.getDateReservation());
    }

    public GroupeDto groupe(GroupeVoyage g) {
        List<Reservation> membres = reservations.findByGroupeIdAndStatut(g.getId(), StatutReservation.CONFIRMEE);
        BigDecimal total = membres.stream().map(Reservation::getPrix).reduce(BigDecimal.ZERO, BigDecimal::add);
        return new GroupeDto(g.getId(), g.getNom(), g.getResponsable(), g.getVol().getId(), libelle(g.getVol()),
                g.isActif(), membres.size(), Tarif.remiseGroupePourcent(membres.size()), total,
                membres.stream().map(this::reservation).toList());
    }
}
