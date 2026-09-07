import { DecimalPipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
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
  imports: [DecimalPipe, RouterLink, FormsModule],
  template: `
    <header class="titulo">
      <h1>Cursos</h1>
      <p class="tenue">
        El curso es la plantilla. Las fechas, el docente y el cupo viven en cada grupo.
      </p>
    </header>

    @if (cargando()) {
      <p class="tenue">Cargando cursos...</p>
    }

    @if (error(); as mensaje) {
      <p class="aviso-error" role="alert">{{ mensaje }}</p>
    }

    <section class="tarjeta nuevo">
      @if (creando()) {
        <h2>Nuevo curso</h2>
        <form (ngSubmit)="crear()">
          <div class="fila">
            <label class="corto">
              <span>Codigo</span>
              <input type="text" name="codigo" [(ngModel)]="codigo" placeholder="SEG-001" />
            </label>
            <label class="ancho">
              <span>Nombre</span>
              <input
                type="text"
                name="nombre"
                [(ngModel)]="nombre"
                placeholder="Seguridad y Salud en el Trabajo"
              />
            </label>
          </div>

          <label>
            <span>Sumilla</span>
            <textarea rows="2" name="sumilla" [(ngModel)]="sumilla"></textarea>
            <small class="tenue">Se ve en el catalogo publico y en la ficha del curso.</small>
          </label>

          <div class="fila">
            <label class="corto">
              <span>Horas</span>
              <input type="number" name="horas" min="1" [(ngModel)]="horasAcademicas" />
            </label>
            <label class="corto">
              <span>Precio base</span>
              <input type="number" name="precio" min="0" step="0.01" [(ngModel)]="precioBase" />
            </label>
            <label class="corto">
              <span>Nota minima</span>
              <input type="number" name="notaMinima" min="0" step="0.01" [(ngModel)]="notaMinima" />
            </label>
            <label class="corto">
              <span>Asistencia minima %</span>
              <input type="number" name="asistencia" min="0" max="100" [(ngModel)]="asistenciaMinima" />
            </label>
          </div>
          <p class="tenue nota">
            La nota y la asistencia minimas son las que decidiran si el alumno recibe su
            certificado. Se pueden cambiar despues, pero no para quien ya termino.
          </p>

          <label class="interruptor">
            <input type="checkbox" name="certificable" [(ngModel)]="certificable" />
            <span>Entrega certificado al aprobar</span>
          </label>

          <div class="acciones-form">
            <button type="submit" class="boton" [disabled]="!puedeCrear() || guardando()">
              {{ guardando() ? 'Creando…' : 'Crear curso' }}
            </button>
            <button type="button" class="boton boton-secundario" (click)="creando.set(false)">
              Cancelar
            </button>
          </div>
        </form>
      } @else {
        <button type="button" class="boton" (click)="creando.set(true)">Nuevo curso</button>
        <p class="tenue nota">
          El curso es la plantilla. Despues se abre un grupo con sus fechas y su cupo, y ahi
          se matriculan los alumnos.
        </p>
      }
    </section>

    @if (cursos().length > 0) {
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
    .nuevo {
      padding: 18px 20px;
      margin-bottom: 22px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      align-items: flex-start;
    }
    .nuevo h2 {
      margin: 0;
      font-size: 18px;
    }
    .nuevo form {
      display: flex;
      flex-direction: column;
      gap: 14px;
      width: 100%;
      max-width: 760px;
    }
    .fila {
      display: flex;
      flex-wrap: wrap;
      gap: 14px;
    }
    .nuevo label {
      display: flex;
      flex-direction: column;
      gap: 5px;
      font-size: 12px;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--texto-tenue);
    }
    .nuevo label small {
      text-transform: none;
      letter-spacing: 0;
      font-size: 12.5px;
      line-height: 1.5;
    }
    .nuevo .corto {
      width: 150px;
    }
    .nuevo .ancho {
      flex: 1;
      min-width: 220px;
    }
    .nuevo .interruptor {
      flex-direction: row;
      align-items: center;
      gap: 8px;
      text-transform: none;
      letter-spacing: 0;
      font-size: 14px;
      color: inherit;
    }
    .nuevo .nota {
      margin: 0;
      font-size: 12.5px;
      line-height: 1.55;
      max-width: 66ch;
    }
    .acciones-form {
      display: flex;
      gap: 8px;
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
  protected readonly creando = signal(false);
  protected readonly guardando = signal(false);

  protected codigo = '';
  protected nombre = '';
  protected sumilla = '';
  protected horasAcademicas: number | null = 24;
  protected precioBase: number | null = null;
  protected notaMinima: number | null = 13;
  protected asistenciaMinima: number | null = 80;
  protected certificable = true;

  protected puedeCrear(): boolean {
    return this.codigo.trim().length > 0 && this.nombre.trim().length > 0;
  }

  protected crear(): void {
    if (!this.puedeCrear()) {
      return;
    }

    this.guardando.set(true);
    this.error.set(null);

    this.api
      .crearCurso({
        codigo: this.codigo.trim().toUpperCase(),
        nombre: this.nombre.trim(),
        sumilla: this.sumilla || null,
        horasAcademicas: this.horasAcademicas,
        precioBase: this.precioBase,
        notaMinima: this.notaMinima,
        asistenciaMinima: this.asistenciaMinima,
        certificable: this.certificable,
      })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.creando.set(false);
          this.codigo = '';
          this.nombre = '';
          this.sumilla = '';
          this.cargar();
        },
        // El backend rechaza un codigo repetido y lo explica; su mensaje es
        // mas util que uno generico nuestro.
        error: (fallo: { error?: { detail?: string } }) => {
          this.guardando.set(false);
          this.error.set(fallo.error?.detail ?? 'No se pudo crear el curso.');
        },
      });
  }

  private readonly api = inject(MateduApi);

  protected readonly cursos = signal<CursoResumen[]>([]);
  protected readonly total = signal(0);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);

    this.api.cursos(undefined, 0, 100).subscribe({
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
