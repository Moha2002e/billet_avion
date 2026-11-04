import { Injectable, inject } from '@angular/core';
import { ConfirmationService } from 'primeng/api';

/** Boîte de confirmation PrimeNG (remplace window.confirm) utilisable avec async/await. */
@Injectable({ providedIn: 'root' })
export class Confirmer {
  private service = inject(ConfirmationService);

  /**
   * Affiche une boîte de dialogue de confirmation et attend la réponse.
   * @param message la question posée à l'utilisateur
   * @param titre le titre de la boîte
   * @param danger vrai pour mettre le bouton de validation en rouge (action destructrice)
   * @returns une promesse qui vaut true si l'utilisateur confirme, false sinon
   */
  demander(message: string, titre = 'Confirmation', danger = false): Promise<boolean> {
    return new Promise((resolve) => {
      this.service.confirm({
        header: titre, message, icon: danger ? 'pi pi-exclamation-triangle' : 'pi pi-question-circle',
        acceptLabel: 'Confirmer', rejectLabel: 'Annuler',
        acceptButtonProps: { severity: danger ? 'danger' : 'primary' }, rejectButtonProps: { severity: 'secondary', outlined: true },
        accept: () => resolve(true), reject: () => resolve(false),
      });
    });
  }
}
