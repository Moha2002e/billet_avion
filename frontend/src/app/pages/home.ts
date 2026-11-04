import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Card } from 'primeng/card';
import { Tag } from 'primeng/tag';
import { Api } from '../api.service';
import { Promotion, Vol } from '../models';
import { SearchForm } from '../shared/search-form';
import { Squelette } from '../shared/spinner';

/** Une liaison proposée sur l'accueil avec son vol le moins cher. */
interface Destination { origine: string; destination: string; prix: number; promo: number; date: string; }

/** Page d'accueil : barre de recherche publique, promotions, destinations à partir de, avantages. */
@Component({
  selector: 'app-home',
  imports: [SearchForm, RouterLink, CurrencyPipe, DatePipe, Squelette, Card, Tag],
  template: `
    <section class="hero">
      <h1>Où voulez-vous aller ? <i class="pi pi-send avion-deco"></i></h1>
      <p>Cherchez sans compte, réservez en quelques minutes. Sièges, bagages et assurance au choix.</p>
      <app-search-form />
    </section>

    @if (promotions().length) {
      <p-card header="Promotions en cours" class="mb-4">
        <div class="grille">
          @for (p of promotions(); track p.id) {
            <div class="tuile">
              <p-tag [value]="'-' + p.pourcentage + ' %'" severity="warn" icon="pi pi-tag" />
              <strong>{{ p.description }}</strong>
              <small>{{ p.volLibelle ?? 'Tous les vols' }} · jusqu'au {{ p.dateFin | date: 'dd/MM/yyyy' }}</small>
              <small>{{ p.automatique ? 'Appliquée automatiquement' : 'Code : ' + p.code }}</small>
            </div>
          }
        </div>
      </p-card>
    }

    <p-card header="Destinations à partir de" class="mb-4">
      <div class="grille">
        @for (d of destinations(); track d.origine + d.destination) {
          <a class="tuile lien" [routerLink]="['/recherche']" [queryParams]="{ origine: d.origine, destination: d.destination }">
            <small>{{ d.origine }} →</small>
            <strong class="ville">{{ d.destination }}</strong>
            @if (d.promo > 0) { <p-tag [value]="'-' + d.promo + ' %'" severity="warn" /> }
            <span>dès <b>{{ d.prix | currency: 'EUR' }}</b></span>
            <small>{{ d.date | date: 'dd MMM yyyy' }}</small>
          </a>
        } @empty {
          @if (chargement()) { <app-squelette [nombre]="4" [hauteur]="110" /> } @else { <p class="muted">Aucun vol programmé pour le moment.</p> }
        }
      </div>
    </p-card>

    <p-card header="Tout pour voyager l'esprit tranquille">
      <div class="grille">
        @for (a of avantages; track a.texte) {
          <div class="tuile"><i [class]="a.icone"></i><span>{{ a.texte }}</span></div>
        }
      </div>
    </p-card>
  `,
})
export class Home {
  /** Promotions en cours. */
  protected promotions = signal<Promotion[]>([]);
  /** Liaisons proposées (vol le moins cher de chaque liaison). */
  protected destinations = signal<Destination[]>([]);
  /** Vrai pendant le chargement des vols. */
  protected chargement = signal(true);
  /** Arguments de vente affichés en bas de page. */
  protected avantages = [
    { icone: 'pi pi-th-large', texte: 'Choisissez votre siège, avec plus de place si vous le souhaitez' },
    { icone: 'pi pi-briefcase', texte: 'Bagages cabine ou soute, par passager' },
    { icone: 'pi pi-shield', texte: 'Assurance annulation avec remboursement' },
    { icone: 'pi pi-sync', texte: 'Modifiez votre vol (frais de 10 %)' },
    { icone: 'pi pi-mobile', texte: 'Enregistrement en ligne et carte d\'embarquement avec QR code' },
    { icone: 'pi pi-users', texte: 'Remises de groupe dès 5 passagers' },
  ];

  /** Charge les promotions et les vols disponibles. */
  constructor() {
    const api = inject(Api);
    api.promotions().subscribe((p) => this.promotions.set(p));
    api.vols({ disponibles: true }).subscribe({
      next: (vols) => { this.destinations.set(this.moinsChers(vols)); this.chargement.set(false); },
      error: () => this.chargement.set(false),
    });
  }

  /**
   * Garde, pour chaque liaison, le vol à venir le moins cher.
   * @param vols les vols disponibles
   * @returns au plus 8 liaisons triées par prix
   */
  private moinsChers(vols: Vol[]): Destination[] {
    const parLiaison = new Map<string, Destination>();
    for (const v of vols.filter((x) => new Date(x.dateDepart).getTime() > Date.now())) {
      const cle = v.origine + '>' + v.destination;
      const courant = parLiaison.get(cle);
      if (!courant || v.prixPromo < courant.prix)
        parLiaison.set(cle, { origine: v.origine, destination: v.destination, prix: v.prixPromo, promo: v.promoPourcent, date: v.dateDepart });
    }
    return [...parLiaison.values()].sort((a, b) => a.prix - b.prix).slice(0, 8);
  }
}
