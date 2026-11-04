import { HttpErrorResponse, HttpInterceptorFn, provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, inject, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { Notifier } from './api.service';
import { Auth } from './auth.service';
import { routes } from './app.routes';

/** Ajoute le jeton administrateur et affiche le message d'erreur renvoyé par Spring Boot. */
const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const notifier = inject(Notifier);
  const auth = inject(Auth);
  const token = auth.token();
  const requete = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  return next(requete).pipe(
    catchError((e: HttpErrorResponse) => {
      if (e.status === 401 && token && !req.url.includes('/auth/login')) auth.expirer();
      // Le chat gère lui-même ses erreurs
      if (!req.url.includes('/api/chat'))
        notifier.error(e.error?.message ?? (e.status === 0 ? 'Serveur injoignable' : 'Erreur inattendue'));
      return throwError(() => e);
    }),
  );
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([apiInterceptor])),
  ],
};
