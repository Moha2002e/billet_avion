import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { ChatReponse, Groupe, Passager, PassagerRequest, Promotion, PromotionRequest, Reservation, Stats, Vol, VolRequest } from './models';

/** Message affiché en haut de page (succès ou erreur). */
@Injectable({ providedIn: 'root' })
export class Notifier {
  readonly message = signal<{ type: 'success' | 'danger'; text: string } | null>(null);
  private timer: ReturnType<typeof setTimeout> | undefined;
  show(type: 'success' | 'danger', text: string) {
    this.message.set({ type, text });
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.message.set(null), 5000);
  }
  ok(text: string) { this.show('success', text); }
  error(text: string) { this.show('danger', text); }
}

function params(obj: Record<string, string | number | boolean | null | undefined>): HttpParams {
  let p = new HttpParams();
  for (const [k, v] of Object.entries(obj)) if (v !== null && v !== undefined && v !== '' && v !== false) p = p.set(k, String(v));
  return p;
}

@Injectable({ providedIn: 'root' })
export class Api {
  private http = inject(HttpClient);

  stats() { return this.http.get<Stats>('/api/stats'); }

  vols(f: { origine?: string; destination?: string; date?: string; disponibles?: boolean } = {}) {
    return this.http.get<Vol[]>('/api/vols', { params: params(f) });
  }
  creerVol(v: VolRequest) { return this.http.post<Vol>('/api/vols', v); }
  modifierVol(id: number, v: VolRequest) { return this.http.put<Vol>(`/api/vols/${id}`, v); }
  supprimerVol(id: number) { return this.http.delete<void>(`/api/vols/${id}`); }
  annulerVol(id: number) { return this.http.post<Vol>(`/api/vols/${id}/annuler`, {}); }
  manifeste(id: number, categorie?: string) {
    return this.http.get<Reservation[]>(`/api/vols/${id}/passagers`, { params: params({ categorie }) });
  }

  passagers(f: { q?: string; categorie?: string } = {}) {
    return this.http.get<Passager[]>('/api/passagers', { params: params(f) });
  }
  creerPassager(p: PassagerRequest) { return this.http.post<Passager>('/api/passagers', p); }
  modifierPassager(id: number, p: PassagerRequest) { return this.http.put<Passager>(`/api/passagers/${id}`, p); }
  supprimerPassager(id: number) { return this.http.delete<void>(`/api/passagers/${id}`); }
  reservationsDe(id: number) { return this.http.get<Reservation[]>(`/api/passagers/${id}/reservations`); }

  reservations(f: { statut?: string; volId?: number; passagerId?: number } = {}) {
    return this.http.get<Reservation[]>('/api/reservations', { params: params(f) });
  }
  reserver(passagerId: number, volId: number, codePromo?: string) {
    return this.http.post<Reservation>('/api/reservations', { passagerId, volId, codePromo: codePromo || null });
  }
  annulerReservation(id: number) { return this.http.post<Reservation>(`/api/reservations/${id}/annuler`, {}); }

  groupes() { return this.http.get<Groupe[]>('/api/groupes'); }
  creerGroupe(g: { nom: string; responsable: string; volId: number; passagerIds: number[]; codePromo?: string | null }) {
    return this.http.post<Groupe>('/api/groupes', g);
  }
  ajouterAuGroupe(id: number, passagerIds: number[]) { return this.http.post<Groupe>(`/api/groupes/${id}/passagers`, { passagerIds }); }
  retirerDuGroupe(id: number, passagerId: number) { return this.http.delete<Groupe>(`/api/groupes/${id}/passagers/${passagerId}`); }
  annulerGroupe(id: number) { return this.http.post<Groupe>(`/api/groupes/${id}/annuler`, {}); }

  promotions() { return this.http.get<Promotion[]>('/api/promotions'); }
  toutesPromotions() { return this.http.get<Promotion[]>('/api/admin/promotions'); }
  verifierCode(code: string, volId: number) {
    return this.http.get<{ code: string; pourcentage: number; description: string }>('/api/promotions/verifier', { params: params({ code, volId }) });
  }
  creerPromotion(p: PromotionRequest) { return this.http.post<Promotion>('/api/promotions', p); }
  modifierPromotion(id: number, p: PromotionRequest) { return this.http.put<Promotion>(`/api/promotions/${id}`, p); }
  supprimerPromotion(id: number) { return this.http.delete<void>(`/api/promotions/${id}`); }

  chat(message: string) { return this.http.post<ChatReponse>('/api/chat', { message }); }
}
