import { Injectable } from '@angular/core';
import { PerfilUsuario, Sesion } from './auth.models';

/**
 * Persistencia de la sesion en el navegador.
 *
 * Se usa localStorage para que la sesion sobreviva a un refresco de pagina. Es
 * el punto que habra que revisar cuando la fase 9 endurezca la seguridad: lo
 * ideal es mover el refresh token a una cookie httpOnly y dejar aqui solo el
 * access token, que dura minutos.
 */
@Injectable({ providedIn: 'root' })
export class TokenStore {
  private static readonly CLAVE_ACCESO = 'matedu.access';
  private static readonly CLAVE_REFRESCO = 'matedu.refresh';
  private static readonly CLAVE_USUARIO = 'matedu.usuario';
  private static readonly CLAVE_CENTRO = 'matedu.centro';

  guardar(sesion: Sesion): void {
    this.escribir(TokenStore.CLAVE_ACCESO, sesion.accessToken);
    this.escribir(TokenStore.CLAVE_REFRESCO, sesion.refreshToken);
    this.escribir(TokenStore.CLAVE_USUARIO, JSON.stringify(sesion.usuario));
  }

  limpiar(): void {
    this.borrar(TokenStore.CLAVE_ACCESO);
    this.borrar(TokenStore.CLAVE_REFRESCO);
    this.borrar(TokenStore.CLAVE_USUARIO);
  }

  get accessToken(): string | null {
    return this.leer(TokenStore.CLAVE_ACCESO);
  }

  get refreshToken(): string | null {
    return this.leer(TokenStore.CLAVE_REFRESCO);
  }

  get usuario(): PerfilUsuario | null {
    const guardado = this.leer(TokenStore.CLAVE_USUARIO);
    if (!guardado) {
      return null;
    }
    try {
      return JSON.parse(guardado) as PerfilUsuario;
    } catch {
      return null;
    }
  }

  /**
   * Codigo del centro para la cabecera X-Tenant.
   *
   * Solo hace falta en desarrollo: en produccion el centro se resuelve por el
   * dominio desde el que se sirve la aplicacion.
   */
  get centro(): string | null {
    return this.leer(TokenStore.CLAVE_CENTRO);
  }

  set centro(codigo: string | null) {
    if (codigo) {
      this.escribir(TokenStore.CLAVE_CENTRO, codigo);
    } else {
      this.borrar(TokenStore.CLAVE_CENTRO);
    }
  }

  // El acceso a localStorage puede fallar en modo privado o con cookies bloqueadas.
  private leer(clave: string): string | null {
    try {
      return localStorage.getItem(clave);
    } catch {
      return null;
    }
  }

  private escribir(clave: string, valor: string): void {
    try {
      localStorage.setItem(clave, valor);
    } catch {
      /* sin almacenamiento: la sesion vive solo mientras dure la pestana */
    }
  }

  private borrar(clave: string): void {
    try {
      localStorage.removeItem(clave);
    } catch {
      /* nada que limpiar */
    }
  }
}
