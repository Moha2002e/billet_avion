import { Component, inject, signal } from '@angular/core';
import { Api } from '../api.service';
import { CATEGORIES, Stats } from '../models';

@Component({
  selector: 'app-dashboard',
  template: `
    <h2>Tableau de bord</h2>
    @if (stats(); as s) {
      <div class="grid">
        <div class="stat"><b>{{ s.totalVols }}</b>Vols ({{ s.volsAVenir }} à venir)</div>
        <div class="stat"><b>{{ s.totalPassagers }}</b>Passagers</div>
        <div class="stat"><b>{{ s.reservationsActives }}</b>Réservations actives</div>
        <div class="stat"><b>{{ s.groupesActifs }}</b>Voyages groupés</div>
        <div class="stat"><b>{{ s.tauxRemplissagePourcent }} %</b>Remplissage des vols</div>
        <div class="stat"><b>{{ s.revenuTotal }} €</b>Chiffre d'affaires</div>
      </div>
      <div class="card" style="margin-top:20px">
        <h2>Passagers par catégorie d'âge</h2>
        <div class="grid">
          @for (c of categories; track c.code) {
            <div class="stat"><b>{{ s.passagersParCategorie[c.code] }}</b><span class="badge {{ c.code }}">{{ c.libelle }}</span></div>
          }
        </div>
        <p class="muted">Tarifs: bébé 10 %, enfant 50 %, jeune 75 %, adulte 100 %, senior 80 % du prix du vol.
          Remise de groupe: 5 % dès 5 passagers, 10 % dès 10, 15 % dès 20.</p>
      </div>
    }
  `,
})
export class Dashboard {
  protected stats = signal<Stats | null>(null);
  protected categories = CATEGORIES;
  constructor() { inject(Api).stats().subscribe((s) => this.stats.set(s)); }
}
