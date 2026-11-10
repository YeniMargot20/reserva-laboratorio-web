import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { finalize } from 'rxjs';

import {
  EstadoReserva,
  hora,
  HorarioOcupado,
  Laboratorio,
  mensajeError,
  Reserva,
  ReservaDatos,
  Usuario
} from './api';
import { AuthService } from './auth.service';
import {
  LaboratorioService,
  ReservaService,
  UsuarioService
} from './datos.service';

/** Horario de atención en el que se sugieren franjas libres. */
const APERTURA = '07:00';
const CIERRE = '22:00';

interface Franja {
  inicio: string;
  fin: string;
}

function horarioValido(grupo: AbstractControl): ValidationErrors | null {
  const inicio = grupo.get('horaInicio')?.value as string;
  const fin = grupo.get('horaFin')?.value as string;

  return inicio && fin && fin <= inicio ? { horario: true } : null;
}

function aMinutos(valor: string): number {
  const [h, m] = valor.split(':').map(Number);
  return h * 60 + m;
}

function aHora(minutos: number): string {
  const h = Math.floor(minutos / 60).toString().padStart(2, '0');
  const m = (minutos % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

function hoy(): string {
  const fecha = new Date();
  fecha.setMinutes(fecha.getMinutes() - fecha.getTimezoneOffset());
  return fecha.toISOString().slice(0, 10);
}

@Component({
  selector: 'app-reservas',
  imports: [ReactiveFormsModule],
  templateUrl: './reservas.html',
  styleUrl: './reservas.css'
})
export class Reservas implements OnInit {
  readonly auth = inject(AuthService);
  private readonly reservasApi = inject(ReservaService);
  private readonly laboratoriosApi = inject(LaboratorioService);
  private readonly usuariosApi = inject(UsuarioService);

  readonly hora = hora;
  readonly hoy = hoy();
  readonly estados: EstadoReserva[] = ['PENDIENTE', 'CONFIRMADA', 'CANCELADA'];

  readonly reservas = signal<Reserva[]>([]);
  readonly laboratorios = signal<Laboratorio[]>([]);
  readonly usuarios = signal<Usuario[]>([]);
  readonly ocupados = signal<HorarioOcupado[]>([]);
  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly editando = signal<Reserva | null>(null);
  readonly error = signal('');
  readonly exito = signal('');

  /** Filtros del listado */
  readonly filtroEstado = signal<EstadoReserva | ''>('');
  readonly filtroLaboratorio = signal<number | ''>('');

  /** Valores actuales del formulario, como señales */
  private readonly seleccion = signal({
    laboratorioId: null as number | null,
    fecha: '',
    horaInicio: '',
    horaFin: ''
  });

  readonly formulario = new FormGroup({
    usuarioId: new FormControl<number | null>(null, Validators.required),
    laboratorioId: new FormControl<number | null>(null, Validators.required),
    fecha: new FormControl('', { nonNullable: true, validators: Validators.required }),
    horaInicio: new FormControl('', { nonNullable: true, validators: Validators.required }),
    horaFin: new FormControl('', { nonNullable: true, validators: Validators.required }),
    motivo: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(200)]
    }),
    estado: new FormControl<EstadoReserva>('PENDIENTE', { nonNullable: true })
  }, { validators: horarioValido });

  readonly laboratoriosActivos = computed(
    () => this.laboratorios().filter(l => l.activo)
  );

  readonly usuariosActivos = computed(
    () => this.usuarios().filter(u => u.activo)
  );

  readonly reservasFiltradas = computed(() => {
    const estado = this.filtroEstado();
    const laboratorio = this.filtroLaboratorio();

    return this.reservas().filter(r =>
      (!estado || r.estado === estado)
      && (!laboratorio || r.laboratorioId === laboratorio)
    );
  });

  readonly resumen = computed(() => {
    const lista = this.reservas();
    return {
      pendientes: lista.filter(r => r.estado === 'PENDIENTE').length,
      confirmadas: lista.filter(r => r.estado === 'CONFIRMADA').length,
      canceladas: lista.filter(r => r.estado === 'CANCELADA').length
    };
  });

  /** Franjas ocupadas, sin contar la reserva que se está editando. */
  readonly ocupadosVisibles = computed<Franja[]>(() => {
    const actual = this.editando();
    const s = this.seleccion();
    let omitida = false;

    return this.ocupados()
      .map(o => ({ inicio: hora(o.horaInicio), fin: hora(o.horaFin) }))
      .filter(f => {
        const esLaMisma = !omitida
          && actual !== null
          && actual.laboratorioId === s.laboratorioId
          && actual.fecha === s.fecha
          && hora(actual.horaInicio) === f.inicio
          && hora(actual.horaFin) === f.fin;

        if (esLaMisma) {
          omitida = true;
        }
        return !esLaMisma;
      })
      .sort((a, b) => a.inicio.localeCompare(b.inicio));
  });

  /** Indica si el horario elegido se cruza con otra reserva. */
  readonly hayCruce = computed(() => {
    const { horaInicio, horaFin } = this.seleccion();

    if (!horaInicio || !horaFin || horaFin <= horaInicio) {
      return false;
    }

    return this.ocupadosVisibles().some(
      f => horaInicio < f.fin && horaFin > f.inicio
    );
  });

  /** Franjas libres dentro del horario de atención. */
  readonly franjasLibres = computed<Franja[]>(() => {
    const libres: Franja[] = [];
    let cursor = APERTURA;

    for (const f of this.ocupadosVisibles()) {
      if (f.inicio > cursor) {
        libres.push({ inicio: cursor, fin: f.inicio < CIERRE ? f.inicio : CIERRE });
      }
      if (f.fin > cursor) {
        cursor = f.fin;
      }
    }

    if (cursor < CIERRE) {
      libres.push({ inicio: cursor, fin: CIERRE });
    }

    // Solo franjas de al menos 30 minutos
    return libres.filter(f => aMinutos(f.fin) - aMinutos(f.inicio) >= 30);
  });

  readonly puedeVerDisponibilidad = computed(() => {
    const s = this.seleccion();
    return s.laboratorioId !== null && !!s.fecha;
  });

  constructor() {
    this.formulario.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        const v = this.formulario.getRawValue();
        const anterior = this.seleccion();

        this.seleccion.set({
          laboratorioId: v.laboratorioId,
          fecha: v.fecha,
          horaInicio: v.horaInicio,
          horaFin: v.horaFin
        });

        if (v.laboratorioId !== anterior.laboratorioId || v.fecha !== anterior.fecha) {
          this.cargarOcupados();
        }
      });
  }

  ngOnInit(): void {
    this.prepararNuevo();
    this.cargar();

    this.laboratoriosApi.listar().subscribe({
      next: lista => this.laboratorios.set(lista),
      error: (e: HttpErrorResponse) => this.error.set(mensajeError(e))
    });

    if (this.auth.esAdministrador()) {
      this.usuariosApi.listar().subscribe({
        next: lista => this.usuarios.set(lista),
        error: (e: HttpErrorResponse) => this.error.set(mensajeError(e))
      });
    }
  }

  cargar(): void {
    this.cargando.set(true);

    this.reservasApi.listar()
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: lista => this.reservas.set(
          [...lista].sort((a, b) =>
            (b.fecha + b.horaInicio).localeCompare(a.fecha + a.horaInicio)
          )
        ),
        error: (e: HttpErrorResponse) => this.error.set(mensajeError(e))
      });
  }

  private cargarOcupados(): void {
    const { laboratorioId, fecha } = this.formulario.getRawValue();

    if (!laboratorioId || !fecha) {
      this.ocupados.set([]);
      return;
    }

    this.reservasApi.ocupados(laboratorioId, fecha).subscribe({
      next: lista => this.ocupados.set(lista),
      error: () => this.ocupados.set([])
    });
  }

  usarFranja(franja: Franja): void {
    const { horaInicio, horaFin } = this.formulario.getRawValue();

    // Conserva la duración elegida si cabe en la franja; si no, 1 hora.
    const duracion = horaInicio && horaFin && horaFin > horaInicio
      ? aMinutos(horaFin) - aMinutos(horaInicio)
      : 60;

    const inicio = aMinutos(franja.inicio);
    const fin = Math.min(inicio + duracion, aMinutos(franja.fin));

    this.formulario.patchValue({
      horaInicio: franja.inicio,
      horaFin: aHora(fin)
    });
  }

  guardar(): void {
    this.limpiarMensajes();

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    if (this.hayCruce()) {
      this.error.set('El horario elegido se cruza con otra reserva. Elige una franja libre.');
      return;
    }

    const v = this.formulario.getRawValue();
    const actual = this.editando();

    const datos: ReservaDatos = {
      usuarioId: Number(v.usuarioId),
      laboratorioId: Number(v.laboratorioId),
      fecha: v.fecha,
      horaInicio: v.horaInicio,
      horaFin: v.horaFin,
      motivo: v.motivo.trim(),
      estado: actual && this.auth.esAdministrador() ? v.estado : null
    };

    const peticion = actual
      ? this.reservasApi.actualizar(actual.id, datos)
      : this.reservasApi.crear(datos);

    this.guardando.set(true);

    peticion
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: () => {
          this.exito.set(actual ? 'Reserva actualizada.' : 'Reserva registrada. Queda pendiente de confirmación.');
          this.prepararNuevo();
          this.cargar();
        },
        error: (e: HttpErrorResponse) => {
          this.error.set(mensajeError(e));
          this.cargarOcupados();
        }
      });
  }

  editar(reserva: Reserva): void {
    this.limpiarMensajes();
    this.editando.set(reserva);

    this.formulario.setValue({
      usuarioId: reserva.usuarioId,
      laboratorioId: reserva.laboratorioId,
      fecha: reserva.fecha,
      horaInicio: hora(reserva.horaInicio),
      horaFin: hora(reserva.horaFin),
      motivo: reserva.motivo,
      estado: reserva.estado
    });

    // El usuario y el laboratorio no se pueden cambiar en una reserva.
    this.formulario.controls.usuarioId.disable({ emitEvent: false });
    this.formulario.controls.laboratorioId.disable({ emitEvent: false });
  }

  prepararNuevo(): void {
    this.editando.set(null);
    this.formulario.controls.usuarioId.enable({ emitEvent: false });
    this.formulario.controls.laboratorioId.enable({ emitEvent: false });

    this.formulario.reset({
      usuarioId: this.auth.esAdministrador()
        ? null
        : this.auth.usuario()?.usuarioId ?? null,
      laboratorioId: null,
      fecha: '',
      horaInicio: '',
      horaFin: '',
      motivo: '',
      estado: 'PENDIENTE'
    });
  }

  cambiarEstado(reserva: Reserva, estado: EstadoReserva): void {
    this.limpiarMensajes();

    this.reservasApi.actualizar(reserva.id, {
      usuarioId: reserva.usuarioId,
      laboratorioId: reserva.laboratorioId,
      fecha: reserva.fecha,
      horaInicio: hora(reserva.horaInicio),
      horaFin: hora(reserva.horaFin),
      motivo: reserva.motivo,
      estado
    }).subscribe({
      next: () => {
        this.exito.set(estado === 'CONFIRMADA' ? 'Reserva confirmada.' : 'Reserva cancelada.');
        this.cargar();
      },
      error: (e: HttpErrorResponse) => this.error.set(mensajeError(e))
    });
  }

  eliminar(reserva: Reserva): void {
    this.limpiarMensajes();

    if (!confirm(`¿Eliminar la reserva de ${reserva.laboratorioNombre} del ${reserva.fecha}?`)) {
      return;
    }

    this.reservasApi.eliminar(reserva.id).subscribe({
      next: () => {
        this.exito.set('Reserva eliminada.');
        if (this.editando()?.id === reserva.id) {
          this.prepararNuevo();
        }
        this.cargar();
      },
      error: (e: HttpErrorResponse) => this.error.set(mensajeError(e))
    });
  }

  cambiarFiltroEstado(valor: string): void {
    this.filtroEstado.set(valor as EstadoReserva | '');
  }

  cambiarFiltroLaboratorio(valor: string): void {
    this.filtroLaboratorio.set(valor ? Number(valor) : '');
  }

  invalido(campo: keyof typeof this.formulario.controls): boolean {
    const control = this.formulario.controls[campo];
    return control.touched && control.invalid;
  }

  horarioInvalido(): boolean {
    return this.formulario.hasError('horario')
      && this.formulario.controls.horaFin.touched;
  }

  private limpiarMensajes(): void {
    this.error.set('');
    this.exito.set('');
  }
}
