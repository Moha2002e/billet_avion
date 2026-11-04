import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { ClasseSiege, Plan, Rangee, TypePassager } from '../models';

export interface PassagerSiege { id: number; libelle: string; siege: string | null; type: TypePassager; }

/** Plan de l'avion : 3 sièges + couloir + 3 sièges, couleurs et prix selon la catégorie de siège. */
@Component({
  selector: 'app-seat-map',
  template: `
    <div class="avion">
      <div class="nez">✈</div>
      <div class="cabine">
        @for (r of plan().plan; track r.rang) {
          @if (debutClasse(r)) { <div class="bandeau {{ r.classe }}">{{ titre(r.classe) }} @if (r.prix > 0) { · +{{ r.prix }} € } @else { · gratuit }</div> }
          <div class="rangee">
            @for (s of gauche(r); track s.code) { <ng-container *ngTemplateOutlet="siege; context: { s: s, r: r }" /> }
            <span class="allee">{{ r.rang }}</span>
            @for (s of droite(r); track s.code) { <ng-container *ngTemplateOutlet="siege; context: { s: s, r: r }" /> }
          </div>
        }
      </div>
    </div>
    <ng-template #siege let-s="s" let-r="r">
      <button type="button" class="siege {{ r.classe }}" [class.pris]="!s.libre" [class.choisi]="estChoisi(s.code)"
              [class.mien]="s.code === actuel()" [disabled]="!peutChoisir(s, r)" (click)="choisir.emit(s.code)"
              [title]="s.code + ' · ' + (r.prix > 0 ? r.prix + ' €' : 'gratuit')">
        {{ numero(s.code) ?? lettre(s.code) }}
      </button>
    </ng-template>
  `,
  imports: [NgTemplateOutlet],
  styles: `
    .avion { display: flex; flex-direction: column; align-items: center; }
    .nez { width: 220px; height: 70px; border-radius: 110px 110px 0 0; background: rgba(255,255,255,.18); display: flex; align-items: center; justify-content: center; font-size: 1.8rem; }
    .cabine { width: 300px; max-height: 460px; overflow-y: auto; padding: 8px 12px; background: rgba(255,255,255,.1); border-radius: 0 0 24px 24px; }
    .bandeau { font-size: .72rem; padding: 3px 8px; border-radius: 6px; margin: 8px 0 4px; text-align: center; }
    .bandeau.PREMIUM { background: #6c5ce7; } .bandeau.AVANT { background: #0984e3; } .bandeau.ESPACE { background: #e17055; } .bandeau.STANDARD { background: #636e72; }
    .rangee { display: flex; justify-content: center; align-items: center; gap: 4px; margin: 3px 0; }
    .allee { width: 26px; text-align: center; font-size: .72rem; opacity: .7; }
    .siege { width: 32px; height: 32px; padding: 0; border-radius: 7px 7px 3px 3px; font-size: .72rem; border: 2px solid transparent; color: #fff; }
    .siege.PREMIUM { background: #6c5ce7; } .siege.AVANT { background: #0984e3; } .siege.ESPACE { background: #e17055; } .siege.STANDARD { background: #636e72; }
    .siege.choisi { background: #fdcb6e; color: #222; border-color: #fff; }
    .siege.mien { box-shadow: 0 0 0 3px #00cec9; }
    .siege.pris { background: #2d3436; color: #636e72; cursor: not-allowed; opacity: .55; }
    .siege:disabled:not(.pris) { opacity: .35; cursor: not-allowed; }
  `,
})
export class SeatMap {
  plan = input.required<Plan>();
  passagers = input.required<PassagerSiege[]>();
  /** Passager en cours de sélection. */
  actif = input.required<number>();
  choisir = output<string>();

  protected actuel = computed(() => this.passagers().find((p) => p.id === this.actif())?.siege ?? null);
  private type = computed(() => this.passagers().find((p) => p.id === this.actif())?.type ?? 'ADULTE');

  protected gauche(r: Rangee) { return r.sieges.filter((s) => 'ABC'.includes(s.code.slice(-1))); }
  protected droite(r: Rangee) { return r.sieges.filter((s) => 'DEF'.includes(s.code.slice(-1))); }
  protected lettre(code: string) { return code.slice(-1); }
  protected debutClasse(r: Rangee) { const p = this.plan().plan; const i = p.indexOf(r); return i === 0 || p[i - 1].classe !== r.classe; }
  protected titre(c: ClasseSiege) {
    return { PREMIUM: 'Premium - grand confort', AVANT: 'Avant de l\'appareil', ESPACE: 'Grand espace jambes', STANDARD: 'Standard' }[c];
  }

  /** Numéro (1, 2, 3…) du passager de la réservation qui a choisi ce siège. */
  protected numero(code: string): number | null {
    const i = this.passagers().findIndex((p) => p.siege === code);
    return i >= 0 ? i + 1 : null;
  }
  protected estChoisi(code: string) { return this.passagers().some((p) => p.siege === code); }

  protected peutChoisir(s: { code: string; libre: boolean }, r: Rangee) {
    if (!s.libre) return false;
    if (this.type() === 'BEBE') return false;
    if (this.type() === 'ENFANT' && r.classe === 'ESPACE') return false;
    const pris = this.passagers().find((p) => p.siege === s.code);
    return !pris || pris.id === this.actif();
  }
}
