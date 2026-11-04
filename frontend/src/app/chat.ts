import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Avatar } from 'primeng/avatar';
import { Button } from 'primeng/button';
import { Chip } from 'primeng/chip';
import { Drawer } from 'primeng/drawer';
import { InputText } from 'primeng/inputtext';
import { Api } from './api.service';

/** Message de la conversation : qui l'a écrit et son texte. */
interface Message { de: 'moi' | 'bot'; texte: string; }

/** Bulle de chat flottante : l'assistant gratuit du back-end (POST /api/chat), dans un panneau PrimeNG. */
@Component({
  selector: 'app-chat',
  imports: [FormsModule, Avatar, Button, Chip, Drawer, InputText],
  template: `
    <p-button class="chat-btn" icon="pi pi-comments" [rounded]="true" size="large" (onClick)="ouvrir()" ariaLabel="Ouvrir l'assistant" />
    <p-drawer [(visible)]="ouvert" position="right" [modal]="false" [dismissible]="false" [blockScroll]="false" styleClass="chat-drawer">
      <ng-template #header>
        <div class="entete-chat"><p-avatar icon="pi pi-android" shape="circle" /> <b>Assistant voyage</b></div>
      </ng-template>
      <div class="msgs" #liste>
        @for (m of messages(); track $index) { <div class="msg {{ m.de }}">{{ m.texte }}</div> }
        @if (attente()) { <div class="msg bot ecrit"><span></span><span></span><span></span></div> }
      </div>
      <div class="sugg">
        @for (s of suggestions(); track s) { <p-chip [label]="s" styleClass="cliquable" (click)="envoyer(s)" /> }
      </div>
      <form class="saisie" (ngSubmit)="envoyer(saisie)">
        <input pInputText name="m" [(ngModel)]="saisie" placeholder="Posez votre question…" maxlength="500" autocomplete="off" />
        <p-button type="submit" icon="pi pi-send" [disabled]="attente()" ariaLabel="Envoyer" />
      </form>
    </p-drawer>
  `,
  styles: `
    :host ::ng-deep .chat-drawer { width: min(400px, 100vw); }
    :host ::ng-deep .chat-drawer .p-drawer-content { display: flex; flex-direction: column; padding-bottom: 0; }
    .entete-chat { display: flex; align-items: center; gap: 10px; }
    .chat-btn { position: fixed; right: 20px; bottom: 20px; z-index: 10; animation: pulsation 2.4s ease-in-out infinite; }
    .msgs { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding: 4px 2px; }
    .msg { max-width: 85%; padding: 8px 12px; border-radius: 12px; white-space: pre-line; font-size: .92rem; animation: apparition .25s ease-out; }
    .bot { background: var(--p-primary-50); color: var(--p-text-color); align-self: flex-start; }
    .moi { background: var(--p-primary-500); color: #fff; align-self: flex-end; }
    .sugg { display: flex; flex-wrap: wrap; gap: 6px; padding: 8px 0; }
    :host ::ng-deep .cliquable { cursor: pointer; }
    .saisie { display: flex; gap: 6px; padding: 10px 0; border-top: 1px solid var(--p-content-border-color); }
    .saisie input { flex: 1; min-width: 0; }
    .ecrit { display: flex; gap: 4px; padding: 12px; }
    .ecrit span { width: 7px; height: 7px; border-radius: 50%; background: var(--p-primary-600); animation: rebond 1s infinite ease-in-out; }
    .ecrit span:nth-child(2) { animation-delay: .15s; } .ecrit span:nth-child(3) { animation-delay: .3s; }
    @keyframes apparition { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
    @keyframes pulsation { 0%, 100% { box-shadow: 0 0 0 0 rgba(224,127,60,.45); } 50% { box-shadow: 0 0 0 12px rgba(224,127,60,0); } }
    @keyframes rebond { 0%, 80%, 100% { transform: translateY(0); opacity: .5; } 40% { transform: translateY(-6px); opacity: 1; } }
    @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
  `,
})
export class Chat {
  private api = inject(Api);
  private liste = viewChild<ElementRef<HTMLElement>>('liste');
  /** Vrai quand le panneau de chat est ouvert. */
  protected ouvert = false;
  /** Vrai pendant que l'assistant prépare sa réponse. */
  protected attente = signal(false);
  protected messages = signal<Message[]>([{ de: 'bot', texte: 'Bonjour ! Je réponds sur les vols, les prix, les bagages, les sièges, les promotions, la modification et l\'annulation d\'un billet.' }]);
  protected suggestions = signal<string[]>(['Quels vols sont disponibles ?', 'Quelles promotions ?', 'Bagages et sièges', 'Modifier ou annuler']);
  /** Texte en cours de saisie. */
  protected saisie = '';

  /** Ouvre le panneau de chat et défile jusqu'au dernier message. */
  protected ouvrir(): void { this.ouvert = true; this.defiler(); }

  /**
   * Envoie une question au chatbot et affiche la réponse.
   * @param texte la question de l'utilisateur
   */
  protected envoyer(texte: string): void {
    const msg = texte.trim();
    if (!msg || this.attente()) return;
    this.saisie = '';
    this.messages.update((m) => [...m, { de: 'moi', texte: msg }]);
    this.attente.set(true); this.defiler();
    this.api.chat(msg).subscribe({
      next: (r) => { this.messages.update((m) => [...m, { de: 'bot', texte: r.reponse }]); this.suggestions.set(r.suggestions); this.fin(); },
      error: () => { this.messages.update((m) => [...m, { de: 'bot', texte: "Désolé, l'assistant est indisponible pour le moment." }]); this.fin(); },
    });
  }

  /** Termine l'attente et défile jusqu'au dernier message. */
  private fin(): void { this.attente.set(false); this.defiler(); }

  /** Fait défiler la conversation jusqu'au bas. */
  private defiler(): void { setTimeout(() => { const e = this.liste()?.nativeElement; if (e) e.scrollTop = e.scrollHeight; }); }
}
