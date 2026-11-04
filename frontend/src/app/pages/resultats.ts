import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, effect, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Api, Notifier } from '../api.service';
import { Auth } from '../auth.service';
import { Recherche, ResultatVol } from '../models';
import { SearchForm } from '../shared/search-form';
import { AvionChargement, Squelette } from '../shared/spinner';

@Component({
  selector: 'app-resultats',
  imports: [SearchForm, CurrencyPipe, DatePipe, AvionChargement, Squelette],
  template: `
    <div class="card"><app-search-form [initial]="recherche()" /></div>

    <div class="card">
      <h2>{{ titre() }}</h2>
      @if (!auth.estConnecte()) { <p class="muted">Vous pouvez chercher librement ; la connexion n'est demandée qu'au moment de réserver (votre choix sera conservé).</p> }
      @if (chargement()) { <app-avion-chargement /><app-squelette [nombre]="3" [hauteur]="96" /> }
      @for (r of resultats(); track r.vol.id; let i = $index) {
        <article class="vol apparition" [style.animation-delay.ms]="i * 60">
          <div class="horaires">
            <div><b>{{ r.vol.dateDepart | date: 'HH:mm' }}</b><small>{{ r.vol.origine }}</small></div>
            <div class="trait"><small>{{ duree(r.vol.dateDepart, r.vol.dateArrivee) }}</small><hr><small>Direct</small></div>
            <div><b>{{ r.vol.dateArrivee | date: 'HH:mm' }}</b><small>{{ r.vol.destination }}</small></div>
          </div>
          <div class="infos">
            <div>{{ r.vol.dateDepart | date: 'EEEE d MMMM y' }}</div>
            <small>{{ r.vol.compagnie }} · vol {{ r.vol.numeroVol }}</small>
            @if (r.vol.placesRestantes < 6) { <small class="alerte">Plus que {{ r.vol.placesRestantes }} place(s) !</small> }
          </div>
          <div class="prix">
            @if (r.vol.promoPourcent > 0) { <span class="badge ENFANT">-{{ r.vol.promoPourcent }} % promo</span> <s class="muted">{{ r.vol.prix | currency: 'EUR' }}</s> }
            <b>{{ r.vol.prixPromo | currency: 'EUR' }}</b><small>par adulte</small>
            @if (nbPassagers() > 1) { <small>Total estimé : <b>{{ r.prixTotalEstime | currency: 'EUR' }}</b></small> }
            <button (click)="reserver(r)">Réserver</button>
          </div>
        </article>
      } @empty {
        @if (!chargement()) { <p>Aucun vol trouvé. Essayez d'autres dates (option « dates flexibles ») ou une autre destination.</p> }
      }
    </div>
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

  protected recherche = signal<Partial<Recherche>>({});
  protected resultats = signal<ResultatVol[]>([]);
  protected chargement = signal(false);

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

  protected nbPassagers() { const r = this.recherche(); return (r.adultes ?? 1) + (r.enfants ?? 0) + (r.bebes ?? 0); }
  protected titre() {
    const r = this.recherche();
    const trajet = (r.origine || 'Partout') + ' → ' + (r.destination || 'Partout');
    return this.chargement() ? trajet : trajet + ' · ' + this.resultats().length + ' vol(s)';
  }
  protected duree(a: string, b: string) {
    const m = Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000);
    return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`;
  }

  /** Réserver : demande de se connecter si besoin, puis crée la réservation (gardée 15 min). */
  protected reserver(r: ResultatVol) {
    const q = { volId: r.vol.id, adultes: this.recherche().adultes ?? 1, enfants: this.recherche().enfants ?? 0, bebes: this.recherche().bebes ?? 0, codePromo: this.recherche().codePromo || null };
    if (this.auth.estConnecte()) { this.router.navigate(['/reserver'], { queryParams: q }); return; }
    const retour = this.router.createUrlTree(['/reserver'], { queryParams: q }).toString();
    this.notifier.info('Connectez-vous ou créez un compte pour réserver : votre vol sélectionné est conservé.');
    this.router.navigate(['/connexion'], { queryParams: { retour } });
  }
}
