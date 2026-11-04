import { Component, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Api } from '../api.service';

/** Crée la réservation (gardée 15 min) avec le vol choisi, puis ouvre la page de réservation. */
@Component({
  selector: 'app-nouvelle-reservation',
  imports: [RouterLink],
  template: `
    <div class="card" style="max-width:520px;margin:30px auto;text-align:center">
      @if (erreur()) {
        <h2>Réservation impossible</h2>
        <p>{{ erreur() }}</p>
        <a routerLink="/">Retour à la recherche</a>
      } @else { <h2>Nous gardons votre vol…</h2> }
    </div>
  `,
})
export class NouvelleReservation {
  private api = inject(Api);
  private router = inject(Router);
  volId = input<string>(); adultes = input<string>(); enfants = input<string>(); bebes = input<string>(); codePromo = input<string>();
  protected erreur = signal('');

  constructor() {
    queueMicrotask(() => {
      const volId = Number(this.volId());
      if (!volId) { this.erreur.set('Aucun vol sélectionné.'); return; }
      this.api.creerReservation({ volId, adultes: Number(this.adultes() ?? 1) || 1, enfants: Number(this.enfants() ?? 0) || 0,
        bebes: Number(this.bebes() ?? 0) || 0, codePromo: this.codePromo() ?? null }).subscribe({
        next: (r) => this.router.navigate(['/reservation', r.id], { replaceUrl: true }),
        error: (e) => this.erreur.set(e.error?.message ?? 'Erreur inattendue'),
      });
    });
  }
}
