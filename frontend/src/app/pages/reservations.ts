import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api, Notifier } from '../api.service';
import { Passager, Reservation, Vol } from '../models';

@Component({
  selector: 'app-reservations',
  imports: [FormsModule, DatePipe],
  template: `
    <div class="card">
      <h2>Nouvelle réservation</h2>
      <form class="row" (ngSubmit)="reserver()">
        <label>Passager
          <select name="p" [(ngModel)]="passagerId" required>
            @for (p of passagers(); track p.id) { <option [ngValue]="p.id">{{ p.nom }} {{ p.prenom }} ({{ p.categorie }})</option> }
          </select>
        </label>
        <label>Vol
          <select name="v" [(ngModel)]="volId" required>
            @for (v of vols(); track v.id) {
              <option [ngValue]="v.id">{{ v.compagnie }} {{ v.numeroVol }} : {{ v.origine }} → {{ v.destination }}
                ({{ v.dateDepart | date: 'dd/MM/yy' }}, {{ v.placesRestantes }} places)</option>
            }
          </select>
        </label>
        <label>Code promo (facultatif)<input name="cp" [(ngModel)]="codePromo" placeholder="ex. ETE20"></label>
        <button type="submit">Réserver</button>
      </form>
      <p class="muted">Le prix est calculé automatiquement selon l'âge du passager à la date du vol. Les promotions automatiques s'appliquent seules ; un code promo valide s'applique s'il est plus avantageux.</p>
    </div>

    <div class="card">
      <h2>Réservations</h2>
      <div class="filters">
        <label>Statut
          <select [(ngModel)]="statut" (ngModelChange)="charger()">
            <option value="">Toutes</option><option value="CONFIRMEE">Confirmées</option><option value="ANNULEE">Annulées</option>
          </select>
        </label>
      </div>
      <table>
        <thead><tr><th>Passager</th><th>Vol</th><th>Départ</th><th>Catégorie</th><th>Prix</th><th>Groupe</th><th>Réservé le</th><th>Statut</th><th></th></tr></thead>
        <tbody>
          @for (r of reservations(); track r.id) {
            <tr>
              <td>{{ r.passagerNom }}</td><td>{{ r.volLibelle }}</td>
              <td>{{ r.dateDepart | date: 'dd/MM/yy HH:mm' }}</td>
              <td><span class="badge {{ r.categorie }}">{{ r.categorie }}</span></td>
              <td>{{ r.prix }} €@if (r.remisePromo > 0) { <span class="badge ENFANT">promo -{{ r.remisePromo }} %</span> }</td><td>{{ r.groupeNom ?? '—' }}</td>
              <td>{{ r.dateReservation | date: 'dd/MM/yy HH:mm' }}</td>
              <td><span class="badge {{ r.statut }}">{{ r.statut === 'ANNULEE' ? 'Annulée' : 'Confirmée' }}</span></td>
              <td>@if (r.statut === 'CONFIRMEE') { <button class="small danger" (click)="annuler(r)">Annuler</button> }</td>
            </tr>
          } @empty { <tr><td colspan="9">Aucune réservation trouvée.</td></tr> }
        </tbody>
      </table>
    </div>
  `,
})
export class Reservations {
  private api = inject(Api);
  private notifier = inject(Notifier);
  protected reservations = signal<Reservation[]>([]);
  protected passagers = signal<Passager[]>([]);
  protected vols = signal<Vol[]>([]);
  protected passagerId: number | null = null;
  protected volId: number | null = null;
  protected codePromo = '';
  protected statut = 'CONFIRMEE';

  constructor() {
    this.api.passagers().subscribe((p) => this.passagers.set(p));
    this.rechargerVols();
    this.charger();
  }

  private rechargerVols() { this.api.vols({ disponibles: true }).subscribe((v) => this.vols.set(v)); }

  charger() { this.api.reservations({ statut: this.statut }).subscribe((r) => this.reservations.set(r)); }

  reserver() {
    if (this.passagerId === null || this.volId === null) return;
    this.api.reserver(this.passagerId, this.volId, this.codePromo.trim()).subscribe((r) => {
      this.codePromo = '';
      this.notifier.ok(`Réservation ajoutée : ${r.prix} € (${r.categorie})`);
      this.charger(); this.rechargerVols();
    });
  }

  annuler(r: Reservation) {
    if (!confirm('Annuler cette réservation ?')) return;
    this.api.annulerReservation(r.id).subscribe(() => {
      this.notifier.ok('Réservation annulée'); this.charger(); this.rechargerVols();
    });
  }
}
