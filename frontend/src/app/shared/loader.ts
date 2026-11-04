import { Injectable, computed, signal } from '@angular/core';

/** Compte les requêtes HTTP en cours : alimente la barre de progression PrimeNG en haut de page. */
@Injectable({ providedIn: 'root' })
export class Loader {
  private n = signal(0);
  /** Vrai tant qu'au moins une requête est en cours. */
  readonly actif = computed(() => this.n() > 0);

  /** Signale le début d'une requête. */
  debut(): void { this.n.update((v) => v + 1); }

  /** Signale la fin d'une requête (le compteur ne descend jamais sous zéro). */
  fin(): void { this.n.update((v) => Math.max(0, v - 1)); }
}
