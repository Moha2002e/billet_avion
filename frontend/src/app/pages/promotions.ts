import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from '../api.service';
import { Promotion } from '../models';

@Component({
  selector: 'app-promotions',
  imports: [DatePipe, RouterLink],
  template: `
    <div class="card">
      <h2>🏷 Promotions en cours</h2>
      <p class="muted">Les promotions ne se cumulent pas entre elles (la meilleure est retenue), mais se cumulent avec le tarif selon l'âge et la remise de groupe. Saisissez un code promo au moment de réserver.</p>
      <table>
        <thead><tr><th>Code</th><th>Description</th><th>Remise</th><th>Jusqu'au</th><th>Vol</th></tr></thead>
        <tbody>
          @for (p of promotions(); track p.id) {
            <tr><td><b>{{ p.automatique ? 'Automatique' : p.code }}</b></td><td>{{ p.description }}</td><td>-{{ p.pourcentage }} %</td>
              <td>{{ p.dateFin | date: 'dd/MM/yyyy' }}</td><td>{{ p.volLibelle ?? 'Tous les vols' }}</td></tr>
          } @empty { <tr><td colspan="5">Aucune promotion en cours.</td></tr> }
        </tbody>
      </table>
      <a routerLink="/">Chercher un vol</a>
    </div>
  `,
})
export class Promotions {
  protected promotions = signal<Promotion[]>([]);
  constructor() { inject(Api).promotions().subscribe((p) => this.promotions.set(p)); }
}
