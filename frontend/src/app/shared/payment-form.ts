import { CurrencyPipe } from '@angular/common';
import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Carte, PaiementRequest } from '../models';
import { Spinner } from './spinner';

/** Formulaire de carte bancaire FICTIF : aucun paiement réel, seule la validité du format est contrôlée. */
@Component({
  selector: 'app-payment-form',
  imports: [FormsModule, CurrencyPipe, Spinner],
  template: `
    <form (ngSubmit)="valider()" class="paiement">
      @if (carteEnregistree(); as c) {
        <label class="case"><input type="radio" name="mode" [value]="true" [ngModel]="utiliserEnregistree()" (ngModelChange)="utiliserEnregistree.set(true)">
          Ma carte enregistrée : <b>{{ c.marque }} •••• {{ c.fin }}</b> ({{ c.titulaire }}, exp. {{ c.expiration }})</label>
        <label class="case"><input type="radio" name="mode" [value]="false" [ngModel]="utiliserEnregistree()" (ngModelChange)="utiliserEnregistree.set(false)"> Utiliser une autre carte</label>
      }
      @if (!carteEnregistree() || !utiliserEnregistree()) {
        <div class="filters">
          <label>Numéro de carte<input name="n" [(ngModel)]="numero" inputmode="numeric" autocomplete="cc-number" placeholder="4242 4242 4242 4242" maxlength="23" required></label>
          <label>Titulaire<input name="t" [(ngModel)]="titulaire" autocomplete="cc-name" placeholder="Nom sur la carte" required></label>
          <label>Expiration<input name="e" [(ngModel)]="expiration" autocomplete="cc-exp" placeholder="MM/AA" maxlength="5" pattern="(0[1-9]|1[0-2])/[0-9]{2}" required></label>
          <label>CVV<input name="c" [(ngModel)]="cvv" autocomplete="cc-csc" inputmode="numeric" placeholder="123" maxlength="4" pattern="[0-9]{3,4}" required></label>
        </div>
        <label class="case"><input type="checkbox" name="s" [(ngModel)]="enregistrer"> Enregistrer cette carte pour mes prochains paiements</label>
      }
      <p class="muted">🔒 Paiement fictif de démonstration : aucun débit réel, aucune banque contactée. Le numéro complet et le CVV ne sont jamais conservés.
        Carte de test acceptée : 4242 4242 4242 4242 · refusée : 4000 0000 0000 0002 (date future, CVV au choix).</p>
      <button type="submit" [disabled]="occupe()">@if (occupe()) { <app-spinner /> Paiement en cours… } @else { {{ libelle() }} } @if (montant() !== null) { — {{ montant() | currency: 'EUR' }} }</button>
    </form>
  `,
})
export class PaymentForm {
  carteEnregistree = input<Carte | null>(null);
  montant = input<number | null>(null);
  libelle = input('Payer');
  occupe = input(false);
  soumettre = output<PaiementRequest>();

  protected utiliserEnregistree = signal(true);
  protected numero = ''; protected titulaire = ''; protected expiration = ''; protected cvv = '';
  protected enregistrer = false;

  protected valider() {
    if (this.carteEnregistree() && this.utiliserEnregistree()) { this.soumettre.emit({ carteEnregistree: true }); return; }
    this.soumettre.emit({ numeroCarte: this.numero, titulaire: this.titulaire, expiration: this.expiration, cvv: this.cvv, enregistrer: this.enregistrer });
    this.cvv = '';   // le CVV ne reste jamais en mémoire
  }
}
