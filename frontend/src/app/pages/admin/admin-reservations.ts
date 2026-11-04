import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { Api, Notifier } from '../../api.service';
import { Reservation } from '../../models';
import { AdminMenu } from '../../shared/admin-menu';
import { Confirmer } from '../../shared/confirmer';

/** Administration des réservations : recherche, filtre par statut, annulation avec remboursement. */
@Component({
  selector: 'app-admin-reservations',
  imports: [FormsModule, DatePipe, CurrencyPipe, AdminMenu, Button, Card, IconField, InputIcon, InputText, Select, TableModule, Tag],
  template: `
    <app-admin-menu />
    <p-card header="Réservations">
      <div class="filtres">
        <p-iconfield><p-inputicon class="pi pi-search" /><input pInputText placeholder="Référence ou e-mail" [(ngModel)]="q" (ngModelChange)="charger()" /></p-iconfield>
        <p-select [options]="statuts" optionLabel="libelle" optionValue="code" [(ngModel)]="statut" (ngModelChange)="charger()" placeholder="Tous les statuts" [showClear]="true" appendTo="body" />
      </div>
      <p-table [value]="reservations()" [paginator]="true" [rows]="10" [rowsPerPageOptions]="[10, 25, 50]" styleClass="p-datatable-sm" [rowHover]="true">
        <ng-template #header><tr><th>Réf.</th><th>Client</th><th>Vol</th><th>Départ</th><th>Passagers</th><th>Total</th><th>Payé</th><th>Statut</th><th></th></tr></ng-template>
        <ng-template #body let-r>
          <tr>
            <td><b>{{ r.reference }}</b></td><td>{{ r.client }}</td><td>{{ r.vol.origine }} → {{ r.vol.destination }}</td>
            <td>{{ r.vol.dateDepart | date: 'dd/MM/yy HH:mm' }}</td><td>{{ r.passagers.length }}</td>
            <td>{{ r.totaux.total | currency: 'EUR' }}</td><td>{{ r.totaux.paye | currency: 'EUR' }}</td>
            <td><p-tag [value]="r.statut" [severity]="gravite(r.statut)" /></td>
            <td>@if (r.statut === 'CONFIRMEE' || r.statut === 'EN_ATTENTE') { <p-button icon="pi pi-times" size="small" severity="danger" [outlined]="true" (onClick)="annuler(r)" ariaLabel="Annuler" /> }</td>
          </tr>
        </ng-template>
        <ng-template #emptymessage><tr><td colspan="9">Aucune réservation.</td></tr></ng-template>
      </p-table>
    </p-card>
  `,
})
export class AdminReservations {
  private api = inject(Api);
  private notifier = inject(Notifier);
  private confirmer = inject(Confirmer);
  /** Réservations affichées. */
  protected reservations = signal<Reservation[]>([]);
  /** Texte recherché (référence ou e-mail). */
  protected q = '';
  /** Statut filtré (ou null pour tous). */
  protected statut: string | null = null;
  /** Statuts proposés dans le filtre. */
  protected statuts = [
    { code: 'CONFIRMEE', libelle: 'Confirmées' }, { code: 'EN_ATTENTE', libelle: 'En attente' },
    { code: 'ANNULEE', libelle: 'Annulées' }, { code: 'EXPIREE', libelle: 'Expirées' },
  ];

  /** Charge les réservations. */
  constructor() { this.charger(); }

  /** Recharge les réservations selon la recherche et le statut. */
  protected charger(): void { this.api.toutesReservations({ q: this.q, statut: this.statut ?? undefined }).subscribe((r) => this.reservations.set(r)); }

  /** Couleur d'étiquette selon le statut. @param s le statut */
  protected gravite(s: string): 'success' | 'warn' | 'danger' | 'secondary' {
    return ({ CONFIRMEE: 'success', EN_ATTENTE: 'warn', ANNULEE: 'danger', EXPIREE: 'danger' } as const)[s as 'CONFIRMEE'] ?? 'secondary';
  }

  /** Annule une réservation (client remboursé intégralement) après confirmation. @param r la réservation */
  protected async annuler(r: Reservation): Promise<void> {
    if (!(await this.confirmer.demander(`Annuler la réservation ${r.reference} ? Le client sera remboursé intégralement.`, 'Annulation', true))) return;
    this.api.annulerAdmin(r.id).subscribe(() => { this.notifier.ok('Réservation annulée et remboursée'); this.charger(); });
  }
}
