import { CurrencyPipe } from '@angular/common';
import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { InputMask } from 'primeng/inputmask';
import { InputText } from 'primeng/inputtext';
import { Message } from 'primeng/message';
import { RadioButton } from 'primeng/radiobutton';
import { Carte, PaiementRequest } from '../models';

/** Formulaire de carte bancaire FICTIF : aucun paiement réel, seule la validité du format est contrôlée. */
@Component({
  selector: 'app-payment-form',
  imports: [FormsModule, CurrencyPipe, Button, Checkbox, InputMask, InputText, Message, RadioButton],
  template: `
    <form (ngSubmit)="valider()" class="paiement colonne">
      @if (carteEnregistree(); as c) {
        <div class="ligne-choix">
          <p-radiobutton name="mode" [value]="true" [ngModel]="utiliserEnregistree()" (ngModelChange)="utiliserEnregistree.set(true)" inputId="carte-enr" />
          <label for="carte-enr">Ma carte enregistrée : <b>{{ c.marque }} •••• {{ c.fin }}</b> ({{ c.titulaire }}, exp. {{ c.expiration }})</label>
        </div>
        <div class="ligne-choix">
          <p-radiobutton name="mode" [value]="false" [ngModel]="utiliserEnregistree()" (ngModelChange)="utiliserEnregistree.set(false)" inputId="carte-autre" />
          <label for="carte-autre">Utiliser une autre carte</label>
        </div>
      }
      @if (!carteEnregistree() || !utiliserEnregistree()) {
        <div class="champ"><label for="numero">Numéro de carte</label>
          <p-inputmask inputId="numero" name="n" [(ngModel)]="numero" mask="9999 9999 9999 9999" placeholder="4242 4242 4242 4242" styleClass="w-full" [required]="true" /></div>
        <div class="champ"><label for="titulaire">Titulaire</label>
          <input pInputText id="titulaire" name="t" [(ngModel)]="titulaire" autocomplete="cc-name" placeholder="Nom sur la carte" required /></div>
        <div class="deux-champs">
          <div class="champ"><label for="expiration">Expiration</label>
            <p-inputmask inputId="expiration" name="e" [(ngModel)]="expiration" mask="99/99" placeholder="MM/AA" styleClass="w-full" [required]="true" /></div>
          <div class="champ"><label for="cvv">CVV</label>
            <p-inputmask inputId="cvv" name="c" [(ngModel)]="cvv" mask="999?9" placeholder="123" styleClass="w-full" [required]="true" /></div>
        </div>
        <div class="ligne-choix">
          <p-checkbox inputId="enregistrer" name="s" [(ngModel)]="enregistrer" [binary]="true" />
          <label for="enregistrer">Enregistrer cette carte pour mes prochains paiements</label>
        </div>
      }
      <p-message severity="secondary" size="small" icon="pi pi-lock">
        Paiement fictif de démonstration : aucun débit réel. Le numéro complet et le CVV ne sont jamais conservés.
        Carte de test acceptée : 4242 4242 4242 4242 · refusée : 4000 0000 0000 0002 (date future, CVV au choix).
      </p-message>
      <p-button type="submit" icon="pi pi-lock" [loading]="occupe()" [fluid]="true"
        [label]="(occupe() ? 'Paiement en cours…' : libelle()) + (montant() !== null ? ' — ' + (montant() | currency: 'EUR') : '')" />
    </form>
  `,
})
export class PaymentForm {
  /** Carte enregistrée sur le compte (ou null). */
  carteEnregistree = input<Carte | null>(null);
  /** Montant affiché sur le bouton. */
  montant = input<number | null>(null);
  /** Texte du bouton. */
  libelle = input('Payer');
  /** Vrai pendant le paiement (bouton en chargement). */
  occupe = input(false);
  /** Émis quand l'utilisateur valide le formulaire. */
  soumettre = output<PaiementRequest>();

  /** Vrai pour payer avec la carte enregistrée. */
  protected utiliserEnregistree = signal(true);
  protected numero = ''; protected titulaire = ''; protected expiration = ''; protected cvv = '';
  protected enregistrer = false;

  /** Valide le formulaire : émet la carte saisie (ou la demande de carte enregistrée) puis efface le CVV. */
  protected valider(): void {
    if (this.carteEnregistree() && this.utiliserEnregistree()) { this.soumettre.emit({ carteEnregistree: true }); return; }
    this.soumettre.emit({ numeroCarte: this.numero.replace(/_/g, ''), titulaire: this.titulaire, expiration: this.expiration, cvv: (this.cvv ?? '').replace(/_/g, ''), enregistrer: this.enregistrer });
    this.cvv = '';   // le CVV ne reste jamais en mémoire
  }
}
