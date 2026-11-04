import { Routes } from '@angular/router';
import { Dashboard } from './pages/dashboard';
import { Groupes } from './pages/groupes';
import { Passagers } from './pages/passagers';
import { Reservations } from './pages/reservations';
import { Vols } from './pages/vols';

export const routes: Routes = [
  { path: '', component: Dashboard, title: 'Tableau de bord' },
  { path: 'vols', component: Vols, title: 'Vols' },
  { path: 'passagers', component: Passagers, title: 'Passagers' },
  { path: 'reservations', component: Reservations, title: 'Réservations' },
  { path: 'groupes', component: Groupes, title: 'Voyages groupés' },
  { path: '**', redirectTo: '' },
];
