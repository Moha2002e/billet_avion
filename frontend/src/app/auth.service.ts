import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { tap } from 'rxjs';

const CLE = 'billet_admin_token';

/** Session administrateur : le jeton est conservé dans le navigateur (localStorage). */
@Injectable({ providedIn: 'root' })
export class Auth {
  private http = inject(HttpClient);
  readonly token = signal<string | null>(this.lire());
  readonly estAdmin = computed(() => this.token() !== null);

  private lire(): string | null {
    try { return localStorage.getItem(CLE); } catch { return null; }
  }

  private ecrire(t: string | null) {
    this.token.set(t);
    try { t ? localStorage.setItem(CLE, t) : localStorage.removeItem(CLE); } catch { /* stockage indisponible */ }
  }

  constructor() {
    // Vérifie au démarrage qu'un jeton mémorisé est toujours valide (après construction, car l'intercepteur injecte ce service)
    if (this.token()) setTimeout(() => this.http.get('/api/auth/me').subscribe({ error: (e) => e.status === 401 && this.ecrire(null) }));
  }

  connecter(username: string, password: string) {
    return this.http.post<{ token: string }>('/api/auth/login', { username, password })
      .pipe(tap((r) => this.ecrire(r.token)));
  }

  deconnecter() {
    this.http.post('/api/auth/logout', {}).subscribe({ error: () => undefined });
    this.ecrire(null);
  }

  expirer() { this.ecrire(null); }
}
