import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { HttpErrorResponse, HttpInterceptorFn, provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, LOCALE_ID, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { catchError, finalize, throwError } from 'rxjs';
import { Loader } from './shared/loader';
import { Notifier } from './api.service';
import { Auth } from './auth.service';
import { routes } from './app.routes';

registerLocaleData(localeFr);

/** Ajoute le jeton de session et affiche le message d'erreur renvoyé par Spring Boot. */
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

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([apiInterceptor])),
    { provide: LOCALE_ID, useValue: 'fr-FR' },
    provideAppInitializer(() => inject(Auth).restaurer()),
  ],
};
