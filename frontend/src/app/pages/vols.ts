import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api, Notifier } from '../api.service';
import { CATEGORIES, Reservation, Vol, VolRequest } from '../models';

const vide = (): VolRequest => ({
  compagnie: '', numeroVol: '', origine: '', destination: '', dateDepart: '', dateArrivee: '', capacite: 150, prix: 100,
});

@Component({
  selector: 'app-vols',
  imports: [FormsModule, DatePipe],
  template: `
    <div class="card">
      <h2>{{ editId() ? 'Modifier le vol' : 'Ajouter un vol' }}</h2>
      <form class="row" (ngSubmit)="enregistrer()">
        <label>Compagnie<input name="c" [(ngModel)]="form.compagnie" required></label>
        <label>N° de vol<input name="n" [(ngModel)]="form.numeroVol" required></label>
        <label>Origine<input name="o" [(ngModel)]="form.origine" required></label>
        <label>Destination<input name="d" [(ngModel)]="form.destination" required></label>
        <label>Départ<input type="datetime-local" name="dd" [(ngModel)]="form.dateDepart" required></label>
        <label>Arrivée<input type="datetime-local" name="da" [(ngModel)]="form.dateArrivee" required></label>
        <label>Places<input type="number" min="1" name="p" [(ngModel)]="form.capacite" required></label>
        <label>Prix (€)<input type="number" min="0.01" step="0.01" name="x" [(ngModel)]="form.prix" required></label>
        <button type="submit">{{ editId() ? 'Enregistrer' : 'Ajouter' }}</button>
        @if (editId()) { <button type="button" class="sec" (click)="reset()">Annuler</button> }
      </form>
    </div>

    <div class="card">
      <h2>Vols</h2>
      <div class="filters">
        <label>Origine<input [(ngModel)]="f.origine" (ngModelChange)="charger()"></label>
        <label>Destination<input [(ngModel)]="f.destination" (ngModelChange)="charger()"></label>
        <label>Date<input type="date" [(ngModel)]="f.date" (ngModelChange)="charger()"></label>
        <label style="flex-direction:row;align-items:center"><input type="checkbox" style="min-width:0" [(ngModel)]="f.disponibles" (ngModelChange)="charger()"> Places disponibles</label>
      </div>
      <table>
        <thead><tr><th>Vol</th><th>Trajet</th><th>Départ</th><th>Arrivée</th><th>Prix</th><th>Places</th><th>Statut</th><th></th></tr></thead>
        <tbody>
          @for (v of vols(); track v.id) {
            <tr>
              <td>{{ v.compagnie }} {{ v.numeroVol }}</td>
              <td>{{ v.origine }} → {{ v.destination }}</td>
              <td>{{ v.dateDepart | date: 'dd/MM/yy HH:mm' }}</td>
              <td>{{ v.dateArrivee | date: 'dd/MM/yy HH:mm' }}</td>
              <td>{{ v.prix }} €</td>
              <td>{{ v.placesRestantes }} / {{ v.capacite }}</td>
              <td><span class="badge {{ v.statut }}">{{ v.statut === 'ANNULE' ? 'Annulé' : 'Programmé' }}</span></td>
              <td class="actions">
                <button class="small sec" (click)="voirPassagers(v)">Passagers</button>
                <button class="small sec" (click)="editer(v)">Modifier</button>
                @if (v.statut === 'PROGRAMME') { <button class="small danger" (click)="annuler(v)">Annuler le vol</button> }
                <button class="small danger" (click)="supprimer(v)">Supprimer</button>
              </td>
            </tr>
          } @empty { <tr><td colspan="8">Aucun vol trouvé.</td></tr> }
        </tbody>
      </table>
    </div>

    @if (manifesteVol(); as mv) {
      <div class="card">
        <h2>Passagers du vol {{ mv.compagnie }} {{ mv.numeroVol }} ({{ mv.origine }} → {{ mv.destination }})</h2>
        <div class="filters">
          <label>Catégorie
            <select [(ngModel)]="categorie" (ngModelChange)="chargerManifeste()">
              <option value="">Toutes</option>
              @for (c of categories; track c.code) { <option [value]="c.code">{{ c.libelle }}</option> }
            </select>
          </label>
        </div>
        <table>
          <thead><tr><th>Passager</th><th>Catégorie</th><th>Prix payé</th><th>Groupe</th></tr></thead>
          <tbody>
            @for (r of manifeste(); track r.id) {
              <tr><td>{{ r.passagerNom }}</td><td><span class="badge {{ r.categorie }}">{{ r.categorie }}</span></td>
                <td>{{ r.prix }} €</td><td>{{ r.groupeNom ?? '—' }}</td></tr>
            } @empty { <tr><td colspan="4">Aucun passager.</td></tr> }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class Vols {
  private api = inject(Api);
  private notifier = inject(Notifier);
  protected vols = signal<Vol[]>([]);
  protected manifeste = signal<Reservation[]>([]);
  protected manifesteVol = signal<Vol | null>(null);
  protected editId = signal<number | null>(null);
  protected categories = CATEGORIES;
  protected categorie = '';
  protected form: VolRequest = vide();
  protected f = { origine: '', destination: '', date: '', disponibles: false };

  constructor() { this.charger(); }

  charger() { this.api.vols(this.f).subscribe((v) => this.vols.set(v)); }

  enregistrer() {
    const id = this.editId();
    const req = id ? this.api.modifierVol(id, this.form) : this.api.creerVol(this.form);
    req.subscribe(() => {
      this.notifier.ok(id ? 'Vol modifié avec succès' : 'Vol ajouté avec succès');
      this.reset(); this.charger();
    });
  }

  editer(v: Vol) {
    this.editId.set(v.id);
    this.form = { compagnie: v.compagnie, numeroVol: v.numeroVol, origine: v.origine, destination: v.destination,
      dateDepart: v.dateDepart.slice(0, 16), dateArrivee: v.dateArrivee.slice(0, 16), capacite: v.capacite, prix: v.prix };
    scrollTo({ top: 0, behavior: 'smooth' });
  }

  reset() { this.editId.set(null); this.form = vide(); }

  annuler(v: Vol) {
    if (!confirm(`Annuler le vol ${v.numeroVol} et toutes ses réservations ?`)) return;
    this.api.annulerVol(v.id).subscribe(() => { this.notifier.ok('Vol annulé'); this.charger(); });
  }

  supprimer(v: Vol) {
    if (!confirm(`Supprimer le vol ${v.numeroVol} ?`)) return;
    this.api.supprimerVol(v.id).subscribe(() => { this.notifier.ok('Vol supprimé'); this.charger(); });
  }

  voirPassagers(v: Vol) { this.manifesteVol.set(v); this.categorie = ''; this.chargerManifeste(); }

  chargerManifeste() {
    const v = this.manifesteVol();
    if (v) this.api.manifeste(v.id, this.categorie).subscribe((m) => this.manifeste.set(m));
  }
}
