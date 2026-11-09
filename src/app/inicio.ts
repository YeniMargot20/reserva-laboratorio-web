import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-inicio',
  templateUrl: './inicio.html',
  styleUrl: './inicio.css'
})
export class Inicio {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  salir(): void {
    this.auth.cerrarSesion();
    void this.router.navigateByUrl('/login');
  }
}