import { Component, input } from '@angular/core';
import { Skeleton } from 'primeng/skeleton';

/** Avion qui traverse l'écran : affiché pendant la recherche de vols. */
@Component({
  selector: 'app-avion-chargement',
  template: `
    <div class="avion-chargement" role="status" aria-live="polite">
      <div class="piste"><span class="avion-vole pi pi-send"></span></div>
      <p>{{ texte() }}</p>
    </div>
  `,
})
export class AvionChargement {
  /** Message affiché sous l'avion. */
  texte = input('Recherche des meilleurs vols…');
}

/** Blocs PrimeNG animés qui préfigurent le contenu pendant le chargement. */
@Component({
  selector: 'app-squelette',
  imports: [Skeleton],
  template: `@for (i of lignes(); track i) { <p-skeleton [height]="hauteur() + 'px'" borderRadius="12px" class="mb-3" /> }`,
})
export class Squelette {
  /** Nombre de blocs. */
  nombre = input(3);
  /** Hauteur de chaque bloc en pixels. */
  hauteur = input(100);

  /** Liste de longueur « nombre » pour répéter le bloc. @returns un tableau d'indices */
  protected lignes = () => Array.from({ length: this.nombre() }, (_, i) => i);
}
