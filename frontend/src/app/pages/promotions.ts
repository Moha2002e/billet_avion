import { DatePipe } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api, Notifier } from '../api.service';
import { Auth } from '../auth.service';
import { Promotion, PromotionRequest, Vol } from '../models';

const vide = (): PromotionRequest => ({
  code: '', description: '', pourcentage: 10, dateDebut: new Date().toISOString().slice(0, 10),
  dateFin: '', automatique: false, volId: null, actif: true,
});

@Component({
  selector: 'app-promotions',
  imports: [FormsModule, DatePipe],
  template: `
    @if (auth.estAdmin()) {
      <div class="card">
        <h2>{{ editId() ? 'Modifier la promotion' : 'Ajouter une promotion' }}</h2>
        <form class="row" (ngSubmit)="enregistrer()">
          <label>Code<input name="c" [(ngModel)]="form.code" pattern="[A-Za-z0-9_\\-]{3,30}" required></label>
          <label>Description<input name="d" [(ngModel)]="form.description" required></label>
          <label>Remise (%)<input type="number" min="1" max="90" name="p" [(ngModel)]="form.pourcentage" required></label>
          <label>Début<input type="date" name="db" [(ngModel)]="form.dateDebut" required></label>
          <label>Fin<input type="date" name="df" [(ngModel)]="form.dateFin" required></label>
          <label>Vol concerné
            <select name="v" [(ngModel)]="form.volId">
              <option [ngValue]="null">Tous les vols</option>
              @for (v of vols(); track v.id) { <option [ngValue]="v.id">{{ v.compagnie }} {{ v.numeroVol }} : {{ v.origine }} → {{ v.destination }}</option> }
            </select>
          </label>
          <label style="flex-direction:row;align-items:center"><input type="checkbox" style="min-width:0" name="a" [(ngModel)]="form.automatique"> Automatique (sans code)</label>
          <label style="flex-direction:row;align-items:center"><input type="checkbox" style="min-width:0" name="ac" [(ngModel)]="form.actif"> Active</label>
          <button type="submit">{{ editId() ? 'Enregistrer' : 'Ajouter' }}</button>
          @if (editId()) { <button type="button" class="sec" (click)="reset()">Annuler</button> }
        </form>
      </div>
    }

    <div class="card">
      <h2>{{ auth.estAdmin() ? 'Toutes les promotions' : 'Promotions en cours' }}</h2>
      <p class="muted">Les promotions ne se cumulent pas entre elles (la meilleure est retenue), mais se cumulent avec le tarif selon l'âge et la remise de groupe.</p>
      <table>
        <thead><tr><th>Code</th><th>Description</th><th>Remise</th><th>Période</th><th>Vol</th><th>Type</th>@if (auth.estAdmin()) { <th>Statut</th><th></th> }</tr></thead>
        <tbody>
          @for (p of promotions(); track p.id) {
            <tr>
              <td><b>{{ p.automatique ? '—' : p.code }}</b></td>
              <td>{{ p.description }}</td>
              <td>-{{ p.pourcentage }} %</td>
              <td>{{ p.dateDebut | date: 'dd/MM/yy' }} → {{ p.dateFin | date: 'dd/MM/yy' }}</td>
              <td>{{ p.volLibelle ?? 'Tous les vols' }}</td>
              <td>{{ p.automatique ? 'Automatique' : 'Sur code' }}</td>
              @if (auth.estAdmin()) {
                <td><span class="badge {{ p.enCours ? 'ADULTE' : 'ANNULE' }}">{{ p.enCours ? 'En cours' : 'Inactive' }}</span></td>
                <td class="actions">
                  <button class="small sec" (click)="editer(p)">Modifier</button>
                  <button class="small danger" (click)="supprimer(p)">Supprimer</button>
                </td>
              }
            </tr>
          } @empty { <tr><td colspan="8">Aucune promotion.</td></tr> }
        </tbody>
      </table>
    </div>
  `,
})
export class Promotions {
  private api = inject(Api);
  private notifier = inject(Notifier);
  protected auth = inject(Auth);
  protected promotions = signal<Promotion[]>([]);
  protected vols = signal<Vol[]>([]);
  protected editId = signal<number | null>(null);
  protected form: PromotionRequest = vide();

  constructor() {
    effect(() => { this.auth.estAdmin(); this.charger(); });
    this.api.vols().subscribe((v) => this.vols.set(v));
  }

  charger() {
    (this.auth.estAdmin() ? this.api.toutesPromotions() : this.api.promotions()).subscribe((p) => this.promotions.set(p));
  }

  enregistrer() {
    const id = this.editId();
    const req = id ? this.api.modifierPromotion(id, this.form) : this.api.creerPromotion(this.form);
    req.subscribe(() => { this.notifier.ok(id ? 'Promotion modifiée' : 'Promotion ajoutée'); this.reset(); this.charger(); });
  }

  editer(p: Promotion) {
    this.editId.set(p.id);
    this.form = { code: p.code, description: p.description, pourcentage: p.pourcentage, dateDebut: p.dateDebut,
      dateFin: p.dateFin, automatique: p.automatique, volId: p.volId, actif: p.actif };
    scrollTo({ top: 0, behavior: 'smooth' });
  }

  reset() { this.editId.set(null); this.form = vide(); }

  supprimer(p: Promotion) {
    if (!confirm(`Supprimer la promotion ${p.code} ?`)) return;
    this.api.supprimerPromotion(p.id).subscribe(() => { this.notifier.ok('Promotion supprimée'); this.charger(); });
  }
}
