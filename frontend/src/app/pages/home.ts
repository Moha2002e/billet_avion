import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from '../api.service';
import { Promotion, Vol } from '../models';
import { SearchForm } from '../shared/search-form';

interface Destination { origine: string; destination: string; prix: number; promo: number; date: string; }

@Component({
  selector: 'app-home',
  imports: [SearchForm, RouterLink, CurrencyPipe, DatePipe],
  template: `
    <section class="hero">
      <h2>Où voulez-vous aller ?</h2>
      <p>Cherchez sans compte, réservez en quelques minutes. Sièges, bagages et assurance au choix.</p>
      <app-search-form />
    </section>

    @if (promotions().length) {
      <section class="card">
        <h2>🏷 Promotions en cours</h2>
        <div class="grid">
          @for (p of promotions(); track p.id) {
            <div class="stat promo">
              <b>-{{ p.pourcentage }} %</b>
              <div>{{ p.description }}</div>
              <small>{{ p.volLibelle ?? 'Tous les vols' }} · jusqu'au {{ p.dateFin | date: 'dd/MM/yyyy' }}</small>
              <small>{{ p.automatique ? 'Appliquée automatiquement' : 'Code : ' + p.code }}</small>
            </div>
          }
        </div>
      </section>
    }

    <section class="card">
      <h2>✈ Destinations à partir de</h2>
      <div class="grid">
        @for (d of destinations(); track d.origine + d.destination) {
          <a class="stat dest" [routerLink]="['/recherche']" [queryParams]="{ origine: d.origine, destination: d.destination }">
            <small>{{ d.origine }} →</small>
            <b>{{ d.destination }}</b>
            @if (d.promo > 0) { <span class="badge ENFANT">-{{ d.promo }} %</span> }
            <div>dès {{ d.prix | currency: 'EUR' }}</div>
            <small>{{ d.date | date: 'dd MMM yyyy' }}</small>
          </a>
        } @empty { <p class="muted">Aucun vol programmé pour le moment.</p> }
      </div>
    </section>

    <section class="card">
      <h2>Tout pour voyager l'esprit tranquille</h2>
      <div class="grid avantages">
        <div class="stat"><b>💺</b>Choisissez votre siège, avec plus de place si vous le souhaitez</div>
        <div class="stat"><b>🧳</b>Bagages cabine ou soute, par passager</div>
        <div class="stat"><b>🛡</b>Assurance annulation avec remboursement</div>
        <div class="stat"><b>🔁</b>Modifiez votre vol (frais de 10 %)</div>
        <div class="stat"><b>📲</b>Enregistrement en ligne et carte d'embarquement</div>
        <div class="stat"><b>👨‍👩‍👧</b>Remises de groupe dès 5 passagers</div>
      </div>
    </section>
  `,
})
export class Home {
  protected promotions = signal<Promotion[]>([]);
  protected destinations = signal<Destination[]>([]);

  constructor() {
    const api = inject(Api);
    api.promotions().subscribe((p) => this.promotions.set(p));
    api.vols({ disponibles: true }).subscribe((vols) => this.destinations.set(this.moinsChers(vols)));
  }

  /** Pour chaque liaison, le vol à venir le moins cher. */
  private moinsChers(vols: Vol[]): Destination[] {
    const parLiaison = new Map<string, Destination>();
    for (const v of vols.filter((x) => new Date(x.dateDepart).getTime() > Date.now())) {
      const cle = v.origine + '>' + v.destination;
      const courant = parLiaison.get(cle);
      if (!courant || v.prixPromo < courant.prix)
        parLiaison.set(cle, { origine: v.origine, destination: v.destination, prix: v.prixPromo, promo: v.promoPourcent, date: v.dateDepart });
    }
    return [...parLiaison.values()].sort((a, b) => a.prix - b.prix).slice(0, 8);
  }
}
