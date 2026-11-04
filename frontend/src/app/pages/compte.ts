import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api, Notifier } from '../api.service';
import { Auth } from '../auth.service';

@Component({
  selector: 'app-compte',
  imports: [FormsModule],
  template: `
    <div class="card" style="max-width:640px;margin:0 auto 20px">
      <h2>Mon compte</h2>
      <p class="muted">E-mail : {{ auth.utilisateur()?.email }}</p>
      <form (ngSubmit)="enregistrer()" class="colonne">
        <div class="filters">
          <label>Prénom<input name="p" [(ngModel)]="f.prenom" required></label>
          <label>Nom<input name="n" [(ngModel)]="f.nom" required></label>
        </div>
        <div class="filters">
          <label>Téléphone<input name="t" type="tel" [(ngModel)]="f.telephone"></label>
          <label>Date de naissance<input name="d" type="date" [(ngModel)]="f.dateNaissance" required></label>
        </div>
        <button type="submit">Enregistrer</button>
      </form>
    </div>
    <div class="card" style="max-width:640px;margin:0 auto">
      <h2>Ma carte enregistrée</h2>
      @if (auth.utilisateur()?.carte; as c) {
        <p><b>{{ c.marque }} •••• {{ c.fin }}</b> — {{ c.titulaire }}, expire {{ c.expiration }}</p>
        <button class="danger" (click)="supprimerCarte()">Supprimer cette carte</button>
      } @else { <p class="muted">Aucune carte enregistrée. Vous pourrez en enregistrer une lors d'un paiement (paiement fictif de démonstration).</p> }
    </div>
  `,
})
export class Compte {
  protected auth = inject(Auth);
  private api = inject(Api);
  private notifier = inject(Notifier);
  protected f = { nom: '', prenom: '', telephone: '', dateNaissance: '' };

  constructor() {
    const u = this.auth.utilisateur();
    if (u) this.f = { nom: u.nom, prenom: u.prenom, telephone: u.telephone ?? '', dateNaissance: u.dateNaissance };
  }

  enregistrer() { this.api.modifierProfil(this.f).subscribe((u) => { this.auth.majUtilisateur(u); this.notifier.ok('Profil mis à jour'); }); }
  supprimerCarte() { this.api.supprimerCarte().subscribe((u) => { this.auth.majUtilisateur(u); this.notifier.ok('Carte supprimée'); }); }
}
