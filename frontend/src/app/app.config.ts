import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { HttpErrorResponse, HttpInterceptorFn, provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, LOCALE_ID, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { catchError, finalize, throwError } from 'rxjs';
import { Notifier } from './api.service';
import { Auth } from './auth.service';
import { routes } from './app.routes';
import { Loader } from './shared/loader';
import { ThemeOrange } from './shared/theme';
import { TRADUCTION_FR } from './shared/traduction';

registerLocaleData(localeFr);

/**
 * Intercepteur HTTP : ajoute le jeton de session, compte les requêtes en cours (barre de progression)
 * et affiche le message d'erreur renvoyé par Spring Boot.
 * @param req la requête sortante
 * @param next la suite de la chaîne d'intercepteurs
 * @returns le flux de la réponse
 */
const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const notifier = inject(Notifier);
  const auth = inject(Auth);
  const router = inject(Router);
  const loader = inject(Loader);
  const suivi = !req.url.includes('/api/chat');   // le chat a son propre indicateur
  if (suivi) loader.debut();
  const token = auth.token();
  const requete = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  return next(requete).pipe(
    catchError((e: HttpErrorResponse) => {
      const silencieux = req.url.includes('/api/chat') || req.url.includes('/api/auth/me');
      if (e.status === 401 && token && !req.url.includes('/auth/login')) {
        auth.expirer();
        notifier.error('Votre session a expiré, reconnectez-vous.');
        router.navigate(['/connexion'], { queryParams: { retour: router.url } });
      } else if (!silencieux) {
        notifier.error(e.error?.message ?? (e.status === 0 ? 'Serveur injoignable' : 'Erreur inattendue'));
      }
      return throwError(() => e);
    }),
    finalize(() => { if (suivi) loader.fin(); }),
  );
};

/** Configuration de l'application : routeur, HTTP, thème PrimeNG orange, français, services de notification. */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([apiInterceptor])),
    { provide: LOCALE_ID, useValue: 'fr-FR' },
    providePrimeNG({ theme: { preset: ThemeOrange, options: { darkModeSelector: false } }, ripple: true, translation: TRADUCTION_FR }),
    MessageService,
    ConfirmationService,
    provideAppInitializer(() => inject(Auth).restaurer()),
  ],
};
