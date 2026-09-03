import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-consola-inicio',
  imports: [RouterLink],
  template: `
    <header class="titulo">
      <span class="etiqueta">Consola</span>
      <h1>Hola, {{ usuario()?.nombreCompleto }}</h1>
      <p class="tenue">
        Esta es la consola de gestion del centro. Desde aqui se administran los cursos,
        se abren los grupos y se matriculan los alumnos.
      </p>
    </header>

    <div class="accesos">
      <a class="acceso tarjeta" routerLink="/consola/cursos">
        <strong>Cursos</strong>
        <span class="tenue">La plantilla de lo que se ensena: temario, horas y precio base.</span>
      </a>
      <a class="acceso tarjeta" routerLink="/consola/grupos">
        <strong>Grupos</strong>
        <span class="tenue">Cada dictado concreto, con sus fechas, su docente y su cupo.</span>
      </a>
      <a class="acceso tarjeta" routerLink="/consola/alumnos">
        <strong>Alumnos</strong>
        <span class="tenue">Participantes del centro, con alta individual o por lote.</span>
      </a>
    </div>

    <section class="nota tarjeta">
      <strong>Lo que sigue</strong>
      <p class="tenue">
        Las fases 2 a 4 agregan aqui el aula virtual con video protegido, los pagos con
        Yape y Plin, y los certificados con QR. La estructura de esta consola ya esta
        preparada para recibirlas.
      </p>
    </section>
  `,
  styles: `
    .titulo {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 26px;
    }
    .titulo h1 {
      font-size: 27px;
    }
    .titulo p {
      margin: 0;
      max-width: 62ch;
    }
    .etiqueta {
      align-self: flex-start;
    }
    .accesos {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
      gap: 14px;
    }
    .acceso {
      display: flex;
      flex-direction: column;
      gap: 5px;
      padding: 18px 20px;
      color: inherit;
      text-decoration: none;
    }
    .acceso:hover {
      border-color: var(--marca-primario);
    }
    .acceso strong {
      font-size: 16px;
    }
    .acceso span {
      font-size: 13.5px;
    }
    .nota {
      margin-top: 26px;
      padding: 18px 20px;
      max-width: 70ch;
    }
    .nota p {
      margin: 6px 0 0;
      font-size: 14px;
    }
  `,
})
export class ConsolaInicioPage {
  protected readonly usuario = inject(AuthService).usuario;
}
