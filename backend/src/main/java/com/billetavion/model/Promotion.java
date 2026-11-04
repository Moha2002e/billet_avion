package com.billetavion.model;

import jakarta.persistence.*;
import java.time.LocalDate;

/**
 * Promotion en pourcentage. Soit automatique (appliquée à toute réservation concernée),
 * soit sur code (le client saisit le code). Valable sur un vol précis ou sur tous les vols.
 */
@Entity
public class Promotion {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(unique = true)
    private String code;
    private String description;
    private int pourcentage;
    private LocalDate dateDebut;
    private LocalDate dateFin;
    private boolean automatique;
    private boolean actif = true;
    @ManyToOne
    private Vol vol;

    /**
     * Indique si la promotion est active et valable ce jour-là.
     *
     * @param jour le jour testé
     * @return vrai si la promotion est en cours
     */
    public boolean enCours(LocalDate jour) {
        return actif && !jour.isBefore(dateDebut) && !jour.isAfter(dateFin);
    }
    /**
     * Indique si la promotion s'applique à ce vol (vol précis ou tous les vols).
     *
     * @param v le vol
     * @return vrai si le vol est concerné
     */
    public boolean concerne(Vol v) { return vol == null || vol.getId().equals(v.getId()); }

    /**
     * Renvoie l'identifiant technique.
     *
     * @return l'identifiant technique
     */
    public Long getId() { return id; }
    /**
     * Renvoie le code.
     *
     * @return le code
     */
    public String getCode() { return code; }
    /**
     * Définit le code.
     *
     * @param v le code
     */
    public void setCode(String v) { this.code = v; }
    /**
     * Renvoie la description.
     *
     * @return la description
     */
    public String getDescription() { return description; }
    /**
     * Définit la description.
     *
     * @param v la description
     */
    public void setDescription(String v) { this.description = v; }
    /**
     * Renvoie le pourcentage de remise.
     *
     * @return le pourcentage de remise
     */
    public int getPourcentage() { return pourcentage; }
    /**
     * Définit le pourcentage de remise.
     *
     * @param v le pourcentage de remise
     */
    public void setPourcentage(int v) { this.pourcentage = v; }
    /**
     * Renvoie le premier jour de validité.
     *
     * @return le premier jour de validité
     */
    public LocalDate getDateDebut() { return dateDebut; }
    /**
     * Définit le premier jour de validité.
     *
     * @param v le premier jour de validité
     */
    public void setDateDebut(LocalDate v) { this.dateDebut = v; }
    /**
     * Renvoie le dernier jour de validité.
     *
     * @return le dernier jour de validité
     */
    public LocalDate getDateFin() { return dateFin; }
    /**
     * Définit le dernier jour de validité.
     *
     * @param v le dernier jour de validité
     */
    public void setDateFin(LocalDate v) { this.dateFin = v; }
    /**
     * Renvoie vrai si la promotion s'applique sans code.
     *
     * @return vrai si la promotion s'applique sans code
     */
    public boolean isAutomatique() { return automatique; }
    /**
     * Définit vrai si la promotion s'applique sans code.
     *
     * @param v vrai si la promotion s'applique sans code
     */
    public void setAutomatique(boolean v) { this.automatique = v; }
    /**
     * Renvoie vrai si la promotion est activée.
     *
     * @return vrai si la promotion est activée
     */
    public boolean isActif() { return actif; }
    /**
     * Définit vrai si la promotion est activée.
     *
     * @param v vrai si la promotion est activée
     */
    public void setActif(boolean v) { this.actif = v; }
    /**
     * Renvoie le vol.
     *
     * @return le vol
     */
    public Vol getVol() { return vol; }
    /**
     * Définit le vol.
     *
     * @param v le vol
     */
    public void setVol(Vol v) { this.vol = v; }
}
