import { Injectable, computed, signal } from '@angular/core';

/** Compte les requêtes HTTP en cours : alimente la barre de chargement en haut de page. */
@Injectable({ providedIn: 'root' })
export class Loader {
  private n = signal(0);
  readonly actif = computed(() => this.n() > 0);
  debut() { this.n.update((v) => v + 1); }
  fin() { this.n.update((v) => Math.max(0, v - 1)); }
}
