import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';

import { AuthService } from './auth.service';
import { Inicio } from './inicio';
import { Login } from './login';

const requiereSesion: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.obtenerToken()
    ? true
    : router.createUrlTree(['/login']);
};

export const routes: Routes = [
  {
    path: 'login',
    component: Login
  },
  {
    path: 'inicio',
    component: Inicio,
    canActivate: [requiereSesion]
  },
  {
    path: '',
    redirectTo: 'inicio',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'inicio'
  }
];