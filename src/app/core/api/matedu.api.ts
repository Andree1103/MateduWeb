import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { URL_BASE_API } from './url-base.token';
import {
  AlumnoResumen,
  ContenidoCurso,
  CursoDelAlumno,
  CursoResumen,
  EnlaceArchivo,
  EstadoGrupo,
  GrupoResumen,
  DeudaAlumno,
  MetodoPago,
  OrdenDetalle,
  Pagina,
  PagoDetalle,
  BoletinConVeredicto,
  CertificadoResumen,
  EstadoAsistencia,
  FilaDeLista,
  IntentoEnCurso,
  MiExamen,
  Reproduccion,
  ResultadoIntento,
  ResumenCobranza,
  AccesoAClase,
  ClaseDetalle,
  ConexionVideoconferencia,
  CursoPublico,
  PaginaPublicaVista,
  SesionClase,
  SitioPublico,
  VerificacionCertificado,
  AvisoEnviado,
  ExportacionResumen,
  FiltrosReporte,
  PlantillaAviso,
  ReporteDisponible,
  TipoAviso,
  TipoReporte,
  VistaPreviaReporte,
  AltaRealizada,
  ConsumoDelCentro,
  DatosDeAlta,
  DisponibilidadSubdominio,
  NombrePlan,
  PlanPublico,
  SuscripcionVista,
  ArchivoSubido,
  CredencialPasarela,
  CrearExamen,
  CrearPregunta,
  DatosCredencial,
  ExamenResumen,
  FichaPasarela,
  LeccionDetalle,
  MaterialDetalle,
  ModuloDetalle,
  NombreProveedor,
  PreguntaDetalle,
  PruebaDeConexion,
  TipoLeccion,
  SesionDePagoNiubiz,
  MiembroEquipo,
  NombreRol,
  NuevoMiembro,
  RolDisponible,
  DominioDelCentro,
  EstadoMatricula,
  MarcaCentroVista,
  MatriculaEnGrupo,
} from './api.models';

/**
 * Acceso a la API de MATEDU.
 *
 * Ninguna llamada envia el centro: el token y el dominio ya lo determinan, y el
 * backend filtra por su cuenta. Si una pantalla tuviera que indicar el centro,
 * seria senal de que el aislamiento esta mal hecho.
 */
@Injectable({ providedIn: 'root' })
export class MateduApi {
  private readonly http = inject(HttpClient);

  /**
   * Vacio en el navegador, absoluto en el servidor: es lo que permite que el
   * renderizado del servidor pueda llamar a la API.
   */
  private readonly base = inject(URL_BASE_API) + environment.apiUrl;

  cursos(buscar?: string, pagina = 0, tamano = 20): Observable<Pagina<CursoResumen>> {
    let parametros = new HttpParams().set('page', pagina).set('size', tamano);
    if (buscar?.trim()) {
      parametros = parametros.set('buscar', buscar.trim());
    }
    return this.http.get<Pagina<CursoResumen>>(`${this.base}/cursos`, { params: parametros });
  }

  gruposDeCurso(cursoId: string): Observable<GrupoResumen[]> {
    return this.http.get<GrupoResumen[]>(`${this.base}/cursos/${cursoId}/grupos`);
  }

  grupos(estado?: EstadoGrupo, pagina = 0, tamano = 20): Observable<Pagina<GrupoResumen>> {
    let parametros = new HttpParams().set('page', pagina).set('size', tamano);
    if (estado) {
      parametros = parametros.set('estado', estado);
    }
    return this.http.get<Pagina<GrupoResumen>>(`${this.base}/grupos`, { params: parametros });
  }

  gruposAbiertos(): Observable<Pagina<GrupoResumen>> {
    return this.http.get<Pagina<GrupoResumen>>(`${this.base}/grupos/abiertos`);
  }

  alumnos(pagina = 0, tamano = 50): Observable<Pagina<AlumnoResumen>> {
    const parametros = new HttpParams().set('page', pagina).set('size', tamano);
    return this.http.get<Pagina<AlumnoResumen>>(`${this.base}/alumnos`, { params: parametros });
  }

  // ------------------------------------------------------------ aula virtual

  /** Cursos en los que el alumno esta matriculado, con su avance. */
  misCursos(): Observable<CursoDelAlumno[]> {
    return this.http.get<CursoDelAlumno[]>(`${this.base}/aula/cursos`);
  }

  contenidoDelCurso(grupoId: string): Observable<ContenidoCurso> {
    return this.http.get<ContenidoCurso>(`${this.base}/aula/grupos/${grupoId}/contenido`);
  }

  /**
   * Pide autorizacion para reproducir una leccion.
   *
   * Es POST y no GET a proposito: emite un enlace firmado nuevo, con lo cual
   * no es una lectura y no debe quedar cacheada por el navegador.
   */
  autorizarReproduccion(leccionId: string): Observable<Reproduccion> {
    return this.http.post<Reproduccion>(
      `${this.base}/aula/lecciones/${leccionId}/reproduccion`,
      {},
    );
  }

  registrarAvance(leccionId: string, segundosVistos: number, completada: boolean): Observable<void> {
    return this.http.post<void>(`${this.base}/aula/lecciones/${leccionId}/avance`, {
      segundosVistos: Math.floor(segundosVistos),
      completada,
    });
  }

  enlaceDeMaterial(recursoId: string): Observable<EnlaceArchivo> {
    return this.http.get<EnlaceArchivo>(`${this.base}/aula/materiales/${recursoId}/enlace`);
  }

  // ------------------------------------------------------------------ pagos

  /**
   * Estado de cuenta del alumno con la sesion abierta.
   *
   * No recibe id: el id de usuario y el de alumno son distintos, y resolverlo
   * en el backend evita ese error.
   */
  misOrdenes(): Observable<OrdenDetalle[]> {
    return this.http.get<OrdenDetalle[]>(`${this.base}/mis-ordenes`);
  }

  /** Estado de cuenta de un alumno concreto. Para el personal del centro. */
  ordenesDeAlumno(alumnoId: string): Observable<OrdenDetalle[]> {
    return this.http.get<OrdenDetalle[]>(`${this.base}/alumnos/${alumnoId}/ordenes`);
  }

  orden(ordenId: string): Observable<OrdenDetalle> {
    return this.http.get<OrdenDetalle>(`${this.base}/ordenes/${ordenId}`);
  }

  pagosDeOrden(ordenId: string): Observable<PagoDetalle[]> {
    return this.http.get<PagoDetalle[]>(`${this.base}/ordenes/${ordenId}/pagos`);
  }

  /**
   * Registra un pago. No cobra: queda pendiente hasta que el centro confirma
   * la constancia.
   */
  registrarPago(datos: {
    ordenId: string;
    metodo: MetodoPago;
    monto: number;
    cuotaId?: string | null;
    numeroOperacion?: string | null;
    constanciaArchivoId?: string | null;
  }): Observable<PagoDetalle> {
    return this.http.post<PagoDetalle>(`${this.base}/pagos`, datos);
  }

  confirmarPago(pagoId: string): Observable<PagoDetalle> {
    return this.http.post<PagoDetalle>(`${this.base}/pagos/${pagoId}/confirmacion`, {});
  }

  rechazarPago(pagoId: string, motivo: string): Observable<PagoDetalle> {
    return this.http.post<PagoDetalle>(`${this.base}/pagos/${pagoId}/rechazo`, { motivo });
  }

  pagosPorConfirmar(): Observable<PagoDetalle[]> {
    return this.http.get<PagoDetalle[]>(`${this.base}/pagos/por-confirmar`);
  }

  // --------------------------------------------------------------- cobranza

  resumenCobranza(): Observable<ResumenCobranza> {
    return this.http.get<ResumenCobranza>(`${this.base}/cobranza/resumen`);
  }

  morosidad(): Observable<DeudaAlumno[]> {
    return this.http.get<DeudaAlumno[]>(`${this.base}/cobranza/morosidad`);
  }

  // ------------------------------------------------------------- examenes

  examenesDelCurso(cursoId: string): Observable<MiExamen[]> {
    return this.http.get<MiExamen[]>(`${this.base}/examenes/curso/${cursoId}/mios`);
  }

  /** Abre el examen, o retoma el intento que quedo en curso. */
  iniciarExamen(examenId: string): Observable<IntentoEnCurso> {
    return this.http.post<IntentoEnCurso>(`${this.base}/examenes/${examenId}/intentos`, {});
  }

  verIntento(intentoId: string): Observable<IntentoEnCurso> {
    return this.http.get<IntentoEnCurso>(`${this.base}/examenes/intentos/${intentoId}`);
  }

  /**
   * Autoguardado de una respuesta.
   *
   * Se llama en cada cambio. Devuelve 204 sin cuerpo: no hay nada que esperar.
   */
  guardarRespuesta(
    intentoId: string,
    preguntaId: string,
    opciones: string[],
    texto: string | null,
  ): Observable<void> {
    return this.http.post<void>(`${this.base}/examenes/intentos/${intentoId}/respuestas`, {
      preguntaId,
      opciones,
      texto,
    });
  }

  entregarExamen(intentoId: string): Observable<ResultadoIntento> {
    return this.http.post<ResultadoIntento>(
      `${this.base}/examenes/intentos/${intentoId}/entrega`,
      {},
    );
  }

  // ------------------------------------------------------------ asistencia

  sesionesDeGrupo(grupoId: string): Observable<ClaseDetalle[]> {
    return this.http.get<ClaseDetalle[]>(`${this.base}/clases/grupo/${grupoId}`);
  }

  listaDeSesion(sesionId: string): Observable<FilaDeLista[]> {
    return this.http.get<FilaDeLista[]>(`${this.base}/asistencia/sesiones/${sesionId}/lista`);
  }

  marcarAsistencia(
    sesionId: string,
    matriculaId: string,
    estado: EstadoAsistencia,
  ): Observable<unknown> {
    return this.http.post(`${this.base}/asistencia/sesiones/${sesionId}/marcar`, {
      matriculaId,
      estado,
    });
  }

  // ---------------------------------------------------------- certificados

  misCertificados(): Observable<CertificadoResumen[]> {
    return this.http.get<CertificadoResumen[]>(`${this.base}/certificados/mios`);
  }

  boletin(matriculaId: string): Observable<BoletinConVeredicto> {
    return this.http.get<BoletinConVeredicto>(
      `${this.base}/certificados/matricula/${matriculaId}/boletin`,
    );
  }

  emitirCertificado(matriculaId: string): Observable<CertificadoResumen> {
    return this.http.post<CertificadoResumen>(
      `${this.base}/certificados/matricula/${matriculaId}`,
      {},
    );
  }

  urlPdfCertificado(certificadoId: string): string {
    return `${this.base}/certificados/${certificadoId}/pdf`;
  }

  /**
   * Verificacion publica de un codigo.
   *
   * No lleva sesion: quien la usa suele ser un empleador con el certificado
   * impreso en la mano.
   */
  verificarCertificado(codigo: string): Observable<VerificacionCertificado> {
    return this.http.get<VerificacionCertificado>(
      `${this.base}/publico/certificados/${encodeURIComponent(codigo)}`,
    );
  }

  // ------------------------------------------------------ videoconferencia

  /** Clases de todos los grupos del alumno con la sesion abierta. */
  miAgenda(): Observable<ClaseDetalle[]> {
    return this.http.get<ClaseDetalle[]>(`${this.base}/clases/mi-agenda`);
  }

  agendaDeGrupo(grupoId: string): Observable<ClaseDetalle[]> {
    return this.http.get<ClaseDetalle[]>(`${this.base}/clases/grupo/${grupoId}`);
  }

  /**
   * Entra a la clase.
   *
   * Es POST porque autoriza el acceso a una reunion en curso: no es una lectura
   * y no debe quedar en el historial ni en cache.
   */
  entrarAClase(sesionId: string): Observable<AccesoAClase> {
    return this.http.post<AccesoAClase>(`${this.base}/clases/${sesionId}/entrar`, {});
  }

  programarClase(datos: {
    grupoId: string;
    titulo: string;
    fecha: string;
    horaInicio?: string | null;
    horaFin?: string | null;
    proveedor: string;
    enlaceManual?: string | null;
  }): Observable<ClaseDetalle> {
    return this.http.post<ClaseDetalle>(`${this.base}/clases`, datos);
  }

  conexionesVideoconferencia(): Observable<ConexionVideoconferencia[]> {
    return this.http.get<ConexionVideoconferencia[]>(`${this.base}/videoconferencia/conexiones`);
  }

  // -------------------------------------------------------- sitio publico

  /**
   * Marca, contacto y menu del centro.
   *
   * Sin sesion: el centro lo resuelve el dominio desde el que se pide.
   */
  sitioPublico(): Observable<SitioPublico> {
    return this.http.get<SitioPublico>(`${this.base}/publico/sitio`);
  }

  catalogoPublico(): Observable<CursoPublico[]> {
    return this.http.get<CursoPublico[]>(`${this.base}/publico/catalogo`);
  }

  cursoPublico(slug: string): Observable<CursoPublico> {
    return this.http.get<CursoPublico>(
      `${this.base}/publico/catalogo/${encodeURIComponent(slug)}`,
    );
  }

  paginaPublica(slug: string): Observable<PaginaPublicaVista> {
    return this.http.get<PaginaPublicaVista>(
      `${this.base}/publico/paginas/${encodeURIComponent(slug)}`,
    );
  }

  // --------------------------------------------- avisos automaticos (fase 7)

  plantillasDeAviso(): Observable<PlantillaAviso[]> {
    return this.http.get<PlantillaAviso[]>(`${this.base}/notificaciones/plantillas`);
  }

  guardarPlantillaDeAviso(
    tipo: TipoAviso,
    datos: { asunto: string; cuerpo: string; activa: boolean },
  ): Observable<PlantillaAviso> {
    return this.http.put<PlantillaAviso>(
      `${this.base}/notificaciones/plantillas/${tipo}`,
      datos,
    );
  }

  /** Devuelve el aviso al texto de fabrica. */
  restablecerPlantillaDeAviso(tipo: TipoAviso): Observable<PlantillaAviso> {
    return this.http.delete<PlantillaAviso>(`${this.base}/notificaciones/plantillas/${tipo}`);
  }

  /**
   * Como quedaria el aviso con datos de ejemplo.
   *
   * Se manda el texto que hay en el formulario, no el guardado: la idea es ver
   * el cambio ANTES de guardarlo.
   */
  vistaPreviaDeAviso(
    tipo: TipoAviso,
    datos: { asunto: string; cuerpo: string; activa: boolean },
  ): Observable<PlantillaAviso> {
    return this.http.post<PlantillaAviso>(
      `${this.base}/notificaciones/plantillas/${tipo}/vista-previa`,
      datos,
    );
  }

  avisosEnviados(cuantos = 50): Observable<AvisoEnviado[]> {
    return this.http.get<AvisoEnviado[]>(`${this.base}/notificaciones`, {
      params: new HttpParams().set('cuantas', cuantos),
    });
  }

  // ------------------------------------------------------ reportes (fase 7)

  reportesDisponibles(): Observable<ReporteDisponible[]> {
    return this.http.get<ReporteDisponible[]>(`${this.base}/reportes`);
  }

  vistaPreviaDeReporte(
    tipo: TipoReporte,
    filtros: FiltrosReporte = {},
  ): Observable<VistaPreviaReporte> {
    return this.http.get<VistaPreviaReporte>(`${this.base}/reportes/${tipo}`, {
      params: this.filtros(filtros),
    });
  }

  /** Encarga el Excel. Contesta 202 y el archivo llega despues. */
  exportarReporte(tipo: TipoReporte, filtros: FiltrosReporte = {}): Observable<ExportacionResumen> {
    return this.http.post<ExportacionResumen>(
      `${this.base}/reportes/${tipo}/exportar`,
      null,
      { params: this.filtros(filtros) },
    );
  }

  exportaciones(): Observable<ExportacionResumen[]> {
    return this.http.get<ExportacionResumen[]>(`${this.base}/exportaciones`);
  }

  exportacion(id: string): Observable<ExportacionResumen> {
    return this.http.get<ExportacionResumen>(`${this.base}/exportaciones/${id}`);
  }

  /**
   * Descarga el Excel como blob y no por un enlace directo.
   *
   * La ruta exige la cabecera de autorizacion, y un <a href> no puede
   * mandarla: abrirla en una pestaña nueva daria un 401.
   */
  descargarExportacion(id: string): Observable<Blob> {
    return this.http.get(`${this.base}/exportaciones/${id}/descargar`, {
      responseType: 'blob',
    });
  }

  // ------------------------------------------ planes y alta (fase 8)

  planesPublicos(): Observable<PlanPublico[]> {
    return this.http.get<PlanPublico[]>(`${this.base}/registro/planes`);
  }

  disponibilidadDeSubdominio(subdominio: string): Observable<DisponibilidadSubdominio> {
    return this.http.get<DisponibilidadSubdominio>(`${this.base}/registro/disponibilidad`, {
      params: new HttpParams().set('subdominio', subdominio),
    });
  }

  sugerirSubdominio(nombre: string): Observable<{ subdominio: string }> {
    return this.http.get<{ subdominio: string }>(`${this.base}/registro/sugerencia`, {
      params: new HttpParams().set('nombre', nombre),
    });
  }

  /** Alta de un centro. Es la unica llamada que funciona sin sesion iniciada. */
  registrarCentro(datos: DatosDeAlta): Observable<AltaRealizada> {
    return this.http.post<AltaRealizada>(`${this.base}/registro`, datos);
  }

  miSuscripcion(): Observable<SuscripcionVista> {
    return this.http.get<SuscripcionVista>(`${this.base}/suscripcion`);
  }

  consumoDelCentro(): Observable<ConsumoDelCentro> {
    return this.http.get<ConsumoDelCentro>(`${this.base}/suscripcion/consumo`);
  }

  cambiarPlan(plan: NombrePlan, periodo: 'MENSUAL' | 'ANUAL' = 'MENSUAL'): Observable<SuscripcionVista> {
    return this.http.post<SuscripcionVista>(`${this.base}/suscripcion/plan`, null, {
      params: new HttpParams().set('plan', plan).set('periodo', periodo),
    });
  }

  // ------------------------------------------ marca y dominio del centro

  marcaDelCentro(): Observable<MarcaCentroVista> {
    return this.http.get<MarcaCentroVista>(`${this.base}/marca`);
  }

  guardarMarca(datos: Partial<MarcaCentroVista>): Observable<MarcaCentroVista> {
    return this.http.put<MarcaCentroVista>(`${this.base}/marca`, datos);
  }

  dominiosDelCentro(): Observable<DominioDelCentro[]> {
    return this.http.get<DominioDelCentro[]>(`${this.base}/dominios`);
  }

  /** Declara el dominio y devuelve el registro TXT que hay que publicar. */
  declararDominio(dominio: string): Observable<DominioDelCentro> {
    return this.http.post<DominioDelCentro>(`${this.base}/dominios`, { dominio });
  }

  verificarDominio(id: string): Observable<DominioDelCentro> {
    return this.http.post<DominioDelCentro>(`${this.base}/dominios/${id}/verificacion`, null);
  }

  activarDominio(id: string): Observable<DominioDelCentro> {
    return this.http.post<DominioDelCentro>(`${this.base}/dominios/${id}/activacion`, null);
  }

  retirarDominio(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/dominios/${id}`);
  }

  // ------------------------------------------------------ matriculas

  matriculasDeGrupo(grupoId: string): Observable<Pagina<MatriculaEnGrupo>> {
    return this.http.get<Pagina<MatriculaEnGrupo>>(`${this.base}/matriculas/grupo/${grupoId}`);
  }

  matricular(grupoId: string, alumnoId: string, montoAcordado?: number | null) {
    return this.http.post<MatriculaEnGrupo>(`${this.base}/matriculas`, {
      grupoId,
      alumnoId,
      montoAcordado: montoAcordado ?? null,
    });
  }

  cambiarEstadoDeMatricula(
    id: string,
    estado: EstadoMatricula,
    motivo?: string,
  ): Observable<MatriculaEnGrupo> {
    let params = new HttpParams().set('estado', estado);
    if (motivo) {
      params = params.set('motivo', motivo);
    }
    return this.http.patch<MatriculaEnGrupo>(`${this.base}/matriculas/${id}/estado`, null, {
      params,
    });
  }

  // ------------------------------------------- equipo del centro

  equipoDelCentro(): Observable<MiembroEquipo[]> {
    return this.http.get<MiembroEquipo[]>(`${this.base}/equipo`);
  }

  rolesDelEquipo(): Observable<RolDisponible[]> {
    return this.http.get<RolDisponible[]>(`${this.base}/equipo/roles`);
  }

  crearMiembro(datos: NuevoMiembro): Observable<MiembroEquipo> {
    return this.http.post<MiembroEquipo>(`${this.base}/equipo`, datos);
  }

  cambiarRolDeMiembro(id: string, rol: NombreRol): Observable<MiembroEquipo> {
    return this.http.patch<MiembroEquipo>(`${this.base}/equipo/${id}/rol`, { rol });
  }

  cambiarEstadoDeMiembro(id: string, activo: boolean): Observable<MiembroEquipo> {
    return this.http.patch<MiembroEquipo>(`${this.base}/equipo/${id}/estado`, { activo });
  }

  /** La escribe el administrador y se la entrega a la persona. */
  cambiarPasswordDeMiembro(id: string, password: string): Observable<void> {
    return this.http.post<void>(`${this.base}/equipo/${id}/password`, { password });
  }

  // --------------------------------------- boton de pago de Niubiz

  /**
   * Prepara el cobro con tarjeta y devuelve lo que necesita el boton.
   *
   * Cada sesion es de un solo uso y queda atada al importe, asi que se pide
   * cuando el alumno decide pagar, no antes.
   */
  sesionDePagoNiubiz(datos: {
    ordenId: string;
    monto: number;
    cuotaId?: string | null;
  }): Observable<SesionDePagoNiubiz> {
    return this.http.post<SesionDePagoNiubiz>(`${this.base}/pagos/niubiz/sesion`, datos);
  }

  // ------------------------------------------- contenido del curso

  temarioDelCurso(cursoId: string): Observable<ModuloDetalle[]> {
    return this.http.get<ModuloDetalle[]>(`${this.base}/contenido/cursos/${cursoId}/temario`);
  }

  materialesDelCurso(cursoId: string): Observable<MaterialDetalle[]> {
    return this.http.get<MaterialDetalle[]>(
      `${this.base}/contenido/cursos/${cursoId}/materiales`,
    );
  }

  crearModulo(cursoId: string, datos: { titulo: string; descripcion?: string | null }) {
    return this.http.post(`${this.base}/contenido/cursos/${cursoId}/modulos`, datos);
  }

  eliminarModulo(moduloId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/contenido/modulos/${moduloId}`);
  }

  crearLeccion(
    moduloId: string,
    datos: { titulo: string; tipo: TipoLeccion; duracionMin?: number | null },
  ): Observable<LeccionDetalle> {
    return this.http.post<LeccionDetalle>(
      `${this.base}/contenido/modulos/${moduloId}/lecciones`,
      datos,
    );
  }

  actualizarLeccion(
    leccionId: string,
    datos: {
      titulo: string;
      tipo: TipoLeccion;
      duracionMin?: number | null;
      contenido?: string | null;
      recursoUrl?: string | null;
      publicado?: boolean | null;
      descargable?: boolean | null;
    },
  ): Observable<LeccionDetalle> {
    return this.http.put<LeccionDetalle>(`${this.base}/contenido/lecciones/${leccionId}`, datos);
  }

  asignarArchivoALeccion(leccionId: string, archivoId: string): Observable<LeccionDetalle> {
    return this.http.post<LeccionDetalle>(
      `${this.base}/contenido/lecciones/${leccionId}/archivo`,
      { archivoId },
    );
  }

  eliminarLeccion(leccionId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/contenido/lecciones/${leccionId}`);
  }

  agregarMaterial(
    cursoId: string,
    datos: { archivoId: string; titulo: string; leccionId?: string | null; descargable: boolean },
  ) {
    return this.http.post(`${this.base}/contenido/cursos/${cursoId}/materiales`, datos);
  }

  eliminarMaterial(recursoId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/contenido/materiales/${recursoId}`);
  }

  /**
   * Sube el archivo y devuelve su ficha.
   *
   * Va primero y por separado: el endpoint de subida es el que controla el
   * tamano y descuenta la cuota del plan. Recien despues se enlaza a la clase.
   */
  subirArchivo(archivo: File): Observable<ArchivoSubido> {
    const cuerpo = new FormData();
    cuerpo.append('archivo', archivo);
    return this.http.post<ArchivoSubido>(`${this.base}/archivos`, cuerpo);
  }

  // ------------------------------------------------- pasarelas de cobro

  catalogoDePasarelas(): Observable<FichaPasarela[]> {
    return this.http.get<FichaPasarela[]>(`${this.base}/pasarelas/catalogo`);
  }

  credencialesDePasarela(): Observable<CredencialPasarela[]> {
    return this.http.get<CredencialPasarela[]>(`${this.base}/pasarelas`);
  }

  guardarCredencial(datos: DatosCredencial): Observable<CredencialPasarela> {
    return this.http.post<CredencialPasarela>(`${this.base}/pasarelas`, datos);
  }

  /** Comprueba las credenciales contra el proveedor, sin cobrar nada. */
  probarPasarela(proveedor: NombreProveedor): Observable<PruebaDeConexion> {
    return this.http.post<PruebaDeConexion>(`${this.base}/pasarelas/${proveedor}/prueba`, null);
  }

  desactivarPasarela(proveedor: NombreProveedor): Observable<void> {
    return this.http.delete<void>(`${this.base}/pasarelas/${proveedor}`);
  }

  // ------------------------------------------- preguntas y examenes

  preguntasDeCurso(cursoId: string): Observable<PreguntaDetalle[]> {
    return this.http.get<PreguntaDetalle[]>(`${this.base}/preguntas/curso/${cursoId}`);
  }

  crearPregunta(datos: CrearPregunta): Observable<PreguntaDetalle> {
    return this.http.post<PreguntaDetalle>(`${this.base}/preguntas`, datos);
  }

  desactivarPregunta(preguntaId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/preguntas/${preguntaId}`);
  }

  examenesDeCurso(cursoId: string): Observable<ExamenResumen[]> {
    return this.http.get<ExamenResumen[]>(`${this.base}/examenes/curso/${cursoId}`);
  }

  crearExamen(datos: CrearExamen): Observable<ExamenResumen> {
    return this.http.post<ExamenResumen>(`${this.base}/examenes`, datos);
  }

  agregarPreguntaAExamen(examenId: string, preguntaId: string): Observable<ExamenResumen> {
    return this.http.post<ExamenResumen>(
      `${this.base}/examenes/${examenId}/preguntas/${preguntaId}`,
      null,
    );
  }

  /** Las preguntas de un examen, en su orden, con las respuestas correctas. */
  preguntasDelExamen(examenId: string): Observable<PreguntaDetalle[]> {
    return this.http.get<PreguntaDetalle[]>(`${this.base}/examenes/${examenId}/preguntas`);
  }

  /**
   * Escribe la pregunta y la deja dentro del examen, en una sola llamada.
   *
   * El curso lo pone el examen en el servidor, asi que no viaja desde aqui.
   */
  crearPreguntaEnExamen(
    examenId: string,
    datos: Omit<CrearPregunta, 'cursoId'>,
  ): Observable<PreguntaDetalle> {
    return this.http.post<PreguntaDetalle>(`${this.base}/examenes/${examenId}/preguntas`, datos);
  }

  quitarPreguntaDeExamen(examenId: string, preguntaId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/examenes/${examenId}/preguntas/${preguntaId}`);
  }

  publicarExamen(examenId: string, publicado: boolean): Observable<ExamenResumen> {
    return this.http.patch<ExamenResumen>(
      `${this.base}/examenes/${examenId}/publicacion`,
      null,
      { params: new HttpParams().set('publicado', publicado) },
    );
  }

  private filtros(filtros: FiltrosReporte): HttpParams {
    let params = new HttpParams();
    for (const [clave, valor] of Object.entries(filtros)) {
      if (valor) {
        params = params.set(clave, valor);
      }
    }
    return params;
  }

  conectarVideoconferencia(datos: {
    proveedor: string;
    modo: string;
    cuentaExterna?: string | null;
    clientId?: string | null;
    clientSecret?: string | null;
    refreshToken?: string | null;
    organizador?: string | null;
  }): Observable<ConexionVideoconferencia> {
    return this.http.post<ConexionVideoconferencia>(
      `${this.base}/videoconferencia/conexiones`,
      datos,
    );
  }
}
