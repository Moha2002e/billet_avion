import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Badge } from 'primeng/badge';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { Tab, TabList, Tabs } from 'primeng/tabs';
import { Tag } from 'primeng/tag';
import { Api } from '../api.service';
import { Auth } from '../auth.service';
import { Reservation } from '../models';
import { Countdown } from '../shared/countdown';
import { Squelette } from '../shared/spinner';

/** Catégories de la liste « Mes voyages ». */
type Onglet = 'avenir' | 'attente' | 'passes' | 'annules';

/** Liste des réservations du client, classées par onglet, avec compte à rebours. */
@Component({
  selector: 'app-mes-voyages',
  imports: [RouterLink, DatePipe, CurrencyPipe, Countdown, Squelette, Badge, Button, Card, Tab, TabList, Tabs, Tag],
  template: `
    <div class="entete-page">
      <div><h2>Mes voyages</h2><p class="muted">Bonjour {{ auth.utilisateur()?.prenom }} ! Retrouvez vos réservations, ajoutez des options ou modifiez un vol.</p></div>
      <p-button label="Réserver un vol" icon="pi pi-search" routerLink="/" />
    </div>

    <p-tabs [value]="onglet()" (valueChange)="onglet.set($any($event))" class="mb-3">
      <p-tablist>
        @for (o of onglets; track o.code) {
          <p-tab [value]="o.code">{{ o.libelle }}&nbsp;<p-badge [value]="nombre(o.code)" [severity]="nombre(o.code) ? 'warn' : 'secondary'" /></p-tab>
        }
      </p-tablist>
    </p-tabs>

    @for (r of affichees(); track r.id) {
      <p-card class="mb-3 apparition">
        <div class="voyage">
          <div>
            <h3>{{ r.vol.origine }} → {{ r.vol.destination }} <p-tag [value]="r.reference" [severity]="gravite(r.statut)" /></h3>
            <div>{{ r.vol.dateDepart | date: 'EEEE d MMMM y, HH:mm' }} · {{ r.vol.compagnie }} {{ r.vol.numeroVol }}</div>
            <small>{{ r.passagers.length }} passager(s) · Total {{ r.totaux.total | currency: 'EUR' }}
              @if (r.totaux.solde > 0 && r.statut !== 'EN_ATTENTE') { · <b class="alerte">Solde à payer {{ r.totaux.solde | currency: 'EUR' }}</b> }</small>
          </div>
          <div class="droite">
            @if (r.statut === 'CONFIRMEE') { <small>Départ dans</small><div><app-countdown [cible]="r.vol.dateDepart" termine="Parti" /></div> }
            @if (r.statut === 'EN_ATTENTE' && r.expireLe) { <small>À payer avant</small><div><app-countdown [cible]="r.expireLe" [court]="true" termine="Expiré" /></div> }
            <p-button [label]="r.statut === 'EN_ATTENTE' ? 'Continuer et payer' : 'Gérer'" icon="pi pi-arrow-right" iconPos="right" [routerLink]="['/reservation', r.id]" />
          </div>
        </div>
      </p-card>
    } @empty {
      @if (chargement()) { <app-squelette [nombre]="3" [hauteur]="90" /> } @else {
        <p-card>Aucune réservation dans cette catégorie. <a routerLink="/">Chercher un vol</a></p-card>
      }
    }
  `,
})
export class MesVoyages {
  protected auth = inject(Auth);
  /** Toutes les réservations du client. */
  protected reservations = signal<Reservation[]>([]);
  /** Onglet affiché. */
  protected onglet = signal<Onglet>('avenir');
  /** Vrai pendant le chargement. */
  protected chargement = signal(true);
  /** Les quatre onglets. */
  protected onglets: { code: Onglet; libelle: string }[] = [
    { code: 'avenir', libelle: 'À venir' }, { code: 'attente', libelle: 'En attente de paiement' },
    { code: 'passes', libelle: 'Passés' }, { code: 'annules', libelle: 'Annulés / expirés' },
  ];
  /** Réservations de l'onglet affiché. */
  protected affichees = computed(() => this.reservations().filter((r) => this.categorie(r) === this.onglet()));

  /** Charge les réservations puis ouvre l'onglet le plus utile. */
  constructor() {
    inject(Api).mesReservations().subscribe({
      next: (r) => { this.reservations.set(r); this.choisirOnglet(r); this.chargement.set(false); },
      error: () => this.chargement.set(false),
    });
  }

  /** Classe une réservation dans un onglet. @param r la réservation */
  private categorie(r: Reservation): Onglet {
    if (r.statut === 'ANNULEE' || r.statut === 'EXPIREE') return 'annules';
    if (r.statut === 'EN_ATTENTE') return 'attente';
    return new Date(r.vol.dateDepart).getTime() > Date.now() ? 'avenir' : 'passes';
  }

  /** Ouvre directement l'onglet le plus utile (en attente de paiement s'il y en a). @param r les réservations */
  private choisirOnglet(r: Reservation[]): void {
    const ordre: Onglet[] = ['attente', 'avenir', 'passes', 'annules'];
    this.onglet.set(ordre.find((o) => r.some((x) => this.categorie(x) === o)) ?? 'avenir');
  }

  /** Nombre de réservations d'un onglet. @param o l'onglet */
  protected nombre(o: Onglet): number { return this.reservations().filter((r) => this.categorie(r) === o).length; }

  /** Couleur de l'étiquette selon le statut. @param s le statut de la réservation */
  protected gravite(s: string): 'success' | 'warn' | 'danger' | 'secondary' {
    return ({ CONFIRMEE: 'success', EN_ATTENTE: 'warn', ANNULEE: 'danger', EXPIREE: 'danger' } as const)[s as 'CONFIRMEE'] ?? 'secondary';
  }
}
