import { Injectable, signal } from '@angular/core';

/** Horloge commune : un seul minuteur d'une seconde pour tous les compteurs à rebours de la page. */
@Injectable({ providedIn: 'root' })
export class Horloge {
  readonly maintenant = signal(Date.now());
  constructor() { setInterval(() => this.maintenant.set(Date.now()), 1000); }
}
