import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Reproductor } from '../../componentes/reproductor';
import {
  ContenidoCurso,
  LeccionDelAlumno,
  MaterialDelCurso,
  tamanoLegible,
} from '../../core/api/api.models';
import { MateduApi } from '../../core/api/matedu.api';

/**
 * Aula de un curso.
 *
 * A la izquierda el temario, a la derecha la clase. La leccion seleccionada vive
 * en un signal y el reproductor reacciona a ella: al cambiar de clase se pide
 * una autorizacion nueva, nunca se reutiliza el enlace anterior.
 */
@Component({
  selector: 'app-aula-curso',
  imports: [RouterLink, Reproductor],
  template: `
    @if (cargando()) {
      <p class="tenue">Abriendo el aula...</p>
    } @else if (error(); as mensaje) {
      <p class="aviso-error" role="alert">{{ mensaje }}</p>
      <p><a routerLink="/aula">Volver a mis cursos</a></p>
    } @else if (contenido(); as curso) {
      <header class="cabecera">
        <div>
          <a class="volver tenue" routerLink="/aula">← Mis cursos</a>
          <h1>{{ curso.curso }}</h1>
          <p class="tenue">Grupo {{ curso.codigoGrupo }}</p>
        </div>
        <div class="avance">
          <span class="porcentaje">{{ avance() }}%</span>
          <span class="tenue">completado</span>
        </div>
      </header>

      <div class="barra-avance" [attr.aria-label]="'Avance ' + avance() + ' por ciento'">
        <span [style.width.%]="avance()"></span>
      </div>

      <div class="columnas">
        <aside class="temario">
          @for (modulo of curso.modulos; track modulo.id) {
            <section class="modulo">
              <h2>{{ modulo.titulo }}</h2>
              @for (leccion of modulo.lecciones; track leccion.id) {
                <button
                  type="button"
                  class="leccion"
                  [class.activa]="leccion.id === leccionActivaId()"
                  [class.hecha]="completadas().has(leccion.id)"
                  (click)="seleccionar(leccion)"
                >
                  <span class="marca" aria-hidden="true">
                    {{ completadas().has(leccion.id) ? '✓' : leccion.orden }}
                  </span>
                  <span class="datos">
                    <span class="titulo">{{ leccion.titulo }}</span>
                    <small class="tenue">
                      {{ leccion.tipo }}
                      @if (leccion.duracionMin) {
                        · {{ leccion.duracionMin }} min
                      }
                    </small>
                  </span>
                </button>
              } @empty {
                <p class="tenue vacio-modulo">Este modulo aun no tiene clases.</p>
              }
            </section>
          } @empty {
            <p class="tenue">El curso todavia no tiene contenido publicado.</p>
          }
        </aside>

        <div class="clase">
          @if (leccionActiva(); as leccion) {
            <app-reproductor
              [leccionId]="leccion.id"
              [tieneVideo]="leccion.tieneVideo"
              [segundosPrevios]="leccion.segundosVistos"
              (completada)="marcarCompletada($event)"
            />

            <h2 class="titulo-clase">{{ leccion.titulo }}</h2>

            @if (leccion.materiales.length > 0) {
              <section class="materiales">
                <h3>Material de la clase</h3>
                @for (material of leccion.materiales; track material.id) {
                  <div class="material">
                    <span class="datos">
                      <strong>{{ material.titulo }}</strong>
                      <small class="tenue">
                        {{ material.nombreArchivo }} · {{ peso(material) }}
                      </small>
                    </span>
                    @if (material.descargable) {
                      <button type="button" class="boton boton-secundario" (click)="abrir(material)">
                        Abrir
                      </button>
                    } @else {
                      <span class="tenue no-descargable">Solo consulta</span>
                    }
                  </div>
                }
              </section>
            }
          } @else {
            <div class="sin-seleccion tarjeta">
              <strong>Elija una clase del temario</strong>
              <p class="tenue">El contenido se abre a la derecha.</p>
            </div>
          }

          @if (curso.materiales.length > 0) {
            <section class="materiales">
              <h3>Material del curso</h3>
              @for (material of curso.materiales; track material.id) {
                <div class="material">
                  <span class="datos">
                    <strong>{{ material.titulo }}</strong>
                    <small class="tenue">{{ material.nombreArchivo }} · {{ peso(material) }}</small>
                  </span>
                  @if (material.descargable) {
                    <button type="button" class="boton boton-secundario" (click)="abrir(material)">
                      Abrir
                    </button>
                  } @else {
                    <span class="tenue no-descargable">Solo consulta</span>
                  }
                </div>
              }
            </section>
          }
        </div>
      </div>
    }
  `,
  styles: `
    .cabecera {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 20px;
      margin-bottom: 12px;
    }
    .volver {
      display: inline-block;
      margin-bottom: 6px;
      font-size: 13px;
      text-decoration: none;
    }
    .cabecera h1 {
      font-size: 25px;
      margin-bottom: 4px;
    }
    .cabecera p {
      margin: 0;
      font-size: 13.5px;
    }
    .avance {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      flex: none;
    }
    .porcentaje {
      font-size: 24px;
      font-weight: 700;
      color: var(--marca-primario);
      font-variant-numeric: tabular-nums;
    }
    .avance span:last-child {
      font-size: 12px;
    }
    .barra-avance {
      height: 6px;
      background: var(--superficie-2);
      border: 1px solid var(--linea);
      border-radius: 99px;
      overflow: hidden;
      margin-bottom: 26px;
    }
    .barra-avance span {
      display: block;
      height: 100%;
      background: var(--marca-primario);
    }
    .columnas {
      display: grid;
      grid-template-columns: 300px 1fr;
      gap: 24px;
      align-items: start;
    }
    .temario {
      display: flex;
      flex-direction: column;
      gap: 18px;
      position: sticky;
      top: 20px;
    }
    .modulo h2 {
      font-size: 12px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--texto-tenue);
      margin-bottom: 8px;
    }
    .leccion {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      width: 100%;
      padding: 9px 11px;
      margin-bottom: 3px;
      font: inherit;
      text-align: left;
      color: var(--texto-2);
      background: transparent;
      border: 1px solid transparent;
      border-radius: var(--radio-sm);
      cursor: pointer;
    }
    .leccion:hover {
      background: var(--superficie-2);
    }
    .leccion.activa {
      color: var(--texto);
      background: var(--marca-primario-suave);
      border-color: var(--marca-primario);
    }
    .marca {
      display: grid;
      place-items: center;
      flex: none;
      width: 22px;
      height: 22px;
      font-size: 11.5px;
      font-weight: 700;
      border-radius: 50%;
      background: var(--superficie-2);
      border: 1px solid var(--linea);
    }
    .leccion.hecha .marca {
      color: #fff;
      background: var(--exito);
      border-color: var(--exito);
    }
    .datos {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .titulo {
      font-size: 14px;
      font-weight: 500;
    }
    .datos small {
      font-size: 11.5px;
    }
    .vacio-modulo {
      font-size: 13px;
      margin: 0 0 0 11px;
    }
    .clase {
      display: flex;
      flex-direction: column;
      gap: 22px;
      min-width: 0;
    }
    .titulo-clase {
      font-size: 20px;
      margin: 0;
    }
    .sin-seleccion {
      padding: 40px 24px;
      text-align: center;
    }
    .sin-seleccion p {
      margin: 6px 0 0;
      font-size: 14px;
    }
    .materiales h3 {
      font-size: 12px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--texto-tenue);
      margin-bottom: 10px;
    }
    .material {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      padding: 12px 16px;
      background: var(--superficie);
      border: 1px solid var(--linea);
      border-radius: var(--radio-sm);
      margin-bottom: 8px;
    }
    .material strong {
      font-size: 14.5px;
    }
    .material small {
      font-size: 12px;
    }
    .no-descargable {
      font-size: 12.5px;
      flex: none;
    }
    @media (max-width: 900px) {
      .columnas {
        grid-template-columns: 1fr;
      }
      .temario {
        position: static;
        order: 2;
      }
    }
  `,
})
export class AulaCursoPage implements OnInit {
  private readonly api = inject(MateduApi);

  /** Llega por la ruta gracias a withComponentInputBinding(). */
  readonly grupoId = input.required<string>();

  protected readonly contenido = signal<ContenidoCurso | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly leccionActivaId = signal<string | null>(null);

  /** Se lleva aparte para reflejar al instante lo que el alumno acaba de terminar. */
  protected readonly completadas = signal(new Set<string>());

  protected readonly lecciones = computed(() =>
    (this.contenido()?.modulos ?? []).flatMap((modulo) => modulo.lecciones),
  );

  protected readonly leccionActiva = computed(() => {
    const id = this.leccionActivaId();
    return id === null ? null : (this.lecciones().find((l) => l.id === id) ?? null);
  });

  protected readonly avance = computed(() => {
    const total = this.lecciones().length;
    return total === 0 ? 0 : Math.round((this.completadas().size * 100) / total);
  });

  ngOnInit(): void {
    this.api.contenidoDelCurso(this.grupoId()).subscribe({
      next: (curso) => {
        this.contenido.set(curso);
        this.completadas.set(
          new Set(
            curso.modulos
              .flatMap((modulo) => modulo.lecciones)
              .filter((leccion) => leccion.completada)
              .map((leccion) => leccion.id),
          ),
        );

        // Abrir donde se quedo: la primera clase pendiente, o la primera de todas.
        const lecciones = curso.modulos.flatMap((modulo) => modulo.lecciones);
        const pendiente = lecciones.find((leccion) => !leccion.completada);
        this.leccionActivaId.set((pendiente ?? lecciones[0])?.id ?? null);

        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudo abrir el aula. Puede que su matricula no este activa.');
        this.cargando.set(false);
      },
    });
  }

  protected seleccionar(leccion: LeccionDelAlumno): void {
    this.leccionActivaId.set(leccion.id);
  }

  protected marcarCompletada(leccionId: string): void {
    this.completadas.update((actuales) => new Set(actuales).add(leccionId));
  }

  protected peso(material: MaterialDelCurso): string {
    return tamanoLegible(material.tamanoBytes);
  }

  /**
   * Abre un material en otra pestana.
   *
   * El enlace se pide en el momento porque vence en minutos; guardarlo en el
   * HTML no serviria de nada.
   */
  protected abrir(material: MaterialDelCurso): void {
    this.api.enlaceDeMaterial(material.id).subscribe({
      next: (enlace) => window.open(enlace.url, '_blank', 'noopener'),
      error: () => this.error.set('No se pudo abrir el material.'),
    });
  }
}
