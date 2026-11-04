import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { Auth } from './auth.service';
import { Notifier } from './api.service';
import { Compte } from './pages/compte';
import { Connexion } from './pages/connexion';
import { Home } from './pages/home';
import { NouvelleReservation } from './pages/nouvelle-reservation';
import { Promotions } from './pages/promotions';
import { Resultats } from './pages/resultats';

/**
 * Garde de route : page réservée aux comptes connectés ; sinon redirection vers la connexion en mémorisant la page demandée.
 * @param _route la route demandée (inutilisée)
 * @param state l'état du routeur (contient l'adresse demandée)
 * @returns true si connecté, sinon une redirection vers /connexion
 */
const connecte: CanActivateFn = (_route, state) => {
  if (inject(Auth).estConnecte()) return true;
  inject(Notifier).info('Connectez-vous pour continuer.');
  return inject(Router).createUrlTree(['/connexion'], { queryParams: { retour: state.url } });
};

/**
 * Garde de route : page réservée à l'administrateur ; un client est renvoyé à l'accueil, un visiteur à la connexion.
 * @param _route la route demandée (inutilisée)
 * @param state l'état du routeur (contient l'adresse demandée)
 * @returns true si administrateur, sinon une redirection
 */
const admin: CanActivateFn = (_route, state) => {
  const auth = inject(Auth);
  if (auth.estAdmin()) return true;
  const router = inject(Router);
  if (auth.estConnecte()) { inject(Notifier).error('Accès réservé à l\'administrateur.'); return router.createUrlTree(['/']); }
  return router.createUrlTree(['/connexion'], { queryParams: { retour: state.url } });
};

export const routes: Routes = [
  { path: '', component: Home, title: 'Billets d\'avion' },
  { path: 'recherche', component: Resultats, title: 'Résultats de recherche' },
  { path: 'promotions', component: Promotions, title: 'Promotions' },
  { path: 'connexion', component: Connexion, title: 'Connexion' },
  { path: 'reserver', component: NouvelleReservation, canActivate: [connecte], title: 'Réservation' },
  { path: 'reservation/:id', loadComponent: () => import('./pages/reservation').then((m) => m.ReservationPage), canActivate: [connecte], title: 'Ma réservation' },
  { path: 'mes-voyages', loadComponent: () => import('./pages/mes-voyages').then((m) => m.MesVoyages), canActivate: [connecte], title: 'Mes voyages' },
  { path: 'compte', component: Compte, canActivate: [connecte], title: 'Mon compte' },
  { path: 'admin', loadComponent: () => import('./pages/admin/admin-dashboard').then((m) => m.AdminDashboard), canActivate: [admin], title: 'Administration' },
  { path: 'admin/vols', loadComponent: () => import('./pages/admin/admin-vols').then((m) => m.AdminVols), canActivate: [admin], title: 'Administration - Vols' },
  { path: 'admin/promotions', loadComponent: () => import('./pages/admin/admin-promotions').then((m) => m.AdminPromotions), canActivate: [admin], title: 'Administration - Promotions' },
  { path: 'admin/reservations', loadComponent: () => import('./pages/admin/admin-reservations').then((m) => m.AdminReservations), canActivate: [admin], title: 'Administration - Réservations' },
  { path: '**', redirectTo: '' },
];
