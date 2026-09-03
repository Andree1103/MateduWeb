import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Rol } from './auth.models';
import { AuthService } from './auth.service';

/** Exige sesion activa. Recuerda a donde queria ir para volver despues del login. */
export const sesionGuard: CanActivateFn = (_ruta, estado) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.autenticado()) {
    return true;
  }

  return router.createUrlTree(['/ingresar'], {
    queryParams: { volverA: estado.url },
  });
};

/** Para el login: si ya hay sesion, no tiene sentido mostrarlo otra vez. */
export const invitadoGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.autenticado() ? router.parseUrl(auth.destinoTrasIngresar()) : true;
};

/**
 * Exige uno de los roles indicados.
 *
 * Es control de interfaz, no de seguridad: quien decide de verdad es el backend
 * con @PreAuthorize. Aqui solo se evita mostrar pantallas que la API rechazaria.
 */
export function rolGuard(...permitidos: Rol[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    const rol = auth.rol();
    if (rol === null) {
      return router.createUrlTree(['/ingresar']);
    }
    if (permitidos.includes(rol)) {
      return true;
    }

    // Con sesion valida pero sin permiso, se devuelve al usuario a su propia area.
    return router.parseUrl(auth.destinoTrasIngresar());
  };
}
