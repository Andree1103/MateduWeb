import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AlumnoResumen } from '../../core/api/api.models';
import { MateduApi } from '../../core/api/matedu.api';

@Component({
  selector: 'app-consola-alumnos',
  imports: [FormsModule, RouterLink],
  template: `
    <header class="titulo">
      <h1>Alumnos</h1>
      <p class="tenue">
        Participantes del centro. En capacitacion corporativa muchos se registran por lote,
        asi que el alumno existe aunque todavia no tenga cuenta de acceso.
      </p>
    </header>

    @if (error(); as mensaje) {
      <p class="aviso-error" role="alert">{{ mensaje }}</p>
    }
    @if (aviso(); as mensaje) {
      <p class="aviso-ok" role="status">{{ mensaje }}</p>
    }

    <section class="tarjeta nuevo">
      @if (creando()) {
        <h2>Nuevo alumno</h2>
        <form (ngSubmit)="crear()">
          <div class="fila">
            <label class="ancho">
              <span>Nombres</span>
              <input type="text" name="nombres" [(ngModel)]="nombres" />
            </label>
            <label class="ancho">
              <span>Apellidos</span>
              <input type="text" name="apellidos" [(ngModel)]="apellidos" />
            </label>
          </div>

          <div class="fila">
            <label class="corto">
              <span>Documento</span>
              <input type="text" name="documento" [(ngModel)]="numeroDocumento" />
            </label>
            <label class="ancho">
              <span>Correo</span>
              <input type="email" name="correoAlumno" [(ngModel)]="email" autocomplete="off" />
            </label>
            <label class="corto">
              <span>Telefono</span>
              <input type="text" name="telefono" [(ngModel)]="telefono" />
            </label>
          </div>

          <label class="ancho">
            <span>Empresa</span>
            <input type="text" name="empresa" [(ngModel)]="empresa" />
            <small class="tenue">
              Para capacitacion corporativa: agrupa a los participantes de un mismo cliente.
            </small>
          </label>

          <p class="tenue nota">
            El alumno existe aunque todavia no tenga cuenta de acceso. Para que entre al
            aula, cree su cuenta en <a routerLink="/consola/equipo">Equipo</a> con el rol
            Alumno y el mismo correo.
          </p>

          <div class="acciones-form">
            <button type="submit" class="boton" [disabled]="!puedeCrear() || guardando()">
              {{ guardando() ? 'Registrando…' : 'Registrar alumno' }}
            </button>
            <button type="button" class="boton boton-secundario" (click)="creando.set(false)">
              Cancelar
            </button>
          </div>
        </form>
      } @else {
        <button type="button" class="boton" (click)="creando.set(true)">Nuevo alumno</button>
        <p class="tenue nota">
          Registrado el alumno, se le matricula en un grupo desde
          <a routerLink="/consola/grupos">Grupos → Ver matriculados</a>.
        </p>
      }
    </section>

    @if (cargando()) {
      <p class="tenue">Cargando alumnos...</p>
    } @else if (alumnos().length > 0) {
      <div class="tabla-scroll tarjeta">
        <table>
          <thead>
            <tr>
              <th>Alumno</th>
              <th>Documento</th>
              <th>Correo</th>
              <th>Empresa</th>
            </tr>
          </thead>
          <tbody>
            @for (alumno of alumnos(); track alumno.id) {
              <tr>
                <td>{{ alumno.nombreCompleto }}</td>
                <td class="mono">{{ alumno.numeroDocumento ?? '—' }}</td>
                <td>{{ alumno.email ?? '—' }}</td>
                <td>{{ alumno.empresa ?? '—' }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <p class="tenue total">{{ total() }} alumno(s) registrado(s).</p>
    }
  `,
  styles: `
    .aviso-ok {
      background: rgba(22, 130, 90, 0.12);
      color: #12805a;
      border-radius: 8px;
      padding: 10px 14px;
      margin: 0 0 14px;
      font-size: 14.5px;
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
      gap: 13px;
      width: 100%;
      max-width: 720px;
    }
    .fila {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
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
    }
    .corto {
      width: 150px;
    }
    .ancho {
      flex: 1;
      min-width: 200px;
    }
    .nota {
      margin: 0;
      font-size: 12.5px;
      line-height: 1.55;
      max-width: 66ch;
    }
    .acciones-form {
      display: flex;
      gap: 8px;
    }
    .titulo {
      margin-bottom: 22px;
    }
    .titulo h1 {
      font-size: 27px;
      margin-bottom: 6px;
    }
    .titulo p {
      margin: 0;
      max-width: 64ch;
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
    .mono {
      font-family: var(--fuente-mono);
      font-size: 13px;
    }
    code {
      font-family: var(--fuente-mono);
      font-size: 12.5px;
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
export class ConsolaAlumnosPage implements OnInit {
  private readonly api = inject(MateduApi);

  protected readonly alumnos = signal<AlumnoResumen[]>([]);
  protected readonly total = signal(0);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly aviso = signal<string | null>(null);
  protected readonly creando = signal(false);
  protected readonly guardando = signal(false);

  protected nombres = '';
  protected apellidos = '';
  protected numeroDocumento = '';
  protected email = '';
  protected telefono = '';
  protected empresa = '';

  ngOnInit(): void {
    this.cargar();
  }

  protected puedeCrear(): boolean {
    return this.nombres.trim().length > 0 && this.apellidos.trim().length > 0;
  }

  protected crear(): void {
    if (!this.puedeCrear()) {
      return;
    }

    this.guardando.set(true);
    this.error.set(null);
    this.aviso.set(null);

    this.api
      .crearAlumno({
        nombres: this.nombres.trim(),
        apellidos: this.apellidos.trim(),
        numeroDocumento: this.numeroDocumento || null,
        email: this.email || null,
        telefono: this.telefono || null,
        empresa: this.empresa || null,
      })
      .subscribe({
        next: (alumno) => {
          this.guardando.set(false);
          this.creando.set(false);
          this.aviso.set(
            `${alumno.nombreCompleto} registrado. Matriculelo en un grupo desde Grupos.`,
          );
          this.limpiar();
          this.cargar();
        },
        // El backend rechaza un documento repetido y dice cual es; ese mensaje
        // es mas util que uno generico.
        error: (fallo: { error?: { detail?: string } }) => {
          this.guardando.set(false);
          this.error.set(fallo.error?.detail ?? 'No se pudo registrar al alumno.');
        },
      });
  }

  private limpiar(): void {
    this.nombres = '';
    this.apellidos = '';
    this.numeroDocumento = '';
    this.email = '';
    this.telefono = '';
    this.empresa = '';
  }

  private cargar(): void {
    this.cargando.set(true);

    this.api.alumnos(0, 200).subscribe({
      next: (pagina) => {
        this.alumnos.set(pagina.content);
        this.total.set(pagina.totalElements);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los alumnos.');
        this.cargando.set(false);
      },
    });
  }
}
