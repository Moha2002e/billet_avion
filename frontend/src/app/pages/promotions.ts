import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Card } from 'primeng/card';
import { Message } from 'primeng/message';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { Api } from '../api.service';
import { Promotion } from '../models';

/** Liste publique des promotions en cours. */
@Component({
  selector: 'app-promotions',
  imports: [DatePipe, RouterLink, Card, Message, TableModule, Tag],
  template: `
    <p-card header="Promotions en cours">
      <p-message severity="info" icon="pi pi-info-circle" class="mb-3">
        Les promotions ne se cumulent pas entre elles (la meilleure est retenue), mais se cumulent avec le tarif selon l'âge et la remise de groupe.
        Saisissez un code promo dans la recherche, au moment de réserver.
      </p-message>
      <p-table [value]="promotions()" styleClass="p-datatable-sm" [rowHover]="true">
        <ng-template #header><tr><th>Code</th><th>Description</th><th>Remise</th><th>Jusqu'au</th><th>Vol</th></tr></ng-template>
        <ng-template #body let-p>
          <tr>
            <td>@if (p.automatique) { <p-tag value="Automatique" severity="info" /> } @else { <b>{{ p.code }}</b> }</td>
            <td>{{ p.description }}</td><td><p-tag [value]="'-' + p.pourcentage + ' %'" severity="warn" /></td>
            <td>{{ p.dateFin | date: 'dd/MM/yyyy' }}</td><td>{{ p.volLibelle ?? 'Tous les vols' }}</td>
          </tr>
        </ng-template>
        <ng-template #emptymessage><tr><td colspan="5">Aucune promotion en cours.</td></tr></ng-template>
      </p-table>
      <a routerLink="/">Chercher un vol</a>
    </p-card>
  `,
})
export class Promotions {
  /** Promotions en cours. */
  protected promotions = signal<Promotion[]>([]);

  /** Charge les promotions en cours. */
  constructor() { inject(Api).promotions().subscribe((p) => this.promotions.set(p)); }
}
