import { Injectable, signal } from '@angular/core';

/** Horloge commune : un seul minuteur d'une seconde pour tous les compteurs à rebours de la page. */
@Injectable({ providedIn: 'root' })
export class Horloge {
  /** Heure actuelle en millisecondes, rafraîchie chaque seconde. */
  readonly maintenant = signal(Date.now());

  /** Démarre le minuteur d'une seconde. */
  constructor() { setInterval(() => this.maintenant.set(Date.now()), 1000); }
}
