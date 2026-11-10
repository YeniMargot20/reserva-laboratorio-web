import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { App } from './app';
import { hora, mensajeError } from './api';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])]
    }).compileComponents();
  });

  it('crea la aplicación', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });
});

describe('mensajeError', () => {
  it('avisa cuando el servidor no responde', () => {
    const error = new HttpErrorResponse({ status: 0 });
    expect(mensajeError(error)).toContain('No se pudo conectar');
  });

  it('une los errores de validación por campo', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: {
        estado: 400,
        mensaje: 'Revisa los datos ingresados',
        errores: { nombre: 'El nombre es obligatorio', capacidad: 'La capacidad mínima es 1' }
      }
    });
    expect(mensajeError(error)).toBe('El nombre es obligatorio. La capacidad mínima es 1');
  });

  it('usa el mensaje del backend si no hay detalle', () => {
    const error = new HttpErrorResponse({
      status: 409,
      error: { estado: 409, mensaje: 'El laboratorio ya tiene una reserva en ese horario', errores: {} }
    });
    expect(mensajeError(error)).toBe('El laboratorio ya tiene una reserva en ese horario');
  });
});

describe('hora', () => {
  it('recorta los segundos', () => {
    expect(hora('08:30:00')).toBe('08:30');
  });
});
