import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom, tap } from 'rxjs';
import { Api } from './api.service';
import { AuthReponse, Utilisateur } from './models';

const CLE = 'billet_token';

/** Session : le jeton est mémorisé dans le navigateur ; le compte est rechargé au démarrage. */
@Injectable({ providedIn: 'root' })
export class Auth {
  private api = inject(Api);
  /** Jeton de session (ou null si déconnecté). */
  readonly token = signal<string | null>(this.lire());
  /** Compte connecté (ou null). */
  readonly utilisateur = signal<Utilisateur | null>(null);
  /** Vrai si un compte est connecté. */
  readonly estConnecte = computed(() => this.utilisateur() !== null);
  /** Vrai si le compte connecté est administrateur. */
  readonly estAdmin = computed(() => this.utilisateur()?.role === 'ADMIN');

  /** Lit le jeton mémorisé dans le navigateur. @returns le jeton ou null (stockage indisponible ou vide) */
  private lire(): string | null { try { return localStorage.getItem(CLE); } catch { return null; } }

  /** Mémorise ou efface le jeton. @param t le nouveau jeton, ou null pour l'effacer */
  private ecrire(t: string | null): void {
    this.token.set(t);
    try { t ? localStorage.setItem(CLE, t) : localStorage.removeItem(CLE); } catch { /* stockage indisponible */ }
  }

  /** Recharge le compte du jeton mémorisé. Appelée avant le démarrage du routeur (provideAppInitializer). */
  async restaurer(): Promise<void> {
    if (!this.token()) return;
    try { this.utilisateur.set(await firstValueFrom(this.api.me())); }
    catch { this.ecrire(null); this.utilisateur.set(null); }
  }

  /** Ouvre la session à partir de la réponse du serveur. @param r jeton et compte */
  private ouvrir(r: AuthReponse): void { this.ecrire(r.token); this.utilisateur.set(r.utilisateur); }

  /** Connecte un utilisateur. @param identifiant e-mail ou identifiant @param motDePasse le mot de passe */
  connecter(identifiant: string, motDePasse: string) { return this.api.login(identifiant, motDePasse).pipe(tap((r) => this.ouvrir(r))); }

  /** Crée un compte et ouvre la session. @param d les informations d'inscription */
  inscrire(d: Parameters<Api['inscription']>[0]) { return this.api.inscription(d).pipe(tap((r) => this.ouvrir(r))); }

  /** Remplace le compte connecté (après modification du profil ou de la carte). @param u le compte à jour */
  majUtilisateur(u: Utilisateur): void { this.utilisateur.set(u); }

  /** Déconnecte l'utilisateur côté serveur et côté navigateur. */
  deconnecter(): void {
    if (this.token()) this.api.logout().subscribe({ error: () => undefined });
    this.ecrire(null); this.utilisateur.set(null);
  }

  /** Oublie la session quand le serveur refuse le jeton (expiré). */
  expirer(): void { this.ecrire(null); this.utilisateur.set(null); }
}
