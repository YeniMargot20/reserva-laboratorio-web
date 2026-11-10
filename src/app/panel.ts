import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from './auth.service';

/** Estructura común de las páginas con sesión: cabecera, menú y pie. */
@Component({
  selector: 'app-panel',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './panel.html',
  styleUrl: './panel.css'
})
export class Panel {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  salir(): void {
    this.auth.cerrarSesion();
    void this.router.navigateByUrl('/login');
  }
}
