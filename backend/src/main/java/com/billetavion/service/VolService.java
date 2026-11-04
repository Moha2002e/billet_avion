package com.billetavion.service;

import com.billetavion.model.*;
import com.billetavion.repo.*;
import com.billetavion.web.Dtos.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
@Transactional
public class VolService {
    private final VolRepository vols;
    private final ReservationRepository reservations;
    private final Mapper mapper;
    private final DisponibiliteService dispo;

    public VolService(VolRepository vols, ReservationRepository reservations, Mapper mapper, DisponibiliteService dispo) {
        this.vols = vols; this.reservations = reservations; this.mapper = mapper; this.dispo = dispo;
    }

    public Vol trouver(Long id) {
        return vols.findById(id).orElseThrow(() -> new Errors.NotFound("Vol introuvable : " + id));
    }

    /** Liste complète (utilisée par l'administration). */
    @Transactional(readOnly = true)
    public List<VolDto> lister(String origine, String destination, LocalDate date, boolean disponibles) {
        return vols.findAll().stream()
                .filter(v -> contient(v.getOrigine(), origine) && contient(v.getDestination(), destination))
                .filter(v -> date == null || v.getDateDepart().toLocalDate().equals(date))
                .map(mapper::vol)
                .filter(v -> !disponibles || (v.placesRestantes() > 0 && v.statut() == StatutVol.PROGRAMME))
                .sorted(Comparator.comparing(VolDto::dateDepart)).toList();
    }

    /** Recherche publique : vols programmés à venir, avec assez de places pour tous les passagers. */
    @Transactional(readOnly = true)
    public List<ResultatVolDto> rechercher(String origine, String destination, LocalDate date, int flexibilite,
                                           int adultes, int enfants, int bebes) {
        int sieges = adultes + enfants;
        int remiseGroupe = Tarif.remiseGroupePourcent(adultes + enfants + bebes);
        return vols.findAll().stream()
                .filter(v -> v.getStatut() == StatutVol.PROGRAMME && v.getDateDepart().isAfter(LocalDateTime.now()))
                .filter(v -> contient(v.getOrigine(), origine) && contient(v.getDestination(), destination))
                .filter(v -> date == null || Math.abs(java.time.temporal.ChronoUnit.DAYS.between(date, v.getDateDepart().toLocalDate())) <= flexibilite)
                .map(mapper::vol)
                .filter(v -> v.placesRestantes() >= sieges)
                .sorted(Comparator.comparing(VolDto::dateDepart))
                .map(v -> new ResultatVolDto(v, estimer(v, adultes, enfants, bebes, remiseGroupe))).toList();
    }

    private static BigDecimal estimer(VolDto v, int adultes, int enfants, int bebes, int remiseGroupe) {
        int promo = v.promoPourcent();
        return Tarif.prix(v.prix(), Categorie.ADULTE, remiseGroupe, promo).multiply(BigDecimal.valueOf(adultes))
                .add(Tarif.prix(v.prix(), Categorie.ENFANT, remiseGroupe, promo).multiply(BigDecimal.valueOf(enfants)))
                .add(Tarif.prix(v.prix(), Categorie.BEBE, remiseGroupe, promo).multiply(BigDecimal.valueOf(bebes)));
    }

    /** Villes proposées dans la barre de recherche. */
    @Transactional(readOnly = true)
    public List<String> villes() {
        Set<String> s = new TreeSet<>(String.CASE_INSENSITIVE_ORDER);
        vols.findAll().stream().filter(v -> v.getStatut() == StatutVol.PROGRAMME).forEach(v -> { s.add(v.getOrigine()); s.add(v.getDestination()); });
        return new ArrayList<>(s);
    }

    @Transactional(readOnly = true)
    public VolDto obtenir(Long id) { return mapper.vol(trouver(id)); }

    public VolDto creer(VolRequest r) {
        Vol v = new Vol();
        appliquer(v, r);
        return mapper.vol(vols.save(v));
    }

    public VolDto modifier(Long id, VolRequest r) {
        Vol v = trouver(id);
        long occupees = v.getCapacite() - dispo.placesRestantes(v);
        if (r.capacite() < occupees)
            throw new Errors.Business("Capacité inférieure au nombre de places déjà réservées (" + occupees + ")");
        appliquer(v, r);
        return mapper.vol(v);
    }

    public void supprimer(Long id) {
        Vol v = trouver(id);
        if (reservations.existsByVolId(id))
            throw new Errors.Business("Ce vol a des réservations : utilisez « Annuler le vol » (les passagers sont remboursés)");
        vols.delete(v);
    }

    /** Annule le vol : toutes les réservations actives sont annulées et intégralement remboursées. */
    public VolDto annuler(Long id) {
        Vol v = trouver(id);
        v.setStatut(StatutVol.ANNULE);
        for (Reservation r : reservations.findByVolId(id)) {
            if (r.getStatut() == StatutReservation.CONFIRMEE || r.getStatut() == StatutReservation.EN_ATTENTE) {
                BigDecimal paye = ReservationService.paye(r);
                r.setStatut(StatutReservation.ANNULEE);
                if (paye.signum() > 0)
                    r.getPaiements().add(new Paiement(r, paye.negate(), TypePaiement.REMBOURSEMENT, null, null, "Vol annulé par la compagnie"));
            }
        }
        return mapper.vol(v);
    }

    @Transactional(readOnly = true)
    public List<ManifesteDto> manifeste(Long id, Categorie categorie) {
        Vol v = trouver(id);
        return reservations.findByVolId(id).stream()
                .filter(r -> r.getStatut() == StatutReservation.CONFIRMEE)
                .flatMap(r -> r.getPassagers().stream())
                .filter(p -> categorie == null || p.getCategorie() == categorie)
                .map(p -> new ManifesteDto(p.getReservation().getReference(),
                        p.getNom() == null ? "(à renseigner)" : p.getPrenom() + " " + p.getNom(), p.getCategorie(),
                        p.getSiege(), p.getBagage(), p.getReservation().getStatut())).toList();
    }

    /** Plan de cabine : 6 sièges par rangée (A-F), prix selon la rangée, sièges déjà pris. */
    @Transactional(readOnly = true)
    public PlanDto plan(Long id, Long sauf) {
        Vol v = trouver(id);
        Set<String> pris = dispo.siegesPris(v, sauf);
        int rangees = Catalogue.rangees(v.getCapacite());
        List<RangeeDto> plan = new ArrayList<>();
        for (int rang = 1; rang <= rangees; rang++) {
            ClasseSiege c = ClasseSiege.duRang(rang);
            List<SiegeDto> sieges = new ArrayList<>();
            for (int i = 0; i < Catalogue.LETTRES.length(); i++) {
                if ((rang - 1) * Catalogue.LETTRES.length() + i >= v.getCapacite()) break;
                String code = rang + String.valueOf(Catalogue.LETTRES.charAt(i));
                sieges.add(new SiegeDto(code, !pris.contains(code)));
            }
            plan.add(new RangeeDto(rang, c, c.getPrix(), sieges));
        }
        return new PlanDto(id, rangees, plan);
    }

    private void appliquer(Vol v, VolRequest r) {
        if (!r.dateArrivee().isAfter(r.dateDepart()))
            throw new Errors.Business("La date d'arrivée doit être après la date de départ");
        if (r.origine().trim().equalsIgnoreCase(r.destination().trim()))
            throw new Errors.Business("L'origine et la destination doivent être différentes");
        v.setCompagnie(r.compagnie().trim()); v.setNumeroVol(r.numeroVol().trim());
        v.setOrigine(r.origine().trim()); v.setDestination(r.destination().trim());
        v.setDateDepart(r.dateDepart()); v.setDateArrivee(r.dateArrivee());
        v.setCapacite(r.capacite()); v.setPrix(r.prix());
    }

    private static boolean contient(String valeur, String filtre) {
        return filtre == null || filtre.isBlank() || valeur.toLowerCase().contains(filtre.trim().toLowerCase());
    }
}
