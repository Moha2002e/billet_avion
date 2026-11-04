import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DatePicker } from 'primeng/datepicker';
import { InputText } from 'primeng/inputtext';
import { Message } from 'primeng/message';
import { Password } from 'primeng/password';
import { TabPanel, TabPanels, Tab, TabList, Tabs } from 'primeng/tabs';
import { Notifier } from '../api.service';
import { Auth } from '../auth.service';
import { aujourdhui, versIsoDate } from '../shared/dates';

/** Connexion et création de compte (deux onglets PrimeNG) ; reprend la réservation après la connexion. */
@Component({
  selector: 'app-connexion',
  imports: [FormsModule, Button, Card, DatePicker, InputText, Message, Password, Tabs, TabList, Tab, TabPanels, TabPanel],
  template: `
    <p-card class="carte-etroite">
      <p-tabs [value]="mode()" (valueChange)="mode.set($any($event))">
        <p-tablist>
          <p-tab value="connexion"><i class="pi pi-sign-in"></i>&nbsp;Se connecter</p-tab>
          <p-tab value="inscription"><i class="pi pi-user-plus"></i>&nbsp;Créer un compte</p-tab>
        </p-tablist>
        <p-tabpanels>
          <p-tabpanel value="connexion">
            @if (retour()) { <p-message severity="info" size="small" class="mb-3">Après connexion, vous reprendrez votre réservation.</p-message> }
            <form (ngSubmit)="connecter()" class="colonne">
              <div class="champ"><label for="identifiant">E-mail</label>
                <input pInputText id="identifiant" name="i" [(ngModel)]="identifiant" autocomplete="username" required /></div>
              <div class="champ"><label for="mdp">Mot de passe</label>
                <p-password inputId="mdp" name="p" [(ngModel)]="motDePasse" [feedback]="false" [toggleMask]="true" autocomplete="current-password" [fluid]="true" /></div>
              <p-button type="submit" label="Se connecter" icon="pi pi-sign-in" [fluid]="true" />
            </form>
          </p-tabpanel>
          <p-tabpanel value="inscription">
            <form (ngSubmit)="inscrire()" class="colonne">
              <div class="deux-champs">
                <div class="champ"><label for="prenom">Prénom</label><input pInputText id="prenom" name="pr" [(ngModel)]="d.prenom" autocomplete="given-name" required /></div>
                <div class="champ"><label for="nom">Nom</label><input pInputText id="nom" name="no" [(ngModel)]="d.nom" autocomplete="family-name" required /></div>
              </div>
              <div class="champ"><label for="email">E-mail</label><input pInputText id="email" name="em" type="email" [(ngModel)]="d.email" autocomplete="email" required /></div>
              <div class="champ"><label for="mdp2">Mot de passe (8 caractères minimum)</label>
                <p-password inputId="mdp2" name="mp" [(ngModel)]="d.motDePasse" [feedback]="false" [toggleMask]="true" autocomplete="new-password" [fluid]="true" /></div>
              <div class="deux-champs">
                <div class="champ"><label for="tel">Téléphone</label><input pInputText id="tel" name="te" type="tel" [(ngModel)]="d.telephone" autocomplete="tel" /></div>
                <div class="champ"><label for="naissance">Date de naissance</label>
                  <p-datepicker inputId="naissance" name="dn" [(ngModel)]="naissance" [maxDate]="max" dateFormat="dd/mm/yy" [showIcon]="true" iconDisplay="input" placeholder="jj/mm/aaaa" appendTo="body" /></div>
              </div>
              <p-button type="submit" label="Créer mon compte" icon="pi pi-user-plus" [fluid]="true" />
            </form>
          </p-tabpanel>
        </p-tabpanels>
      </p-tabs>
    </p-card>
  `,
})
export class Connexion {
  private auth = inject(Auth);
  private router = inject(Router);
  private notifier = inject(Notifier);
  /** Adresse où revenir après la connexion (paramètre d'URL). */
  retour = input<string>();
  /** Onglet affiché : connexion ou inscription. */
  protected mode = signal<'connexion' | 'inscription'>('connexion');
  protected identifiant = ''; protected motDePasse = '';
  /** Date maximale de naissance : aujourd'hui. */
  protected max = aujourdhui();
  /** Date de naissance choisie à l'inscription. */
  protected naissance: Date | null = null;
  protected d = { email: '', motDePasse: '', nom: '', prenom: '', telephone: '', dateNaissance: '' };

  /** Connecte l'utilisateur avec l'e-mail et le mot de passe saisis. */
  protected connecter(): void {
    this.auth.connecter(this.identifiant, this.motDePasse).subscribe(() => { this.motDePasse = ''; this.apres('Connexion réussie'); });
  }

  /** Crée le compte avec les informations saisies puis connecte l'utilisateur. */
  protected inscrire(): void {
    this.auth.inscrire({ ...this.d, dateNaissance: versIsoDate(this.naissance) }).subscribe(() => { this.d.motDePasse = ''; this.apres('Compte créé, bienvenue !'); });
  }

  /**
   * Après la connexion : affiche un message puis ouvre la page demandée (ou la page d'accueil du compte).
   * @param message le message de succès
   */
  private apres(message: string): void {
    this.notifier.ok(message);
    const retour = this.retour();
    // On n'accepte que les chemins internes de l'application
    if (retour && retour.startsWith('/') && !retour.startsWith('//')) this.router.navigateByUrl(retour, { replaceUrl: true });
    else this.router.navigateByUrl(this.auth.estAdmin() ? '/admin' : '/mes-voyages', { replaceUrl: true });
  }
}
