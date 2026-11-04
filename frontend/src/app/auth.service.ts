import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom, tap } from 'rxjs';
import { Api } from './api.service';
import { AuthReponse, Utilisateur } from './models';

const CLE = 'billet_token';

/** Session : le jeton est mémorisé dans le navigateur ; le compte est rechargé au démarrage. */
@Injectable({ providedIn: 'root' })
export class Auth {
  private api = inject(Api);
  readonly token = signal<string | null>(this.lire());
  readonly utilisateur = signal<Utilisateur | null>(null);
  readonly estConnecte = computed(() => this.utilisateur() !== null);
  readonly estAdmin = computed(() => this.utilisateur()?.role === 'ADMIN');

  private lire(): string | null { try { return localStorage.getItem(CLE); } catch { return null; } }
  private ecrire(t: string | null) {
    this.token.set(t);
    try { t ? localStorage.setItem(CLE, t) : localStorage.removeItem(CLE); } catch { /* stockage indisponible */ }
  }

  /** Appelé avant le démarrage du routeur (provideAppInitializer). */
  async restaurer() {
    if (!this.token()) return;
    try { this.utilisateur.set(await firstValueFrom(this.api.me())); }
    catch { this.ecrire(null); this.utilisateur.set(null); }
  }

  private ouvrir(r: AuthReponse) { this.ecrire(r.token); this.utilisateur.set(r.utilisateur); }

  connecter(identifiant: string, motDePasse: string) { return this.api.login(identifiant, motDePasse).pipe(tap((r) => this.ouvrir(r))); }
  inscrire(d: Parameters<Api['inscription']>[0]) { return this.api.inscription(d).pipe(tap((r) => this.ouvrir(r))); }
  majUtilisateur(u: Utilisateur) { this.utilisateur.set(u); }

  deconnecter() {
    if (this.token()) this.api.logout().subscribe({ error: () => undefined });
    this.ecrire(null); this.utilisateur.set(null);
  }

  /** Jeton refusé par le serveur (expiré) : on oublie la session. */
  expirer() { this.ecrire(null); this.utilisateur.set(null); }
}
