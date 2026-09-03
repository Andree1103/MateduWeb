import { InjectionToken } from '@angular/core';

/**
 * Prefijo absoluto de la API.
 *
 * En el navegador va vacio: una ruta relativa como /api resuelve contra el
 * propio origen y el proxy hace el resto.
 *
 * En el servidor NO hay origen, y HttpClient no sabe resolver una ruta
 * relativa: sin esto, cada peticion falla durante el renderizado y la pagina
 * se entrega vacia, que es justo lo contrario de lo que busca el SSR.
 */
export const URL_BASE_API = new InjectionToken<string>('URL_BASE_API', {
  providedIn: 'root',
  factory: () => '',
});
