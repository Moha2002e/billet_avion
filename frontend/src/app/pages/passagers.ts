import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api, Notifier } from '../api.service';
import { CATEGORIES, Passager, PassagerRequest, Reservation } from '../models';

const vide = (): PassagerRequest => ({ nom: '', prenom: '', dateNaissance: '', telephone: '', email: null });

@Component({
  selector: 'app-passagers',
  imports: [FormsModule, DatePipe],
  template: `
    <div class="card">
      <h2>{{ editId() ? 'Modifier le passager' : 'Ajouter un passager' }}</h2>
      <form class="row" (ngSubmit)="enregistrer()">
        <label>Nom<input name="n" [(ngModel)]="form.nom" required></label>
        <label>Prénom<input name="p" [(ngModel)]="form.prenom" required></label>
        <label>Date de naissance<input type="date" name="d" [(ngModel)]="form.dateNaissance" required></label>
        <label>Téléphone<input type="tel" name="t" [(ngModel)]="form.telephone" pattern="[0-9]{10,15}" required></label>
        <label>E-mail<input type="email" name="e" [(ngModel)]="form.email"></label>
        <button type="submit">{{ editId() ? 'Enregistrer' : 'Ajouter' }}</button>
        @if (editId()) { <button type="button" class="sec" (click)="reset()">Annuler</button> }
      </form>
    </div>

    <div class="card">
      <h2>Passagers</h2>
      <div class="filters">
        <label>Recherche<input placeholder="Nom ou prénom" [(ngModel)]="f.q" (ngModelChange)="charger()"></label>
        <label>Catégorie
          <select [(ngModel)]="f.categorie" (ngModelChange)="charger()">
            <option value="">Toutes</option>
            @for (c of categories; track c.code) { <option [value]="c.code">{{ c.libelle }}</option> }
          </select>
        </label>
        <button class="sec" (click)="filtrer('JEUNE')">Voir les jeunes</button>
      </div>
      <table>
        <thead><tr><th>Nom</th><th>Naissance</th><th>Âge</th><th>Catégorie</th><th>Téléphone</th><th>E-mail</th><th></th></tr></thead>
        <tbody>
          @for (p of passagers(); track p.id) {
            <tr>
              <td>{{ p.nom }} {{ p.prenom }}</td>
              <td>{{ p.dateNaissance | date: 'dd/MM/yyyy' }}</td>
              <td>{{ p.age }} ans</td>
              <td><span class="badge {{ p.categorie }}">{{ p.categorieLibelle }}</span></td>
              <td>{{ p.telephone }}</td><td>{{ p.email ?? '—' }}</td>
              <td class="actions">
                <button class="small sec" (click)="voirReservations(p)">Réservations</button>
                <button class="small sec" (click)="editer(p)">Modifier</button>
                <button class="small danger" (click)="supprimer(p)">Supprimer</button>
              </td>
            </tr>
          } @empty { <tr><td colspan="7">Aucun passager trouvé.</td></tr> }
        </tbody>
      </table>
    </div>

    @if (courant(); as c) {
      <div class="card">
        <h2>Réservations de {{ c.prenom }} {{ c.nom }}</h2>
        <table>
          <thead><tr><th>Vol</th><th>Départ</th><th>Prix</th><th>Groupe</th><th>Statut</th></tr></thead>
          <tbody>
            @for (r of reservations(); track r.id) {
              <tr><td>{{ r.volLibelle }}</td><td>{{ r.dateDepart | date: 'dd/MM/yy HH:mm' }}</td><td>{{ r.prix }} €</td>
                <td>{{ r.groupeNom ?? '—' }}</td><td><span class="badge {{ r.statut }}">{{ r.statut }}</span></td></tr>
            } @empty { <tr><td colspan="5">Aucune réservation.</td></tr> }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class Passagers {
  private api = inject(Api);
  private notifier = inject(Notifier);
  protected passagers = signal<Passager[]>([]);
  protected reservations = signal<Reservation[]>([]);
  protected courant = signal<Passager | null>(null);
  protected editId = signal<number | null>(null);
  protected categories = CATEGORIES;
  protected form: PassagerRequest = vide();
  protected f = { q: '', categorie: '' };

  constructor() { this.charger(); }

  charger() { this.api.passagers(this.f).subscribe((p) => this.passagers.set(p)); }

  filtrer(cat: string) { this.f.categorie = cat; this.charger(); }

  enregistrer() {
    const id = this.editId();
    const body = { ...this.form, email: this.form.email || null };
    const req = id ? this.api.modifierPassager(id, body) : this.api.creerPassager(body);
    req.subscribe(() => {
      this.notifier.ok(id ? 'Passager modifié avec succès' : 'Passager ajouté avec succès');
      this.reset(); this.charger();
    });
  }

  editer(p: Passager) {
    this.editId.set(p.id);
    this.form = { nom: p.nom, prenom: p.prenom, dateNaissance: p.dateNaissance, telephone: p.telephone, email: p.email };
    scrollTo({ top: 0, behavior: 'smooth' });
  }

  reset() { this.editId.set(null); this.form = vide(); }

  supprimer(p: Passager) {
    if (!confirm(`Supprimer ${p.prenom} ${p.nom} ?`)) return;
    this.api.supprimerPassager(p.id).subscribe(() => { this.notifier.ok('Passager supprimé'); this.charger(); });
  }

  voirReservations(p: Passager) {
    this.courant.set(p);
    this.api.reservationsDe(p.id).subscribe((r) => this.reservations.set(r));
  }
}
