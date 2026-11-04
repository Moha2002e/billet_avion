import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import {
  ApercuModification, AuthReponse, Catalogue, ChatReponse, DonneesResultat, Manifeste, PaiementRequest, Plan, Promotion,
  PromotionRequest, Recherche, Reservation, ResultatVol, Stats, Utilisateur, Vol, VolRequest,
} from './models';

/** Notifications de l'application : affichées sous forme de « toast » PrimeNG en haut de l'écran. */
@Injectable({ providedIn: 'root' })
export class Notifier {
  private messages = inject(MessageService);

  /**
   * Affiche une notification.
   * @param severity le type de message (success, error ou info)
   * @param titre le titre en gras
   * @param texte le détail du message
   */
  private afficher(severity: 'success' | 'error' | 'info', titre: string, texte: string): void {
    this.messages.add({ severity, summary: titre, detail: texte, life: severity === 'error' ? 8000 : 5000 });
  }

  /** Affiche un message de succès. @param texte le message */
  ok(texte: string): void { this.afficher('success', 'Succès', texte); }

  /** Affiche un message d'erreur. @param texte le message */
  error(texte: string): void { this.afficher('error', 'Erreur', texte); }

  /** Affiche un message d'information. @param texte le message */
  info(texte: string): void { this.afficher('info', 'Information', texte); }
}

type Valeur = string | number | boolean | null | undefined;

/**
 * Construit les paramètres d'URL d'une requête en ignorant les valeurs vides.
 * @param obj les paramètres (clé → valeur)
 * @returns les paramètres HTTP prêts à l'emploi
 */
function params(obj: Record<string, Valeur>): HttpParams {
  let p = new HttpParams();
  for (const [k, v] of Object.entries(obj)) if (v !== null && v !== undefined && v !== '' && v !== false) p = p.set(k, String(v));
  return p;
}

/** Client HTTP de l'API Spring Boot : une méthode par route du back-end. */
@Injectable({ providedIn: 'root' })
export class Api {
  private http = inject(HttpClient);

  // ---------------------------------------------------------------- public

  /** Récupère les tarifs et règles commerciales (bagages, sièges, assurance, frais…). */
  catalogue() { return this.http.get<Catalogue>('/api/catalogue'); }

  /** Liste les villes proposées dans la barre de recherche. */
  villes() { return this.http.get<string[]>('/api/vols/villes'); }

  /** Recherche des vols disponibles (publique, sans connexion). @param r les critères de recherche */
  recherche(r: Partial<Recherche>) { return this.http.get<ResultatVol[]>('/api/vols/recherche', { params: params({ ...r }) }); }

  /** Liste les vols selon des filtres facultatifs. @param f origine, destination, date, seulement les vols disponibles */
  vols(f: { origine?: string; destination?: string; date?: string; disponibles?: boolean } = {}) {
    return this.http.get<Vol[]>('/api/vols', { params: params(f) });
  }

  /** Récupère le plan de cabine d'un vol. @param volId le vol @param reservationId la réservation dont les sièges comptent comme libres */
  plan(volId: number, reservationId?: number) { return this.http.get<Plan>(`/api/vols/${volId}/sieges`, { params: params({ reservationId }) }); }

  /** Liste les promotions en cours. */
  promotions() { return this.http.get<Promotion[]>('/api/promotions'); }

  /** Envoie une question au chatbot. @param message la question */
  chat(message: string) { return this.http.post<ChatReponse>('/api/chat', { message }); }

  // ---------------------------------------------------------------- comptes

  /** Connecte un utilisateur. @param identifiant e-mail ou identifiant admin @param motDePasse le mot de passe */
  login(identifiant: string, motDePasse: string) { return this.http.post<AuthReponse>('/api/auth/login', { identifiant, motDePasse }); }

  /** Crée un compte client et le connecte. @param d les informations d'inscription */
  inscription(d: { email: string; motDePasse: string; nom: string; prenom: string; telephone: string; dateNaissance: string }) {
    return this.http.post<AuthReponse>('/api/auth/inscription', d);
  }

  /** Récupère le compte de la session en cours. */
  me() { return this.http.get<Utilisateur>('/api/auth/me'); }

  /** Termine la session côté serveur. */
  logout() { return this.http.post<void>('/api/auth/logout', {}); }

  /** Modifie le profil du client connecté. @param d nom, prénom, téléphone, date de naissance */
  modifierProfil(d: { nom: string; prenom: string; telephone: string; dateNaissance: string }) { return this.http.put<Utilisateur>('/api/compte', d); }

  /** Supprime la carte bancaire enregistrée du compte. */
  supprimerCarte() { return this.http.delete<Utilisateur>('/api/compte/carte'); }

  // ---------------------------------------------------------------- réservations (compte connecté)

  /** Liste les réservations du client connecté. */
  mesReservations() { return this.http.get<Reservation[]>('/api/reservations'); }

  /** Récupère une réservation. @param id l'identifiant de la réservation */
  reservation(id: number) { return this.http.get<Reservation>(`/api/reservations/${id}`); }

  /** Crée une réservation (gardée 15 minutes avant paiement). @param d vol, nombre de passagers par type, code promo */
  creerReservation(d: { volId: number; adultes: number; enfants: number; bebes: number; codePromo?: string | null }) {
    return this.http.post<Reservation>('/api/reservations', d);
  }

  /** Met à jour les passagers d'une réservation. @param id la réservation @param passagers nom, prénom et naissance de chacun */
  majPassagers(id: number, passagers: { id: number; nom: string; prenom: string; dateNaissance: string | null }[]) {
    return this.http.put<Reservation>(`/api/reservations/${id}/passagers`, { passagers });
  }

  /** Met à jour sièges, bagages, options et assurance. @param id la réservation @param d les choix par passager */
  majOptions(id: number, d: { assurance: boolean; passagers: { id: number; siege: string | null; bagage: string; prioritaire: boolean; repas: boolean }[] }) {
    return this.http.put<Reservation>(`/api/reservations/${id}/options`, d);
  }

  /** Paie le solde d'une réservation (paiement fictif). @param id la réservation @param p la carte */
  payer(id: number, p: PaiementRequest) { return this.http.post<Reservation>(`/api/reservations/${id}/paiement`, p); }

  /** Annule une réservation. @param id la réservation */
  annuler(id: number) { return this.http.post<Reservation>(`/api/reservations/${id}/annuler`, {}); }

  /** Calcule le coût d'un changement de vol (frais + différence). @param id la réservation @param nouveauVolId le nouveau vol */
  apercuModification(id: number, nouveauVolId: number) {
    return this.http.get<ApercuModification>(`/api/reservations/${id}/modification`, { params: params({ nouveauVolId }) });
  }

  /** Change le vol d'une réservation et paie les frais. @param id la réservation @param nouveauVolId le nouveau vol @param paiement la carte */
  modifierVol(id: number, nouveauVolId: number, paiement: PaiementRequest) {
    return this.http.post<Reservation>(`/api/reservations/${id}/modification`, { nouveauVolId, paiement });
  }

  /** Effectue l'enregistrement en ligne. @param id la réservation */
  enregistrement(id: number) { return this.http.post<Reservation>(`/api/reservations/${id}/enregistrement`, {}); }

  // ---------------------------------------------------------------- administration

  /** Récupère les statistiques du tableau de bord. */
  stats() { return this.http.get<Stats>('/api/admin/stats'); }

  /** Liste toutes les réservations. @param f filtre par statut et recherche (référence ou e-mail) */
  toutesReservations(f: { statut?: string; q?: string } = {}) { return this.http.get<Reservation[]>('/api/admin/reservations', { params: params(f) }); }

  /** Annule une réservation en tant qu'administrateur (remboursement intégral). @param id la réservation */
  annulerAdmin(id: number) { return this.http.post<Reservation>(`/api/admin/reservations/${id}/annuler`, {}); }

  /** Liste les passagers d'un vol. @param volId le vol @param categorie filtre par catégorie d'âge */
  manifeste(volId: number, categorie?: string) { return this.http.get<Manifeste[]>(`/api/admin/vols/${volId}/passagers`, { params: params({ categorie }) }); }

  /** Liste toutes les promotions, y compris expirées. */
  toutesPromotions() { return this.http.get<Promotion[]>('/api/admin/promotions'); }

  /** Insère les données de démonstration (sans doublon si elles existent déjà). */
  insererDonnees() { return this.http.post<DonneesResultat>('/api/admin/donnees', {}); }

  /** Ajoute un vol. @param v les informations du vol */
  creerVol(v: VolRequest) { return this.http.post<Vol>('/api/vols', v); }

  /** Modifie un vol. @param id le vol @param v les nouvelles informations */
  modifierVolAdmin(id: number, v: VolRequest) { return this.http.put<Vol>(`/api/vols/${id}`, v); }

  /** Supprime un vol sans réservation. @param id le vol */
  supprimerVol(id: number) { return this.http.delete<void>(`/api/vols/${id}`); }

  /** Annule un vol et rembourse ses passagers. @param id le vol */
  annulerVol(id: number) { return this.http.post<Vol>(`/api/vols/${id}/annuler`, {}); }

  /** Ajoute une promotion. @param p la promotion */
  creerPromotion(p: PromotionRequest) { return this.http.post<Promotion>('/api/promotions', p); }

  /** Modifie une promotion. @param id la promotion @param p les nouvelles informations */
  modifierPromotion(id: number, p: PromotionRequest) { return this.http.put<Promotion>(`/api/promotions/${id}`, p); }

  /** Supprime une promotion. @param id la promotion */
  supprimerPromotion(id: number) { return this.http.delete<void>(`/api/promotions/${id}`); }
}
