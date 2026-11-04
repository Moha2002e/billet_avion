package com.billetavion.service;

import com.billetavion.model.*;
import com.billetavion.repo.*;
import com.billetavion.web.Dtos.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.List;

@Service
@Transactional
public class VolService {
    private final VolRepository vols;
    private final ReservationRepository reservations;
    private final GroupeRepository groupes;
    private final Mapper mapper;

    public VolService(VolRepository vols, ReservationRepository reservations, GroupeRepository groupes, Mapper mapper) {
        this.vols = vols; this.reservations = reservations; this.groupes = groupes; this.mapper = mapper;
    }

    public Vol trouver(Long id) {
        return vols.findById(id).orElseThrow(() -> new Errors.NotFound("Vol introuvable : " + id));
    }

    @Transactional(readOnly = true)
    public List<VolDto> lister(String origine, String destination, LocalDate date, boolean disponibles) {
        return vols.findAll().stream()
                .filter(v -> contient(v.getOrigine(), origine) && contient(v.getDestination(), destination))
                .filter(v -> date == null || v.getDateDepart().toLocalDate().equals(date))
                .map(mapper::vol)
                .filter(v -> !disponibles || (v.placesRestantes() > 0 && v.statut() == StatutVol.PROGRAMME))
                .sorted(java.util.Comparator.comparing(VolDto::dateDepart))
                .toList();
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
        long reservees = v.getCapacite() - mapper.placesRestantes(v);
        if (r.capacite() < reservees)
            throw new Errors.Business("Capacité inférieure au nombre de places déjà réservées (" + reservees + ")");
        appliquer(v, r);
        return mapper.vol(v);
    }

    public void supprimer(Long id) {
        Vol v = trouver(id);
        if (reservations.existsByVolIdAndStatut(id, StatutReservation.CONFIRMEE))
            throw new Errors.Business("Impossible de supprimer un vol qui a des réservations actives : annulez-les d'abord");
        if (groupes.existsByVolId(id) || !reservations.findByVolIdAndStatut(id, StatutReservation.ANNULEE).isEmpty())
            throw new Errors.Business("Ce vol a un historique de réservations : utilisez « Annuler le vol »");
        vols.delete(v);
    }

    /** Annule le vol et toutes ses réservations. */
    public VolDto annuler(Long id) {
        Vol v = trouver(id);
        v.setStatut(StatutVol.ANNULE);
        reservations.findByVolIdAndStatut(id, StatutReservation.CONFIRMEE)
                .forEach(r -> r.setStatut(StatutReservation.ANNULEE));
        return mapper.vol(v);
    }

    /** Liste des passagers du vol (manifeste), filtrable par catégorie (ex. JEUNE). */
    @Transactional(readOnly = true)
    public List<ReservationDto> manifeste(Long id, Categorie categorie) {
        trouver(id);
        return reservations.findByVolIdAndStatut(id, StatutReservation.CONFIRMEE).stream()
                .filter(r -> categorie == null || r.getCategorie() == categorie)
                .map(mapper::reservation).toList();
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
