/**
 * Desarrollo: la API se sirve por el proxy de ng serve y el centro se elige
 * a mano en la pantalla de ingreso mediante la cabecera X-Tenant.
 */
export const environment = {
  produccion: false,
  apiUrl: '/api',
  enviarCabeceraCentro: true,
};
