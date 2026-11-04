import { Routes } from '@angular/router';
import { Auth } from './auth.service';
import { Dashboard } from './pages/dashboard';
import { Groupes } from './pages/groupes';
import { Login } from './pages/login';
import { Passagers } from './pages/passagers';
import { Promotions } from './pages/promotions';
import { Reservations } from './pages/reservations';
import { Vols } from './pages/vols';


export const routes: Routes = [
  { path: '', component: Dashboard, title: 'Tableau de bord' },
  { path: 'vols', component: Vols, title: 'Vols' },
  { path: 'promotions', component: Promotions, title: 'Promotions' },
  { path: 'passagers', component: Passagers, title: 'Passagers' },
  { path: 'reservations', component: Reservations, title: 'Réservations' },
  { path: 'groupes', component: Groupes, title: 'Voyages groupés' },
  { path: 'admin', component: Login, title: 'Administrateur' },
  { path: '**', redirectTo: '' },
];
