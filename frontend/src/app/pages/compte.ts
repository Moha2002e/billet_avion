import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DatePicker } from 'primeng/datepicker';
import { InputText } from 'primeng/inputtext';
import { Tag } from 'primeng/tag';
import { Api, Notifier } from '../api.service';
import { Auth } from '../auth.service';
import { Confirmer } from '../shared/confirmer';
import { aujourdhui, versDate, versIsoDate } from '../shared/dates';

/** Mon compte : modification du profil et gestion de la carte bancaire enregistrée. */
@Component({
  selector: 'app-compte',
  imports: [FormsModule, Button, Card, DatePicker, InputText, Tag],
  template: `
    <p-card header="Mon compte" [subheader]="auth.utilisateur()?.email" class="carte-etroite mb-4">
      <form (ngSubmit)="enregistrer()" class="colonne">
        <div class="deux-champs">
          <div class="champ"><label for="prenom">Prénom</label><input pInputText id="prenom" name="p" [(ngModel)]="f.prenom" required /></div>
          <div class="champ"><label for="nom">Nom</label><input pInputText id="nom" name="n" [(ngModel)]="f.nom" required /></div>
        </div>
        <div class="deux-champs">
          <div class="champ"><label for="tel">Téléphone</label><input pInputText id="tel" name="t" type="tel" [(ngModel)]="f.telephone" /></div>
          <div class="champ"><label for="naissance">Date de naissance</label>
            <p-datepicker inputId="naissance" name="d" [(ngModel)]="naissance" [maxDate]="max" dateFormat="dd/mm/yy" [showIcon]="true" iconDisplay="input" appendTo="body" /></div>
        </div>
        <p-button type="submit" label="Enregistrer" icon="pi pi-check" />
      </form>
    </p-card>
    <p-card header="Ma carte enregistrée" class="carte-etroite">
      @if (auth.utilisateur()?.carte; as c) {
        <p><p-tag [value]="c.marque" icon="pi pi-credit-card" /> •••• <b>{{ c.fin }}</b> — {{ c.titulaire }}, expire {{ c.expiration }}</p>
        <p-button label="Supprimer cette carte" icon="pi pi-trash" severity="danger" [outlined]="true" (onClick)="supprimerCarte()" />
      } @else { <p class="muted">Aucune carte enregistrée. Vous pourrez en enregistrer une lors d'un paiement (paiement fictif de démonstration).</p> }
    </p-card>
  `,
})
export class Compte {
  protected auth = inject(Auth);
  private api = inject(Api);
  private notifier = inject(Notifier);
  private confirmer = inject(Confirmer);
  /** Date maximale de naissance : aujourd'hui. */
  protected max = aujourdhui();
  /** Date de naissance en cours de modification. */
  protected naissance: Date | null = null;
  protected f = { nom: '', prenom: '', telephone: '' };

  /** Pré-remplit le formulaire avec le profil du compte connecté. */
  constructor() {
    const u = this.auth.utilisateur();
    if (u) { this.f = { nom: u.nom, prenom: u.prenom, telephone: u.telephone ?? '' }; this.naissance = versDate(u.dateNaissance); }
  }

  /** Enregistre les modifications du profil. */
  protected enregistrer(): void {
    this.api.modifierProfil({ ...this.f, dateNaissance: versIsoDate(this.naissance) }).subscribe((u) => { this.auth.majUtilisateur(u); this.notifier.ok('Profil mis à jour'); });
  }

  /** Supprime la carte enregistrée après confirmation. */
  protected async supprimerCarte(): Promise<void> {
    if (!(await this.confirmer.demander('Supprimer la carte enregistrée ?', 'Carte bancaire', true))) return;
    this.api.supprimerCarte().subscribe((u) => { this.auth.majUtilisateur(u); this.notifier.ok('Carte supprimée'); });
  }
}
