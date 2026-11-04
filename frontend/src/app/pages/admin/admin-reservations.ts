import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api, Notifier } from '../../api.service';
import { Reservation } from '../../models';
import { AdminMenu } from '../../shared/admin-menu';

@Component({
  selector: 'app-admin-reservations',
  imports: [FormsModule, DatePipe, CurrencyPipe, AdminMenu],
  template: `
    <app-admin-menu />
    <div class="card">
      <h2>Réservations</h2>
      <div class="filters">
        <label>Recherche (référence ou e-mail)<input [(ngModel)]="q" (ngModelChange)="charger()" placeholder="ex. K7M2QX"></label>
        <label>Statut
          <select [(ngModel)]="statut" (ngModelChange)="charger()">
            <option value="">Tous</option><option value="CONFIRMEE">Confirmées</option><option value="EN_ATTENTE">En attente</option>
            <option value="ANNULEE">Annulées</option><option value="EXPIREE">Expirées</option>
          </select>
        </label>
      </div>
      <table>
        <thead><tr><th>Réf.</th><th>Client</th><th>Vol</th><th>Départ</th><th>Passagers</th><th>Total</th><th>Payé</th><th>Statut</th><th></th></tr></thead>
        <tbody>
          @for (r of reservations(); track r.id) {
            <tr>
              <td><b>{{ r.reference }}</b></td><td>{{ r.client }}</td><td>{{ r.vol.origine }} → {{ r.vol.destination }}</td>
              <td>{{ r.vol.dateDepart | date: 'dd/MM/yy HH:mm' }}</td><td>{{ r.passagers.length }}</td>
              <td>{{ r.totaux.total | currency: 'EUR' }}</td><td>{{ r.totaux.paye | currency: 'EUR' }}</td>
              <td><span class="badge {{ r.statut }}">{{ r.statut }}</span></td>
              <td>@if (r.statut === 'CONFIRMEE' || r.statut === 'EN_ATTENTE') { <button class="small danger" (click)="annuler(r)">Annuler</button> }</td>
            </tr>
          } @empty { <tr><td colspan="9">Aucune réservation.</td></tr> }
        </tbody>
      </table>
    </div>
  `,
})
export class AdminReservations {
  private api = inject(Api);
  private notifier = inject(Notifier);
  protected reservations = signal<Reservation[]>([]);
  protected q = ''; protected statut = '';
  constructor() { this.charger(); }
  charger() { this.api.toutesReservations({ q: this.q, statut: this.statut }).subscribe((r) => this.reservations.set(r)); }
  annuler(r: Reservation) {
    if (!confirm(`Annuler la réservation ${r.reference} ? Le client sera remboursé intégralement.`)) return;
    this.api.annulerAdmin(r.id).subscribe(() => { this.notifier.ok('Réservation annulée et remboursée'); this.charger(); });
  }
}
