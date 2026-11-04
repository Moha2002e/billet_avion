import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Notifier } from './api.service';
import { Auth } from './auth.service';
import { Chat } from './chat';
import { Loader } from './shared/loader';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Chat],
  templateUrl: './app.html',
})
export class App {
  protected notifier = inject(Notifier);
  protected auth = inject(Auth);
  protected loader = inject(Loader);
  private router = inject(Router);

  protected deconnecter() {
    this.auth.deconnecter();
    this.notifier.ok('Vous êtes déconnecté');
    this.router.navigateByUrl('/');
  }
}
