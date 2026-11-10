import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';

import { AuthService } from './auth.service';
import { Inicio } from './inicio';
import { Laboratorios } from './laboratorios';
import { Login } from './login';
import { Panel } from './panel';
import { Reservas } from './reservas';
import { Usuarios } from './usuarios';

const requiereSesion: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.obtenerToken()
    ? true
    : router.createUrlTree(['/login']);
};

const soloAdministrador: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.esAdministrador()
    ? true
    : router.createUrlTree(['/inicio']);
};

export const routes: Routes = [
  {
    path: 'login',
    component: Login
  },
  {
    path: '',
    component: Panel,
    canActivate: [requiereSesion],
    children: [
      { path: 'inicio', component: Inicio },
      { path: 'laboratorios', component: Laboratorios },
      { path: 'reservas', component: Reservas },
      {
        path: 'usuarios',
        component: Usuarios,
        canActivate: [soloAdministrador]
      },
      { path: '', redirectTo: 'inicio', pathMatch: 'full' }
    ]
  },
  {
    path: '**',
    redirectTo: 'inicio'
  }
];
