/** Produccion: el centro se resuelve por el dominio, no por cabecera. */
export const environment = {
  produccion: true,
  apiUrl: '/api',
  enviarCabeceraCentro: false,
  // Vacio a proposito: en produccion el centro sale del dominio.
  centroPorDefecto: '',
};
