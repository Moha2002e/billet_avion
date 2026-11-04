import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from '../api.service';
import { Auth } from '../auth.service';
import { Reservation } from '../models';
import { Countdown } from '../shared/countdown';

type Onglet = 'avenir' | 'attente' | 'passes' | 'annules';

@Component({
  selector: 'app-mes-voyages',
  imports: [RouterLink, DatePipe, CurrencyPipe, Countdown],
  template: `
    <div class="card entete">
      <div><h2>Mes voyages</h2><p class="muted">Bonjour {{ auth.utilisateur()?.prenom }} ! Retrouvez vos réservations, ajoutez des options ou modifiez un vol.</p></div>
      <a class="bouton" routerLink="/">🔍 Réserver un vol</a>
    </div>

    <div class="onglets">
      @for (o of onglets; track o.code) {
        <button type="button" [class.actif]="onglet() === o.code" (click)="onglet.set(o.code)">{{ o.libelle }} ({{ nombre(o.code) }})</button>
      }
    </div>

    @for (r of affichees(); track r.id) {
      <article class="card voyage">
        <div>
          <h3>{{ r.vol.origine }} → {{ r.vol.destination }} <span class="badge {{ r.statut }}">{{ r.reference }}</span></h3>
          <div>{{ r.vol.dateDepart | date: 'EEEE d MMMM y, HH:mm' }} · {{ r.vol.compagnie }} {{ r.vol.numeroVol }}</div>
          <small>{{ r.passagers.length }} passager(s) · Total {{ r.totaux.total | currency: 'EUR' }}
            @if (r.totaux.solde > 0 && r.statut !== 'EN_ATTENTE') { · <b class="alerte">Solde à payer {{ r.totaux.solde | currency: 'EUR' }}</b> }</small>
        </div>
        <div class="droite">
          @if (r.statut === 'CONFIRMEE') { <small>Départ dans</small><div><app-countdown [cible]="r.vol.dateDepart" termine="Parti" /></div> }
          @if (r.statut === 'EN_ATTENTE' && r.expireLe) { <small>À payer avant</small><div><app-countdown [cible]="r.expireLe" [court]="true" termine="Expiré" /></div> }
          <a class="bouton" [routerLink]="['/reservation', r.id]">{{ r.statut === 'EN_ATTENTE' ? 'Continuer et payer' : 'Gérer' }}</a>
        </div>
      </article>
    } @empty { <div class="card">Aucune réservation dans cette catégorie. <a routerLink="/">Chercher un vol</a></div> }
  `,
})
export class MesVoyages {
  protected auth = inject(Auth);
  protected reservations = signal<Reservation[]>([]);
  protected onglet = signal<Onglet>('avenir');
  protected onglets: { code: Onglet; libelle: string }[] = [
    { code: 'avenir', libelle: 'À venir' }, { code: 'attente', libelle: 'En attente de paiement' },
    { code: 'passes', libelle: 'Passés' }, { code: 'annules', libelle: 'Annulés / expirés' },
  ];

  constructor() { inject(Api).mesReservations().subscribe((r) => { this.reservations.set(r); this.choisirOnglet(r); }); }

  private categorie(r: Reservation): Onglet {
    if (r.statut === 'ANNULEE' || r.statut === 'EXPIREE') return 'annules';
    if (r.statut === 'EN_ATTENTE') return 'attente';
    return new Date(r.vol.dateDepart).getTime() > Date.now() ? 'avenir' : 'passes';
  }
  /** Ouvre directement l'onglet le plus utile (en attente de paiement s'il y en a). */
  private choisirOnglet(r: Reservation[]) {
    const ordre: Onglet[] = ['attente', 'avenir', 'passes', 'annules'];
    this.onglet.set(ordre.find((o) => r.some((x) => this.categorie(x) === o)) ?? 'avenir');
  }
  protected nombre(o: Onglet) { return this.reservations().filter((r) => this.categorie(r) === o).length; }
  protected affichees = computed(() => this.reservations().filter((r) => this.categorie(r) === this.onglet()));
}
