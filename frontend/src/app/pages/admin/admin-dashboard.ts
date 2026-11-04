import { CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Api } from '../../api.service';
import { CATEGORIES, Stats } from '../../models';
import { AdminMenu } from '../../shared/admin-menu';

@Component({
  selector: 'app-admin-dashboard',
  imports: [AdminMenu, CurrencyPipe],
  template: `
    <app-admin-menu />
    <h2>Tableau de bord</h2>
    @if (stats(); as s) {
      <div class="grid">
        <div class="stat"><b>{{ s.totalVols }}</b>Vols ({{ s.volsAVenir }} à venir)</div>
        <div class="stat"><b>{{ s.clients }}</b>Clients inscrits</div>
        <div class="stat"><b>{{ s.reservationsConfirmees }}</b>Réservations confirmées</div>
        <div class="stat"><b>{{ s.reservationsEnAttente }}</b>En attente de paiement</div>
        <div class="stat"><b>{{ s.tauxRemplissagePourcent }} %</b>Remplissage des vols</div>
        <div class="stat"><b>{{ s.revenuTotal | currency: 'EUR' }}</b>Chiffre d'affaires (net des remboursements)</div>
      </div>
      <div class="card" style="margin-top:20px">
        <h2>Passagers (réservations confirmées) par catégorie d'âge</h2>
        <div class="grid">
          @for (c of categories; track c.code) { <div class="stat"><b>{{ s.passagersParCategorie[c.code] }}</b><span class="badge {{ c.code }}">{{ c.libelle }}</span></div> }
        </div>
      </div>
    }
  `,
})
export class AdminDashboard {
  protected stats = signal<Stats | null>(null);
  protected categories = CATEGORIES;
  constructor() { inject(Api).stats().subscribe((s) => this.stats.set(s)); }
}
