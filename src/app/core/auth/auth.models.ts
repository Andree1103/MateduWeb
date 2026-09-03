/** Contratos que devuelve /api/auth del backend. */

export type Rol = 'SUPERADMIN' | 'ADMIN_CENTRO' | 'COORDINADOR' | 'DOCENTE' | 'ALUMNO';

export interface PerfilUsuario {
  id: string;
  centroId: string | null;
  email: string;
  nombreCompleto: string;
  rol: Rol;
}

export interface Sesion {
  accessToken: string;
  refreshToken: string;
  expiraEnSegundos: number;
  usuario: PerfilUsuario;
}

export interface Credenciales {
  email: string;
  password: string;
}

/** Error del backend en formato RFC 7807. */
export interface ProblemDetail {
  title?: string;
  detail?: string;
  status?: number;
  errores?: Record<string, string>;
}

/** Roles que trabajan dentro de la consola del centro. */
export const ROLES_DE_GESTION: readonly Rol[] = ['SUPERADMIN', 'ADMIN_CENTRO', 'COORDINADOR', 'DOCENTE'];

/** Ruta de inicio segun el rol: gestion va a la consola, alumno va al aula. */
export function rutaInicial(rol: Rol): string {
  return rol === 'ALUMNO' ? '/aula' : '/consola';
}

export function esDeGestion(rol: Rol): boolean {
  return ROLES_DE_GESTION.includes(rol);
}
