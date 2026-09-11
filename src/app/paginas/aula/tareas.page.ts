import { DatePipe } from '@angular/common';
import { Component, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TareaDelAlumno } from '../../core/api/api.models';
import { MateduApi } from '../../core/api/matedu.api';

/**
 * Las tareas del alumno en un grupo.
 *
 * Lo primero que necesita saber quien abre esto es qué le falta y para cuándo,
 * así que cada tarea dice su estado en una línea —entregada, calificada, sin
 * entregar, fuera de plazo— antes que cualquier otra cosa. Entregar es escribir
 * o adjuntar en la misma tarjeta: no hay que abrir otra pantalla.
 *
 * Cuando ya le calificaron, el formulario desaparece y queda la nota con el
 * comentario del docente, que es lo que el alumno viene a ver.
 */
@Component({
  selector: 'app-aula-tareas',
  imports: [FormsModule, DatePipe, RouterLink],
  template: `
    <header class="titulo">
      <a class="volver" [routerLink]="['/aula/cursos', grupoId()]">← Volver al curso</a>
      <h1>Tareas</h1>
    </header>

    @if (error(); as mensaje) {
      <p class="aviso-error" role="alert">{{ mensaje }}</p>
    }

    @if (cargando()) {
      <p class="tenue">Cargando…</p>
    } @else if (tareas().length === 0) {
      <div class="tarjeta vacio">
        <strong>No hay tareas por ahora</strong>
        <p class="tenue">Cuando su docente pida una, aparecerá aquí.</p>
      </div>
    }

    <div class="tareas">
      @for (tarea of tareas(); track tarea.id) {
        <article class="tarjeta tarea">
          <header>
            <h2>{{ tarea.titulo }}</h2>
            <span class="estado" [class]="clase(tarea)">{{ estado(tarea) }}</span>
          </header>

          @if (tarea.fechaLimite) {
            <p class="plazo tenue">
              Entregar antes del {{ tarea.fechaLimite | date: 'dd/MM/yyyy, HH:mm' }}
              @if (tarea.vencida && tarea.aceptaTardias && !tarea.entrega) {
                · el plazo pasó, aún puede entregar y quedará marcada como tardía
              }
            </p>
          }

          @if (tarea.descripcion) {
            <p class="enunciado">{{ tarea.descripcion }}</p>
          }

          @if (calificada(tarea)) {
            <div class="calificacion">
              <p class="nota">
                <strong>{{ tarea.entrega!.nota }}</strong>
                <span class="tenue">de {{ tarea.notaMaxima }}</span>
              </p>
              @if (tarea.entrega!.retroalimentacion) {
                <p class="observacion">{{ tarea.entrega!.retroalimentacion }}</p>
              }
            </div>
          } @else if (puedeEntregar(tarea)) {
            <div class="entrega">
              @if (tarea.entrega) {
                <p class="tenue ya">
                  Entregó el {{ tarea.entrega.entregadoEn | date: 'dd/MM HH:mm' }}. Puede
                  reemplazarlo mientras no lo califiquen.
                </p>
              }

              <label class="campo">
                <span>Comentario</span>
                <textarea
                  rows="3"
                  [ngModel]="comentarios[tarea.id] ?? tarea.entrega?.comentario ?? ''"
                  (ngModelChange)="comentarios[tarea.id] = $event"
                  [name]="'comentario-' + tarea.id"
                  placeholder="Cuéntele a su docente qué está entregando"
                ></textarea>
              </label>

              <div class="archivo">
                <input
                  type="file"
                  [id]="'archivo-' + tarea.id"
                  (change)="elegirArchivo(tarea, $event)"
                />
                @if (archivos[tarea.id]; as nombre) {
                  <span class="tenue">{{ nombre }}</span>
                }
              </div>

              <button
                type="button"
                class="boton"
                [disabled]="enviando() === tarea.id"
                (click)="entregar(tarea)"
              >
                {{ enviando() === tarea.id ? 'Enviando…' : tarea.entrega ? 'Reemplazar entrega' : 'Entregar' }}
              </button>
            </div>
          } @else {
            <p class="cerrada tenue">
              El plazo para entregar pasó y esta tarea no acepta entregas tardías.
            </p>
          }
        </article>
      }
    </div>
  `,
  styles: `
    .titulo { margin-bottom: 20px; }
    .titulo h1 { font-size: 22px; margin: 6px 0 0; }
    .volver { font-size: 13px; }

    .tareas { display: flex; flex-direction: column; gap: 14px; }

    .tarea { padding: 18px 20px; }
    .tarea > header {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 6px;
    }
    .tarea h2 { font-size: 16px; margin: 0; }

    .estado {
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      padding: 2px 8px;
      border-radius: var(--radio-sm);
      white-space: nowrap;
    }
    .estado.pendiente { color: var(--aviso); background: var(--aviso-suave); }
    .estado.entregada { color: var(--texto-2); background: var(--neutro-suave); }
    .estado.calificada { color: var(--exito); background: var(--exito-suave); }
    .estado.cerrada { color: var(--error); background: var(--error-suave); }

    .plazo { margin: 0 0 10px; font-size: 12.5px; }
    .enunciado { margin: 0 0 14px; white-space: pre-wrap; max-width: 70ch; }

    .calificacion {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 8px 18px;
      padding: 12px 14px;
      background: var(--exito-suave);
      border-radius: var(--radio);
    }
    .nota { margin: 0; display: flex; align-items: baseline; gap: 6px; }
    .nota strong { font-size: 24px; color: var(--exito); }
    .observacion { margin: 0; font-size: 14px; max-width: 60ch; }

    .entrega { display: flex; flex-direction: column; gap: 10px; max-width: 560px; }
    .ya { margin: 0; font-size: 12.5px; }
    .archivo { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .archivo input { width: auto; }
    .entrega .boton { align-self: flex-start; }

    .cerrada { margin: 0; font-size: 13px; }

    .vacio { padding: 22px 24px; }
    .vacio strong { display: block; margin-bottom: 4px; }
    .vacio p { margin: 0; }
  `,
})
export class AulaTareasPage implements OnInit {
  private readonly api = inject(MateduApi);

  readonly grupoId = input.required<string>();

  readonly tareas = signal<TareaDelAlumno[]>([]);
  readonly cargando = signal(true);
  readonly enviando = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  comentarios: Record<string, string> = {};
  /** Nombre del archivo elegido, por tarea, para confirmarle al alumno cuál mandó. */
  archivos: Record<string, string> = {};
  private seleccionados: Record<string, File> = {};

  ngOnInit(): void {
    this.cargar();
  }

  /**
   * Si ya tiene nota.
   *
   * Se compara con != null y no con !== null a proposito: la API omite los
   * campos nulos, asi que una entrega sin calificar no trae 'nota' como null,
   * no la trae en absoluto. Con !== null, undefined pasaba el filtro y una
   * entrega recien hecha aparecia como calificada con la nota en blanco.
   */
  calificada(tarea: TareaDelAlumno): boolean {
    return tarea.entrega != null && tarea.entrega.nota != null;
  }

  estado(tarea: TareaDelAlumno): string {
    if (this.calificada(tarea)) {
      return 'Calificada';
    }
    if (tarea.entrega) {
      return tarea.entrega.tardia ? 'Entregada tarde' : 'Entregada';
    }
    return this.puedeEntregar(tarea) ? 'Sin entregar' : 'Fuera de plazo';
  }

  clase(tarea: TareaDelAlumno): string {
    if (this.calificada(tarea)) {
      return 'calificada';
    }
    if (tarea.entrega) {
      return 'entregada';
    }
    return this.puedeEntregar(tarea) ? 'pendiente' : 'cerrada';
  }

  puedeEntregar(tarea: TareaDelAlumno): boolean {
    return !tarea.vencida || tarea.aceptaTardias;
  }

  elegirArchivo(tarea: TareaDelAlumno, evento: Event): void {
    const archivo = (evento.target as HTMLInputElement).files?.[0];
    if (archivo) {
      this.seleccionados[tarea.id] = archivo;
      this.archivos[tarea.id] = archivo.name;
    }
  }

  /**
   * Entrega: primero el archivo, si lo hay, y después la entrega con su id.
   *
   * Van en dos pasos porque el archivo puede pesar y la entrega es un dato
   * pequeño: si se mandara todo junto, un corte a mitad de subida dejaría al
   * alumno sin saber si entregó o no.
   */
  entregar(tarea: TareaDelAlumno): void {
    this.error.set(null);
    this.enviando.set(tarea.id);

    const archivo = this.seleccionados[tarea.id];
    if (!archivo) {
      this.guardarEntrega(tarea, tarea.entrega?.archivoId ?? null);
      return;
    }

    this.api.subirArchivoDeEntrega(tarea.id, archivo).subscribe({
      next: (subido) => this.guardarEntrega(tarea, subido.id),
      error: (e: unknown) => {
        this.enviando.set(null);
        this.error.set(this.motivo(e, 'No se pudo subir el archivo.'));
      },
    });
  }

  private guardarEntrega(tarea: TareaDelAlumno, archivoId: string | null): void {
    this.api
      .entregarTarea(tarea.id, {
        archivoId,
        comentario: this.comentarios[tarea.id] ?? tarea.entrega?.comentario ?? null,
      })
      .subscribe({
        next: () => {
          this.enviando.set(null);
          delete this.seleccionados[tarea.id];
          this.cargar();
        },
        error: (e: unknown) => {
          this.enviando.set(null);
          this.error.set(this.motivo(e, 'No se pudo entregar.'));
        },
      });
  }

  private cargar(): void {
    this.api.misTareas(this.grupoId()).subscribe({
      next: (lista) => {
        this.tareas.set(lista);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.error.set('No se pudieron cargar las tareas.');
      },
    });
  }

  private motivo(error: unknown, porDefecto: string): string {
    const detalle = (error as { error?: { detail?: string } })?.error?.detail;
    return detalle ?? porDefecto;
  }
}
