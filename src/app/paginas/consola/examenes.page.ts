import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CrearOpcion,
  CursoResumen,
  ExamenResumen,
  PreguntaDetalle,
  TipoPregunta,
} from '../../core/api/api.models';
import { MateduApi } from '../../core/api/matedu.api';

/**
 * Armado de un examen: primero el examen, después sus preguntas.
 *
 * Antes esto eran dos mitades —un banco de preguntas a un lado y los exámenes
 * al otro— y había que crear la pregunta y luego arrastrarla al examen. Nadie
 * piensa así: quien arma un examen piensa en *las preguntas de este examen*.
 * Ahora se elige el examen y las preguntas se escriben dentro; el servidor las
 * crea y las enlaza en la misma transacción.
 */
@Component({
  selector: 'app-consola-examenes',
  imports: [FormsModule],
  template: `
    <header class="titulo">
      <h1>Evaluaciones</h1>
      <p class="tenue">
        Cree el examen y escriba sus preguntas debajo. Un examen no se publica sin
        preguntas.
      </p>
    </header>

    @if (error(); as mensaje) {
      <p class="aviso-error" role="alert">{{ mensaje }}</p>
    }

    <label class="selector">
      <span>Curso</span>
      <select name="curso" [ngModel]="cursoId()" (ngModelChange)="elegirCurso($event)">
        <option value="">Elija un curso…</option>
        @for (curso of cursos(); track curso.id) {
          <option [value]="curso.id">{{ curso.codigo }} · {{ curso.nombre }}</option>
        }
      </select>
    </label>

    @if (cursoId()) {
      <!-- ------------------------------------------------ paso 1: el examen -->
      <section class="tarjeta panel">
        <h2>1 · El examen</h2>

        @if (examenes().length > 0) {
          <div class="pestanas">
            @for (examen of examenes(); track examen.id) {
              <button
                type="button"
                class="pestana"
                [class.activa]="examenActivoId() === examen.id"
                (click)="elegirExamen(examen)"
              >
                {{ examen.titulo }}
                <span class="cuenta">{{ examen.totalPreguntas }}</span>
              </button>
            }
            <button type="button" class="pestana nuevo" (click)="nuevoExamen()">
              + Nuevo
            </button>
          </div>
        }

        @if (creandoExamen() || examenes().length === 0) {
          <form class="fila" (ngSubmit)="crearExamen()">
            <label class="ancho">
              <span>Título</span>
              <input
                type="text"
                name="tituloExamen"
                [(ngModel)]="tituloExamen"
                placeholder="Examen final"
              />
            </label>
            <label>
              <span>Minutos</span>
              <input type="number" name="minutos" min="1" [(ngModel)]="minutosLimite" />
            </label>
            <label>
              <span>Intentos</span>
              <input type="number" name="intentos" min="1" [(ngModel)]="intentos" />
            </label>
            <label class="interruptor">
              <input type="checkbox" name="aleatorio" [(ngModel)]="aleatorizar" />
              <span>Orden aleatorio</span>
            </label>
            <button type="submit" class="boton" [disabled]="!tituloExamen.trim()">
              Crear examen
            </button>
          </form>
          <p class="tenue nota">
            Con el orden aleatorio, cada alumno ve las preguntas en un orden distinto. Dentro
            de un mismo intento el orden no cambia, así que recargar la página no le
            desordena el examen a medias.
          </p>
        }

        @if (examenActivo(); as examen) {
          <div class="resumen">
            <div class="datos">
              <strong>{{ examen.titulo }}</strong>
              <small class="tenue">
                {{ examen.totalPreguntas }} pregunta(s)
                @if (examen.minutosLimite) {
                  · {{ examen.minutosLimite }} min
                }
                · {{ examen.intentosPermitidos }} intento(s)
              </small>
            </div>
            @if (examen.publicado) {
              <span class="estado publicado">Publicado</span>
            } @else {
              <span class="estado">Borrador</span>
            }
            <button
              type="button"
              class="boton boton-secundario chico"
              (click)="alternarPublicacion(examen)"
            >
              {{ examen.publicado ? 'Despublicar' : 'Publicar' }}
            </button>
          </div>
        }
      </section>

      <!-- ------------------------------------------- paso 2: sus preguntas -->
      @if (examenActivo(); as examen) {
        <section class="tarjeta panel">
          <h2>2 · Preguntas de «{{ examen.titulo }}»</h2>

          @for (pregunta of preguntas(); track pregunta.id; let i = $index) {
            <article class="pregunta">
              <div class="cabecera">
                <span class="orden">{{ i + 1 }}</span>
                <div class="datos">
                  <strong>{{ pregunta.enunciado }}</strong>
                  <small class="tenue">
                    {{ etiquetaTipo(pregunta.tipo) }} · {{ pregunta.puntaje }} punto(s)
                  </small>
                </div>
                <button type="button" class="quitar-texto" (click)="quitar(examen, pregunta)">
                  Quitar
                </button>
              </div>
              <ul>
                @for (opcion of pregunta.opciones; track opcion.id) {
                  <li [class.correcta]="opcion.correcta">
                    {{ opcion.texto }}
                    @if (opcion.correcta) {
                      <span aria-label="correcta">✓</span>
                    }
                  </li>
                }
              </ul>
            </article>
          } @empty {
            <p class="tenue vacio">
              Este examen todavía no tiene preguntas. Escriba la primera abajo.
            </p>
          }

          <form class="nueva" (ngSubmit)="agregarPregunta(examen)">
            <h3>Agregar una pregunta</h3>

            <label>
              <span>Enunciado</span>
              <textarea rows="2" name="enunciado" [(ngModel)]="enunciado"></textarea>
            </label>

            <div class="dos">
              <label>
                <span>Tipo</span>
                <select name="tipo" [ngModel]="tipo()" (ngModelChange)="cambiarTipo($event)">
                  <option value="OPCION_UNICA">Opción única</option>
                  <option value="OPCION_MULTIPLE">Opción múltiple</option>
                  <option value="VERDADERO_FALSO">Verdadero o falso</option>
                  <option value="RESPUESTA_CORTA">Respuesta corta</option>
                </select>
              </label>
              <label>
                <span>Puntaje</span>
                <input type="number" name="puntaje" min="1" step="1" [(ngModel)]="puntaje" />
              </label>
            </div>

            @if (tipo() !== 'RESPUESTA_CORTA') {
              <div class="opciones">
                <span class="etiqueta-opciones">
                  Opciones
                  <em class="tenue">
                    {{
                      tipo() === 'OPCION_MULTIPLE'
                        ? 'marque todas las correctas'
                        : 'marque la correcta'
                    }}
                  </em>
                </span>

                @for (opcion of opciones(); track $index) {
                  <div class="opcion">
                    <input
                      [type]="tipo() === 'OPCION_MULTIPLE' ? 'checkbox' : 'radio'"
                      name="correcta"
                      [checked]="opcion.correcta"
                      (change)="marcarCorrecta($index)"
                      [attr.aria-label]="'Marcar opción ' + ($index + 1) + ' como correcta'"
                    />
                    <input
                      type="text"
                      [name]="'opcion-' + $index"
                      [ngModel]="opcion.texto"
                      (ngModelChange)="cambiarTexto($index, $event)"
                      [readOnly]="tipo() === 'VERDADERO_FALSO'"
                      placeholder="Texto de la opción"
                    />
                    @if (tipo() !== 'VERDADERO_FALSO' && opciones().length > 2) {
                      <button type="button" class="quitar" (click)="quitarOpcion($index)">×</button>
                    }
                  </div>
                }

                @if (tipo() !== 'VERDADERO_FALSO') {
                  <button
                    type="button"
                    class="boton boton-secundario chico"
                    (click)="agregarOpcion()"
                  >
                    Agregar opción
                  </button>
                }
              </div>
            } @else {
              <label>
                <span>Respuesta esperada</span>
                <input type="text" name="respuesta" [(ngModel)]="respuestaCorta" />
                <small class="tenue">
                  Se compara sin distinguir mayúsculas ni espacios sobrantes.
                </small>
              </label>
            }

            <button type="submit" class="boton" [disabled]="!puedeAgregar() || guardando()">
              {{ guardando() ? 'Agregando…' : 'Agregar al examen' }}
            </button>
          </form>
        </section>
      }
    }
  `,
  styles: `
    .titulo {
      margin-bottom: 20px;
    }
    .titulo h1 {
      font-size: 27px;
      margin-bottom: 6px;
    }
    .titulo p {
      margin: 0;
      max-width: 66ch;
    }
    .selector {
      display: flex;
      flex-direction: column;
      gap: 5px;
      max-width: 420px;
      margin-bottom: 20px;
      font-size: 12px;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--texto-tenue);
    }
    .panel {
      padding: 20px 22px;
      margin-bottom: 18px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      max-width: 760px;
    }
    .panel h2 {
      margin: 0;
      font-size: 18px;
    }
    .panel h3 {
      margin: 0;
      font-size: 12.5px;
      letter-spacing: 0.07em;
      text-transform: uppercase;
      color: var(--texto-tenue);
    }
    .pestanas {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .pestana {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      border: 1px solid var(--borde);
      background: var(--fondo-tarjeta);
      color: var(--texto-tenue);
      border-radius: 999px;
      padding: 6px 14px;
      font-size: 13.5px;
      cursor: pointer;
    }
    .pestana.activa {
      background: var(--marca-primario);
      border-color: var(--marca-primario);
      color: #fff;
    }
    .pestana .cuenta {
      font-size: 11px;
      opacity: 0.75;
      font-variant-numeric: tabular-nums;
    }
    .pestana.nuevo {
      border-style: dashed;
    }
    form.fila {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: 12px;
    }
    label {
      display: flex;
      flex-direction: column;
      gap: 5px;
      font-size: 12px;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--texto-tenue);
    }
    label small {
      text-transform: none;
      letter-spacing: 0;
      font-size: 12.5px;
    }
    .ancho {
      flex: 1;
      min-width: 200px;
    }
    .interruptor {
      flex-direction: row;
      align-items: center;
      gap: 7px;
      text-transform: none;
      letter-spacing: 0;
      font-size: 14px;
      color: inherit;
      padding-bottom: 8px;
    }
    .nota {
      margin: -6px 0 0;
      font-size: 12.5px;
      line-height: 1.55;
      max-width: 66ch;
    }
    .resumen {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
      border-top: 1px solid var(--borde);
      padding-top: 14px;
    }
    .resumen .datos {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
      min-width: 0;
    }
    .estado {
      font-size: 11.5px;
      padding: 2px 9px;
      border-radius: 999px;
      background: rgba(150, 150, 150, 0.16);
      color: var(--texto-tenue);
    }
    .estado.publicado {
      background: rgba(22, 130, 90, 0.14);
      color: #12805a;
    }
    .pregunta {
      border: 1px solid var(--borde);
      border-radius: 10px;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 7px;
    }
    .cabecera {
      display: flex;
      align-items: flex-start;
      gap: 11px;
    }
    .orden {
      width: 24px;
      height: 24px;
      border-radius: 999px;
      background: var(--marca-primario-suave);
      color: var(--marca-primario);
      display: grid;
      place-items: center;
      font-size: 12.5px;
      font-weight: 600;
      flex: none;
    }
    .cabecera .datos {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
      min-width: 0;
    }
    .pregunta ul {
      margin: 0;
      padding-left: 53px;
      font-size: 13.5px;
      color: var(--texto-tenue);
      line-height: 1.65;
    }
    .pregunta li.correcta {
      color: #12805a;
      font-weight: 600;
    }
    form.nueva {
      display: flex;
      flex-direction: column;
      gap: 13px;
      border-top: 1px solid var(--borde);
      padding-top: 16px;
    }
    .dos {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      max-width: 420px;
    }
    .opciones {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .etiqueta-opciones {
      font-size: 12px;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--texto-tenue);
    }
    .etiqueta-opciones em {
      font-style: normal;
      text-transform: none;
      letter-spacing: 0;
      margin-left: 8px;
    }
    .opcion {
      display: flex;
      align-items: center;
      gap: 9px;
      max-width: 520px;
    }
    .opcion input[type='text'] {
      flex: 1;
      min-width: 0;
    }
    .quitar {
      border: 0;
      background: none;
      color: var(--texto-tenue);
      font-size: 19px;
      line-height: 1;
      cursor: pointer;
      padding: 0 4px;
    }
    .quitar-texto {
      border: 0;
      background: none;
      color: var(--error);
      font-size: 13px;
      cursor: pointer;
      padding: 0;
      flex: none;
    }
    .chico {
      padding: 5px 12px;
      font-size: 13px;
      align-self: flex-start;
    }
    .vacio {
      margin: 0;
      font-size: 14px;
    }
  `,
})
export class ConsolaExamenesPage implements OnInit {
  private readonly api = inject(MateduApi);

  readonly cursos = signal<CursoResumen[]>([]);
  readonly cursoId = signal<string>('');
  readonly examenes = signal<ExamenResumen[]>([]);
  readonly examenActivoId = signal<string | null>(null);
  readonly preguntas = signal<PreguntaDetalle[]>([]);
  readonly creandoExamen = signal(false);
  readonly guardando = signal(false);
  readonly tipo = signal<TipoPregunta>('OPCION_UNICA');
  readonly opciones = signal<CrearOpcion[]>([
    { texto: '', correcta: true },
    { texto: '', correcta: false },
  ]);
  readonly error = signal<string | null>(null);

  enunciado = '';
  puntaje = 1;
  respuestaCorta = '';
  tituloExamen = '';
  minutosLimite: number | null = 30;
  intentos = 1;
  aleatorizar = true;

  readonly examenActivo = computed(
    () => this.examenes().find((examen) => examen.id === this.examenActivoId()) ?? null,
  );

  ngOnInit(): void {
    this.api.cursos(undefined, 0, 100).subscribe({
      next: (pagina) => this.cursos.set(pagina.content),
      error: () => this.error.set('No se pudieron cargar los cursos.'),
    });
  }

  elegirCurso(cursoId: string): void {
    this.cursoId.set(cursoId);
    this.examenActivoId.set(null);
    this.examenes.set([]);
    this.preguntas.set([]);
    this.creandoExamen.set(false);

    if (cursoId) {
      this.cargarExamenes();
    }
  }

  elegirExamen(examen: ExamenResumen): void {
    this.examenActivoId.set(examen.id);
    this.creandoExamen.set(false);
    this.error.set(null);
    this.cargarPreguntas(examen.id);
  }

  nuevoExamen(): void {
    this.creandoExamen.set(true);
    this.tituloExamen = '';
    this.error.set(null);
  }

  crearExamen(): void {
    if (!this.tituloExamen.trim() || !this.cursoId()) {
      return;
    }

    this.error.set(null);
    this.api
      .crearExamen({
        cursoId: this.cursoId(),
        titulo: this.tituloExamen.trim(),
        minutosLimite: this.minutosLimite,
        intentosPermitidos: this.intentos,
        aleatorizar: this.aleatorizar,
      })
      .subscribe({
        next: (examen) => {
          this.tituloExamen = '';
          this.creandoExamen.set(false);
          this.examenActivoId.set(examen.id);
          this.cargarExamenes();
          this.cargarPreguntas(examen.id);
        },
        error: (fallo) => this.mostrarError(fallo, 'No se pudo crear el examen.'),
      });
  }

  cambiarTipo(tipo: TipoPregunta): void {
    this.tipo.set(tipo);

    // Verdadero/falso trae sus dos opciones puestas: escribirlas cada vez es
    // trabajo repetido y una fuente de erratas.
    if (tipo === 'VERDADERO_FALSO') {
      this.opciones.set([
        { texto: 'Verdadero', correcta: true },
        { texto: 'Falso', correcta: false },
      ]);
    } else if (tipo === 'RESPUESTA_CORTA') {
      this.opciones.set([]);
    } else {
      this.opciones.set([
        { texto: '', correcta: true },
        { texto: '', correcta: false },
      ]);
    }
  }

  agregarOpcion(): void {
    this.opciones.update((actuales) => [...actuales, { texto: '', correcta: false }]);
  }

  quitarOpcion(indice: number): void {
    this.opciones.update((actuales) => actuales.filter((_, i) => i !== indice));
  }

  cambiarTexto(indice: number, texto: string): void {
    this.opciones.update((actuales) =>
      actuales.map((opcion, i) => (i === indice ? { ...opcion, texto } : opcion)),
    );
  }

  /**
   * En opción única, marcar una desmarca las demás.
   *
   * Guardar dos correctas en una pregunta de opción única dejaría un examen que
   * ningún alumno puede aprobar del todo, y el error solo se vería al calificar.
   */
  marcarCorrecta(indice: number): void {
    this.opciones.update((actuales) =>
      actuales.map((opcion, i) => {
        if (this.tipo() === 'OPCION_MULTIPLE') {
          return i === indice ? { ...opcion, correcta: !opcion.correcta } : opcion;
        }
        return { ...opcion, correcta: i === indice };
      }),
    );
  }

  puedeAgregar(): boolean {
    if (!this.enunciado.trim()) {
      return false;
    }
    if (this.tipo() === 'RESPUESTA_CORTA') {
      return this.respuestaCorta.trim().length > 0;
    }
    const conTexto = this.opciones().filter((opcion) => opcion.texto.trim().length > 0);
    return conTexto.length >= 2 && conTexto.some((opcion) => opcion.correcta);
  }

  agregarPregunta(examen: ExamenResumen): void {
    if (!this.puedeAgregar()) {
      return;
    }

    const opciones =
      this.tipo() === 'RESPUESTA_CORTA'
        ? [{ texto: this.respuestaCorta.trim(), correcta: true }]
        : this.opciones()
            .filter((opcion) => opcion.texto.trim().length > 0)
            .map((opcion, indice) => ({ ...opcion, orden: indice + 1 }));

    this.guardando.set(true);
    this.error.set(null);

    // Una sola llamada: el servidor crea la pregunta y la enlaza al examen en la
    // misma transacción, así que no puede quedar una pregunta suelta.
    this.api
      .crearPreguntaEnExamen(examen.id, {
        enunciado: this.enunciado.trim(),
        tipo: this.tipo(),
        puntaje: this.puntaje,
        opciones,
      })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.enunciado = '';
          this.respuestaCorta = '';
          this.cambiarTipo(this.tipo());
          this.cargarExamenes();
          this.cargarPreguntas(examen.id);
        },
        // El backend valida que haya una correcta y que opción única no tenga
        // dos; su mensaje dice exactamente cuál falla.
        error: (fallo) => this.mostrarError(fallo, 'No se pudo agregar la pregunta.'),
      });
  }

  quitar(examen: ExamenResumen, pregunta: PreguntaDetalle): void {
    this.error.set(null);

    this.api.quitarPreguntaDeExamen(examen.id, pregunta.id).subscribe({
      next: () => {
        this.cargarExamenes();
        this.cargarPreguntas(examen.id);
      },
      error: (fallo) => this.mostrarError(fallo, 'No se pudo quitar la pregunta.'),
    });
  }

  alternarPublicacion(examen: ExamenResumen): void {
    this.error.set(null);

    this.api.publicarExamen(examen.id, !examen.publicado).subscribe({
      next: () => this.cargarExamenes(),
      // No se puede publicar un examen sin preguntas: lo impide el backend.
      error: (fallo) => this.mostrarError(fallo, 'No se pudo cambiar la publicación.'),
    });
  }

  etiquetaTipo(tipo: TipoPregunta): string {
    const etiquetas: Record<TipoPregunta, string> = {
      OPCION_UNICA: 'Opción única',
      OPCION_MULTIPLE: 'Opción múltiple',
      VERDADERO_FALSO: 'V / F',
      RESPUESTA_CORTA: 'Respuesta corta',
    };
    return etiquetas[tipo];
  }

  private cargarExamenes(): void {
    this.api.examenesDeCurso(this.cursoId()).subscribe({
      next: (examenes) => {
        this.examenes.set(examenes);

        if (!this.examenActivoId() && examenes.length > 0) {
          this.examenActivoId.set(examenes[0].id);
          this.cargarPreguntas(examenes[0].id);
        }
      },
      error: () => this.error.set('No se pudieron cargar los exámenes.'),
    });
  }

  private cargarPreguntas(examenId: string): void {
    this.api.preguntasDelExamen(examenId).subscribe({
      next: (preguntas) => this.preguntas.set(preguntas),
      error: () => this.error.set('No se pudieron cargar las preguntas del examen.'),
    });
  }

  private mostrarError(fallo: { error?: { detail?: string } }, respaldo: string): void {
    this.guardando.set(false);
    this.error.set(fallo?.error?.detail ?? respaldo);
  }
}
