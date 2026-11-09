import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { finalize } from 'rxjs';

import { AuthService } from './auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly cargando = signal(false);
  readonly error = signal('');

  readonly formulario = new FormGroup({
    correo: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.email,
        Validators.maxLength(150)
      ]
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.maxLength(64)
      ]
    })
  });

  ingresar(): void {
    if (this.cargando()) {
      return;
    }

    this.error.set('');

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.cargando.set(true);

    const { correo, password } = this.formulario.getRawValue();

    this.auth.iniciarSesion(correo, password)
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: () => {
          this.formulario.controls.password.reset();
          void this.router.navigateByUrl('/inicio');
        },
        error: (respuesta: HttpErrorResponse) => {
          this.formulario.controls.password.reset();

          if (respuesta.status === 0) {
            this.error.set(
              'No se pudo conectar con el servidor. Verifica que Java esté ejecutándose en el puerto 8080.'
            );
          } else if (respuesta.status === 401) {
            this.error.set(
              'Correo o contraseña incorrectos, o cuenta inactiva.'
            );
          } else {
            this.error.set(
              'No se pudo iniciar sesión. Revisa los datos e inténtalo nuevamente.'
            );
          }
        }
      });
  }

  salir(): void {
    this.auth.cerrarSesion();
    this.formulario.reset();
    this.error.set('');
  }
}