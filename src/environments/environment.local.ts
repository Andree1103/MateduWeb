/**
 * LOCAL: todo en su maquina.
 *
 * La API se sirve por el proxy de `ng serve` (proxy.conf.json apunta al 8080),
 * asi que la ruta es relativa y no hay CORS de por medio. El centro se elige a
 * mano en la pantalla de ingreso mediante la cabecera X-Tenant, porque en
 * localhost no hay dominio del que deducirlo.
 *
 * Es el entorno del dia a dia: no depende de internet ni de que el tunel este
 * levantado.
 */
export const environment = {
  produccion: false,
  entorno: 'local',
  apiUrl: '/api',
  enviarCabeceraCentro: true,
};
