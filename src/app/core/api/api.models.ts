/** Espejo de los DTOs que expone la API. */

export type Modalidad = 'PRESENCIAL' | 'EN_VIVO' | 'ASINCRONO' | 'MIXTO';

export type EstadoGrupo =
  | 'PLANIFICADO'
  | 'MATRICULA_ABIERTA'
  | 'EN_CURSO'
  | 'FINALIZADO'
  | 'CANCELADO';

export interface CursoResumen {
  id: string;
  codigo: string;
  nombre: string;
  slug: string;
  horasAcademicas: number;
  precioBase: number;
  moneda: string;
  publicado: boolean;
}

export interface GrupoResumen {
  id: string;
  cursoId: string;
  codigo: string;
  modalidad: Modalidad;
  estado: EstadoGrupo;
  fechaInicio: string;
  fechaFin: string;
  horario: string | null;
  docenteId: string | null;
  cupoMaximo: number;
  cuposOcupados: number;
  vacantes: number;
  precio: number;
  moneda: string;
}

export interface AlumnoResumen {
  id: string;
  nombres: string;
  apellidos: string;
  nombreCompleto: string;
  numeroDocumento: string | null;
  email: string | null;
  telefono: string | null;
  empresa: string | null;
  activo: boolean;
}

/** Respuesta paginada de Spring Data. */
export interface Pagina<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export const ETIQUETA_MODALIDAD: Record<Modalidad, string> = {
  PRESENCIAL: 'Presencial',
  EN_VIVO: 'En vivo',
  ASINCRONO: 'Asincrono',
  MIXTO: 'Mixto',
};

export const ETIQUETA_ESTADO_GRUPO: Record<EstadoGrupo, string> = {
  PLANIFICADO: 'Planificado',
  MATRICULA_ABIERTA: 'Matricula abierta',
  EN_CURSO: 'En curso',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado',
};

// --------------------------------------------------------------- aula virtual

export type EstadoMatricula =
  | 'PREINSCRITO'
  | 'PAGADO'
  | 'ACTIVO'
  | 'APROBADO'
  | 'DESAPROBADO'
  | 'RETIRADO';

export type TipoLeccion = 'VIDEO' | 'DOCUMENTO' | 'ENLACE' | 'TEXTO' | 'TAREA' | 'EXAMEN';

/** Como debe montarse el reproductor. Lo decide el backend segun el proveedor. */
export type FormatoVideo = 'ARCHIVO' | 'IFRAME';

export interface CursoDelAlumno {
  matriculaId: string;
  grupoId: string;
  cursoId: string;
  curso: string;
  codigoGrupo: string;
  estado: EstadoMatricula;
  fechaInicio: string;
  fechaFin: string;
  horario: string | null;
  leccionesTotales: number;
  leccionesCompletadas: number;
  porcentajeAvance: number;
}

export interface MaterialDelCurso {
  id: string;
  titulo: string;
  nombreArchivo: string;
  tipoMime: string;
  tamanoBytes: number;
  descargable: boolean;
}

export interface LeccionDelAlumno {
  id: string;
  titulo: string;
  tipo: TipoLeccion;
  orden: number;
  duracionMin: number | null;
  tieneVideo: boolean;
  completada: boolean;
  segundosVistos: number;
  materiales: MaterialDelCurso[];
}

export interface ModuloConLecciones {
  id: string;
  titulo: string;
  descripcion: string | null;
  orden: number;
  lecciones: LeccionDelAlumno[];
}

export interface ContenidoCurso {
  grupoId: string;
  curso: string;
  codigoGrupo: string;
  porcentajeAvance: number;
  modulos: ModuloConLecciones[];
  materiales: MaterialDelCurso[];
}

/**
 * Autorizacion de reproduccion.
 *
 * La url vence en minutos: no se guarda ni se comparte, se pide una nueva cada
 * vez que el alumno abre la leccion.
 */
export interface Reproduccion {
  leccionId: string;
  url: string;
  formato: FormatoVideo;
  expiraEn: string;
}

export interface EnlaceArchivo {
  url: string;
  expiraEn: string;
}

/** Tamano legible: 1536 -> "1,5 KB". */
export function tamanoLegible(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const unidades = ['KB', 'MB', 'GB'];
  let valor = bytes / 1024;
  let unidad = 0;
  while (valor >= 1024 && unidad < unidades.length - 1) {
    valor /= 1024;
    unidad++;
  }
  return `${valor.toFixed(1).replace('.', ',')} ${unidades[unidad]}`;
}

// -------------------------------------------------------------------- pagos

export type EstadoOrden = 'PENDIENTE' | 'PARCIAL' | 'PAGADA' | 'ANULADA' | 'VENCIDA';
export type EstadoCuota = 'PENDIENTE' | 'PARCIAL' | 'PAGADA' | 'VENCIDA';
export type EstadoPago = 'PENDIENTE' | 'CONFIRMADO' | 'RECHAZADO' | 'ANULADO' | 'REEMBOLSADO';

export type MetodoPago =
  | 'EFECTIVO'
  | 'TRANSFERENCIA'
  | 'YAPE'
  | 'PLIN'
  | 'TARJETA_CREDITO'
  | 'TARJETA_DEBITO';

export interface CuotaDetalle {
  id: string;
  numero: number;
  monto: number;
  montoPagado: number;
  saldo: number;
  fechaVencimiento: string;
  estado: EstadoCuota;
}

export interface OrdenDetalle {
  id: string;
  numero: string;
  alumnoId: string;
  grupoId: string;
  subtotal: number;
  descuento: number;
  total: number;
  totalPagado: number;
  saldo: number;
  moneda: string;
  estado: EstadoOrden;
  venceEn: string | null;
  cuotas: CuotaDetalle[];
}

export interface PagoDetalle {
  id: string;
  ordenId: string;
  cuotaId: string | null;
  metodo: MetodoPago;
  monto: number;
  moneda: string;
  estado: EstadoPago;
  numeroOperacion: string | null;
  constanciaArchivoId: string | null;
  confirmadoEn: string | null;
  rechazadoMotivo: string | null;
  creadoEn: string;
}

export interface ResumenCobranza {
  fecha: string;
  cobradoHoy: number;
  pagosPorConfirmar: number;
  saldoPorCobrar: number;
  ordenesMorosas: number;
}

export interface DeudaAlumno {
  ordenId: string;
  numeroOrden: string;
  alumnoId: string;
  alumno: string;
  saldo: number;
  moneda: string;
  venceEn: string;
  diasDeAtraso: number;
}

export const ETIQUETA_METODO: Record<MetodoPago, string> = {
  EFECTIVO: 'Efectivo',
  TRANSFERENCIA: 'Transferencia',
  YAPE: 'Yape',
  PLIN: 'Plin',
  TARJETA_CREDITO: 'Tarjeta de credito',
  TARJETA_DEBITO: 'Tarjeta de debito',
};

/** Metodos que el alumno puede usar desde el aula subiendo su constancia. */
/**
 * Lo que el alumno puede elegir para pagar.
 *
 * La tarjeta va primero porque es el unico cobro inmediato: los demas quedan
 * pendientes hasta que alguien del centro revisa la constancia.
 */
export const METODOS_DEL_ALUMNO: MetodoPago[] = [
  'TARJETA_CREDITO',
  'YAPE',
  'PLIN',
  'TRANSFERENCIA',
];

/** Importe con su moneda: 450 -> "S/ 450.00". */
export function importe(monto: number, moneda = 'PEN'): string {
  const simbolo = moneda === 'PEN' ? 'S/' : moneda;
  return `${simbolo} ${monto.toFixed(2)}`;
}

// ------------------------------------------------------------- evaluacion

export type TipoPregunta =
  | 'OPCION_MULTIPLE'
  | 'OPCION_UNICA'
  | 'VERDADERO_FALSO'
  | 'RESPUESTA_CORTA';

export type EstadoIntento = 'EN_CURSO' | 'ENTREGADO' | 'CALIFICADO' | 'EXPIRADO' | 'ANULADO';

export type EstadoAsistencia = 'PRESENTE' | 'TARDE' | 'AUSENTE' | 'JUSTIFICADO';

export type EstadoCertificado = 'GENERANDO' | 'EMITIDO' | 'ANULADO' | 'ERROR';

export interface OpcionParaRendir {
  id: string;
  texto: string;
}

/** Lo que el alumno ve al rendir. Nunca dice cual opcion es la correcta. */
export interface PreguntaParaRendir {
  id: string;
  enunciado: string;
  tipo: TipoPregunta;
  puntaje: number;
  opciones: OpcionParaRendir[];
  opcionesElegidas: string[];
  textoRespondido: string | null;
}

export interface IntentoEnCurso {
  intentoId: string;
  examenId: string;
  titulo: string;
  numero: number;
  intentosPermitidos: number;
  estado: EstadoIntento;
  expiraEn: string | null;
  segundosRestantes: number;
  preguntas: PreguntaParaRendir[];
}

export interface ResultadoIntento {
  intentoId: string;
  estado: EstadoIntento;
  puntaje: number | null;
  puntajeMaximo: number | null;
  nota: number | null;
  entregadoEn: string | null;
  mostrarResultado: boolean;
}

export interface MiExamen {
  examenId: string;
  titulo: string;
  minutosLimite: number | null;
  intentosPermitidos: number;
  intentosUsados: number;
  mejorNota: number | null;
  tieneIntentoEnCurso: boolean;
  disponible: boolean;
}

export interface SesionClase {
  id: string;
  grupoId: string;
  titulo: string;
  fecha: string;
  cuentaAsistencia: boolean;
  codigoAsistencia: string | null;
}

export interface FilaDeLista {
  matriculaId: string;
  alumnoId: string;
  estado: EstadoAsistencia;
  metodo: string | null;
}

export interface Boletin {
  matriculaId: string;
  cursoId: string;
  notaFinal: number;
  notaExamenes: number;
  notaTareas: number;
  porcentajeAsistencia: number;
  sesionesAsistidas: number;
  sesionesTotales: number;
  notaMinima: number;
  asistenciaMinima: number;
  examenesCalificados: number;
  tareasCalificadas: number;
}

export interface CertificadoResumen {
  id: string;
  codigo: string;
  alumno: string;
  curso: string;
  centro: string;
  horasAcademicas: number;
  notaFinal: number | null;
  porcentajeAsistencia: number | null;
  estado: EstadoCertificado;
  pdfListo: boolean;
  emitidoEn: string | null;
  errorMensaje: string | null;
}

export interface BoletinConVeredicto {
  boletin: Boletin;
  aprobado: boolean;
  cumpleNota: boolean;
  cumpleAsistencia: boolean;
  motivo: string | null;
  certificado: CertificadoResumen | null;
}

/** Respuesta de la pagina publica de validacion. */
export interface VerificacionCertificado {
  valido: boolean;
  estado: EstadoCertificado;
  codigo: string;
  alumno: string;
  curso: string;
  centro: string;
  horasAcademicas: number;
  notaFinal: number | null;
  fechaFin: string | null;
  emitidoEn: string | null;
  anuladoMotivo: string | null;
}

export const ETIQUETA_ASISTENCIA: Record<EstadoAsistencia, string> = {
  PRESENTE: 'Presente',
  TARDE: 'Tarde',
  AUSENTE: 'Ausente',
  JUSTIFICADO: 'Justificado',
};

/** mm:ss a partir de segundos. Para el temporizador del examen. */
export function comoReloj(segundos: number): string {
  const seguros = Math.max(0, Math.floor(segundos));
  const minutos = Math.floor(seguros / 60);
  const resto = seguros % 60;
  return `${String(minutos).padStart(2, '0')}:${String(resto).padStart(2, '0')}`;
}

// -------------------------------------------------------- videoconferencia

export type ProveedorVideoconferencia = 'MANUAL' | 'ZOOM' | 'MEET' | 'TEAMS';

export interface ClaseDetalle {
  id: string;
  grupoId: string;
  titulo: string;
  fecha: string;
  horaInicio: string | null;
  horaFin: string | null;
  proveedor: ProveedorVideoconferencia;
  proveedorEtiqueta: string;
  tieneReunion: boolean;
  tieneGrabacion: boolean;
  cuentaAsistencia: boolean;
  /** Solo llega al personal del centro. */
  codigoAsistencia?: string;
  errorReunion?: string;
  ventanaAbierta: boolean;
  abreEn: string;
  cierraEn: string;
  minutosParaAbrir: number;
}

export interface AccesoAClase {
  sesionId: string;
  titulo: string;
  enlace: string;
  clave: string | null;
  proveedor: ProveedorVideoconferencia;
  comoAnfitrion: boolean;
}

export interface ConexionVideoconferencia {
  proveedor: ProveedorVideoconferencia;
  etiqueta: string;
  modo: 'PRUEBAS' | 'PRODUCCION';
  cuentaExterna: string | null;
  clientId: string | null;
  /** Solo los ultimos caracteres del secreto. */
  clientSecretPista: string | null;
  organizador: string | null;
  activo: boolean;
  conectadoEn: string | null;
  ultimoError: string | null;
}

/** Cuenta atras legible: 90 -> "1 h 30 min". */
export function faltanPara(minutos: number): string {
  if (minutos <= 0) {
    return 'ahora';
  }
  if (minutos < 60) {
    return `${minutos} min`;
  }
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (horas < 24) {
    return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
  }
  return `${Math.floor(horas / 24)} d`;
}

// ------------------------------------------------------------ sitio publico

export interface ContactoPublico {
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
  whatsapp: string | null;
}

export interface RedesPublicas {
  facebook: string | null;
  instagram: string | null;
  tiktok: string | null;
  linkedin: string | null;
  youtube: string | null;
}

export interface EnlaceMenu {
  slug: string;
  titulo: string;
}

/** Marca y datos del sitio publico del centro. */
export interface SitioPublico {
  nombre: string;
  lema: string | null;
  descripcion: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  portadaUrl: string | null;
  colorPrimario: string;
  colorSecundario: string | null;
  tipografia: string | null;
  contacto: ContactoPublico;
  redes: RedesPublicas;
  menu: EnlaceMenu[];
}

export interface GrupoPublico {
  id: string;
  codigo: string;
  modalidad: string;
  fechaInicio: string;
  fechaFin: string;
  horario: string | null;
  precio: number;
  moneda: string;
  vacantes: number;
  docente: string | null;
}

export interface CursoPublico {
  id: string;
  slug: string;
  codigo: string;
  nombre: string;
  sumilla: string | null;
  temario: string | null;
  requisitos: string | null;
  dirigidoA: string | null;
  horasAcademicas: number;
  precio: number;
  moneda: string;
  certificable: boolean;
  portadaUrl: string | null;
  grupos: GrupoPublico[];
}

export interface PaginaPublicaVista {
  slug: string;
  titulo: string;
  contenido: string | null;
  metaTitulo: string | null;
  metaDescripcion: string | null;
}

// ------------------------------------------------------------------ tareas

export interface TareaResumen {
  id: string;
  cursoId: string;
  titulo: string;
  descripcion: string | null;
  fechaLimite: string | null;
  notaMaxima: number;
  peso: number;
  aceptaTardias: boolean;
  publicado: boolean;
}

export interface EntregaDetalle {
  id: string;
  tareaId: string;
  matriculaId: string;
  archivoId: string | null;
  comentario: string | null;
  entregadoEn: string;
  tardia: boolean;
  nota: number | null;
  retroalimentacion: string | null;
  calificadoEn: string | null;
}

/** Una tarea como la ve el alumno: el enunciado y lo que el mismo entrego. */
export interface TareaDelAlumno {
  id: string;
  titulo: string;
  descripcion: string | null;
  fechaLimite: string | null;
  notaMaxima: number;
  aceptaTardias: boolean;
  vencida: boolean;
  entrega: EntregaDetalle | null;
}

/** Una entrega como la ve el docente: con nombre, no con un identificador. */
export interface EntregaParaCalificar {
  id: string;
  matriculaId: string;
  alumno: string;
  grupo: string;
  archivoId: string | null;
  comentario: string | null;
  entregadoEn: string;
  tardia: boolean;
  nota: number | null;
  retroalimentacion: string | null;
  calificadoEn: string | null;
}

export interface AvanceTarea {
  matriculados: number;
  entregadas: number;
  calificadas: number;
  tardias: number;
}

export interface CrearTarea {
  cursoId: string;
  titulo: string;
  descripcion?: string | null;
  fechaLimite?: string | null;
  notaMaxima?: number | null;
  peso?: number | null;
  aceptaTardias?: boolean | null;
}

// ------------------------------------------------------- fase 7: automatizacion

export type TipoAviso =
  | 'MATRICULA_CONFIRMADA'
  | 'PAGO_REGISTRADO'
  | 'CUOTA_POR_VENCER'
  | 'CUOTA_VENCIDA'
  | 'CLASE_PROXIMA'
  | 'CERTIFICADO_EMITIDO'
  | 'EXPORTACION_LISTA';

export interface PlantillaAviso {
  tipo: TipoAviso;
  titulo: string;
  asunto: string;
  cuerpo: string;
  activa: boolean;
  /** false = es el texto de fabrica; true = lo escribio el centro. */
  personalizada: boolean;
  variables: string[];
}

export interface AvisoEnviado {
  id: string;
  tipo: TipoAviso;
  destinatario: string;
  nombre: string | null;
  asunto: string;
  estado: 'PENDIENTE' | 'ENVIADA' | 'FALLIDA';
  error: string | null;
  creadoEn: string;
  enviadoEn: string | null;
}

/** Por donde estan saliendo los correos ahora mismo. */
export interface EstadoDeCorreo {
  enviador: string;
}

/** Resultado de un envio de prueba, con el motivo si el servidor lo rechazo. */
export interface PruebaDeCorreo {
  enviado: boolean;
  enviador: string;
  error: string | null;
}

export type TipoReporte = 'MATRICULAS' | 'NOTAS' | 'ASISTENCIA' | 'COBRANZA' | 'INGRESOS';

export interface ReporteDisponible {
  tipo: TipoReporte;
  titulo: string;
}

export interface ColumnaReporte {
  titulo: string;
  tipo: 'TEXTO' | 'NUMERO' | 'DINERO' | 'PORCENTAJE' | 'FECHA';
}

export interface VistaPreviaReporte {
  titulo: string;
  columnas: ColumnaReporte[];
  filas: (string | number | null)[][];
  cantidad: number;
  /** true = hay mas filas de las que se ven; el Excel las trae todas. */
  recortada: boolean;
}

export interface ExportacionResumen {
  id: string;
  tipo: TipoReporte;
  titulo: string;
  estado: 'PENDIENTE' | 'LISTA' | 'FALLIDA';
  filas: number | null;
  error: string | null;
  creadoEn: string;
  terminadoEn: string | null;
  descargable: boolean;
}

export interface FiltrosReporte {
  grupoId?: string | null;
  cursoId?: string | null;
  desde?: string | null;
  hasta?: string | null;
}

// ------------------------------------------------- fase 8: planes y alta

export type NombrePlan = 'ESENCIAL' | 'PROFESIONAL' | 'AVANZADO';

export type EstadoSuscripcion =
  | 'PRUEBA'
  | 'ACTIVA'
  | 'VENCIDA'
  | 'SUSPENDIDA'
  | 'CANCELADA'
  | 'SIN_SUSCRIPCION';

export interface PlanPublico {
  plan: NombrePlan;
  almacenamientoGb: number;
  buzonesCorreo: number;
  diasDePrueba: number;
}

export interface DisponibilidadSubdominio {
  subdominio: string;
  disponible: boolean;
  motivo: string;
  url: string | null;
}

export interface AltaRealizada {
  subdominio: string;
  url: string;
  plan: NombrePlan;
  diasDePrueba: number;
}

export interface DatosDeAlta {
  nombre: string;
  subdominio: string;
  plan: NombrePlan;
  email: string;
  password: string;
  nombres: string;
  apellidos: string;
}

export interface AlmacenamientoConsumo {
  usadoBytes: number;
  totalBytes: number;
  gigasDelPlan: number;
  porcentaje: number;
  usadoLegible: string;
  totalLegible: string;
}

export interface PlanPosible {
  plan: NombrePlan;
  almacenamientoGb: number;
  buzonesCorreo: number;
  esElActual: boolean;
  /** false = el centro no cabe hoy en ese plan; el motivo va en impedimentos. */
  disponible: boolean;
  impedimentos: string[];
}

export interface ConsumoDelCentro {
  plan: NombrePlan;
  estado: EstadoSuscripcion;
  vigenteHasta: string | null;
  diasRestantes: number;
  diasHastaElCorte: number;
  almacenamiento: AlmacenamientoConsumo;
  buzones: { enUso: number; incluidos: number };
  volumen: { alumnos: number; cursos: number; grupos: number; matriculas: number };
  planes: PlanPosible[];
}

export interface SuscripcionVista {
  plan: NombrePlan;
  periodo: 'MENSUAL' | 'ANUAL';
  monto: number;
  moneda: string;
  estado: EstadoSuscripcion;
  vigenteHasta: string;
  diasRestantes: number;
  vigente: boolean;
}

// ------------------------------------------- contenido del curso (consola)

export interface LeccionDetalle {
  id: string;
  titulo: string;
  tipo: TipoLeccion;
  orden: number;
  duracionMin: number | null;
  contenido: string | null;
  recursoUrl: string | null;
  publicado: boolean;
  descargable: boolean;
  archivoId: string | null;
  nombreArchivo: string | null;
  tipoMime: string | null;
  tamanoBytes: number;
}

export interface ModuloDetalle {
  id: string;
  titulo: string;
  descripcion: string | null;
  orden: number;
  lecciones: LeccionDetalle[];
}

export interface MaterialDetalle {
  id: string;
  titulo: string;
  leccionId: string | null;
  descargable: boolean;
  orden: number;
  nombreArchivo: string | null;
  tamanoBytes: number;
}

export interface ArchivoSubido {
  id: string;
  nombreOriginal: string;
  tipoMime: string;
  tamanoBytes: number;
}

// ------------------------------------------------- pasarelas de cobro

export type NombreProveedor = 'MANUAL' | 'CULQI' | 'IZIPAY' | 'NIUBIZ' | 'MERCADOPAGO';
export type ModoPasarela = 'PRUEBAS' | 'PRODUCCION';

export interface CampoPasarela {
  clave: string;
  etiqueta: string;
  ayuda: string;
  secreto: boolean;
  obligatorio: boolean;
}

export interface FichaPasarela {
  proveedor: NombreProveedor;
  nombre: string;
  descripcion: string;
  /** false = todavia no hay adaptador; se puede guardar pero no cobra. */
  soportado: boolean;
  /** false = escrito segun la documentacion, sin probar contra una cuenta real. */
  verificado: boolean;
  urlPruebas: string | null;
  urlProduccion: string | null;
  campos: CampoPasarela[];
}

export interface CredencialPasarela {
  proveedor: NombreProveedor;
  modo: ModoPasarela;
  llavePublica: string | null;
  /** Solo los ultimos caracteres: la llave completa no sale nunca de la API. */
  llaveSecretaPista: string | null;
  comercioId: string | null;
  usuarioApi: string | null;
  urlBase: string | null;
  endpointEfectivo: string | null;
  notas: string | null;
  activo: boolean;
}

export interface DatosCredencial {
  proveedor: NombreProveedor;
  modo: ModoPasarela;
  llavePublica?: string | null;
  /** Vacio = no cambiar la que ya esta guardada. */
  llaveSecreta?: string | null;
  comercioId?: string | null;
  urlBase?: string | null;
  usuarioApi?: string | null;
  notas?: string | null;
}

export interface PruebaDeConexion {
  alcanzable: boolean;
  credencialesAceptadas: boolean;
  codigo: number;
  mensaje: string;
  urlProbada: string;
}

// ------------------------------------------- preguntas y examenes (consola)

export type Dificultad = 'BAJA' | 'MEDIA' | 'ALTA';

export interface OpcionDetalle {
  id: string;
  texto: string;
  correcta: boolean;
  orden: number;
}

export interface PreguntaDetalle {
  id: string;
  cursoId: string | null;
  enunciado: string;
  tipo: TipoPregunta;
  dificultad: Dificultad;
  etiquetas: string | null;
  puntaje: number;
  opciones: OpcionDetalle[];
}

export interface CrearOpcion {
  texto: string;
  correcta: boolean;
  orden?: number | null;
}

export interface CrearPregunta {
  cursoId: string;
  enunciado: string;
  tipo: TipoPregunta;
  dificultad?: Dificultad | null;
  etiquetas?: string | null;
  puntaje?: number | null;
  explicacion?: string | null;
  opciones: CrearOpcion[];
}

export interface ExamenResumen {
  id: string;
  cursoId: string;
  titulo: string;
  descripcion: string | null;
  minutosLimite: number | null;
  intentosPermitidos: number;
  notaMaxima: number;
  peso: number;
  publicado: boolean;
  totalPreguntas: number;
  tipo: TipoExamen;
  tipoEtiqueta: string;
  /** false = no entra en el promedio del curso. */
  cuentaParaNota: boolean;
}

export interface CrearExamen {
  cursoId: string;
  titulo: string;
  descripcion?: string | null;
  minutosLimite?: number | null;
  intentosPermitidos?: number | null;
  notaMaxima?: number | null;
  peso?: number | null;
  aleatorizar?: boolean | null;
  mostrarResultado?: boolean | null;
  tipo?: TipoExamen | null;
  cuentaParaNota?: boolean | null;
}

// --------------------------------------------- boton de pago de Niubiz

export interface SesionDePagoNiubiz {
  sessionToken: string;
  merchantId: string;
  purchaseNumber: string;
  amount: string;
  currency: string;
  /** El script del formulario: uno para sandbox y otro para produccion. */
  urlScript: string;
  /** A donde envia el NAVEGADOR el resultado. Puede ser localhost. */
  urlRespuesta: string;
  urlTimeout: string;
  expirationMinutes: number;
  modo: ModoPasarela;
  pagoId: string;
}

// ------------------------------------------------- equipo del centro

export type NombreRol = 'ADMIN_CENTRO' | 'COORDINADOR' | 'DOCENTE' | 'ALUMNO';

export interface RolDisponible {
  rol: NombreRol;
  nombre: string;
  descripcion: string;
}

export interface MiembroEquipo {
  id: string;
  email: string;
  nombres: string;
  apellidos: string;
  rol: NombreRol;
  activo: boolean;
  telefono: string | null;
  ultimoAcceso: string | null;
  /** Para no ofrecerle desactivarse a si mismo y quedarse fuera. */
  esUsted: boolean;
}

export interface NuevoMiembro {
  email: string;
  nombres: string;
  apellidos: string;
  rol: NombreRol;
  password: string;
  telefono?: string | null;
}

// ---------------------------------------------- marca y dominio del centro

export interface MarcaCentroVista {
  nombre: string;
  colorPrimario: string;
  colorSecundario: string | null;
  tipografia: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  portadaUrl: string | null;
  lema: string | null;
  descripcionPublica: string | null;
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
  whatsapp: string | null;
  facebook: string | null;
  instagram: string | null;
  tiktok: string | null;
  linkedin: string | null;
  youtube: string | null;
  subdominio: string;
  dominioPropio: string | null;
}

export type EstadoDominio = 'DECLARADO' | 'VERIFICADO' | 'ACTIVO' | 'FALLIDO' | 'RETIRADO';

export interface DominioDelCentro {
  id: string;
  dominio: string;
  estado: EstadoDominio;
  principal: boolean;
  /** El registro TXT que hay que publicar en el DNS del dominio. */
  nombreRegistro: string;
  tipoRegistro: string;
  valorRegistro: string;
  intentos: number;
  ultimoError: string | null;
}

// ------------------------------------------------------ matriculas

export interface MatriculaEnGrupo {
  id: string;
  grupoId: string;
  alumnoId: string;
  estado: EstadoMatricula;
  siguientesPosibles: EstadoMatricula[];
  fechaMatricula: string;
  montoAcordado: number;
  moneda: string;
  notaFinal: number | null;
  aprobado: boolean | null;
}

// ---------------------------------------------- tipos de examen (fase 4+)

export type TipoExamen = 'PRACTICA' | 'TEST' | 'PARCIAL' | 'FINAL' | 'RECUPERACION';

export interface TipoExamenDisponible {
  tipo: TipoExamen;
  etiqueta: string;
  /** Peso que trae por defecto dentro del componente de examenes. */
  pesoSugerido: number;
  cuentaParaNota: boolean;
}

export interface CrearCurso {
  codigo: string;
  nombre: string;
  sumilla?: string | null;
  temario?: string | null;
  requisitos?: string | null;
  dirigidoA?: string | null;
  horasAcademicas?: number | null;
  precioBase?: number | null;
  notaMinima?: number | null;
  asistenciaMinima?: number | null;
  certificable?: boolean | null;
}

export interface CrearAlumno {
  nombres: string;
  apellidos: string;
  numeroDocumento?: string | null;
  email?: string | null;
  telefono?: string | null;
  empresa?: string | null;
}

// ------------------------------------------- inscripcion publica del alumno

export interface DatosDeInscripcion {
  grupoId: string;
  nombres: string;
  apellidos: string;
  numeroDocumento?: string | null;
  email: string;
  telefono?: string | null;
  password: string;
}

export interface InscripcionHecha {
  matriculaId: string;
  ordenId: string;
  numeroOrden: string;
  total: number;
  moneda: string;
  curso: string;
  grupo: string;
  email: string;
  /** false = ese correo ya tenia cuenta; entra con su contrasena de siempre. */
  cuentaNueva: boolean;
  urlAula: string;
}
