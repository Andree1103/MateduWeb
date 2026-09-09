import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, filter, Observable, switchMap, take, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { TokenStore } from './token.store';

/** Evita que varias peticiones en paralelo disparen varios refrescos a la vez. */
let refrescando = false;
const tokenRenovado = new BehaviorSubject<string | null>(null);

/**
 * Agrega a cada llamada a la API el token de acceso y, en desarrollo, la
 * cabecera X-Tenant con el centro elegido.
 *
 * Ante un 401 intenta refrescar una sola vez y reintenta la peticion original.
 * Si el refresco tambien falla, cierra la sesion y manda al login.
 */
export function authInterceptor(
  peticion: HttpRequest<unknown>,
  siguiente: HttpHandlerFn,
): Observable<HttpEvent<unknown>> {
  const store = inject(TokenStore);
  const auth = inject(AuthService);
  const router = inject(Router);

  // Solo se toca lo que va a nuestra API. Se usa includes y no startsWith
  // porque en el renderizado del servidor la URL viene absoluta.
  if (!peticion.url.includes(environment.apiUrl)) {
    return siguiente(peticion);
  }

  const peticionConCabeceras = agregarCabeceras(peticion, store);

  return siguiente(peticionConCabeceras).pipe(
    catchError((error: unknown) => {
      // 402: la suscripcion del centro esta suspendida. Sin este desvio, el
      // administrador veria errores sueltos en cada pantalla y ninguna le
      // diria que lo que falta es pagar.
      if (error instanceof HttpErrorResponse && error.status === 402) {
        void router.navigate(["/consola/plan"], { queryParams: { motivo: "suspendida" } });
        return throwError(() => error);
      }

      const esNoAutorizado = error instanceof HttpErrorResponse && error.status === 401;
      const esLlamadaDeSesion = peticion.url.includes('/auth/login')
        || peticion.url.includes('/auth/refresh');

      if (!esNoAutorizado || esLlamadaDeSesion || !store.refreshToken) {
        return throwError(() => error);
      }

      return refrescarYReintentar(peticion, siguiente, store, auth, router);
    }),
  );
}

function agregarCabeceras(
  peticion: HttpRequest<unknown>,
  store: TokenStore,
): HttpRequest<unknown> {
  const cabeceras: Record<string, string> = {};

  const token = store.accessToken;
  if (token) {
    cabeceras['Authorization'] = `Bearer ${token}`;
  }

  // En produccion el centro se resuelve por el dominio y esta cabecera sobra.
  //
  // El centro de la sesion manda; si no hay sesion se usa el declarado en el
  // entorno. Sin ese respaldo, las paginas publicas —catalogo, ficha de
  // curso, inscripcion— fallan con "No se pudo determinar el centro": las
  // abre alguien que todavia no ha entrado, asi que no hay nada guardado.
  const centro = store.centro || environment.centroPorDefecto;
  if (environment.enviarCabeceraCentro && centro) {
    cabeceras['X-Tenant'] = centro;
  }

  return Object.keys(cabeceras).length > 0
    ? peticion.clone({ setHeaders: cabeceras })
    : peticion;
}

function refrescarYReintentar(
  peticion: HttpRequest<unknown>,
  siguiente: HttpHandlerFn,
  store: TokenStore,
  auth: AuthService,
  router: Router,
): Observable<HttpEvent<unknown>> {
  // Si ya hay un refresco en curso, esta peticion espera al token nuevo.
  if (refrescando) {
    return tokenRenovado.pipe(
      filter((token): token is string => token !== null),
      take(1),
      switchMap(() => siguiente(agregarCabeceras(peticion, store))),
    );
  }

  refrescando = true;
  tokenRenovado.next(null);

  return auth.refrescar().pipe(
    switchMap((sesion) => {
      refrescando = false;
      tokenRenovado.next(sesion.accessToken);
      return siguiente(agregarCabeceras(peticion, store));
    }),
    catchError((error: unknown) => {
      refrescando = false;
      auth.olvidarSesion();
      void router.navigate(['/ingresar'], {
        queryParams: { motivo: 'sesion-expirada' },
      });
      return throwError(() => error);
    }),
  );
}
