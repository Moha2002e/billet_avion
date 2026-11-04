import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import {
  ApercuModification, AuthReponse, Catalogue, ChatReponse, Manifeste, PaiementRequest, Plan, Promotion,
  PromotionRequest, Recherche, Reservation, ResultatVol, Stats, Utilisateur, Vol, VolRequest,
} from './models';

/** Message affiché en haut de page (succès, erreur ou information). */
@Injectable({ providedIn: 'root' })
export class Notifier {
  readonly message = signal<{ type: 'success' | 'danger' | 'info'; text: string } | null>(null);
  private timer: ReturnType<typeof setTimeout> | undefined;
  show(type: 'success' | 'danger' | 'info', text: string) {
    this.message.set({ type, text });
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.message.set(null), 6000);
  }
  ok(text: string) { this.show('success', text); }
  error(text: string) { this.show('danger', text); }
  info(text: string) { this.show('info', text); }
}

type Valeur = string | number | boolean | null | undefined;
function params(obj: Record<string, Valeur>): HttpParams {
  let p = new HttpParams();
  for (const [k, v] of Object.entries(obj)) if (v !== null && v !== undefined && v !== '' && v !== false) p = p.set(k, String(v));
  return p;
}

@Injectable({ providedIn: 'root' })
export class Api {
  private http = inject(HttpClient);

  // ---- public
  catalogue() { return this.http.get<Catalogue>('/api/catalogue'); }
  villes() { return this.http.get<string[]>('/api/vols/villes'); }
  recherche(r: Partial<Recherche>) { return this.http.get<ResultatVol[]>('/api/vols/recherche', { params: params({ ...r }) }); }
  vols(f: { origine?: string; destination?: string; date?: string; disponibles?: boolean } = {}) {
    return this.http.get<Vol[]>('/api/vols', { params: params(f) });
  }
  plan(volId: number, reservationId?: number) { return this.http.get<Plan>(`/api/vols/${volId}/sieges`, { params: params({ reservationId }) }); }
  promotions() { return this.http.get<Promotion[]>('/api/promotions'); }
  chat(message: string) { return this.http.post<ChatReponse>('/api/chat', { message }); }

  // ---- comptes
  login(identifiant: string, motDePasse: string) { return this.http.post<AuthReponse>('/api/auth/login', { identifiant, motDePasse }); }
  inscription(d: { email: string; motDePasse: string; nom: string; prenom: string; telephone: string; dateNaissance: string }) {
    return this.http.post<AuthReponse>('/api/auth/inscription', d);
  }
  me() { return this.http.get<Utilisateur>('/api/auth/me'); }
  logout() { return this.http.post<void>('/api/auth/logout', {}); }
  modifierProfil(d: { nom: string; prenom: string; telephone: string; dateNaissance: string }) { return this.http.put<Utilisateur>('/api/compte', d); }
  supprimerCarte() { return this.http.delete<Utilisateur>('/api/compte/carte'); }

  // ---- réservations (connecté)
  mesReservations() { return this.http.get<Reservation[]>('/api/reservations'); }
  reservation(id: number) { return this.http.get<Reservation>(`/api/reservations/${id}`); }
  creerReservation(d: { volId: number; adultes: number; enfants: number; bebes: number; codePromo?: string | null }) {
    return this.http.post<Reservation>('/api/reservations', d);
  }
  majPassagers(id: number, passagers: { id: number; nom: string; prenom: string; dateNaissance: string | null }[]) {
    return this.http.put<Reservation>(`/api/reservations/${id}/passagers`, { passagers });
  }
  majOptions(id: number, d: { assurance: boolean; passagers: { id: number; siege: string | null; bagage: string; prioritaire: boolean; repas: boolean }[] }) {
    return this.http.put<Reservation>(`/api/reservations/${id}/options`, d);
  }
  payer(id: number, p: PaiementRequest) { return this.http.post<Reservation>(`/api/reservations/${id}/paiement`, p); }
  annuler(id: number) { return this.http.post<Reservation>(`/api/reservations/${id}/annuler`, {}); }
  apercuModification(id: number, nouveauVolId: number) {
    return this.http.get<ApercuModification>(`/api/reservations/${id}/modification`, { params: params({ nouveauVolId }) });
  }
  modifierVol(id: number, nouveauVolId: number, paiement: PaiementRequest) {
    return this.http.post<Reservation>(`/api/reservations/${id}/modification`, { nouveauVolId, paiement });
  }
  enregistrement(id: number) { return this.http.post<Reservation>(`/api/reservations/${id}/enregistrement`, {}); }

  // ---- administration
  stats() { return this.http.get<Stats>('/api/admin/stats'); }
  toutesReservations(f: { statut?: string; q?: string } = {}) { return this.http.get<Reservation[]>('/api/admin/reservations', { params: params(f) }); }
  annulerAdmin(id: number) { return this.http.post<Reservation>(`/api/admin/reservations/${id}/annuler`, {}); }
  manifeste(volId: number, categorie?: string) { return this.http.get<Manifeste[]>(`/api/admin/vols/${volId}/passagers`, { params: params({ categorie }) }); }
  toutesPromotions() { return this.http.get<Promotion[]>('/api/admin/promotions'); }
  creerVol(v: VolRequest) { return this.http.post<Vol>('/api/vols', v); }
  modifierVolAdmin(id: number, v: VolRequest) { return this.http.put<Vol>(`/api/vols/${id}`, v); }
  supprimerVol(id: number) { return this.http.delete<void>(`/api/vols/${id}`); }
  annulerVol(id: number) { return this.http.post<Vol>(`/api/vols/${id}/annuler`, {}); }
  creerPromotion(p: PromotionRequest) { return this.http.post<Promotion>('/api/promotions', p); }
  modifierPromotion(id: number, p: PromotionRequest) { return this.http.put<Promotion>(`/api/promotions/${id}`, p); }
  supprimerPromotion(id: number) { return this.http.delete<void>(`/api/promotions/${id}`); }
}
