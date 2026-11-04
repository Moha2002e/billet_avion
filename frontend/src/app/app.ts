import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { Button } from 'primeng/button';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Menu } from 'primeng/menu';
import { Menubar } from 'primeng/menubar';
import { ProgressBar } from 'primeng/progressbar';
import { Toast } from 'primeng/toast';
import { Notifier } from './api.service';
import { Auth } from './auth.service';
import { Chat } from './chat';
import { Loader } from './shared/loader';

/** Coque de l'application : barre de menu PrimeNG, notifications, confirmations, barre de chargement, chat. */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, Button, ConfirmDialog, Menu, Menubar, ProgressBar, Toast, Chat],
  templateUrl: './app.html',
})
export class App {
  private notifier = inject(Notifier);
  private router = inject(Router);
  protected auth = inject(Auth);
  protected loader = inject(Loader);

  /** Entrées du menu principal, selon que l'utilisateur est connecté ou administrateur. */
  protected menu = computed<MenuItem[]>(() => {
    const items: MenuItem[] = [
      { label: 'Vols', icon: 'pi pi-search', routerLink: '/' },
      { label: 'Promotions', icon: 'pi pi-tag', routerLink: '/promotions' },
    ];
    if (this.auth.estConnecte() && !this.auth.estAdmin()) items.push({ label: 'Mes voyages', icon: 'pi pi-ticket', routerLink: '/mes-voyages' });
    if (this.auth.estAdmin()) items.push({ label: 'Administration', icon: 'pi pi-cog', routerLink: '/admin' });
    return items;
  });

  /** Entrées du menu du compte (Mon compte, Se déconnecter). */
  protected menuCompte: MenuItem[] = [
    { label: 'Mon compte', icon: 'pi pi-user', command: () => this.router.navigateByUrl('/compte') },
    { label: 'Se déconnecter', icon: 'pi pi-sign-out', command: () => this.deconnecter() },
  ];

  /** Ouvre la page de connexion. */
  protected seConnecter(): void { this.router.navigateByUrl('/connexion'); }

  /** Déconnecte l'utilisateur et revient à l'accueil. */
  protected deconnecter(): void {
    this.auth.deconnecter();
    this.notifier.ok('Vous êtes déconnecté');
    this.router.navigateByUrl('/');
  }
}
