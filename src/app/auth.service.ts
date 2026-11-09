import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  usuarioId: number;
  nombre: string;
  rol: 'ADMINISTRADOR' | 'SOLICITANTE';
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly sesion = signal<LoginResponse | null>(null);
  readonly usuario = this.sesion.asReadonly();

  private vencimiento = 0;

  iniciarSesion(correo: string, password: string) {
    return this.http.post<LoginResponse>(
      'http://localhost:8080/api/auth/login',
      { correo: correo.trim(), password }
    ).pipe(
      tap(respuesta => {
        this.vencimiento = Date.now() + respuesta.expiresIn * 1000;
        this.sesion.set(respuesta);
      })
    );
  }

  obtenerToken(): string | null {
    if (Date.now() >= this.vencimiento) {
      this.cerrarSesion();
      return null;
    }

    return this.sesion()?.accessToken ?? null;
  }

  cerrarSesion(): void {
    this.sesion.set(null);
    this.vencimiento = 0;
  }
}