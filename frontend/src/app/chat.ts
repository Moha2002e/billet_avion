import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api } from './api.service';

interface Message { de: 'moi' | 'bot'; texte: string; }

/** Bulle de chat flottante : l'assistant gratuit du back-end (POST /api/chat). */
@Component({
  selector: 'app-chat',
  imports: [FormsModule],
  template: `
    @if (ouvert()) {
      <section class="chat" aria-label="Assistant">
        <header><b>🤖 Assistant voyage</b><button class="small sec" (click)="ouvert.set(false)" aria-label="Fermer">✕</button></header>
        <div class="msgs" #liste>
          @for (m of messages(); track $index) { <div class="msg {{ m.de }}">{{ m.texte }}</div> }
          @if (attente()) { <div class="msg bot ecrit"><span></span><span></span><span></span></div> }
        </div>
        <div class="sugg">
          @for (s of suggestions(); track s) { <button class="small sec" (click)="envoyer(s)">{{ s }}</button> }
        </div>
        <form (ngSubmit)="envoyer(saisie)">
          <input name="m" [(ngModel)]="saisie" placeholder="Posez votre question…" maxlength="500" autocomplete="off">
          <button type="submit" [disabled]="attente()">Envoyer</button>
        </form>
      </section>
    } @else {
      <button class="chat-btn" (click)="ouvrir()" aria-label="Ouvrir l'assistant">💬</button>
    }
  `,
  styles: `
    .chat-btn { position: fixed; right: 20px; bottom: 20px; width: 56px; height: 56px; border-radius: 50%; font-size: 1.6rem; padding: 0; z-index: 10; box-shadow: 0 4px 14px rgba(0,0,0,.3); }
    .chat { position: fixed; right: 20px; bottom: 20px; width: min(380px, calc(100vw - 40px)); height: min(520px, 80vh); display: flex; flex-direction: column;
      background: #fff; border: 1px solid #efd5bf; border-radius: 14px; box-shadow: 0 8px 30px rgba(0,0,0,.25); z-index: 10; overflow: hidden; }
    header { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #e07f3c; color: #fff; }
    header button { background: rgba(255,255,255,.25); color: #fff; border: 0; }
    .msgs { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
    .msg { max-width: 85%; padding: 8px 12px; border-radius: 12px; white-space: pre-line; font-size: .92rem; }
    .bot { background: #fdf2e8; color: #1f2937; align-self: flex-start; }
    .moi { background: #e07f3c; color: #fff; align-self: flex-end; }
    .sugg { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 12px 8px; }
    form { display: flex; gap: 6px; padding: 10px; border-top: 1px solid #efd5bf; }
    form input { flex: 1; min-width: 0; }
    .msg { animation: apparition .25s ease-out; }
    .chat { animation: ouverture .25s ease-out; transform-origin: bottom right; }
    .chat-btn { animation: pulsation 2.4s ease-in-out infinite; }
    .ecrit { display: flex; gap: 4px; padding: 12px; }
    .ecrit span { width: 7px; height: 7px; border-radius: 50%; background: #c4662a; animation: rebond 1s infinite ease-in-out; }
    .ecrit span:nth-child(2) { animation-delay: .15s; } .ecrit span:nth-child(3) { animation-delay: .3s; }
    @keyframes apparition { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
    @keyframes ouverture { from { opacity: 0; transform: scale(.9); } to { opacity: 1; transform: none; } }
    @keyframes pulsation { 0%, 100% { box-shadow: 0 4px 14px rgba(0,0,0,.3); } 50% { box-shadow: 0 4px 14px rgba(0,0,0,.3), 0 0 0 10px rgba(224,127,60,.25); } }
    @keyframes rebond { 0%, 80%, 100% { transform: translateY(0); opacity: .5; } 40% { transform: translateY(-6px); opacity: 1; } }
    @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
  `,
})
export class Chat {
  private api = inject(Api);
  private liste = viewChild<ElementRef<HTMLElement>>('liste');
  protected ouvert = signal(false);
  protected attente = signal(false);
  protected messages = signal<Message[]>([{ de: 'bot', texte: 'Bonjour ! Je réponds sur les vols, les prix selon l\'âge, les promotions et les voyages groupés.' }]);
  protected suggestions = signal<string[]>(['Quels vols sont disponibles ?', 'Quelles promotions ?', 'Tarifs par âge', 'Voyage en groupe']);
  protected saisie = '';

  ouvrir() { this.ouvert.set(true); this.defiler(); }

  envoyer(texte: string) {
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

  private fin() { this.attente.set(false); this.defiler(); }
  private defiler() { setTimeout(() => { const e = this.liste()?.nativeElement; if (e) e.scrollTop = e.scrollHeight; }); }
}
