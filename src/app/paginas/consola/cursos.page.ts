import { DecimalPipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CursoResumen } from '../../core/api/api.models';
import { MateduApi } from '../../core/api/matedu.api';

/**
 * Listado de cursos del centro.
 *
 * Es la pantalla que prueba de punta a punta el trabajo de la fase 0: el
 * interceptor pone el token, el backend resuelve el centro y devuelve solo lo
 * suyo. Entrando con otro centro, esta misma pantalla muestra otros cursos.
 */
@Component({
  selector: 'app-consola-cursos',
  imports: [DecimalPipe, RouterLink],
  template: `
    <header class="titulo">
      <h1>Cursos</h1>
      <p class="tenue">
        El curso es la plantilla. Las fechas, el docente y el cupo viven en cada grupo.
      </p>
    </header>

    @if (cargando()) {
      <p class="tenue">Cargando cursos...</p>
    } @else if (error(); as mensaje) {
      <p class="aviso-error" role="alert">{{ mensaje }}</p>
    } @else if (cursos().length === 0) {
      <div class="vacio tarjeta">
        <strong>Todavia no hay cursos</strong>
        <p class="tenue">Cree el primero desde la API o cargue los datos de ejemplo del backend.</p>
      </div>
    } @else {
      <div class="tabla-scroll tarjeta">
        <table>
          <thead>
            <tr>
              <th>Codigo</th>
              <th>Nombre</th>
              <th class="num">Horas</th>
              <th class="num">Precio base</th>
              <th>Estado</th>
              <th class="acciones">Contenido</th>
            </tr>
          </thead>
          <tbody>
            @for (curso of cursos(); track curso.id) {
              <tr>
                <td class="mono">{{ curso.codigo }}</td>
                <td>{{ curso.nombre }}</td>
                <td class="num">{{ curso.horasAcademicas }}</td>
                <td class="num">
                  {{ curso.moneda }} {{ curso.precioBase | number: '1.2-2' }}
                </td>
                <td>
                  <span class="estado" [class.publicado]="curso.publicado">
                    {{ curso.publicado ? 'Publicado' : 'Borrador' }}
                  </span>
                </td>
                <td class="acciones">
                  <!-- Sin esto, un curso creado se queda sin temario y el aula
                       del alumno aparece vacia sin explicacion. -->
                  <a class="boton boton-secundario" [routerLink]="['/consola/cursos', curso.id, 'contenido']">
                    Armar temario
                  </a>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <p class="tenue total">{{ total() }} curso(s) en este centro.</p>
    }
  `,
  styles: `
    .titulo {
      margin-bottom: 22px;
    }
    .acciones {
      text-align: right;
      white-space: nowrap;
    }
    .acciones a {
      text-decoration: none;
      display: inline-block;
    }
    .titulo h1 {
      font-size: 27px;
      margin-bottom: 6px;
    }
    .titulo p {
      margin: 0;
      max-width: 62ch;
    }
    .tabla-scroll {
      overflow-x: auto;
    }
    table {
      width: 100%;
      min-width: 620px;
      border-collapse: collapse;
      font-size: 14.5px;
    }
    th,
    td {
      text-align: left;
      padding: 11px 16px;
      border-bottom: 1px solid var(--linea-2);
    }
    thead th {
      font-size: 11.5px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--texto-tenue);
      background: var(--superficie-2);
      border-bottom: 1px solid var(--linea);
    }
    tbody tr:last-child td {
      border-bottom: 0;
    }
    .num {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    .mono {
      font-family: var(--fuente-mono);
      font-size: 13px;
    }
    .estado {
      display: inline-block;
      padding: 2px 9px;
      font-size: 12px;
      border-radius: 99px;
      color: var(--texto-tenue);
      background: var(--superficie-2);
      border: 1px solid var(--linea);
    }
    .estado.publicado {
      color: var(--exito);
      background: transparent;
      border-color: var(--exito);
    }
    .vacio {
      padding: 22px 24px;
    }
    .vacio p {
      margin: 4px 0 0;
      font-size: 14px;
    }
    .total {
      margin-top: 12px;
      font-size: 13px;
    }
  `,
})
export class ConsolaCursosPage implements OnInit {
  private readonly api = inject(MateduApi);

  protected readonly cursos = signal<CursoResumen[]>([]);
  protected readonly total = signal(0);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.api.cursos().subscribe({
      next: (pagina) => {
        this.cursos.set(pagina.content);
        this.total.set(pagina.totalElements);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los cursos. Revise que la API este disponible.');
        this.cargando.set(false);
      },
    });
  }
}
