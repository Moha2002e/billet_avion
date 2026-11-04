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
    .urgent { color: #c0392b; }
  `,
})
export class Countdown {
  private horloge = inject(Horloge);
  cible = input.required<string>();
  termine = input('Terminé');
  /** Mode « court » : met en rouge quand il reste moins de 15 minutes. */
  court = input(false);

  protected reste = computed(() => new Date(this.cible()).getTime() - this.horloge.maintenant());
  protected jours = computed(() => Math.floor(this.reste() / 86400000));
  protected heures = computed(() => Math.floor((this.reste() % 86400000) / 3600000));
  protected minutes = computed(() => Math.floor((this.reste() % 3600000) / 60000));
  protected secondes = computed(() => Math.floor((this.reste() % 60000) / 1000));
  protected pad(n: number) { return String(n).padStart(2, '0'); }
}
