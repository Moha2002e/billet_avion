package com.billetavion.service;

import com.billetavion.model.*;
import com.billetavion.repo.*;
import com.billetavion.web.Dtos.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
public class ReservationService {
    private final ReservationRepository reservations;
    private final VolService volService;
    private final PassagerService passagerService;
    private final Mapper mapper;
    private final PromotionService promotions;

    public ReservationService(ReservationRepository reservations, VolService volService,
                              PassagerService passagerService, Mapper mapper, PromotionService promotions) {
        this.promotions = promotions;
        this.reservations = reservations; this.volService = volService;
        this.passagerService = passagerService; this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public List<ReservationDto> lister(Long volId, Long passagerId, StatutReservation statut) {
        return reservations.findAllByOrderByDateReservationDesc().stream()
                .filter(r -> volId == null || r.getVol().getId().equals(volId))
                .filter(r -> passagerId == null || r.getPassager().getId().equals(passagerId))
                .filter(r -> statut == null || r.getStatut() == statut)
                .map(mapper::reservation).toList();
    }

    public ReservationDto creer(ReservationRequest req) {
        Vol vol = volService.trouver(req.volId());
        Passager p = passagerService.trouver(req.passagerId());
        verifierVolReservable(vol, 1);
        return mapper.reservation(ajouter(vol, p, null, promotions.remisePour(vol, req.codePromo())));
    }

    public ReservationDto annuler(Long id) {
        Reservation r = reservations.findById(id).orElseThrow(() -> new Errors.NotFound("Réservation introuvable : " + id));
        if (r.getStatut() == StatutReservation.ANNULEE) throw new Errors.Business("Réservation déjà annulée");
        r.setStatut(StatutReservation.ANNULEE);
        if (r.getGroupe() != null) recalculerGroupe(r.getGroupe());
        return mapper.reservation(r);
    }

    // ---- Utilitaires partagés avec GroupeService ----

    /** Vérifie que le vol est programmé, dans le futur, et a assez de places. */
    void verifierVolReservable(Vol vol, int places) {
        if (vol.getStatut() != StatutVol.PROGRAMME) throw new Errors.Business("Ce vol est annulé");
        if (!vol.getDateDepart().isAfter(LocalDateTime.now())) throw new Errors.Business("Ce vol est déjà parti");
        if (mapper.placesRestantes(vol) < places)
            throw new Errors.Business("Pas assez de places : " + mapper.placesRestantes(vol) + " restante(s)");
    }

    Reservation ajouter(Vol vol, Passager p, GroupeVoyage groupe, PromotionService.Remise remise) {
        if (reservations.existsByVolIdAndPassagerIdAndStatut(vol.getId(), p.getId(), StatutReservation.CONFIRMEE))
            throw new Errors.Business(p.getPrenom() + " " + p.getNom() + " est déjà réservé(e) sur ce vol");
        Reservation r = new Reservation();
        r.setVol(vol); r.setPassager(p); r.setGroupe(groupe);
        r.setCategorie(Categorie.pour(p.getDateNaissance(), vol.getDateDepart().toLocalDate()));
        r.setCodePromo(remise.code()); r.setRemisePromo(remise.pourcentage());
        r.setPrix(Tarif.prix(vol.getPrix(), r.getCategorie(), 0, remise.pourcentage()));
        return reservations.save(r);
    }

    /** Recalcule les prix de tout le groupe selon sa taille actuelle. */
    void recalculerGroupe(GroupeVoyage g) {
        List<Reservation> membres = reservations.findByGroupeIdAndStatut(g.getId(), StatutReservation.CONFIRMEE);
        int remise = Tarif.remiseGroupePourcent(membres.size());
        membres.forEach(r -> r.setPrix(Tarif.prix(r.getVol().getPrix(), r.getCategorie(), remise, r.getRemisePromo())));
    }
}
