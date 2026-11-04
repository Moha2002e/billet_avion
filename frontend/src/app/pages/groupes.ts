import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api, Notifier } from '../api.service';
import { Groupe, Passager, Vol } from '../models';

@Component({
  selector: 'app-groupes',
  imports: [FormsModule],
  template: `
    <div class="card">
      <h2>Nouveau voyage groupé</h2>
      <form (ngSubmit)="creer()">
        <div class="filters">
          <label>Nom du groupe<input name="n" [(ngModel)]="nom" required></label>
          <label>Responsable<input name="r" [(ngModel)]="responsable" required></label>
          <label>Vol
            <select name="v" [(ngModel)]="volId" required>
              @for (v of vols(); track v.id) { <option [ngValue]="v.id">{{ v.compagnie }} {{ v.numeroVol }} : {{ v.origine }} → {{ v.destination }} ({{ v.placesRestantes }} places)</option> }
            </select>
          </label>
        </div>
        <p>Passagers du groupe ({{ choisis.size }} sélectionné(s)) :</p>
        <div class="checks">
          @for (p of passagers(); track p.id) {
            <label><input type="checkbox" [checked]="choisis.has(p.id)" (change)="basculer(choisis, p.id)"> {{ p.nom }} {{ p.prenom }} <span class="badge {{ p.categorie }}">{{ p.categorie }}</span></label>
          }
        </div>
        <button type="submit">Créer le groupe</button>
        <span class="muted"> Remise: 5 % dès 5 passagers, 10 % dès 10, 15 % dès 20.</span>
      </form>
    </div>

    @for (g of groupes(); track g.id) {
      <div class="card">
        <h2>{{ g.nom }} <span class="badge {{ g.actif ? 'ADULTE' : 'ANNULE' }}">{{ g.actif ? 'Actif' : 'Annulé' }}</span></h2>
        <p>{{ g.volLibelle }} · Responsable : {{ g.responsable }} · {{ g.nbPassagers }} passager(s) ·
          remise {{ g.remisePourcent }} % · total <b>{{ g.total }} €</b></p>
        <table>
          <thead><tr><th>Passager</th><th>Catégorie</th><th>Prix</th><th></th></tr></thead>
          <tbody>
            @for (m of g.membres; track m.id) {
              <tr><td>{{ m.passagerNom }}</td><td><span class="badge {{ m.categorie }}">{{ m.categorie }}</span></td><td>{{ m.prix }} €</td>
                <td>@if (g.actif) { <button class="small danger" (click)="retirer(g, m.passagerId)">Retirer</button> }</td></tr>
            } @empty { <tr><td colspan="4">Aucun passager.</td></tr> }
          </tbody>
        </table>
        @if (g.actif) {
          <p>Ajouter des passagers :</p>
          <div class="checks">
            @for (p of disponibles(g); track p.id) {
              <label><input type="checkbox" [checked]="aAjouter(g.id).has(p.id)" (change)="basculer(aAjouter(g.id), p.id)"> {{ p.nom }} {{ p.prenom }}</label>
            }
          </div>
          <button class="sec" (click)="ajouter(g)">Ajouter la sélection</button>
          <button class="danger" (click)="annuler(g)">Annuler le groupe</button>
        }
      </div>
    } @empty { <div class="card">Aucun voyage groupé.</div> }
  `,
})
export class Groupes {
  private api = inject(Api);
  private notifier = inject(Notifier);
  protected groupes = signal<Groupe[]>([]);
  protected passagers = signal<Passager[]>([]);
  protected vols = signal<Vol[]>([]);
  protected nom = '';
  protected responsable = '';
  protected volId: number | null = null;
  protected choisis = new Set<number>();
  private ajouts = new Map<number, Set<number>>();

  constructor() {
    this.api.passagers().subscribe((p) => this.passagers.set(p));
    this.recharger();
  }

  private recharger() {
    this.api.groupes().subscribe((g) => this.groupes.set(g));
    this.api.vols({ disponibles: true }).subscribe((v) => this.vols.set(v));
  }

  basculer(set: Set<number>, id: number) { set.has(id) ? set.delete(id) : set.add(id); }
  aAjouter(id: number) { if (!this.ajouts.has(id)) this.ajouts.set(id, new Set()); return this.ajouts.get(id)!; }
  disponibles(g: Groupe) {
    const dedans = new Set(g.membres.map((m) => m.passagerId));
    return this.passagers().filter((p) => !dedans.has(p.id));
  }

  creer() {
    if (this.volId === null) return;
    this.api.creerGroupe({ nom: this.nom, responsable: this.responsable, volId: this.volId, passagerIds: [...this.choisis] })
      .subscribe((g) => {
        this.notifier.ok(`Groupe créé : ${g.nbPassagers} passagers, remise ${g.remisePourcent} %`);
        this.nom = ''; this.responsable = ''; this.choisis = new Set(); this.recharger();
      });
  }

  ajouter(g: Groupe) {
    const ids = [...this.aAjouter(g.id)];
    if (!ids.length) return;
    this.api.ajouterAuGroupe(g.id, ids).subscribe(() => {
      this.ajouts.delete(g.id); this.notifier.ok('Passagers ajoutés au groupe'); this.recharger();
    });
  }

  retirer(g: Groupe, passagerId: number) {
    this.api.retirerDuGroupe(g.id, passagerId).subscribe(() => { this.notifier.ok('Passager retiré du groupe'); this.recharger(); });
  }

  annuler(g: Groupe) {
    if (!confirm(`Annuler le groupe « ${g.nom} » et toutes ses réservations ?`)) return;
    this.api.annulerGroupe(g.id).subscribe(() => { this.notifier.ok('Groupe annulé'); this.recharger(); });
  }
}
