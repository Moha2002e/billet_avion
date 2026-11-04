package com.billetavion.service;

import com.billetavion.model.*;
import com.billetavion.repo.*;
import com.billetavion.web.Dtos.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class PromotionService {
    /** Remise retenue pour une réservation (0 % si aucune promotion). */
    public record Remise(String code, int pourcentage) {
        public static final Remise AUCUNE = new Remise(null, 0);
    }

    private final PromotionRepository promotions;
    private final VolRepository vols;

    public PromotionService(PromotionRepository promotions, VolRepository vols) {
        this.promotions = promotions; this.vols = vols;
    }

    private Promotion trouver(Long id) {
        return promotions.findById(id).orElseThrow(() -> new Errors.NotFound("Promotion introuvable : " + id));
    }

    public PromotionDto dto(Promotion p) {
        Vol v = p.getVol();
        return new PromotionDto(p.getId(), p.getCode(), p.getDescription(), p.getPourcentage(), p.getDateDebut(),
                p.getDateFin(), p.isAutomatique(), v == null ? null : v.getId(), v == null ? null : Mapper.libelle(v),
                p.isActif(), p.enCours(LocalDate.now()));
    }

    /** Promotions visibles par le public : actives aujourd'hui. */
    @Transactional(readOnly = true)
    public List<PromotionDto> enCours() {
        LocalDate today = LocalDate.now();
        return promotions.findAll().stream().filter(p -> p.enCours(today))
                .sorted(Comparator.comparingInt(Promotion::getPourcentage).reversed()).map(this::dto).toList();
    }

    @Transactional(readOnly = true)
    public List<PromotionDto> toutes() {
        return promotions.findAll().stream().map(this::dto).toList();
    }

    public PromotionDto creer(PromotionRequest r) {
        if (promotions.findByCodeIgnoreCase(r.code()).isPresent()) throw new Errors.Business("Ce code promo existe déjà");
        Promotion p = new Promotion();
        appliquer(p, r);
        return dto(promotions.save(p));
    }

    public PromotionDto modifier(Long id, PromotionRequest r) {
        Promotion p = trouver(id);
        promotions.findByCodeIgnoreCase(r.code()).filter(x -> !x.getId().equals(id))
                .ifPresent(x -> { throw new Errors.Business("Ce code promo existe déjà"); });
        appliquer(p, r);
        return dto(p);
    }

    public void supprimer(Long id) { promotions.delete(trouver(id)); }

    /** Promotion « meilleure offre » automatique pour un vol (affichée sur les vols). */
    @Transactional(readOnly = true)
    public int promoAutomatique(Vol vol) {
        LocalDate today = LocalDate.now();
        return promotions.findAll().stream()
                .filter(p -> p.isAutomatique() && p.enCours(today) && p.concerne(vol))
                .mapToInt(Promotion::getPourcentage).max().orElse(0);
    }

    /** Vérifie un code promo pour un vol (utilisé à la saisie du client). */
    @Transactional(readOnly = true)
    public RemiseDto verifier(String code, Long volId) {
        Vol vol = vols.findById(volId).orElseThrow(() -> new Errors.NotFound("Vol introuvable : " + volId));
        Promotion p = codeValide(code, vol);
        return new RemiseDto(p.getCode(), p.getPourcentage(), p.getDescription());
    }

    /** Meilleure remise applicable : promotion automatique ou code saisi (non cumulables). */
    @Transactional(readOnly = true)
    public Remise remisePour(Vol vol, String code) {
        LocalDate today = LocalDate.now();
        Remise meilleure = promotions.findAll().stream()
                .filter(p -> p.isAutomatique() && p.enCours(today) && p.concerne(vol))
                .max(Comparator.comparingInt(Promotion::getPourcentage))
                .map(p -> new Remise(p.getCode(), p.getPourcentage())).orElse(Remise.AUCUNE);
        if (code != null && !code.isBlank()) {
            Promotion p = codeValide(code, vol);
            if (p.getPourcentage() >= meilleure.pourcentage()) meilleure = new Remise(p.getCode(), p.getPourcentage());
        }
        return meilleure;
    }

    private Promotion codeValide(String code, Vol vol) {
        Optional<Promotion> p = promotions.findByCodeIgnoreCase(code == null ? "" : code.trim());
        if (p.isEmpty() || !p.get().enCours(LocalDate.now()) || !p.get().concerne(vol))
            throw new Errors.Business("Code promo invalide, expiré ou non valable pour ce vol");
        return p.get();
    }

    private void appliquer(Promotion p, PromotionRequest r) {
        if (r.dateFin().isBefore(r.dateDebut())) throw new Errors.Business("La date de fin doit être après la date de début");
        p.setCode(r.code().trim().toUpperCase());
        p.setDescription(r.description().trim());
        p.setPourcentage(r.pourcentage());
        p.setDateDebut(r.dateDebut()); p.setDateFin(r.dateFin());
        p.setAutomatique(r.automatique()); p.setActif(r.actif());
        p.setVol(r.volId() == null ? null : vols.findById(r.volId())
                .orElseThrow(() -> new Errors.NotFound("Vol introuvable : " + r.volId())));
    }
}
