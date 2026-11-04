package com.billetavion.service;

import com.billetavion.model.*;
import com.billetavion.repo.*;
import com.billetavion.web.Dtos.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.HashSet;
import java.util.List;

@Service
@Transactional
public class GroupeService {
    private final GroupeRepository groupes;
    private final ReservationRepository reservations;
    private final VolService volService;
    private final PassagerService passagerService;
    private final ReservationService reservationService;
    private final Mapper mapper;
    private final PromotionService promotions;

    public GroupeService(GroupeRepository groupes, ReservationRepository reservations, VolService volService,
                         PassagerService passagerService, ReservationService reservationService, Mapper mapper,
                         PromotionService promotions) {
        this.promotions = promotions;
        this.groupes = groupes; this.reservations = reservations; this.volService = volService;
        this.passagerService = passagerService; this.reservationService = reservationService; this.mapper = mapper;
    }

    private GroupeVoyage trouver(Long id) {
        return groupes.findById(id).orElseThrow(() -> new Errors.NotFound("Groupe introuvable : " + id));
    }

    @Transactional(readOnly = true)
    public List<GroupeDto> lister() {
        return groupes.findAll().stream().map(mapper::groupe).toList();
    }

    @Transactional(readOnly = true)
    public GroupeDto obtenir(Long id) { return mapper.groupe(trouver(id)); }

    public GroupeDto creer(GroupeRequest req) {
        Vol vol = volService.trouver(req.volId());
        List<Long> ids = req.passagerIds().stream().distinct().toList();
        reservationService.verifierVolReservable(vol, ids.size());
        PromotionService.Remise remise = promotions.remisePour(vol, req.codePromo());
        GroupeVoyage g = new GroupeVoyage();
        g.setNom(req.nom().trim()); g.setResponsable(req.responsable().trim()); g.setVol(vol);
        groupes.save(g);
        ids.forEach(pid -> reservationService.ajouter(vol, passagerService.trouver(pid), g, remise));
        reservationService.recalculerGroupe(g);
        return mapper.groupe(g);
    }

    public GroupeDto ajouterMembres(Long id, MembresRequest req) {
        GroupeVoyage g = trouver(id);
        if (!g.isActif()) throw new Errors.Business("Ce groupe est annulé");
        List<Long> ids = req.passagerIds().stream().distinct().toList();
        reservationService.verifierVolReservable(g.getVol(), ids.size());
        PromotionService.Remise remise = promotions.remisePour(g.getVol(), req.codePromo());
        ids.forEach(pid -> reservationService.ajouter(g.getVol(), passagerService.trouver(pid), g, remise));
        reservations.flush();
        reservationService.recalculerGroupe(g);
        return mapper.groupe(g);
    }

    public GroupeDto retirerMembre(Long id, Long passagerId) {
        GroupeVoyage g = trouver(id);
        Reservation r = reservations.findByGroupeIdAndStatut(id, StatutReservation.CONFIRMEE).stream()
                .filter(x -> x.getPassager().getId().equals(passagerId)).findFirst()
                .orElseThrow(() -> new Errors.NotFound("Ce passager n'est pas dans le groupe"));
        r.setStatut(StatutReservation.ANNULEE);
        reservations.flush();
        reservationService.recalculerGroupe(g);
        return mapper.groupe(g);
    }

    /** Annule le groupe et toutes les réservations de ses membres. */
    public GroupeDto annuler(Long id) {
        GroupeVoyage g = trouver(id);
        reservations.findByGroupeIdAndStatut(id, StatutReservation.CONFIRMEE)
                .forEach(r -> r.setStatut(StatutReservation.ANNULEE));
        g.setActif(false);
        return mapper.groupe(g);
    }
}
