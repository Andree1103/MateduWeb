import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Credenciales, esDeGestion, PerfilUsuario, Rol, rutaInicial, Sesion } from './auth.models';
import { TokenStore } from './token.store';

/**
 * Sesion del usuario.
 *
 * El estado vive en signals, asi que las plantillas se actualizan solas cuando
 * alguien entra o sale. Al arrancar se rehidrata desde el almacenamiento para
 * que un F5 no eche al usuario.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly store = inject(TokenStore);

  private readonly _usuario = signal<PerfilUsuario | null>(this.store.usuario);

  readonly usuario = this._usuario.asReadonly();
  readonly autenticado = computed(() => this._usuario() !== null);
  readonly rol = computed<Rol | null>(() => this._usuario()?.rol ?? null);
  readonly esGestion = computed(() => {
    const rol = this.rol();
    return rol !== null && esDeGestion(rol);
  });
  readonly iniciales = computed(() => {
    const nombre = this._usuario()?.nombreCompleto ?? '';
    return nombre
      .split(' ')
      .filter((parte) => parte.length > 0)
      .slice(0, 2)
      .map((parte) => parte[0]?.toUpperCase() ?? '')
      .join('');
  });

  iniciarSesion(credenciales: Credenciales, centro?: string): Observable<Sesion> {
    if (centro) {
      this.store.centro = centro.trim();
    }
    return this.http
      .post<Sesion>(`${environment.apiUrl}/auth/login`, credenciales)
      .pipe(tap((sesion) => this.aceptarSesion(sesion)));
  }

  /** Renueva el access token. Lo llama el interceptor cuando la API responde 401. */
  refrescar(): Observable<Sesion> {
    const refreshToken = this.store.refreshToken;
    return this.http
      .post<Sesion>(`${environment.apiUrl}/auth/refresh`, { refreshToken })
      .pipe(tap((sesion) => this.aceptarSesion(sesion)));
  }

  cerrarSesion(): void {
    const refreshToken = this.store.refreshToken;

    // El logout del servidor es mejor esfuerzo: la sesion local se cierra igual
    // aunque la API no responda.
    if (refreshToken) {
      this.http.post(`${environment.apiUrl}/auth/logout`, { refreshToken }).subscribe({
        error: () => undefined,
      });
    }

    this.olvidarSesion();
    void this.router.navigate(['/ingresar']);
  }

  /** Cierra la sesion local sin avisar al servidor. La usa el interceptor si el refresco falla. */
  olvidarSesion(): void {
    this.store.limpiar();
    this._usuario.set(null);
  }

  /** Destino segun el rol: la consola para gestion, el aula para el alumno. */
  destinoTrasIngresar(): string {
    const rol = this.rol();
    return rol ? rutaInicial(rol) : '/ingresar';
  }

  private aceptarSesion(sesion: Sesion): void {
    this.store.guardar(sesion);
    this._usuario.set(sesion.usuario);
  }
}
