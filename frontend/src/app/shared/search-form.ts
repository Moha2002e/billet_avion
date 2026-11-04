import { Component, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AutoComplete, AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { DatePicker } from 'primeng/datepicker';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { Popover } from 'primeng/popover';
import { Api } from '../api.service';
import { Recherche } from '../models';
import { aujourdhui, versDate, versIsoDate } from './dates';

/** Barre de recherche de vols (accueil et résultats) : publique, sans connexion. */
@Component({
  selector: 'app-search-form',
  imports: [FormsModule, AutoComplete, Button, Checkbox, DatePicker, InputNumber, InputText, Popover],
  template: `
    <form class="recherche" (ngSubmit)="rechercher()">
      <div class="champ"><label for="origine">Départ</label>
        <p-autocomplete inputId="origine" name="o" [(ngModel)]="f.origine" [suggestions]="suggestionsO()" (completeMethod)="filtrer($event, 'o')"
          [dropdown]="true" placeholder="Ville de départ" /></div>
      <p-button type="button" icon="pi pi-arrow-right-arrow-left" severity="secondary" [outlined]="true" (onClick)="echanger()" ariaLabel="Inverser départ et destination" />
      <div class="champ"><label for="destination">Destination</label>
        <p-autocomplete inputId="destination" name="d" [(ngModel)]="f.destination" [suggestions]="suggestionsD()" (completeMethod)="filtrer($event, 'd')"
          [dropdown]="true" placeholder="Ville d'arrivée" /></div>
      <div class="champ"><label for="date">Date de départ</label>
        <p-datepicker inputId="date" name="dt" [(ngModel)]="date" [minDate]="min" dateFormat="dd/mm/yy" [showIcon]="true" iconDisplay="input"
          [showButtonBar]="true" placeholder="jj/mm/aaaa" /></div>
      <div class="champ"><label>Passagers</label>
        <p-button type="button" [label]="resume()" icon="pi pi-users" severity="secondary" [outlined]="true" (onClick)="panneau.toggle($event)" /></div>
      <p-button type="submit" label="Rechercher" icon="pi pi-search" styleClass="rechercher" />

      <p-popover #panneau>
        <div class="panneau-passagers">
          <div class="ligne"><span>Adultes <small>12 ans et +</small></span>
            <p-inputnumber name="ad" [(ngModel)]="f.adultes" [showButtons]="true" buttonLayout="horizontal" [min]="1" [max]="30" [step]="1"
              incrementButtonIcon="pi pi-plus" decrementButtonIcon="pi pi-minus" inputStyleClass="compteur" /></div>
          <div class="ligne"><span>Enfants <small>2-11 ans</small></span>
            <p-inputnumber name="en" [(ngModel)]="f.enfants" [showButtons]="true" buttonLayout="horizontal" [min]="0" [max]="30"
              incrementButtonIcon="pi pi-plus" decrementButtonIcon="pi pi-minus" inputStyleClass="compteur" /></div>
          <div class="ligne"><span>Bébés <small>0-1 an, sur les genoux</small></span>
            <p-inputnumber name="be" [(ngModel)]="f.bebes" [showButtons]="true" buttonLayout="horizontal" [min]="0" [max]="30"
              incrementButtonIcon="pi pi-plus" decrementButtonIcon="pi pi-minus" inputStyleClass="compteur" /></div>
          <div class="ligne-choix">
            <p-checkbox inputId="flex" name="fx" [ngModel]="f.flexibilite > 0" (ngModelChange)="f.flexibilite = $event ? 3 : 0" [binary]="true" />
            <label for="flex">Dates flexibles (± 3 jours)</label>
          </div>
          <div class="champ"><label for="promo">Code promo (facultatif)</label>
            <input pInputText id="promo" name="cp" [(ngModel)]="f.codePromo" placeholder="ex. ETE20" autocomplete="off" /></div>
          <small class="muted">Dès 5 passagers : remise de groupe automatique.</small>
          <p-button type="button" label="OK" size="small" (onClick)="panneau.hide()" />
        </div>
      </p-popover>
    </form>
  `,
})
export class SearchForm {
  private router = inject(Router);
  private api = inject(Api);
  /** Valeurs initiales du formulaire (recherche en cours). */
  initial = input<Partial<Recherche> | null>(null);

  private villes: string[] = [];
  /** Suggestions de villes pour le départ et la destination. */
  protected suggestionsO = signal<string[]>([]);
  protected suggestionsD = signal<string[]>([]);
  /** Date minimale du calendrier : aujourd'hui. */
  protected min = aujourdhui();
  /** Date de départ choisie. */
  protected date: Date | null = null;
  protected f: Recherche = { origine: '', destination: '', date: '', flexibilite: 0, adultes: 1, enfants: 0, bebes: 0, codePromo: '' };

  /** Charge la liste des villes et applique la recherche initiale quand elle change. */
  constructor() {
    this.api.villes().subscribe((v) => this.villes = v);
    effect(() => {
      const i = this.initial();
      if (i) { this.f = { ...this.f, ...i }; this.date = versDate(i.date); }
    });
  }

  /**
   * Filtre les villes selon le texte tapé (autocomplétion).
   * @param e l'événement PrimeNG contenant la saisie
   * @param champ « o » pour le départ, « d » pour la destination
   */
  protected filtrer(e: AutoCompleteCompleteEvent, champ: 'o' | 'd'): void {
    const q = e.query.trim().toLowerCase();
    const r = this.villes.filter((v) => v.toLowerCase().includes(q));
    (champ === 'o' ? this.suggestionsO : this.suggestionsD).set(r);
  }

  /** Résumé du nombre de passagers affiché sur le bouton. */
  protected resume(): string {
    const n = (this.f.adultes ?? 1) + (this.f.enfants ?? 0) + (this.f.bebes ?? 0);
    return `${n} passager${n > 1 ? 's' : ''}`;
  }

  /** Inverse le départ et la destination. */
  protected echanger(): void { [this.f.origine, this.f.destination] = [this.f.destination, this.f.origine]; }

  /** Lance la recherche : ouvre la page des résultats avec les critères dans l'adresse. */
  protected rechercher(): void {
    this.f.adultes = this.f.adultes || 1;
    // Les bébés ne peuvent pas être plus nombreux que les adultes
    if ((this.f.bebes ?? 0) > this.f.adultes) this.f.bebes = this.f.adultes;
    this.router.navigate(['/recherche'], { queryParams: {
      origine: this.f.origine || null, destination: this.f.destination || null, date: versIsoDate(this.date) || null,
      flexibilite: this.f.flexibilite || null, adultes: this.f.adultes, enfants: this.f.enfants || null, bebes: this.f.bebes || null,
      codePromo: this.f.codePromo || null } });
  }
}
