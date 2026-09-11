import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AvanceTarea,
  CursoResumen,
  EntregaParaCalificar,
  TareaResumen,
} from '../../core/api/api.models';
import { MateduApi } from '../../core/api/matedu.api';

/**
 * Tareas del curso: pedirlas y calificarlas.
 *
 * La pantalla se ordena por lo que hace el docente, no por lo que guarda la
 * base: elige el curso, ve sus tareas con cuántas entregas le faltan revisar, y
 * al abrir una se encuentra la lista de entregas con las sin calificar arriba.
 * Calificar es escribir un número y un comentario en la misma fila; no hay que
 * abrir nada.
 */
@Component({
  selector: 'app-consola-tareas',
  imports: [FormsModule, DatePipe],
  template: `
    <header class="titulo">
      <h1>Tareas</h1>
      <p class="tenue">
        Lo que el alumno tiene que entregar. Mientras no se publique, no existe para él.
      </p>
    </header>

    @if (error(); as mensaje) {
      <p class="aviso-error" role="alert">{{ mensaje }}</p>
    }

    <label class="campo selector">
      <span>Curso</span>
      <select name="curso" [ngModel]="cursoId()" (ngModelChange)="elegirCurso($event)">
        <option value="">Elija un curso…</option>
        @for (curso of cursos(); track curso.id) {
          <option [value]="curso.id">{{ curso.codigo }} · {{ curso.nombre }}</option>
        }
      </select>
    </label>

    @if (cursoId()) {
      <div class="columnas">
        <section class="lista tarjeta">
          <header class="cabecera-lista">
            <h2>Tareas del curso</h2>
            <button type="button" class="boton" (click)="nueva()">Nueva tarea</button>
          </header>

          @if (tareas().length === 0 && !creando()) {
            <p class="tenue vacio">
              Este curso todavía no pide ninguna tarea.
            </p>
          }

          @for (tarea of tareas(); track tarea.id) {
            <button
              type="button"
              class="fila"
              [class.activa]="tareaActivaId() === tarea.id"
              (click)="abrir(tarea)"
            >
              <span class="nombre">{{ tarea.titulo }}</span>
              <span class="marcas">
                @if (!tarea.publicado) {
                  <span class="etiqueta">Borrador</span>
                } @else if (porRevisar(tarea.id) > 0) {
                  <span class="etiqueta pendiente">{{ porRevisar(tarea.id) }} por revisar</span>
                } @else {
                  <span class="etiqueta publicada">Publicada</span>
                }
              </span>
            </button>
          }
        </section>

        <section class="detalle">
          @if (creando() || tareaActiva()) {
            <div class="tarjeta editor">
              <h2>{{ creando() ? 'Nueva tarea' : 'Enunciado' }}</h2>

              <label class="campo">
                <span>Título</span>
                <input type="text" [(ngModel)]="titulo" name="titulo" />
              </label>

              <label class="campo">
                <span>Enunciado</span>
                <textarea rows="5" [(ngModel)]="descripcion" name="descripcion"></textarea>
                <span class="ayuda">Es lo único que el alumno va a leer.</span>
              </label>

              <div class="tres">
                <label class="campo">
                  <span>Entregar antes de</span>
                  <input type="datetime-local" [(ngModel)]="fechaLimite" name="fechaLimite" />
                </label>
                <label class="campo">
                  <span>Nota máxima</span>
                  <input type="number" min="1" step="0.5" [(ngModel)]="notaMaxima" name="notaMaxima" />
                </label>
                <label class="campo">
                  <span>Peso</span>
                  <input type="number" min="1" [(ngModel)]="peso" name="peso" />
                </label>
              </div>

              <label class="interruptor">
                <input type="checkbox" [(ngModel)]="aceptaTardias" name="aceptaTardias" />
                <span>Aceptar entregas fuera de plazo, marcándolas como tardías</span>
              </label>

              <div class="acciones">
                <button type="button" class="boton" [disabled]="guardando()" (click)="guardar()">
                  {{ creando() ? 'Crear' : 'Guardar' }}
                </button>

                @if (tareaActiva(); as tarea) {
                  @if (tarea.publicado) {
                    <button type="button" class="boton boton-secundario" (click)="publicar(false)">
                      Retirar
                    </button>
                  } @else {
                    <button type="button" class="boton boton-secundario" (click)="publicar(true)">
                      Publicar
                    </button>
                  }
                  <button type="button" class="boton boton-secundario" (click)="eliminar()">
                    Eliminar
                  </button>
                }
                @if (creando()) {
                  <button type="button" class="boton boton-secundario" (click)="cancelar()">
                    Cancelar
                  </button>
                }
              </div>
            </div>
          }

          @if (tareaActiva() && !creando()) {
            <div class="tarjeta entregas">
              <header class="cabecera-lista">
                <h2>Entregas</h2>
                @if (avance(); as datos) {
                  <span class="tenue resumen">
                    {{ datos.entregadas }} de {{ datos.matriculados }} entregaron ·
                    {{ datos.calificadas }} calificadas
                    @if (datos.tardias > 0) {
                      · {{ datos.tardias }} tardías
                    }
                  </span>
                }
              </header>

              @if (entregas().length === 0) {
                <p class="tenue vacio">Todavía no ha entregado nadie.</p>
              } @else {
                <div class="tabla-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Alumno</th>
                        <th>Entregó</th>
                        <th>Lo que mandó</th>
                        <th class="num">Nota</th>
                        <th>Observación</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (entrega of entregas(); track entrega.id) {
                        <tr [class.calificada]="entrega.nota != null">
                          <td>
                            {{ entrega.alumno }}
                            <small class="tenue mono">{{ entrega.grupo }}</small>
                          </td>
                          <td>
                            {{ entrega.entregadoEn | date: 'dd/MM HH:mm' }}
                            @if (entrega.tardia) {
                              <span class="etiqueta tardia">Tardía</span>
                            }
                          </td>
                          <td class="mandado">
                            @if (entrega.comentario) {
                              <span>{{ entrega.comentario }}</span>
                            }
                            @if (entrega.archivoId) {
                              <button type="button" class="enlace" (click)="abrirArchivo(entrega)">
                                Ver archivo
                              </button>
                            }
                          </td>
                          <td class="num">
                            <input
                              type="number"
                              class="nota"
                              min="0"
                              step="0.5"
                              [max]="notaMaximaActiva()"
                              [ngModel]="notas[entrega.id] ?? entrega.nota"
                              (ngModelChange)="notas[entrega.id] = $event"
                              [name]="'nota-' + entrega.id"
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              [ngModel]="comentarios[entrega.id] ?? entrega.retroalimentacion"
                              (ngModelChange)="comentarios[entrega.id] = $event"
                              [name]="'obs-' + entrega.id"
                              placeholder="Qué le falta"
                            />
                          </td>
                          <td class="derecha">
                            <button type="button" class="boton" (click)="calificar(entrega)">
                              {{ entrega.nota == null ? 'Calificar' : 'Corregir' }}
                            </button>
                            @if (entrega.nota != null) {
                              <button
                                type="button"
                                class="enlace"
                                (click)="quitarNota(entrega)"
                                title="Le devuelve la entrega al alumno"
                              >
                                Quitar nota
                              </button>
                            }
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </div>
          }
        </section>
      </div>
    }
  `,
  styles: `
    .titulo { margin-bottom: 18px; }
    .titulo p { margin: 4px 0 0; max-width: 66ch; }

    .selector { max-width: 420px; margin-bottom: 18px; }

    .columnas {
      display: grid;
      grid-template-columns: minmax(220px, 280px) 1fr;
      gap: 16px;
      align-items: start;
    }
    @media (max-width: 900px) {
      .columnas { grid-template-columns: 1fr; }
    }

    .lista { padding: 6px; display: flex; flex-direction: column; }
    .cabecera-lista {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      padding: 8px 10px 10px;
    }
    .cabecera-lista h2 { font-size: 14px; margin: 0; }
    .resumen { font-size: 12.5px; }

    .fila {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      background: none;
      border: 0;
      border-left: 3px solid transparent;
      padding: 8px 10px;
      text-align: left;
      cursor: pointer;
      color: inherit;
      font: inherit;
      font-size: 13.5px;
    }
    .fila:hover { background: var(--superficie-2); }
    .fila.activa {
      background: var(--superficie-2);
      border-left-color: var(--marca-primario);
      font-weight: 600;
    }
    .nombre { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .etiqueta.pendiente { color: var(--aviso); background: var(--aviso-suave); border-color: transparent; }
    .etiqueta.publicada { color: var(--exito); background: var(--exito-suave); border-color: transparent; }
    .etiqueta.tardia { color: var(--aviso); background: var(--aviso-suave); border-color: transparent; margin-left: 6px; }

    .detalle { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
    .editor { padding: 18px 20px; display: flex; flex-direction: column; gap: 14px; }
    .editor h2 { font-size: 15px; margin: 0; }

    .tres {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 12px;
    }

    .interruptor {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13.5px;
      color: var(--texto-2);
    }
    .interruptor input { width: auto; }

    .acciones { display: flex; flex-wrap: wrap; gap: 8px; }

    .entregas { padding: 6px 0 0; }
    .entregas .cabecera-lista { padding: 10px 16px; }
    .vacio { padding: 6px 16px 16px; margin: 0; }

    .num { text-align: right; }
    .derecha { text-align: right; white-space: nowrap; }
    .nota { width: 72px; text-align: right; }
    .mandado { max-width: 280px; }
    .mandado span {
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    td small { display: block; font-size: 11px; }

    tr.calificada td { color: var(--texto-tenue); }
    tr.calificada .nota { color: var(--texto); font-weight: 600; }

    .enlace {
      background: none;
      border: 0;
      padding: 0;
      font: inherit;
      font-size: 12.5px;
      color: var(--marca-primario);
      cursor: pointer;
      text-decoration: underline;
    }
    .derecha .enlace { display: block; margin-top: 4px; }
  `,
})
export class ConsolaTareasPage implements OnInit {
  private readonly api = inject(MateduApi);

  readonly cursos = signal<CursoResumen[]>([]);
  readonly cursoId = signal<string>('');
  readonly tareas = signal<TareaResumen[]>([]);
  readonly tareaActivaId = signal<string | null>(null);
  readonly entregas = signal<EntregaParaCalificar[]>([]);
  readonly avance = signal<AvanceTarea | null>(null);
  readonly creando = signal(false);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);

  /** Cuántas faltan por revisar en cada tarea, para marcarlas en la lista. */
  private readonly pendientes = signal<Record<string, number>>({});

  readonly tareaActiva = computed(
    () => this.tareas().find((tarea) => tarea.id === this.tareaActivaId()) ?? null,
  );

  /** El tope que acepta el campo de nota. 20 mientras no haya tarea abierta. */
  readonly notaMaximaActiva = computed(() => this.tareaActiva()?.notaMaxima ?? 20);

  titulo = '';
  descripcion = '';
  fechaLimite = '';
  notaMaxima = 20;
  peso = 100;
  aceptaTardias = true;

  /** Lo que el docente está escribiendo, por entrega, sin pisar lo guardado. */
  notas: Record<string, number | null> = {};
  comentarios: Record<string, string | null> = {};

  ngOnInit(): void {
    this.api.cursos(undefined, 0, 100).subscribe({
      next: (pagina) => this.cursos.set(pagina.content),
      error: () => this.error.set('No se pudieron cargar los cursos.'),
    });
  }

  porRevisar(tareaId: string): number {
    return this.pendientes()[tareaId] ?? 0;
  }

  elegirCurso(cursoId: string): void {
    this.cursoId.set(cursoId);
    this.tareaActivaId.set(null);
    this.creando.set(false);
    this.entregas.set([]);
    this.avance.set(null);

    if (!cursoId) {
      this.tareas.set([]);
      return;
    }
    this.cargarTareas();
  }

  nueva(): void {
    this.creando.set(true);
    this.tareaActivaId.set(null);
    this.titulo = '';
    this.descripcion = '';
    this.fechaLimite = '';
    this.notaMaxima = 20;
    this.peso = 100;
    this.aceptaTardias = true;
  }

  cancelar(): void {
    this.creando.set(false);
  }

  abrir(tarea: TareaResumen): void {
    this.creando.set(false);
    this.tareaActivaId.set(tarea.id);
    this.titulo = tarea.titulo;
    this.descripcion = tarea.descripcion ?? '';
    this.fechaLimite = tarea.fechaLimite ? tarea.fechaLimite.slice(0, 16) : '';
    this.notaMaxima = tarea.notaMaxima;
    this.peso = tarea.peso;
    this.aceptaTardias = tarea.aceptaTardias;

    this.cargarEntregas(tarea.id);
  }

  guardar(): void {
    const datos = {
      cursoId: this.cursoId(),
      titulo: this.titulo,
      descripcion: this.descripcion,
      // El navegador da la hora local sin zona; el servidor guarda en UTC.
      fechaLimite: this.fechaLimite ? new Date(this.fechaLimite).toISOString() : null,
      notaMaxima: this.notaMaxima,
      peso: this.peso,
      aceptaTardias: this.aceptaTardias,
    };

    this.guardando.set(true);
    const activa = this.tareaActivaId();
    const peticion = activa
      ? this.api.editarTarea(activa, datos)
      : this.api.crearTarea(datos);

    peticion.subscribe({
      next: (tarea) => {
        this.guardando.set(false);
        this.creando.set(false);
        this.cargarTareas(tarea.id);
      },
      error: (e: unknown) => {
        this.guardando.set(false);
        this.error.set(this.motivo(e, 'No se pudo guardar la tarea.'));
      },
    });
  }

  publicar(publicada: boolean): void {
    const id = this.tareaActivaId();
    if (!id) {
      return;
    }

    this.api.publicarTarea(id, publicada).subscribe({
      next: () => this.cargarTareas(id),
      error: (e: unknown) => this.error.set(this.motivo(e, 'No se pudo cambiar la tarea.')),
    });
  }

  eliminar(): void {
    const id = this.tareaActivaId();
    if (!id || !confirm('¿Eliminar esta tarea?')) {
      return;
    }

    this.api.eliminarTarea(id).subscribe({
      next: () => {
        this.tareaActivaId.set(null);
        this.cargarTareas();
      },
      error: (e: unknown) => this.error.set(this.motivo(e, 'No se pudo eliminar la tarea.')),
    });
  }

  calificar(entrega: EntregaParaCalificar): void {
    const nota = this.notas[entrega.id] ?? entrega.nota;
    if (nota == null) {
      this.error.set('Escriba la nota antes de calificar.');
      return;
    }

    this.api
      .calificarEntrega(entrega.id, {
        nota,
        retroalimentacion: this.comentarios[entrega.id] ?? entrega.retroalimentacion,
      })
      .subscribe({
        next: () => this.recargarEntregas(),
        error: (e: unknown) => this.error.set(this.motivo(e, 'No se pudo calificar.')),
      });
  }

  quitarNota(entrega: EntregaParaCalificar): void {
    this.api.quitarCalificacion(entrega.id).subscribe({
      next: () => {
        delete this.notas[entrega.id];
        delete this.comentarios[entrega.id];
        this.recargarEntregas();
      },
      error: (e: unknown) => this.error.set(this.motivo(e, 'No se pudo quitar la nota.')),
    });
  }

  abrirArchivo(entrega: EntregaParaCalificar): void {
    this.api.enlaceDeEntrega(entrega.id).subscribe({
      next: (enlace) => window.open(enlace.url, '_blank'),
      error: () => this.error.set('No se pudo abrir el archivo.'),
    });
  }

  private cargarTareas(seleccionar?: string): void {
    this.api.tareasDelCurso(this.cursoId()).subscribe({
      next: (lista) => {
        this.tareas.set(lista);
        this.contarPendientes(lista);

        if (seleccionar) {
          const tarea = lista.find((t) => t.id === seleccionar);
          if (tarea) {
            this.abrir(tarea);
          }
        }
      },
      error: () => this.error.set('No se pudieron cargar las tareas.'),
    });
  }

  /**
   * Cuántas entregas esperan nota en cada tarea.
   *
   * Se pregunta tarea por tarea porque es el dato que hace útil la lista: sin
   * él hay que abrirlas una por una para descubrir dónde hay trabajo.
   */
  private contarPendientes(tareas: TareaResumen[]): void {
    for (const tarea of tareas.filter((t) => t.publicado)) {
      this.api.avanceDeTarea(tarea.id).subscribe({
        next: (datos) =>
          this.pendientes.update((actual) => ({
            ...actual,
            [tarea.id]: datos.entregadas - datos.calificadas,
          })),
        error: () => undefined,
      });
    }
  }

  private cargarEntregas(tareaId: string): void {
    this.api.entregasDeTarea(tareaId).subscribe({
      next: (lista) => this.entregas.set(lista),
      error: () => this.entregas.set([]),
    });
    this.api.avanceDeTarea(tareaId).subscribe({
      next: (datos) => this.avance.set(datos),
      error: () => this.avance.set(null),
    });
  }

  private recargarEntregas(): void {
    const id = this.tareaActivaId();
    if (id) {
      this.cargarEntregas(id);
      this.cargarTareas(id);
    }
  }

  /** El motivo que manda el servidor, que suele decir exactamente qué pasó. */
  private motivo(error: unknown, porDefecto: string): string {
    const detalle = (error as { error?: { detail?: string } })?.error?.detail;
    return detalle ?? porDefecto;
  }
}
