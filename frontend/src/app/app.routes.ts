import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { Auth } from './auth.service';
import { Notifier } from './api.service';
import { AdminDashboard } from './pages/admin/admin-dashboard';
import { AdminPromotions } from './pages/admin/admin-promotions';
import { AdminReservations } from './pages/admin/admin-reservations';
import { AdminVols } from './pages/admin/admin-vols';
import { Compte } from './pages/compte';
import { Connexion } from './pages/connexion';
import { Home } from './pages/home';
import { MesVoyages } from './pages/mes-voyages';
import { NouvelleReservation } from './pages/nouvelle-reservation';
import { Promotions } from './pages/promotions';
import { ReservationPage } from './pages/reservation';
import { Resultats } from './pages/resultats';

/** Page réservée aux comptes connectés : sinon on envoie vers la connexion en mémorisant la page demandée. */
const connecte: CanActivateFn = (_route, state) => {
  if (inject(Auth).estConnecte()) return true;
  inject(Notifier).info('Connectez-vous pour continuer.');
  return inject(Router).createUrlTree(['/connexion'], { queryParams: { retour: state.url } });
};

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
  { path: 'reservation/:id', component: ReservationPage, canActivate: [connecte], title: 'Ma réservation' },
  { path: 'mes-voyages', component: MesVoyages, canActivate: [connecte], title: 'Mes voyages' },
  { path: 'compte', component: Compte, canActivate: [connecte], title: 'Mon compte' },
  { path: 'admin', component: AdminDashboard, canActivate: [admin], title: 'Administration' },
  { path: 'admin/vols', component: AdminVols, canActivate: [admin], title: 'Administration - Vols' },
  { path: 'admin/promotions', component: AdminPromotions, canActivate: [admin], title: 'Administration - Promotions' },
  { path: 'admin/reservations', component: AdminReservations, canActivate: [admin], title: 'Administration - Réservations' },
  { path: '**', redirectTo: '' },
];
