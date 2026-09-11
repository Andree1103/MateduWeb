import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { Rol } from '../../core/auth/auth.models';
import { MarcaService } from '../../core/tenant/marca.service';

interface EntradaMenu {
  etiqueta: string;
  ruta: string;
  /** Bloque del menu al que pertenece. Vacio = suelta, arriba del todo. */
  grupo: string;
  roles: Rol[];
}

interface BloqueMenu {
  titulo: string;
  entradas: EntradaMenu[];
}

/**
 * Consola del centro: lo que ven administradores, coordinadores y docentes.
 *
 * El menu se arma segun el rol para no ofrecer pantallas que la API rechazaria.
 * Es comodidad de interfaz; el permiso real lo aplica el backend.
 */
@Component({
  selector: 'app-consola-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './consola-layout.html',
  styleUrl: './consola-layout.css',
})
export class ConsolaLayout {
  private readonly auth = inject(AuthService);
  private readonly marcaService = inject(MarcaService);

  protected readonly usuario = this.auth.usuario;
  protected readonly iniciales = this.auth.iniciales;
  protected readonly marca = this.marcaService.marca;

  constructor() {
    // El centro se ve con su nombre y su color tambien aqui dentro, no solo
    // en su sitio publico.
    this.marcaService.cargar();
  }
  protected readonly menuAbierto = signal(false);

  /**
   * El menu, agrupado por el trabajo que se hace, no por como esta hecho
   * el sistema por dentro. Trece enlaces seguidos se leen como una lista de
   * la compra; en cuatro bloques, quien busca "cobranza" mira solo el bloque
   * del dinero.
   *
   * Sin iconos a proposito: trece simbolos geometricos distintos no ayudan a
   * distinguir nada —nadie asocia un rombo con la cobranza— y ensucian una
   * columna donde la palabra ya dice exactamente lo que hay.
   */
  private readonly entradas: EntradaMenu[] = [
    { etiqueta: 'Inicio', ruta: '/consola', grupo: '', roles: ['SUPERADMIN', 'ADMIN_CENTRO', 'COORDINADOR', 'DOCENTE'] },

    { etiqueta: 'Cursos', ruta: '/consola/cursos', grupo: 'Academico', roles: ['SUPERADMIN', 'ADMIN_CENTRO', 'COORDINADOR', 'DOCENTE'] },
    { etiqueta: 'Grupos', ruta: '/consola/grupos', grupo: 'Academico', roles: ['SUPERADMIN', 'ADMIN_CENTRO', 'COORDINADOR', 'DOCENTE'] },
    { etiqueta: 'Alumnos', ruta: '/consola/alumnos', grupo: 'Academico', roles: ['SUPERADMIN', 'ADMIN_CENTRO', 'COORDINADOR'] },
    { etiqueta: 'Evaluaciones', ruta: '/consola/examenes', grupo: 'Academico', roles: ['SUPERADMIN', 'ADMIN_CENTRO', 'COORDINADOR', 'DOCENTE'] },
    { etiqueta: 'Tareas', ruta: '/consola/tareas', grupo: 'Academico', roles: ['SUPERADMIN', 'ADMIN_CENTRO', 'COORDINADOR', 'DOCENTE'] },

    { etiqueta: 'Cobranza', ruta: '/consola/cobranza', grupo: 'Dinero', roles: ['SUPERADMIN', 'ADMIN_CENTRO', 'COORDINADOR'] },
    { etiqueta: 'Cobros online', ruta: '/consola/cobros', grupo: 'Dinero', roles: ['SUPERADMIN', 'ADMIN_CENTRO'] },

    { etiqueta: 'Reportes', ruta: '/consola/reportes', grupo: 'Operacion', roles: ['SUPERADMIN', 'ADMIN_CENTRO', 'COORDINADOR'] },
    { etiqueta: 'Avisos', ruta: '/consola/avisos', grupo: 'Operacion', roles: ['SUPERADMIN', 'ADMIN_CENTRO'] },
    { etiqueta: 'Videoconferencia', ruta: '/consola/videoconferencia', grupo: 'Operacion', roles: ['SUPERADMIN', 'ADMIN_CENTRO'] },

    { etiqueta: 'Mi centro', ruta: '/consola/centro', grupo: 'Configuracion', roles: ['SUPERADMIN', 'ADMIN_CENTRO'] },
    { etiqueta: 'Equipo', ruta: '/consola/equipo', grupo: 'Configuracion', roles: ['SUPERADMIN', 'ADMIN_CENTRO'] },
    { etiqueta: 'Plan', ruta: '/consola/plan', grupo: 'Configuracion', roles: ['SUPERADMIN', 'ADMIN_CENTRO'] },
  ];

  /**
   * El menu del rol, ya agrupado.
   *
   * Un bloque que se queda sin entradas visibles no se muestra: un docente no
   * tiene por que ver un titulo "Dinero" con nada debajo.
   */
  protected readonly menu = computed<BloqueMenu[]>(() => {
    const rol = this.auth.rol();
    if (rol === null) {
      return [];
    }

    const bloques: BloqueMenu[] = [];
    for (const entrada of this.entradas) {
      if (!entrada.roles.includes(rol)) {
        continue;
      }

      const ultimo = bloques[bloques.length - 1];
      if (ultimo && ultimo.titulo === entrada.grupo) {
        ultimo.entradas.push(entrada);
      } else {
        bloques.push({ titulo: entrada.grupo, entradas: [entrada] });
      }
    }

    return bloques;
  });

  protected alternarMenu(): void {
    this.menuAbierto.update((abierto) => !abierto);
  }

  protected cerrarMenu(): void {
    this.menuAbierto.set(false);
  }

  protected salir(): void {
    this.auth.cerrarSesion();
  }
}
