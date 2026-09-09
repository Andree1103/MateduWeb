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

  /**
   * Centro que se asume cuando NO hay sesion.
   *
   * Las paginas publicas —el catalogo, la ficha de un curso, la
   * inscripcion— las abre un visitante sin cuenta, asi que no hay centro
   * guardado que mandar. En produccion no hace falta: el centro se deduce
   * del dominio desde el que se sirve la pagina. Aqui no hay tal dominio
   * (localhost, o el de Netlify), asi que se declara.
   *
   * Es el centro que se ve en matedu.netlify.app.
   */
  centroPorDefecto: 'andina',
};
