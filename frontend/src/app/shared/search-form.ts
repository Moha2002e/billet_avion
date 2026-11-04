import { Component, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Api } from '../api.service';
import { Recherche } from '../models';

/** Barre de recherche de vols (accueil et résultats) : publique, sans connexion. */
@Component({
  selector: 'app-search-form',
  imports: [FormsModule],
  template: `
    <form class="recherche" (ngSubmit)="rechercher()">
      <label>Départ
        <input name="o" [(ngModel)]="f.origine" list="villes" placeholder="Ville de départ" autocomplete="off">
      </label>
      <button type="button" class="echange" (click)="echanger()" aria-label="Inverser départ et destination" title="Inverser">⇄</button>
      <label>Destination
        <input name="d" [(ngModel)]="f.destination" list="villes" placeholder="Ville d'arrivée" autocomplete="off">
      </label>
      <label>Date de départ
        <input type="date" name="dt" [(ngModel)]="f.date" [min]="aujourdhui">
      </label>
      <label>Passagers
        <button type="button" class="sec passagers" (click)="ouvert.set(!ouvert())">{{ resume() }} ▾</button>
      </label>
      <button type="submit" class="rechercher">🔍 Rechercher</button>
      <datalist id="villes">@for (v of villes(); track v) { <option [value]="v"></option> }</datalist>

      @if (ouvert()) {
        <div class="panneau-passagers">
          <div class="ligne"><span>Adultes <small>12 ans et +</small></span>
            <span class="pas"><button type="button" class="small sec" (click)="f.adultes = max(1, f.adultes - 1)">−</button><b>{{ f.adultes }}</b><button type="button" class="small sec" (click)="f.adultes = f.adultes + 1">+</button></span></div>
          <div class="ligne"><span>Enfants <small>2-11 ans</small></span>
            <span class="pas"><button type="button" class="small sec" (click)="f.enfants = max(0, f.enfants - 1)">−</button><b>{{ f.enfants }}</b><button type="button" class="small sec" (click)="f.enfants = f.enfants + 1">+</button></span></div>
          <div class="ligne"><span>Bébés <small>0-1 an, sur les genoux</small></span>
            <span class="pas"><button type="button" class="small sec" (click)="f.bebes = max(0, f.bebes - 1)">−</button><b>{{ f.bebes }}</b><button type="button" class="small sec" (click)="f.bebes = f.bebes + 1">+</button></span></div>
          <label class="case"><input type="checkbox" name="fx" [ngModel]="f.flexibilite > 0" (ngModelChange)="f.flexibilite = $event ? 3 : 0"> Dates flexibles (± 3 jours)</label>
          <label>Code promo (facultatif)<input name="cp" [(ngModel)]="f.codePromo" placeholder="ex. ETE20" autocomplete="off"></label>
          <p class="muted">Dès 5 passagers : remise de groupe automatique.</p>
          <button type="button" class="small" (click)="ouvert.set(false)">OK</button>
        </div>
      }
    </form>
  `,
})
export class SearchForm {
  private router = inject(Router);
  initial = input<Partial<Recherche> | null>(null);
  protected villes = signal<string[]>([]);
  protected ouvert = signal(false);
  protected aujourdhui = new Date().toISOString().slice(0, 10);
  protected f: Recherche = { origine: '', destination: '', date: '', flexibilite: 0, adultes: 1, enfants: 0, bebes: 0, codePromo: '' };

  constructor() {
    inject(Api).villes().subscribe((v) => this.villes.set(v));
    effect(() => { const i = this.initial(); if (i) this.f = { ...this.f, ...i }; });
  }

  protected max(a: number, b: number) { return Math.max(a, b); }
  protected resume() {
    const n = this.f.adultes + this.f.enfants + this.f.bebes;
    return `${n} passager${n > 1 ? 's' : ''}`;
  }
  protected echanger() { [this.f.origine, this.f.destination] = [this.f.destination, this.f.origine]; }

  protected rechercher() {
    // Les bébés ne peuvent pas être plus nombreux que les adultes
    if (this.f.bebes > this.f.adultes) this.f.bebes = this.f.adultes;
    this.router.navigate(['/recherche'], { queryParams: { ...this.f, flexibilite: this.f.flexibilite || null, date: this.f.date || null, origine: this.f.origine || null, destination: this.f.destination || null, enfants: this.f.enfants || null, bebes: this.f.bebes || null, codePromo: this.f.codePromo || null } });
  }
}
