import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Notifier } from '../api.service';
import { Auth } from '../auth.service';

@Component({
  selector: 'app-connexion',
  imports: [FormsModule],
  template: `
    <div class="card" style="max-width:520px;margin:30px auto">
      <div class="onglets">
        <button type="button" [class.actif]="mode() === 'connexion'" (click)="mode.set('connexion')">Se connecter</button>
        <button type="button" [class.actif]="mode() === 'inscription'" (click)="mode.set('inscription')">Créer un compte</button>
      </div>
      @if (retour()) { <p class="muted">Après connexion, vous reprendrez votre réservation.</p> }

      @if (mode() === 'connexion') {
        <form (ngSubmit)="connecter()" class="colonne">
          <label>E-mail<input name="i" [(ngModel)]="identifiant" autocomplete="username" required></label>
          <label>Mot de passe<input name="p" type="password" [(ngModel)]="motDePasse" autocomplete="current-password" required></label>
          <button type="submit">Se connecter</button>
        </form>
      } @else {
        <form (ngSubmit)="inscrire()" class="colonne">
          <div class="filters">
            <label>Prénom<input name="pr" [(ngModel)]="d.prenom" autocomplete="given-name" required></label>
            <label>Nom<input name="no" [(ngModel)]="d.nom" autocomplete="family-name" required></label>
          </div>
          <label>E-mail<input name="em" type="email" [(ngModel)]="d.email" autocomplete="email" required></label>
          <label>Mot de passe (8 caractères minimum)<input name="mp" type="password" [(ngModel)]="d.motDePasse" minlength="8" autocomplete="new-password" required></label>
          <div class="filters">
            <label>Téléphone<input name="te" type="tel" [(ngModel)]="d.telephone" autocomplete="tel"></label>
            <label>Date de naissance<input name="dn" type="date" [(ngModel)]="d.dateNaissance" [max]="aujourdhui" required></label>
          </div>
          <button type="submit">Créer mon compte</button>
        </form>
      }
    </div>
  `,
})
export class Connexion {
  private auth = inject(Auth);
  private router = inject(Router);
  private notifier = inject(Notifier);
  retour = input<string>();
  protected mode = signal<'connexion' | 'inscription'>('connexion');
  protected identifiant = ''; protected motDePasse = '';
  protected aujourdhui = new Date().toISOString().slice(0, 10);
  protected d = { email: '', motDePasse: '', nom: '', prenom: '', telephone: '', dateNaissance: '' };

  connecter() {
    this.auth.connecter(this.identifiant, this.motDePasse).subscribe(() => { this.motDePasse = ''; this.apres('Connexion réussie'); });
  }

  inscrire() {
    this.auth.inscrire(this.d).subscribe(() => { this.d.motDePasse = ''; this.apres('Compte créé, bienvenue !'); });
  }

  private apres(message: string) {
    this.notifier.ok(message);
    const retour = this.retour();
    // On n'accepte que les chemins internes de l'application
    if (retour && retour.startsWith('/') && !retour.startsWith('//')) this.router.navigateByUrl(retour, { replaceUrl: true });
    else this.router.navigateByUrl(this.auth.estAdmin() ? '/admin' : '/mes-voyages', { replaceUrl: true });
  }
}
