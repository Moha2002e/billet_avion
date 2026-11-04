import { Component, computed, inject, input } from '@angular/core';
import { Horloge } from './horloge';

/** Compte à rebours en direct vers une date (jours, heures, minutes, secondes). */
@Component({
  selector: 'app-countdown',
  template: `
    @if (reste() > 0) {
      <span class="compte" [class.urgent]="reste() < 15 * 60000 && court()">
        @if (jours() > 0) { <b>{{ jours() }}</b> j }
        <b>{{ pad(heures()) }}</b> h <b>{{ pad(minutes()) }}</b> min <b>{{ pad(secondes()) }}</b> s
      </span>
    } @else { <span class="compte">{{ termine() }}</span> }
  `,
  styles: `
    .compte { font-variant-numeric: tabular-nums; }
    .compte b { font-size: 1.15em; }
    .urgent { color: var(--p-red-600); animation: clignote 1s ease-in-out infinite; }
    @keyframes clignote { 0%, 100% { opacity: 1; } 50% { opacity: .55; } }
  `,
})
export class Countdown {
  private horloge = inject(Horloge);
  /** Date cible (texte ISO). */
  cible = input.required<string>();
  /** Texte affiché quand la date est dépassée. */
  termine = input('Terminé');
  /** Mode « court » : met en rouge quand il reste moins de 15 minutes. */
  court = input(false);

  /** Millisecondes restantes avant la date cible. */
  protected reste = computed(() => new Date(this.cible()).getTime() - this.horloge.maintenant());
  /** Nombre de jours entiers restants. */
  protected jours = computed(() => Math.floor(this.reste() / 86400000));
  /** Heures restantes (0-23). */
  protected heures = computed(() => Math.floor((this.reste() % 86400000) / 3600000));
  /** Minutes restantes (0-59). */
  protected minutes = computed(() => Math.floor((this.reste() % 3600000) / 60000));
  /** Secondes restantes (0-59). */
  protected secondes = computed(() => Math.floor((this.reste() % 60000) / 1000));

  /** Ajoute un zéro devant un nombre à un chiffre. @param n le nombre @returns le texte sur deux caractères */
  protected pad(n: number): string { return String(n).padStart(2, '0'); }
}
