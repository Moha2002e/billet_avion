import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-admin-menu',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <div class="onglets admin-menu">
      <a routerLink="/admin" routerLinkActive="actif" [routerLinkActiveOptions]="{ exact: true }">📊 Tableau de bord</a>
      <a routerLink="/admin/vols" routerLinkActive="actif">✈ Vols</a>
      <a routerLink="/admin/promotions" routerLinkActive="actif">🏷 Promotions</a>
      <a routerLink="/admin/reservations" routerLinkActive="actif">🎫 Réservations</a>
    </div>
  `,
})
export class AdminMenu {}
