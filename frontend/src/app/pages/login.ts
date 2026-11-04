import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Notifier } from '../api.service';
import { Auth } from '../auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  template: `
    <div class="card" style="max-width:420px;margin:40px auto">
      @if (auth.estAdmin()) {
        <h2>Espace administrateur</h2>
        <p>Vous êtes connecté. Vous pouvez ajouter des vols et gérer les promotions.</p>
        <button class="danger" (click)="deconnecter()">Se déconnecter</button>
      } @else {
        <h2>Connexion administrateur</h2>
        <form (ngSubmit)="connecter()" style="display:flex;flex-direction:column;gap:12px">
          <label>Identifiant<input name="u" [(ngModel)]="username" autocomplete="username" required></label>
          <label>Mot de passe<input name="p" type="password" [(ngModel)]="password" autocomplete="current-password" required></label>
          <button type="submit">Se connecter</button>
        </form>
      }
    </div>
  `,
})
export class Login {
  protected auth = inject(Auth);
  private notifier = inject(Notifier);
  private router = inject(Router);
  protected username = '';
  protected password = '';

  connecter() {
    this.auth.connecter(this.username, this.password).subscribe(() => {
      this.password = '';
      this.notifier.ok('Connecté en tant qu\'administrateur');
      this.router.navigateByUrl('/vols');
    });
  }

  deconnecter() { this.auth.deconnecter(); this.notifier.ok('Déconnecté'); }
}
