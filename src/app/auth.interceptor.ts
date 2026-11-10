import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { API_URL } from './api';
import { AuthService } from './auth.service';

/**
 * Agrega el token JWT a cada llamada al backend y, si la sesión
 * expiró (401), cierra la sesión y vuelve al login.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const esApi = req.url.startsWith(API_URL);
  const esLogin = req.url.endsWith('/auth/login');
  const token = esApi && !esLogin ? auth.obtenerToken() : null;

  const peticion = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(peticion).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && esApi && !esLogin) {
        auth.cerrarSesion();
        void router.navigateByUrl('/login');
      }

      return throwError(() => error);
    })
  );
};
