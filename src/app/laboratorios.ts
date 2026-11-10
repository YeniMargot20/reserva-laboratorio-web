import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { finalize } from 'rxjs';

import { Laboratorio, mensajeError } from './api';
import { AuthService } from './auth.service';
import { LaboratorioService } from './datos.service';

@Component({
  selector: 'app-laboratorios',
  imports: [ReactiveFormsModule],
  templateUrl: './laboratorios.html'
})
export class Laboratorios implements OnInit {
  readonly auth = inject(AuthService);
  private readonly servicio = inject(LaboratorioService);

  readonly laboratorios = signal<Laboratorio[]>([]);
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
    ubicacion: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(150)]
    }),
    capacidad: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(1), Validators.max(500)]
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
        next: lista => this.laboratorios.set(
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

    const valores = this.formulario.getRawValue();
    const datos = {
      nombre: valores.nombre.trim(),
      ubicacion: valores.ubicacion.trim(),
      capacidad: Number(valores.capacidad),
      activo: valores.activo
    };

    const id = this.editandoId();
    const peticion = id
      ? this.servicio.actualizar(id, datos)
      : this.servicio.crear(datos);

    this.guardando.set(true);

    peticion
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: () => {
          this.exito.set(id ? 'Laboratorio actualizado.' : 'Laboratorio registrado.');
          this.cancelarEdicion();
          this.cargar();
        },
        error: (e: HttpErrorResponse) => this.error.set(mensajeError(e))
      });
  }

  editar(laboratorio: Laboratorio): void {
    this.limpiarMensajes();
    this.editandoId.set(laboratorio.id);
    this.formulario.setValue({
      nombre: laboratorio.nombre,
      ubicacion: laboratorio.ubicacion,
      capacidad: laboratorio.capacidad,
      activo: laboratorio.activo
    });
  }

  cancelarEdicion(): void {
    this.editandoId.set(null);
    this.formulario.reset({
      nombre: '',
      ubicacion: '',
      capacidad: null,
      activo: true
    });
  }

  eliminar(laboratorio: Laboratorio): void {
    this.limpiarMensajes();

    if (!confirm(`¿Eliminar "${laboratorio.nombre}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    this.servicio.eliminar(laboratorio.id).subscribe({
      next: () => {
        this.exito.set('Laboratorio eliminado.');
        if (this.editandoId() === laboratorio.id) {
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

  invalido(campo: keyof typeof this.formulario.controls): boolean {
    const control = this.formulario.controls[campo];
    return control.touched && control.invalid;
  }

  private limpiarMensajes(): void {
    this.error.set('');
    this.exito.set('');
  }
}
