import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { MarcaService } from '../../core/tenant/marca.service';

/**
 * Aula del alumno.
 *
 * Deliberadamente distinta de la consola: barra superior en vez de lateral, y
 * solo lo que el alumno necesita. Quien estudia no deberia ver nunca la
 * herramienta de gestion.
 */
@Component({
  selector: 'app-aula-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './aula-layout.html',
  styleUrl: './aula-layout.css',
})
export class AulaLayout {
  private readonly auth = inject(AuthService);
  private readonly marcaService = inject(MarcaService);

  protected readonly usuario = this.auth.usuario;
  protected readonly iniciales = this.auth.iniciales;
  protected readonly marca = this.marcaService.marca;

  protected salir(): void {
    this.auth.cerrarSesion();
  }
}
