import { Routes } from '@angular/router';
import { invitadoGuard, rolGuard, sesionGuard } from './core/auth/auth.guards';

/**
 * Dos areas separadas por layout y por rol:
 *
 *   /consola  gestion del centro (admin, coordinador, docente)
 *   /aula     experiencia del alumno
 *
 * Todo se carga de forma diferida: el alumno nunca descarga el codigo de la
 * consola, y viceversa.
 */
export const routes: Routes = [
  {
    // El sitio publico del centro vive en la raiz: es lo que carga quien
    // escribe cursos.sucentro.com o llega desde Google. La aplicacion queda
    // en /consola y /aula.
    path: '',
    loadComponent: () =>
      import('./paginas/publico/sitio.layout').then((m) => m.SitioPublicoLayout),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./paginas/publico/portada.page').then((m) => m.PortadaPage),
      },
      {
        path: 'cursos',
        loadComponent: () =>
          import('./paginas/publico/catalogo.page').then((m) => m.CatalogoPublicoPage),
      },
      {
        path: 'cursos/:slug',
        loadComponent: () =>
          import('./paginas/publico/curso.page').then((m) => m.CursoPublicoPage),
      },
      {
        path: 'p/:slug',
        loadComponent: () =>
          import('./paginas/publico/pagina.page').then((m) => m.PaginaPublicaPage),
      },
    ],
  },
  {
    // Alta de un centro. Publica por necesidad: quien se registra todavia no
    // tiene cuenta.
    path: 'registro',
    loadComponent: () => import('./paginas/registro/registro.page').then((m) => m.RegistroPage),
  },
  {
    path: 'ingresar',
    canActivate: [invitadoGuard],
    loadComponent: () => import('./paginas/ingresar/ingresar.page').then((m) => m.IngresarPage),
  },
  {
    path: 'consola',
    canActivate: [sesionGuard, rolGuard('SUPERADMIN', 'ADMIN_CENTRO', 'COORDINADOR', 'DOCENTE')],
    loadComponent: () =>
      import('./layouts/consola/consola-layout').then((m) => m.ConsolaLayout),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./paginas/consola/inicio.page').then((m) => m.ConsolaInicioPage),
      },
      {
        path: 'cursos',
        loadComponent: () =>
          import('./paginas/consola/cursos.page').then((m) => m.ConsolaCursosPage),
      },
      {
        path: 'grupos',
        loadComponent: () =>
          import('./paginas/consola/grupos.page').then((m) => m.ConsolaGruposPage),
      },
      {
        path: 'videoconferencia',
        canActivate: [rolGuard('SUPERADMIN', 'ADMIN_CENTRO')],
        loadComponent: () =>
          import('./paginas/consola/videoconferencia.page').then(
            (m) => m.ConsolaVideoconferenciaPage,
          ),
      },
      {
        path: 'cobranza',
        canActivate: [rolGuard('SUPERADMIN', 'ADMIN_CENTRO', 'COORDINADOR')],
        loadComponent: () =>
          import('./paginas/consola/cobranza.page').then((m) => m.ConsolaCobranzaPage),
      },
      {
        path: 'alumnos',
        canActivate: [rolGuard('SUPERADMIN', 'ADMIN_CENTRO', 'COORDINADOR')],
        loadComponent: () =>
          import('./paginas/consola/alumnos.page').then((m) => m.ConsolaAlumnosPage),
      },
      {
        // El temario de un curso: modulos, clases y materiales.
        path: 'cursos/:cursoId/contenido',
        canActivate: [rolGuard('SUPERADMIN', 'ADMIN_CENTRO', 'COORDINADOR', 'DOCENTE')],
        loadComponent: () =>
          import('./paginas/consola/contenido.page').then((m) => m.ConsolaContenidoPage),
      },
      {
        path: 'examenes',
        canActivate: [rolGuard('SUPERADMIN', 'ADMIN_CENTRO', 'COORDINADOR', 'DOCENTE')],
        loadComponent: () =>
          import('./paginas/consola/examenes.page').then((m) => m.ConsolaExamenesPage),
      },
      {
        // Las llaves de la cuenta comercial: solo el administrador.
        path: 'cobros',
        canActivate: [rolGuard('SUPERADMIN', 'ADMIN_CENTRO')],
        loadComponent: () =>
          import('./paginas/consola/cobros.page').then((m) => m.ConsolaCobrosPage),
      },
      {
        // Quien esta matriculado en un grupo. Sin esta pantalla no habia forma
        // de meter a un alumno en un curso, y su aula quedaba vacia.
        path: 'grupos/:grupoId/matriculas',
        canActivate: [rolGuard('SUPERADMIN', 'ADMIN_CENTRO', 'COORDINADOR')],
        loadComponent: () =>
          import('./paginas/consola/matriculas.page').then((m) => m.ConsolaMatriculasPage),
      },
      {
        // Marca y dominio propio: la identidad del centro.
        path: 'centro',
        canActivate: [rolGuard('SUPERADMIN', 'ADMIN_CENTRO')],
        loadComponent: () =>
          import('./paginas/consola/centro.page').then((m) => m.ConsolaCentroPage),
      },
      {
        // Las cuentas del equipo: solo el administrador. Un coordinador que
        // pudiera crearlas podria nombrarse administrador a si mismo.
        path: 'equipo',
        canActivate: [rolGuard('SUPERADMIN', 'ADMIN_CENTRO')],
        loadComponent: () =>
          import('./paginas/consola/equipo.page').then((m) => m.ConsolaEquipoPage),
      },
      {
        path: 'reportes',
        canActivate: [rolGuard('SUPERADMIN', 'ADMIN_CENTRO', 'COORDINADOR')],
        loadComponent: () =>
          import('./paginas/consola/reportes.page').then((m) => m.ConsolaReportesPage),
      },
      {
        // Plan y consumo. Es tambien donde aterriza un 402: si el acceso esta
        // cortado, el administrador tiene que caer donde se arregla.
        path: 'plan',
        canActivate: [rolGuard('SUPERADMIN', 'ADMIN_CENTRO')],
        loadComponent: () =>
          import('./paginas/consola/plan.page').then((m) => m.ConsolaPlanPage),
      },
      {
        // Los avisos los edita quien responde por lo que dice el centro.
        path: 'avisos',
        canActivate: [rolGuard('SUPERADMIN', 'ADMIN_CENTRO')],
        loadComponent: () =>
          import('./paginas/consola/avisos.page').then((m) => m.ConsolaAvisosPage),
      },
    ],
  },
  {
    // El aula solo exige sesion: un coordinador tambien necesita poder verla
    // tal como la ve el alumno.
    path: 'aula',
    canActivate: [sesionGuard],
    loadComponent: () => import('./layouts/aula/aula-layout').then((m) => m.AulaLayout),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./paginas/aula/mis-cursos.page').then((m) => m.AulaMisCursosPage),
      },
      {
        // El grupoId llega al componente como input gracias a withComponentInputBinding().
        path: 'cursos/:grupoId',
        loadComponent: () => import('./paginas/aula/curso.page').then((m) => m.AulaCursoPage),
      },
      {
        path: 'clases',
        loadComponent: () => import('./paginas/aula/agenda.page').then((m) => m.AulaAgendaPage),
      },
      {
        path: 'examenes/:examenId',
        loadComponent: () =>
          import('./paginas/aula/examen.page').then((m) => m.AulaExamenPage),
      },
      {
        path: 'pagos',
        loadComponent: () =>
          import('./paginas/aula/mis-pagos.page').then((m) => m.AulaMisPagosPage),
      },
      {
        // Cierre del pago con tarjeta. Aterriza aqui el navegador al volver de
        // Niubiz, y desde aqui se vuelve al estado de cuenta ya actualizado.
        path: 'pagos/resultado',
        loadComponent: () =>
          import('./paginas/aula/resultado-pago.page').then((m) => m.ResultadoPagoPage),
      },
      {
        path: 'certificados',
        loadComponent: () =>
          import('./paginas/aula/certificados.page').then((m) => m.AulaCertificadosPage),
      },
    ],
  },
  {
    // Verificacion publica de certificados. Es la direccion que lleva el QR
    // impreso: sin sesion, sin centro y sin nada que iniciar.
    path: 'validar',
    loadComponent: () =>
      import('./paginas/publico/validar.page').then((m) => m.ValidarCertificadoPage),
  },
  {
    path: 'validar/:codigo',
    loadComponent: () =>
      import('./paginas/publico/validar.page').then((m) => m.ValidarCertificadoPage),
  },
  {
    path: '**',
    loadComponent: () => import('./paginas/no-encontrado.page').then((m) => m.NoEncontradoPage),
  },
];
