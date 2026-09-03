import { Component, inject, OnInit, signal } from '@angular/core';
import { AlumnoResumen } from '../../core/api/api.models';
import { MateduApi } from '../../core/api/matedu.api';

@Component({
  selector: 'app-consola-alumnos',
  template: `
    <header class="titulo">
      <h1>Alumnos</h1>
      <p class="tenue">
        Participantes del centro. En capacitacion corporativa muchos se registran por lote,
        asi que el alumno existe aunque todavia no tenga cuenta de acceso.
      </p>
    </header>

    @if (cargando()) {
      <p class="tenue">Cargando alumnos...</p>
    } @else if (error(); as mensaje) {
      <p class="aviso-error" role="alert">{{ mensaje }}</p>
    } @else if (alumnos().length === 0) {
      <div class="vacio tarjeta">
        <strong>Todavia no hay alumnos</strong>
        <p class="tenue">
          La carga masiva desde Excel se conecta a <code>POST /api/alumnos/lote</code>.
        </p>
      </div>
    } @else {
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

  ngOnInit(): void {
    this.api.alumnos().subscribe({
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
