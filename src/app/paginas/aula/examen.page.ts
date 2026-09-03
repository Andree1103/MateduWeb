import { Component, computed, inject, input, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject, debounceTime, groupBy, mergeMap } from 'rxjs';
import {
  comoReloj,
  IntentoEnCurso,
  PreguntaParaRendir,
  ResultadoIntento,
} from '../../core/api/api.models';
import { MateduApi } from '../../core/api/matedu.api';

/**
 * Rendicion de un examen.
 *
 * Dos cosas hacen que esto funcione el dia del examen y no genere reclamos:
 *
 *   1. AUTOGUARDADO. Cada cambio se manda al servidor, con un respiro de medio
 *      segundo para no disparar una peticion por tecla. Si se cae el navegador,
 *      lo respondido ya esta guardado.
 *
 *   2. EL RELOJ ES DEL SERVIDOR. El contador de pantalla arranca de los
 *      segundos que informa la API, no de la hora del equipo del alumno. Al
 *      llegar a cero se entrega solo.
 */
@Component({
  selector: 'app-aula-examen',
  imports: [FormsModule, RouterLink],
  template: `
    @if (cargando()) {
      <p class="tenue">Abriendo el examen...</p>
    } @else if (error(); as mensaje) {
      <p class="aviso-error" role="alert">{{ mensaje }}</p>
      <p><a routerLink="/aula">Volver a mis cursos</a></p>
    } @else if (resultado(); as fin) {
      <section class="cierre tarjeta">
        <span class="etiqueta">{{ fin.estado === 'EXPIRADO' ? 'Tiempo agotado' : 'Entregado' }}</span>
        <h1>Examen entregado</h1>

        @if (fin.mostrarResultado && fin.nota !== null) {
          <p class="nota">{{ fin.nota }}</p>
          <p class="tenue">{{ fin.puntaje }} de {{ fin.puntajeMaximo }} puntos</p>
        } @else {
          <p class="tenue">Su centro publicara el resultado mas adelante.</p>
        }

        <a class="boton" routerLink="/aula">Volver a mis cursos</a>
      </section>
    } @else if (intento(); as datos) {
      <header class="cabecera">
        <div>
          <h1>{{ datos.titulo }}</h1>
          <p class="tenue">
            Intento {{ datos.numero }} de {{ datos.intentosPermitidos }} ·
            {{ respondidas() }} de {{ datos.preguntas.length }} respondidas
          </p>
        </div>

        @if (datos.expiraEn) {
          <div class="reloj" [class.apremio]="segundos() < 120">
            <span class="tiempo">{{ reloj() }}</span>
            <span class="tenue">restante</span>
          </div>
        }
      </header>

      <p class="guardado tenue" aria-live="polite">{{ estadoGuardado() }}</p>

      <div class="preguntas">
        @for (pregunta of datos.preguntas; track pregunta.id; let i = $index) {
          <article class="pregunta tarjeta" [class.respondida]="estaRespondida(pregunta)">
            <header class="pregunta-cabecera">
              <span class="numero">{{ i + 1 }}</span>
              <div>
                <p class="enunciado">{{ pregunta.enunciado }}</p>
                <small class="tenue">{{ pregunta.puntaje }} punto(s)</small>
              </div>
            </header>

            @if (pregunta.tipo === 'RESPUESTA_CORTA') {
              <input
                type="text"
                class="respuesta-corta"
                [ngModel]="texto()[pregunta.id] ?? ''"
                (ngModelChange)="cambiarTexto(pregunta, $event)"
                [name]="'texto-' + pregunta.id"
                placeholder="Escriba su respuesta"
              />
            } @else {
              <div class="opciones">
                @for (opcion of pregunta.opciones; track opcion.id) {
                  <label class="opcion" [class.marcada]="estaMarcada(pregunta, opcion.id)">
                    <input
                      [type]="pregunta.tipo === 'OPCION_MULTIPLE' ? 'checkbox' : 'radio'"
                      [name]="'p-' + pregunta.id"
                      [checked]="estaMarcada(pregunta, opcion.id)"
                      (change)="alternar(pregunta, opcion.id)"
                    />
                    <span>{{ opcion.texto }}</span>
                  </label>
                }
              </div>
            }
          </article>
        }
      </div>

      <div class="entregar">
        @if (sinResponder() > 0) {
          <p class="aviso tenue">
            Le quedan {{ sinResponder() }} pregunta(s) sin responder. Puede entregar igual:
            valen cero.
          </p>
        }
        <button type="button" class="boton" [disabled]="entregando()" (click)="entregar()">
          {{ entregando() ? 'Entregando...' : 'Entregar examen' }}
        </button>
      </div>
    }
  `,
  styles: `
    .cabecera {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 20px;
      margin-bottom: 8px;
    }
    .cabecera h1 {
      font-size: 25px;
      margin-bottom: 4px;
    }
    .cabecera p {
      margin: 0;
      font-size: 13.5px;
    }
    .reloj {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      flex: none;
      padding: 8px 16px;
      border: 1px solid var(--linea);
      border-radius: var(--radio-sm);
    }
    .reloj.apremio {
      border-color: var(--error);
      color: var(--error);
    }
    .tiempo {
      font-family: var(--fuente-mono);
      font-size: 24px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
    .reloj span:last-child {
      font-size: 11px;
    }
    .guardado {
      font-size: 12.5px;
      margin: 0 0 20px;
      min-height: 18px;
    }
    .preguntas {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .pregunta {
      padding: 20px 22px;
    }
    .pregunta.respondida {
      border-color: var(--marca-primario);
    }
    .pregunta-cabecera {
      display: flex;
      gap: 14px;
      margin-bottom: 14px;
    }
    .numero {
      display: grid;
      place-items: center;
      flex: none;
      width: 26px;
      height: 26px;
      font-size: 12.5px;
      font-weight: 700;
      border-radius: 50%;
      background: var(--superficie-2);
      border: 1px solid var(--linea);
    }
    .pregunta.respondida .numero {
      color: #fff;
      background: var(--marca-primario);
      border-color: var(--marca-primario);
    }
    .enunciado {
      margin: 0 0 3px;
      font-size: 15.5px;
      line-height: 1.5;
    }
    .opciones {
      display: flex;
      flex-direction: column;
      gap: 7px;
    }
    .opcion {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px 13px;
      font-size: 14.5px;
      border: 1px solid var(--linea);
      border-radius: var(--radio-sm);
      cursor: pointer;
    }
    .opcion:hover {
      background: var(--superficie-2);
    }
    .opcion.marcada {
      border-color: var(--marca-primario);
      background: var(--marca-primario-suave);
    }
    .opcion input {
      margin-top: 2px;
    }
    .respuesta-corta {
      width: 100%;
      padding: 10px 12px;
      font: inherit;
      font-size: 14.5px;
      color: var(--texto);
      background: var(--superficie);
      border: 1px solid var(--linea);
      border-radius: var(--radio-sm);
    }
    .entregar {
      margin-top: 26px;
      padding-top: 20px;
      border-top: 1px solid var(--linea);
    }
    .entregar .aviso {
      margin: 0 0 12px;
      font-size: 13.5px;
    }
    .cierre {
      padding: 40px 30px;
      text-align: center;
      max-width: 46ch;
      margin: 40px auto;
    }
    .cierre h1 {
      font-size: 24px;
      margin: 10px 0 8px;
    }
    .cierre p {
      margin: 0 0 6px;
    }
    .nota {
      font-size: 46px;
      font-weight: 700;
      color: var(--marca-primario);
      font-variant-numeric: tabular-nums;
    }
    .cierre .boton {
      margin-top: 18px;
      text-decoration: none;
    }
  `,
})
export class AulaExamenPage implements OnInit, OnDestroy {
  private readonly api = inject(MateduApi);
  private readonly router = inject(Router);

  readonly examenId = input.required<string>();

  protected readonly intento = signal<IntentoEnCurso | null>(null);
  protected readonly resultado = signal<ResultadoIntento | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly entregando = signal(false);
  protected readonly segundos = signal(0);
  protected readonly estadoGuardado = signal('');

  /** Respuestas en pantalla, para no depender de recargar el intento. */
  protected readonly marcadas = signal<Record<string, string[]>>({});
  protected readonly texto = signal<Record<string, string>>({});

  protected readonly reloj = computed(() => comoReloj(this.segundos()));

  protected readonly respondidas = computed(() => {
    const datos = this.intento();
    return datos ? datos.preguntas.filter((p) => this.estaRespondida(p)).length : 0;
  });

  protected readonly sinResponder = computed(() => {
    const datos = this.intento();
    return datos ? datos.preguntas.length - this.respondidas() : 0;
  });

  /**
   * Cola de autoguardado.
   *
   * Se agrupa por pregunta para que el respiro de medio segundo sea por
   * pregunta y no global: responder rapido dos preguntas seguidas no debe hacer
   * que la primera se pierda.
   */
  private readonly cambios = new Subject<{ preguntaId: string }>();
  private cronometro?: ReturnType<typeof setInterval>;

  constructor() {
    this.cambios
      .pipe(
        groupBy((cambio) => cambio.preguntaId),
        mergeMap((porPregunta) => porPregunta.pipe(debounceTime(500))),
      )
      .subscribe((cambio) => this.enviar(cambio.preguntaId));
  }

  ngOnInit(): void {
    this.api.iniciarExamen(this.examenId()).subscribe({
      next: (datos) => {
        this.intento.set(datos);
        this.marcadas.set(
          Object.fromEntries(datos.preguntas.map((p) => [p.id, p.opcionesElegidas ?? []])),
        );
        this.texto.set(
          Object.fromEntries(datos.preguntas.map((p) => [p.id, p.textoRespondido ?? ''])),
        );
        this.segundos.set(datos.segundosRestantes);
        this.cargando.set(false);

        if (datos.expiraEn) {
          this.arrancarCronometro();
        }
      },
      error: (respuesta: { error?: { detail?: string } }) => {
        this.error.set(respuesta?.error?.detail ?? 'No se pudo abrir el examen.');
        this.cargando.set(false);
      },
    });
  }

  ngOnDestroy(): void {
    clearInterval(this.cronometro);
    this.cambios.complete();
  }

  protected estaMarcada(pregunta: PreguntaParaRendir, opcionId: string): boolean {
    return (this.marcadas()[pregunta.id] ?? []).includes(opcionId);
  }

  protected estaRespondida(pregunta: PreguntaParaRendir): boolean {
    if (pregunta.tipo === 'RESPUESTA_CORTA') {
      return (this.texto()[pregunta.id] ?? '').trim().length > 0;
    }
    return (this.marcadas()[pregunta.id] ?? []).length > 0;
  }

  protected alternar(pregunta: PreguntaParaRendir, opcionId: string): void {
    this.marcadas.update((actual) => {
      const previas = actual[pregunta.id] ?? [];

      const nuevas =
        pregunta.tipo === 'OPCION_MULTIPLE'
          ? previas.includes(opcionId)
            ? previas.filter((id) => id !== opcionId)
            : [...previas, opcionId]
          : [opcionId];

      return { ...actual, [pregunta.id]: nuevas };
    });

    this.cambios.next({ preguntaId: pregunta.id });
  }

  protected cambiarTexto(pregunta: PreguntaParaRendir, valor: string): void {
    this.texto.update((actual) => ({ ...actual, [pregunta.id]: valor }));
    this.cambios.next({ preguntaId: pregunta.id });
  }

  protected entregar(): void {
    const datos = this.intento();
    if (!datos || this.entregando()) {
      return;
    }

    this.entregando.set(true);
    this.api.entregarExamen(datos.intentoId).subscribe({
      next: (fin) => {
        clearInterval(this.cronometro);
        this.resultado.set(fin);
        this.entregando.set(false);
      },
      error: () => {
        this.error.set('No se pudo entregar el examen. Intente otra vez.');
        this.entregando.set(false);
      },
    });
  }

  private arrancarCronometro(): void {
    this.cronometro = setInterval(() => {
      const restantes = this.segundos() - 1;
      this.segundos.set(Math.max(0, restantes));

      // Al llegar a cero se entrega solo, con lo que haya respondido.
      if (restantes <= 0) {
        clearInterval(this.cronometro);
        this.entregar();
      }
    }, 1000);
  }

  private enviar(preguntaId: string): void {
    const datos = this.intento();
    if (!datos) {
      return;
    }

    this.estadoGuardado.set('Guardando...');

    this.api
      .guardarRespuesta(
        datos.intentoId,
        preguntaId,
        this.marcadas()[preguntaId] ?? [],
        this.texto()[preguntaId] ?? null,
      )
      .subscribe({
        next: () => this.estadoGuardado.set('Respuestas guardadas'),
        error: () =>
          this.estadoGuardado.set('No se pudo guardar. Revise su conexion antes de entregar.'),
      });
  }
}
