import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { finalize } from 'rxjs';

import { mensajeError, Usuario } from './api';
import { AuthService } from './auth.service';
import { UsuarioService } from './datos.service';

@Component({
  selector: 'app-usuarios',
  imports: [ReactiveFormsModule],
  templateUrl: './usuarios.html'
})
export class Usuarios implements OnInit {
  readonly auth = inject(AuthService);
  private readonly servicio = inject(UsuarioService);

  readonly usuarios = signal<Usuario[]>([]);
  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly editandoId = signal<number | null>(null);
  readonly error = signal('');
  readonly exito = signal('');

  readonly formulario = new FormGroup({
    nombre: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)]
    }),
    correo: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email, Validators.maxLength(150)]
    }),
    // Solo se pide al crear; al editar se desactiva.
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(12), Validators.maxLength(64)]
    }),
    activo: new FormControl(true, { nonNullable: true })
  });

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);

    this.servicio.listar()
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: lista => this.usuarios.set(
          [...lista].sort((a, b) => a.nombre.localeCompare(b.nombre))
        ),
        error: (e: HttpErrorResponse) => this.error.set(mensajeError(e))
      });
  }

  guardar(): void {
    this.limpiarMensajes();

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const v = this.formulario.getRawValue();
    const id = this.editandoId();

    const peticion = id
      ? this.servicio.actualizar(id, {
          nombre: v.nombre.trim(),
          correo: v.correo.trim(),
          activo: v.activo
        })
      : this.servicio.crear({
          nombre: v.nombre.trim(),
          correo: v.correo.trim(),
          password: v.password
        });

    this.guardando.set(true);

    peticion
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: () => {
          this.exito.set(id ? 'Usuario actualizado.' : 'Usuario registrado como solicitante.');
          this.cancelarEdicion();
          this.cargar();
        },
        error: (e: HttpErrorResponse) => this.error.set(mensajeError(e))
      });
  }

  editar(usuario: Usuario): void {
    this.limpiarMensajes();
    this.editandoId.set(usuario.id);
    this.formulario.controls.password.disable();
    this.formulario.patchValue({
      nombre: usuario.nombre,
      correo: usuario.correo,
      password: '',
      activo: usuario.activo
    });
  }

  cancelarEdicion(): void {
    this.editandoId.set(null);
    this.formulario.controls.password.enable();
    this.formulario.reset({ nombre: '', correo: '', password: '', activo: true });
  }

  eliminar(usuario: Usuario): void {
    this.limpiarMensajes();

    if (!confirm(`¿Eliminar la cuenta de ${usuario.nombre}?`)) {
      return;
    }

    this.servicio.eliminar(usuario.id).subscribe({
      next: () => {
        this.exito.set('Usuario eliminado.');
        if (this.editandoId() === usuario.id) {
          this.cancelarEdicion();
        }
        this.cargar();
      },
      error: (e: HttpErrorResponse) => this.error.set(
        e.status === 409
          ? 'No se puede eliminar porque tiene reservas registradas. Puedes desactivarlo en su lugar.'
          : mensajeError(e)
      )
    });
  }

  esYo(usuario: Usuario): boolean {
    return this.auth.usuario()?.usuarioId === usuario.id;
  }

  invalido(campo: keyof typeof this.formulario.controls): boolean {
    const control = this.formulario.controls[campo];
    return control.touched && control.invalid;
  }

  private limpiarMensajes(): void {
    this.error.set('');
    this.exito.set('');
  }
}
