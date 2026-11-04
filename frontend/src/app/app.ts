import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Notifier } from './api.service';
import { Auth } from './auth.service';
import { Chat } from './chat';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Chat],
  templateUrl: './app.html',
})
export class App {
  protected notifier = inject(Notifier);
  protected auth = inject(Auth);
}
