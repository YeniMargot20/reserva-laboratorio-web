import { HttpErrorResponse } from '@angular/common/http';

/** Dirección base del backend Spring Boot. */
export const API_URL = 'http://localhost:8080/api';

export interface Laboratorio {
  id: number;
  nombre: string;
  ubicacion: string;
  capacidad: number;
  activo: boolean;
}

export type LaboratorioDatos = Omit<Laboratorio, 'id'>;

export type EstadoReserva = 'PENDIENTE' | 'CONFIRMADA' | 'CANCELADA';

export interface Reserva {
  id: number;
  usuarioId: number;
  usuarioNombre: string;
  laboratorioId: number;
  laboratorioNombre: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  motivo: string;
  estado: EstadoReserva;
}

export interface ReservaDatos {
  usuarioId: number;
  laboratorioId: number;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  motivo: string;
  estado?: EstadoReserva | null;
}

export interface HorarioOcupado {
  horaInicio: string;
  horaFin: string;
  estado: EstadoReserva;
}

export interface Usuario {
  id: number;
  nombre: string;
  correo: string;
  activo: boolean;
  rol: 'ADMINISTRADOR' | 'SOLICITANTE';
}

export interface UsuarioCrear {
  nombre: string;
  correo: string;
  password: string;
}

export interface UsuarioActualizar {
  nombre: string;
  correo: string;
  activo: boolean;
}

/** Formato de error que devuelve el backend (ErrorRespuesta). */
interface ErrorApi {
  estado: number;
  mensaje: string;
  errores?: Record<string, string>;
}

/** Convierte un error HTTP en un mensaje legible para el usuario. */
export function mensajeError(respuesta: HttpErrorResponse): string {
  if (respuesta.status === 0) {
    return 'No se pudo conectar con el servidor. Verifica que el backend esté ejecutándose en el puerto 8080.';
  }

  const error = respuesta.error as ErrorApi | null;
  const detalles = Object.values(error?.errores ?? {});

  if (detalles.length > 0) {
    return detalles.join('. ');
  }

  return error?.mensaje ?? 'No se pudo completar la operación.';
}

/** Muestra "08:00:00" como "08:00". */
export function hora(valor: string): string {
  return valor.slice(0, 5);
}
