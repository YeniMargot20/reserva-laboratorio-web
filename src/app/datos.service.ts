import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import {
  API_URL,
  HorarioOcupado,
  Laboratorio,
  LaboratorioDatos,
  Reserva,
  ReservaDatos,
  Usuario,
  UsuarioActualizar,
  UsuarioCrear
} from './api';

/** Operaciones CRUD de laboratorios y aulas. */
@Injectable({ providedIn: 'root' })
export class LaboratorioService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/laboratorios`;

  listar() {
    return this.http.get<Laboratorio[]>(this.url);
  }

  crear(datos: LaboratorioDatos) {
    return this.http.post<Laboratorio>(this.url, datos);
  }

  actualizar(id: number, datos: LaboratorioDatos) {
    return this.http.put<Laboratorio>(`${this.url}/${id}`, datos);
  }

  eliminar(id: number) {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}

/** Operaciones CRUD de reservas. */
@Injectable({ providedIn: 'root' })
export class ReservaService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/reservas`;

  listar() {
    return this.http.get<Reserva[]>(this.url);
  }

  ocupados(laboratorioId: number, fecha: string) {
    return this.http.get<HorarioOcupado[]>(`${this.url}/ocupados`, {
      params: { laboratorioId, fecha }
    });
  }

  crear(datos: ReservaDatos) {
    return this.http.post<Reserva>(this.url, datos);
  }

  actualizar(id: number, datos: ReservaDatos) {
    return this.http.put<Reserva>(`${this.url}/${id}`, datos);
  }

  eliminar(id: number) {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}

/** Operaciones CRUD de usuarios (solo administrador). */
@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/usuarios`;

  listar() {
    return this.http.get<Usuario[]>(this.url);
  }

  crear(datos: UsuarioCrear) {
    return this.http.post<Usuario>(this.url, datos);
  }

  actualizar(id: number, datos: UsuarioActualizar) {
    return this.http.put<Usuario>(`${this.url}/${id}`, datos);
  }

  eliminar(id: number) {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
