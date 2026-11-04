import { HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, inject, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { Notifier } from './api.service';
import { routes } from './app.routes';

/** Affiche le message d'erreur renvoyé par le back-end Spring Boot. */
const errorInterceptor = (req: any, next: any) => {
  const notifier = inject(Notifier);
  return next(req).pipe(
    catchError((e: HttpErrorResponse) => {
      notifier.error(e.error?.message ?? (e.status === 0 ? 'Serveur injoignable' : 'Erreur inattendue'));
      return throwError(() => e);
    }),
  );
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([errorInterceptor])),
  ],
};
