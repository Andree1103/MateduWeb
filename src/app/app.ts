import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MarcaService } from './core/tenant/marca.service';

/**
 * Raiz de la aplicacion.
 *
 * Solo aplica la marca del centro y deja pasar el enrutador: cada area monta
 * su propio layout.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class App implements OnInit {
  private readonly marca = inject(MarcaService);

  ngOnInit(): void {
    // En la fase 6 esto vendra del backend segun el dominio del centro.
    this.marca.restablecer();
  }
}
