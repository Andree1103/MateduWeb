import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { Rol } from '../../core/auth/auth.models';
import { MarcaService } from '../../core/tenant/marca.service';

interface EntradaMenu {
  etiqueta: string;
  ruta: string;
  icono: string;
  roles: Rol[];
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
  protected readonly menuAbierto = signal(false);

  private readonly entradas: EntradaMenu[] = [
    { etiqueta: 'Inicio', ruta: '/consola', icono: '◧', roles: ['SUPERADMIN', 'ADMIN_CENTRO', 'COORDINADOR', 'DOCENTE'] },
    { etiqueta: 'Cursos', ruta: '/consola/cursos', icono: '▤', roles: ['SUPERADMIN', 'ADMIN_CENTRO', 'COORDINADOR', 'DOCENTE'] },
    { etiqueta: 'Grupos', ruta: '/consola/grupos', icono: '◫', roles: ['SUPERADMIN', 'ADMIN_CENTRO', 'COORDINADOR', 'DOCENTE'] },
    { etiqueta: 'Alumnos', ruta: '/consola/alumnos', icono: '◎', roles: ['SUPERADMIN', 'ADMIN_CENTRO', 'COORDINADOR'] },
    { etiqueta: 'Evaluaciones', ruta: '/consola/examenes', icono: '✎', roles: ['SUPERADMIN', 'ADMIN_CENTRO', 'COORDINADOR', 'DOCENTE'] },
    { etiqueta: 'Cobranza', ruta: '/consola/cobranza', icono: '◈', roles: ['SUPERADMIN', 'ADMIN_CENTRO', 'COORDINADOR'] },
    { etiqueta: 'Cobros online', ruta: '/consola/cobros', icono: '▣', roles: ['SUPERADMIN', 'ADMIN_CENTRO'] },
    { etiqueta: 'Reportes', ruta: '/consola/reportes', icono: '▦', roles: ['SUPERADMIN', 'ADMIN_CENTRO', 'COORDINADOR'] },
    { etiqueta: 'Avisos', ruta: '/consola/avisos', icono: '✉', roles: ['SUPERADMIN', 'ADMIN_CENTRO'] },
    { etiqueta: 'Videoconferencia', ruta: '/consola/videoconferencia', icono: '▷', roles: ['SUPERADMIN', 'ADMIN_CENTRO'] },
    { etiqueta: 'Mi centro', ruta: '/consola/centro', icono: '◐', roles: ['SUPERADMIN', 'ADMIN_CENTRO'] },
    { etiqueta: 'Equipo', ruta: '/consola/equipo', icono: '◉', roles: ['SUPERADMIN', 'ADMIN_CENTRO'] },
    { etiqueta: 'Plan', ruta: '/consola/plan', icono: '◆', roles: ['SUPERADMIN', 'ADMIN_CENTRO'] },
  ];

  protected readonly menu = computed(() => {
    const rol = this.auth.rol();
    return rol === null ? [] : this.entradas.filter((entrada) => entrada.roles.includes(rol));
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
