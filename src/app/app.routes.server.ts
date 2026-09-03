import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Que se renderiza en el servidor y que en el navegador.
 *
 * El sitio publico va en SERVIDOR: es lo que rastrea Google, y una SPA que
 * entrega un HTML vacio no posiciona. Sin esto, el argumento comercial de
 * "web profesional que aparece en buscadores" no se sostiene.
 *
 * La consola y el aula van en CLIENTE: dependen del token del navegador, el
 * servidor no tiene sesion, y renderizarlas alli solo produciria una pantalla
 * de carga. Ademas evita que contenido privado pase por el renderizador.
 *
 * No se usa Prerender porque el contenido depende del centro que resuelve el
 * dominio: la misma ruta muestra un sitio distinto en cada dominio, y
 * congelarla en el build daria el sitio de un centro a todos los demas.
 */
export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Server },
  { path: 'cursos', renderMode: RenderMode.Server },
  { path: 'cursos/:slug', renderMode: RenderMode.Server },
  { path: 'p/:slug', renderMode: RenderMode.Server },

  { path: 'registro', renderMode: RenderMode.Server },
  { path: 'ingresar', renderMode: RenderMode.Client },
  { path: 'validar', renderMode: RenderMode.Client },
  { path: 'validar/:codigo', renderMode: RenderMode.Client },
  { path: 'consola/**', renderMode: RenderMode.Client },
  { path: 'aula/**', renderMode: RenderMode.Client },

  { path: '**', renderMode: RenderMode.Client },
];
