import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, effect, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { Message } from 'primeng/message';
import { Tag } from 'primeng/tag';
import { Api, Notifier } from '../api.service';
import { Auth } from '../auth.service';
import { Recherche, ResultatVol } from '../models';
import { SearchForm } from '../shared/search-form';
import { AvionChargement, Squelette } from '../shared/spinner';

/** Résultats d'une recherche de vols : publique ; la connexion n'est demandée qu'au moment de réserver. */
@Component({
  selector: 'app-resultats',
  imports: [SearchForm, CurrencyPipe, DatePipe, AvionChargement, Squelette, Button, Card, Message, Tag],
  template: `
    <p-card class="mb-4"><app-search-form [initial]="recherche()" /></p-card>

    <h2>{{ titre() }}</h2>
    @if (!auth.estConnecte()) {
      <p-message severity="info" icon="pi pi-info-circle" class="mb-3">
        Vous pouvez chercher librement ; la connexion n'est demandée qu'au moment de réserver (votre choix sera conservé).
      </p-message>
    }
    @if (chargement()) { <app-avion-chargement /><app-squelette [nombre]="3" [hauteur]="96" /> }
    @for (r of resultats(); track r.vol.id; let i = $index) {
      <p-card class="vol apparition mb-3" [style.animation-delay.ms]="i * 60">
        <div class="vol-grille">
          <div class="horaires">
            <div><b>{{ r.vol.dateDepart | date: 'HH:mm' }}</b><small>{{ r.vol.origine }}</small></div>
            <div class="trait"><small>{{ duree(r.vol.dateDepart, r.vol.dateArrivee) }}</small><hr><small>Direct</small></div>
            <div><b>{{ r.vol.dateArrivee | date: 'HH:mm' }}</b><small>{{ r.vol.destination }}</small></div>
          </div>
          <div class="infos">
            <div>{{ r.vol.dateDepart | date: 'EEEE d MMMM y' }}</div>
            <small>{{ r.vol.compagnie }} · vol {{ r.vol.numeroVol }}</small>
            @if (r.vol.placesRestantes < 6) { <p-tag [value]="'Plus que ' + r.vol.placesRestantes + ' place(s)'" severity="danger" icon="pi pi-exclamation-circle" /> }
          </div>
          <div class="prix">
            @if (r.vol.promoPourcent > 0) { <p-tag [value]="'-' + r.vol.promoPourcent + ' % promo'" severity="warn" icon="pi pi-tag" /> <s class="muted">{{ r.vol.prix | currency: 'EUR' }}</s> }
            <b>{{ r.vol.prixPromo | currency: 'EUR' }}</b><small>par adulte</small>
            @if (nbPassagers() > 1) { <small>Total estimé : <b>{{ r.prixTotalEstime | currency: 'EUR' }}</b></small> }
            <p-button label="Réserver" icon="pi pi-arrow-right" iconPos="right" (onClick)="reserver(r)" />
          </div>
        </div>
      </p-card>
    } @empty {
      @if (!chargement()) {
        <p-message severity="warn" icon="pi pi-exclamation-triangle">Aucun vol trouvé. Essayez d'autres dates (option « dates flexibles ») ou une autre destination.</p-message>
      }
    }
  `,
})
export class Resultats {
  private api = inject(Api);
  private router = inject(Router);
  private notifier = inject(Notifier);
  protected auth = inject(Auth);

  // Paramètres d'URL (withComponentInputBinding)
  origine = input<string>(); destination = input<string>(); date = input<string>(); flexibilite = input<string>();
  adultes = input<string>(); enfants = input<string>(); bebes = input<string>(); codePromo = input<string>();

  /** Critères de la recherche en cours. */
  protected recherche = signal<Partial<Recherche>>({});
  /** Vols trouvés. */
  protected resultats = signal<ResultatVol[]>([]);
  /** Vrai pendant la recherche. */
  protected chargement = signal(false);

  /** Relance la recherche à chaque changement des paramètres d'adresse. */
  constructor() {
    effect(() => {
      const r: Recherche = {
        origine: this.origine() ?? '', destination: this.destination() ?? '', date: this.date() ?? '',
        flexibilite: Number(this.flexibilite() ?? 0), adultes: Number(this.adultes() ?? 1) || 1,
        enfants: Number(this.enfants() ?? 0) || 0, bebes: Number(this.bebes() ?? 0) || 0, codePromo: this.codePromo() ?? '',
      };
      this.recherche.set(r);
      this.chargement.set(true);
      this.api.recherche({ ...r, codePromo: undefined }).subscribe({
        next: (res) => { this.resultats.set(res); this.chargement.set(false); },
        error: () => this.chargement.set(false),
      });
    });
  }

  /** Nombre total de passagers de la recherche. */
  protected nbPassagers(): number { const r = this.recherche(); return (r.adultes ?? 1) + (r.enfants ?? 0) + (r.bebes ?? 0); }

  /** Titre de la page : trajet et nombre de vols (sans le nombre pendant le chargement). */
  protected titre(): string {
    const r = this.recherche();
    const trajet = (r.origine || 'Partout') + ' → ' + (r.destination || 'Partout');
    return this.chargement() ? trajet : trajet + ' · ' + this.resultats().length + ' vol(s)';
  }

  /**
   * Durée d'un vol au format « 2 h 05 ».
   * @param a la date de départ (ISO)
   * @param b la date d'arrivée (ISO)
   */
  protected duree(a: string, b: string): string {
    const m = Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000);
    return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`;
  }

  /**
   * Réserver : demande de se connecter si besoin, puis crée la réservation (gardée 15 min).
   * @param r le vol choisi
   */
  protected reserver(r: ResultatVol): void {
    const q = { volId: r.vol.id, adultes: this.recherche().adultes ?? 1, enfants: this.recherche().enfants ?? 0, bebes: this.recherche().bebes ?? 0, codePromo: this.recherche().codePromo || null };
    if (this.auth.estConnecte()) { this.router.navigate(['/reserver'], { queryParams: q }); return; }
    const retour = this.router.createUrlTree(['/reserver'], { queryParams: q }).toString();
    this.notifier.info('Connectez-vous ou créez un compte pour réserver : votre vol sélectionné est conservé.');
    this.router.navigate(['/connexion'], { queryParams: { retour } });
  }
}
