import { Component, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { Message } from 'primeng/message';
import { ProgressSpinner } from 'primeng/progressspinner';
import { Api } from '../api.service';

/** Crée la réservation (gardée 15 min) avec le vol choisi, puis ouvre la page de réservation. */
@Component({
  selector: 'app-nouvelle-reservation',
  imports: [Card, Button, Message, ProgressSpinner],
  template: `
    <p-card class="carte-etroite centre">
      @if (erreur()) {
        <h2>Réservation impossible</h2>
        <p-message severity="error">{{ erreur() }}</p-message>
        <p-button label="Retour à la recherche" icon="pi pi-search" (onClick)="retour()" styleClass="mt-3" />
      } @else {
        <p-progress-spinner strokeWidth="5" ariaLabel="Chargement" />
        <h2>Nous gardons votre vol…</h2>
      }
    </p-card>
  `,
})
export class NouvelleReservation {
  private api = inject(Api);
  private router = inject(Router);
  // Paramètres d'URL (withComponentInputBinding)
  volId = input<string>(); adultes = input<string>(); enfants = input<string>(); bebes = input<string>(); codePromo = input<string>();
  /** Message d'erreur éventuel. */
  protected erreur = signal('');

  /** Crée la réservation dès l'ouverture de la page, puis redirige vers elle. */
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

  /** Revient à l'accueil pour refaire une recherche. */
  protected retour(): void { this.router.navigateByUrl('/'); }
}
