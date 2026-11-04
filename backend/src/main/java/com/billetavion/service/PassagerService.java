package com.billetavion.service;

import com.billetavion.model.*;
import com.billetavion.repo.*;
import com.billetavion.web.Dtos.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;

@Service
@Transactional
public class PassagerService {
    private final PassagerRepository passagers;
    private final ReservationRepository reservations;
    private final Mapper mapper;

    public PassagerService(PassagerRepository passagers, ReservationRepository reservations, Mapper mapper) {
        this.passagers = passagers; this.reservations = reservations; this.mapper = mapper;
    }

    public Passager trouver(Long id) {
        return passagers.findById(id).orElseThrow(() -> new Errors.NotFound("Passager introuvable : " + id));
    }

    @Transactional(readOnly = true)
    public List<PassagerDto> lister(String q, Categorie categorie) {
        return passagers.findAll().stream()
                .filter(p -> q == null || q.isBlank()
                        || (p.getNom() + " " + p.getPrenom()).toLowerCase().contains(q.trim().toLowerCase()))
                .map(mapper::passager)
                .filter(p -> categorie == null || p.categorie() == categorie)
                .sorted(Comparator.comparing(PassagerDto::nom, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    @Transactional(readOnly = true)
    public PassagerDto obtenir(Long id) { return mapper.passager(trouver(id)); }

    public PassagerDto creer(PassagerRequest r) {
        Passager p = new Passager();
        appliquer(p, r);
        return mapper.passager(passagers.save(p));
    }

    public PassagerDto modifier(Long id, PassagerRequest r) {
        Passager p = trouver(id);
        appliquer(p, r);
        return mapper.passager(p);
    }

    public void supprimer(Long id) {
        Passager p = trouver(id);
        if (reservations.existsByPassagerIdAndStatut(id, StatutReservation.CONFIRMEE))
            throw new Errors.Business("Ce passager a des réservations actives : annulez-les d'abord");
        if (!reservations.findByPassagerIdOrderByDateReservationDesc(id).isEmpty())
            throw new Errors.Business("Ce passager a un historique de réservations et ne peut pas être supprimé");
        passagers.delete(p);
    }

    @Transactional(readOnly = true)
    public List<ReservationDto> reservationsDe(Long id) {
        trouver(id);
        return reservations.findByPassagerIdOrderByDateReservationDesc(id).stream().map(mapper::reservation).toList();
    }

    private void appliquer(Passager p, PassagerRequest r) {
        if (r.dateNaissance().isAfter(LocalDate.now()))
            throw new Errors.Business("Date de naissance invalide");
        p.setNom(r.nom().trim()); p.setPrenom(r.prenom().trim());
        p.setDateNaissance(r.dateNaissance()); p.setTelephone(r.telephone().trim());
        p.setEmail(r.email() == null || r.email().isBlank() ? null : r.email().trim());
    }
}
