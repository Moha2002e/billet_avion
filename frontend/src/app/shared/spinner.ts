import { Component, input } from '@angular/core';

/** Petite icône de chargement qui tourne (utilisable dans un bouton ou un texte). */
@Component({
  selector: 'app-spinner',
  template: `<span class="spinner" role="status" [attr.aria-label]="libelle()"></span>`,
})
export class Spinner { libelle = input('Chargement'); }

/** Avion qui traverse l'écran : affiché pendant la recherche de vols. */
@Component({
  selector: 'app-avion-chargement',
  template: `
    <div class="avion-chargement" role="status" aria-live="polite">
      <div class="piste"><span class="avion-vole">✈</span></div>
      <p>{{ texte() }}</p>
    </div>
  `,
})
export class AvionChargement { texte = input('Recherche des meilleurs vols…'); }

/** Blocs gris animés qui préfigurent le contenu pendant le chargement. */
@Component({
  selector: 'app-squelette',
  template: `@for (i of lignes(); track i) { <div class="squelette" [style.height.px]="hauteur()"></div> }`,
})
export class Squelette {
  nombre = input(3);
  hauteur = input(100);
  protected lignes = () => Array.from({ length: this.nombre() }, (_, i) => i);
}
