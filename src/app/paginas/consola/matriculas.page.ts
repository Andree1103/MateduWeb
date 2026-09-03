import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  AlumnoResumen,
  EstadoMatricula,
  GrupoResumen,
  MatriculaEnGrupo,
} from '../../core/api/api.models';
import { MateduApi } from '../../core/api/matedu.api';

/**
 * Quién está matriculado en un grupo, y cómo entra alguien nuevo.
 *
 * Faltaba entera, y era el hueco más raro del producto: se podía crear el
 * curso, el grupo y el alumno, emitir la orden y cobrarla, pero no había forma
 * de decir que ese alumno pertenece a ese grupo. Sin matrícula, el alumno no ve
 * nada en el aula.
 */
@Component({
  selector: 'app-consola-matriculas',
  imports: [DatePipe, DecimalPipe, FormsModule, RouterLink],
  template: `
    <header class="titulo">
      <a class="volver tenue" routerLink="/consola/grupos">← Grupos</a>
      <h1>Matriculados</h1>
      @if (grupo(); as datos) {
        <p class="tenue">
          {{ datos.codigo }} · {{ datos.cuposOcupados }} de {{ datos.cupoMaximo }} vacantes
          ocupadas · quedan {{ datos.vacantes }}
        </p>
      }
    </header>

    @if (error(); as mensaje) {
      <p class="aviso-error" role="alert">{{ mensaje }}</p>
    }
    @if (aviso(); as mensaje) {
      <p class="aviso-ok" role="status">{{ mensaje }}</p>
    }

    <section class="tarjeta agregar">
      <h2>Matricular a un alumno</h2>
      <form (ngSubmit)="matricular()">
        <label>
          <span>Alumno</span>
          <select name="alumno" [(ngModel)]="alumnoElegido">
            <option [ngValue]="null">Elija un alumno…</option>
            @for (alumno of disponibles(); track alumno.id) {
              <option [ngValue]="alumno.id">
                {{ alumno.apellidos }}, {{ alumno.nombres }}
                @if (alumno.numeroDocumento) {
                  · {{ alumno.numeroDocumento }}
                }
              </option>
            }
          </select>
        </label>

        <label>
          <span>Monto acordado</span>
          <input
            type="number"
            name="monto"
            step="0.01"
            min="0"
            [(ngModel)]="montoAcordado"
            [placeholder]="precioDelGrupo()"
          />
          <small class="tenue">Vacío = el precio del grupo.</small>
        </label>

        <button type="submit" class="boton" [disabled]="!alumnoElegido || guardando()">
          {{ guardando() ? 'Matriculando…' : 'Matricular' }}
        </button>
      </form>

      @if (disponibles().length === 0) {
        <p class="tenue nota">
          Todos los alumnos del centro ya están en este grupo. Registre uno nuevo desde
          <a routerLink="/consola/alumnos">Alumnos</a>.
        </p>
      }
    </section>

    <section>
      <h2 class="seccion">En este grupo</h2>

      @if (matriculas().length === 0) {
        <p class="tenue">Todavía no hay nadie matriculado.</p>
      } @else {
        <div class="tabla-scroll tarjeta">
          <table>
            <thead>
              <tr>
                <th>Alumno</th>
                <th>Matriculado</th>
                <th class="num">Monto</th>
                <th>Estado</th>
                <th class="acciones">Cambiar a</th>
              </tr>
            </thead>
            <tbody>
              @for (matricula of matriculas(); track matricula.id) {
                <tr>
                  <td>{{ nombreDe(matricula.alumnoId) }}</td>
                  <td>{{ matricula.fechaMatricula | date: 'dd/MM/yyyy' }}</td>
                  <td class="num">
                    {{ matricula.moneda }} {{ matricula.montoAcordado | number: '1.2-2' }}
                  </td>
                  <td>
                    <span class="estado" [class]="'estado-' + matricula.estado.toLowerCase()">
                      {{ matricula.estado }}
                    </span>
                  </td>
                  <td class="acciones">
                    @if (matricula.siguientesPosibles.length === 0) {
                      <span class="tenue">—</span>
                    } @else {
                      @for (destino of matricula.siguientesPosibles; track destino) {
                        <button
                          type="button"
                          class="enlace"
                          (click)="cambiar(matricula, destino)"
                        >
                          {{ destino }}
                        </button>
                      }
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <p class="tenue nota">
          Los estados solo avanzan por caminos válidos: de PREINSCRITO a PAGADO, de PAGADO a
          ACTIVO. Un alumno RETIRADO libera su vacante.
        </p>
      }
    </section>
  `,
  styles: `
    .titulo {
      margin-bottom: 22px;
    }
    .titulo h1 {
      font-size: 27px;
      margin: 4px 0 6px;
    }
    .titulo p {
      margin: 0;
    }
    .volver {
      font-size: 13.5px;
      text-decoration: none;
    }
    .aviso-ok {
      background: rgba(22, 130, 90, 0.12);
      color: #12805a;
      border-radius: 8px;
      padding: 10px 14px;
      margin: 0 0 14px;
      font-size: 14.5px;
    }
    .agregar {
      padding: 18px 20px;
      margin-bottom: 26px;
    }
    .agregar h2 {
      margin: 0 0 12px;
      font-size: 18px;
    }
    form {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: 14px;
    }
    label {
      display: flex;
      flex-direction: column;
      gap: 5px;
      font-size: 12px;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--texto-tenue);
      flex: 1;
      min-width: 200px;
    }
    label small {
      text-transform: none;
      letter-spacing: 0;
      font-size: 12.5px;
    }
    .seccion {
      font-size: 13px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--texto-tenue);
      margin-bottom: 10px;
    }
    .tabla-scroll {
      overflow-x: auto;
    }
    table {
      width: 100%;
      min-width: 640px;
      border-collapse: collapse;
      font-size: 14.5px;
    }
    th,
    td {
      text-align: left;
      padding: 11px 16px;
      border-bottom: 1px solid var(--borde);
    }
    th {
      font-size: 12px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--texto-tenue);
    }
    .num {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    .acciones {
      text-align: right;
      white-space: nowrap;
    }
    .estado {
      display: inline-block;
      font-size: 11.5px;
      padding: 2px 9px;
      border-radius: 999px;
      border: 1px solid var(--borde);
      color: var(--texto-tenue);
    }
    .estado-activo,
    .estado-aprobado,
    .estado-pagado {
      color: #12805a;
      border-color: #12805a;
    }
    .estado-retirado,
    .estado-desaprobado {
      color: var(--error);
      border-color: var(--error);
    }
    .enlace {
      background: none;
      border: 0;
      padding: 0 0 0 12px;
      color: var(--marca-primario);
      font-size: 13px;
      cursor: pointer;
    }
    .nota {
      margin: 10px 0 0;
      font-size: 12.5px;
      line-height: 1.55;
    }
  `,
})
export class ConsolaMatriculasPage implements OnInit {
  private readonly api = inject(MateduApi);

  readonly grupoId = input.required<string>();

  readonly grupo = signal<GrupoResumen | null>(null);
  readonly matriculas = signal<MatriculaEnGrupo[]>([]);
  readonly alumnos = signal<AlumnoResumen[]>([]);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  readonly aviso = signal<string | null>(null);

  alumnoElegido: string | null = null;
  montoAcordado: number | null = null;

  /** Los que aún no están en el grupo: ofrecer un repetido solo da un error. */
  readonly disponibles = computed(() => {
    const dentro = new Set(this.matriculas().map((m) => m.alumnoId));
    return this.alumnos().filter((alumno) => !dentro.has(alumno.id));
  });

  ngOnInit(): void {
    this.cargar();
  }

  precioDelGrupo(): string {
    const grupo = this.grupo();
    return grupo ? `${grupo.moneda} ${grupo.precio.toFixed(2)}` : '';
  }

  nombreDe(alumnoId: string): string {
    const alumno = this.alumnos().find((a) => a.id === alumnoId);
    return alumno ? `${alumno.apellidos}, ${alumno.nombres}` : '—';
  }

  matricular(): void {
    if (!this.alumnoElegido) {
      return;
    }

    this.guardando.set(true);
    this.limpiar();

    this.api.matricular(this.grupoId(), this.alumnoElegido, this.montoAcordado).subscribe({
      next: () => {
        this.guardando.set(false);
        this.alumnoElegido = null;
        this.montoAcordado = null;
        this.aviso.set('Alumno matriculado. Ya ve el curso en su aula.');
        this.cargar();
      },
      // El backend rechaza matricular dos veces al mismo alumno y avisa cuando
      // el grupo se quedó sin vacantes; su mensaje es más útil que uno nuestro.
      error: (fallo) => this.mostrarError(fallo, 'No se pudo matricular al alumno.'),
    });
  }

  cambiar(matricula: MatriculaEnGrupo, estado: EstadoMatricula): void {
    this.limpiar();

    const motivo = estado === 'RETIRADO' ? 'Retiro registrado desde la consola' : undefined;

    this.api.cambiarEstadoDeMatricula(matricula.id, estado, motivo).subscribe({
      next: () => this.cargar(),
      error: (fallo) => this.mostrarError(fallo, 'No se pudo cambiar el estado.'),
    });
  }

  private cargar(): void {
    this.api.matriculasDeGrupo(this.grupoId()).subscribe({
      next: (pagina) => this.matriculas.set(pagina.content),
      error: () => this.error.set('No se pudieron cargar las matrículas.'),
    });

    this.api.alumnos(0, 200).subscribe({
      next: (pagina) => this.alumnos.set(pagina.content),
      error: () => this.error.set('No se pudieron cargar los alumnos.'),
    });

    this.api.grupos(undefined, 0, 200).subscribe({
      next: (pagina) =>
        this.grupo.set(pagina.content.find((g) => g.id === this.grupoId()) ?? null),
      error: () => this.error.set('No se pudo cargar el grupo.'),
    });
  }

  private limpiar(): void {
    this.error.set(null);
    this.aviso.set(null);
  }

  private mostrarError(fallo: { error?: { detail?: string } }, respaldo: string): void {
    this.guardando.set(false);
    this.aviso.set(null);
    this.error.set(fallo?.error?.detail ?? respaldo);
  }
}
