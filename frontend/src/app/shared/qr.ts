import { Component, effect, input, signal } from '@angular/core';
import QRCode from 'qrcode';

/** QR code généré dans le navigateur (aucun service externe). */
@Component({
  selector: 'app-qr',
  template: `@if (src()) { <img class="qr" [src]="src()" [width]="taille()" [height]="taille()" alt="QR code du billet"> }`,
  styles: `.qr { display: block; image-rendering: pixelated; background: #fff; }`,
})
export class Qr {
  /** Texte encodé dans le QR code. */
  valeur = input.required<string>();
  /** Taille de l'image en pixels. */
  taille = input(120);
  /** Image du QR code (URL de données), vide tant qu'elle n'est pas prête. */
  protected src = signal('');

  /** Régénère l'image à chaque changement du texte à encoder. */
  constructor() {
    effect(() => {
      QRCode.toDataURL(this.valeur(), { margin: 1, width: this.taille() * 3, errorCorrectionLevel: 'M' })
        .then((url) => this.src.set(url))
        .catch(() => this.src.set(''));
    });
  }
}
