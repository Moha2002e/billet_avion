import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api, Notifier } from '../../api.service';
import { Promotion, PromotionRequest, Vol } from '../../models';
import { AdminMenu } from '../../shared/admin-menu';

const vide = (): PromotionRequest => ({
  code: '', description: '', pourcentage: 10, dateDebut: new Date().toISOString().slice(0, 10),
  dateFin: '', automatique: false, volId: null, actif: true,
});

@Component({
  selector: 'app-admin-promotions',
  imports: [FormsModule, DatePipe, AdminMenu],
  template: `
    <app-admin-menu />
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
        <label class="case"><input type="checkbox" name="a" [(ngModel)]="form.automatique"> Automatique (sans code)</label>
        <label class="case"><input type="checkbox" name="ac" [(ngModel)]="form.actif"> Active</label>
        <button type="submit">{{ editId() ? 'Enregistrer' : 'Ajouter' }}</button>
        @if (editId()) { <button type="button" class="sec" (click)="reset()">Annuler</button> }
      </form>
    </div>
    <div class="card">
      <h2>Toutes les promotions</h2>
      <table>
        <thead><tr><th>Code</th><th>Description</th><th>Remise</th><th>Période</th><th>Vol</th><th>Type</th><th>Statut</th><th></th></tr></thead>
        <tbody>
          @for (p of promotions(); track p.id) {
            <tr><td><b>{{ p.code }}</b></td><td>{{ p.description }}</td><td>-{{ p.pourcentage }} %</td>
              <td>{{ p.dateDebut | date: 'dd/MM/yy' }} → {{ p.dateFin | date: 'dd/MM/yy' }}</td><td>{{ p.volLibelle ?? 'Tous les vols' }}</td>
              <td>{{ p.automatique ? 'Automatique' : 'Sur code' }}</td>
              <td><span class="badge {{ p.enCours ? 'ADULTE' : 'ANNULE' }}">{{ p.enCours ? 'En cours' : 'Inactive' }}</span></td>
              <td class="actions"><button class="small sec" (click)="editer(p)">Modifier</button><button class="small danger" (click)="supprimer(p)">Supprimer</button></td></tr>
          } @empty { <tr><td colspan="8">Aucune promotion.</td></tr> }
        </tbody>
      </table>
    </div>
  `,
})
export class AdminPromotions {
  private api = inject(Api);
  private notifier = inject(Notifier);
  protected promotions = signal<Promotion[]>([]);
  protected vols = signal<Vol[]>([]);
  protected editId = signal<number | null>(null);
  protected form: PromotionRequest = vide();

  constructor() { this.charger(); this.api.vols().subscribe((v) => this.vols.set(v)); }
  charger() { this.api.toutesPromotions().subscribe((p) => this.promotions.set(p)); }

  enregistrer() {
    const id = this.editId();
    (id ? this.api.modifierPromotion(id, this.form) : this.api.creerPromotion(this.form)).subscribe(() => {
      this.notifier.ok(id ? 'Promotion modifiée' : 'Promotion ajoutée'); this.reset(); this.charger();
    });
  }
  editer(p: Promotion) {
    this.editId.set(p.id);
    this.form = { code: p.code, description: p.description, pourcentage: p.pourcentage, dateDebut: p.dateDebut, dateFin: p.dateFin,
      automatique: p.automatique, volId: p.volId, actif: p.actif };
    scrollTo({ top: 0, behavior: 'smooth' });
  }
  reset() { this.editId.set(null); this.form = vide(); }
  supprimer(p: Promotion) {
    if (!confirm(`Supprimer la promotion ${p.code} ?`)) return;
    this.api.supprimerPromotion(p.id).subscribe(() => { this.notifier.ok('Promotion supprimée'); this.charger(); });
  }
}
