/**
 * DEV: el backend de su maquina, publicado por el tunel de Cloudflare.
 *
 * Sirve para lo que localhost no puede: abrir la aplicacion desde un celular,
 * ensenarsela a alguien, o recibir avisos de servicios externos (la respuesta
 * de una pasarela de pago, un webhook) que necesitan una direccion publica.
 *
 * apiUrl es ABSOLUTA a proposito: aqui no hay proxy de por medio, el navegador
 * llama directo al tunel. Por eso el backend responde con CORS abierto en
 * desarrollo.
 *
 * OJO: esta direccion la reescribe `tunel.ps1` cada vez que se levanta el
 * tunel. Un tunel rapido (trycloudflare.com) recibe un nombre nuevo en cada
 * arranque; no lo edite a mano, se pisara solo.
 */
export const environment = {
  produccion: false,
  entorno: 'dev',
  apiUrl: 'https://equal-retail-advisors-pittsburgh.trycloudflare.com/api',
  enviarCabeceraCentro: true,
};
