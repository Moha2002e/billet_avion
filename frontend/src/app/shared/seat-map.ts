import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { Tooltip } from 'primeng/tooltip';
import { ClasseSiege, Plan, Rangee, TypePassager } from '../models';

/** Passager tel que présenté au plan de l'avion (identifiant, libellé, siège choisi et type). */
export interface PassagerSiege { id: number; libelle: string; siege: string | null; type: TypePassager; }

/** Plan de l'avion : 3 sièges + couloir + 3 sièges, couleurs et prix selon la catégorie de siège. */
@Component({
  selector: 'app-seat-map',
  imports: [NgTemplateOutlet, Tooltip],
  template: `
    <div class="avion">
      <div class="nez"><i class="pi pi-send"></i></div>
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
              [pTooltip]="s.code + ' · ' + (!s.libre ? 'occupé' : r.prix > 0 ? r.prix + ' €' : 'gratuit')" tooltipPosition="top">
        {{ numero(s.code) ?? lettre(s.code) }}
      </button>
    </ng-template>
  `,
  styles: `
    .avion { display: flex; flex-direction: column; align-items: center; }
    .nez { width: 220px; height: 70px; border-radius: 110px 110px 0 0; background: var(--p-primary-50); border: 2px solid var(--p-primary-200); border-bottom: 0; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; color: var(--p-primary-600); }
    .nez i { transform: rotate(-45deg); }
    .cabine { width: 300px; max-height: 460px; overflow-y: auto; padding: 8px 12px; background: var(--p-primary-50); border: 2px solid var(--p-primary-200); border-radius: 0 0 24px 24px; }
    .bandeau { font-size: .72rem; padding: 3px 8px; border-radius: 6px; margin: 8px 0 4px; text-align: center; color: #fff; }
    .bandeau.PREMIUM { background: #7c2d12; } .bandeau.AVANT { background: var(--p-primary-500); } .bandeau.ESPACE { background: #d99a00; } .bandeau.STANDARD { background: #6b7280; }
    .rangee { display: flex; justify-content: center; align-items: center; gap: 4px; margin: 3px 0; }
    .allee { width: 26px; text-align: center; font-size: .72rem; color: #6b7280; }
    .siege { width: 32px; height: 32px; padding: 0; border-radius: 7px 7px 3px 3px; font-size: .72rem; border: 2px solid transparent; color: #fff; cursor: pointer; transition: transform .15s; }
    .siege.PREMIUM { background: #7c2d12; } .siege.AVANT { background: var(--p-primary-500); } .siege.ESPACE { background: #f5b301; color: #222; }
    .siege.STANDARD { background: #cfd4da; color: #1f2937; }
    .siege.choisi { background: #1f2937; color: #fff; border-color: #fff; }
    .siege.mien { box-shadow: 0 0 0 3px var(--p-primary-500); }
    .siege.pris { background: #f1f3f5; color: #adb5bd; cursor: not-allowed; border: 1px solid #dee2e6; }
    .siege:disabled:not(.pris) { opacity: .35; cursor: not-allowed; }
    .siege:not(:disabled):hover { transform: scale(1.18); }
  `,
})
export class SeatMap {
  /** Plan de cabine du vol. */
  plan = input.required<Plan>();
  /** Passagers de la réservation avec leur siège actuel. */
  passagers = input.required<PassagerSiege[]>();
  /** Identifiant du passager en cours de sélection. */
  actif = input.required<number>();
  /** Émis quand l'utilisateur clique sur un siège (code du siège). */
  choisir = output<string>();

  /** Siège actuellement choisi par le passager actif. */
  protected actuel = computed(() => this.passagers().find((p) => p.id === this.actif())?.siege ?? null);
  /** Type (adulte, enfant, bébé) du passager actif. */
  private type = computed(() => this.passagers().find((p) => p.id === this.actif())?.type ?? 'ADULTE');

  /** Sièges A, B, C d'une rangée (côté gauche). @param r la rangée */
  protected gauche(r: Rangee) { return r.sieges.filter((s) => 'ABC'.includes(s.code.slice(-1))); }

  /** Sièges D, E, F d'une rangée (côté droit). @param r la rangée */
  protected droite(r: Rangee) { return r.sieges.filter((s) => 'DEF'.includes(s.code.slice(-1))); }

  /** Lettre d'un siège (« 12A » → « A »). @param code le code du siège */
  protected lettre(code: string): string { return code.slice(-1); }

  /** Indique si la rangée commence une nouvelle catégorie de sièges (pour afficher le bandeau). @param r la rangée */
  protected debutClasse(r: Rangee): boolean { const p = this.plan().plan; const i = p.indexOf(r); return i === 0 || p[i - 1].classe !== r.classe; }

  /** Titre d'une catégorie de sièges. @param c la catégorie */
  protected titre(c: ClasseSiege): string {
    return { PREMIUM: 'Premium - grand confort', AVANT: 'Avant de l\'appareil', ESPACE: 'Grand espace jambes', STANDARD: 'Standard' }[c];
  }

  /** Numéro (1, 2, 3…) du passager de la réservation qui a choisi ce siège, ou null. @param code le siège */
  protected numero(code: string): number | null {
    const i = this.passagers().findIndex((p) => p.siege === code);
    return i >= 0 ? i + 1 : null;
  }

  /** Vrai si un passager de la réservation a choisi ce siège. @param code le siège */
  protected estChoisi(code: string): boolean { return this.passagers().some((p) => p.siege === code); }

  /**
   * Indique si le passager actif peut choisir ce siège : libre, pas pour un bébé, pas de sortie de secours pour un enfant,
   * et pas déjà pris par un autre passager de la même réservation.
   * @param s le siège
   * @param r sa rangée
   */
  protected peutChoisir(s: { code: string; libre: boolean }, r: Rangee): boolean {
    if (!s.libre) return false;
    if (this.type() === 'BEBE') return false;
    if (this.type() === 'ENFANT' && r.classe === 'ESPACE') return false;
    const pris = this.passagers().find((p) => p.siege === s.code);
    return !pris || pris.id === this.actif();
  }
}
