import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  LeccionDetalle,
  MaterialDetalle,
  ModuloDetalle,
  TipoLeccion,
} from '../../core/api/api.models';
import { MateduApi } from '../../core/api/matedu.api';
import { tamanoLegible } from '../../core/api/api.models';

/**
 * Armado del temario: modulos, clases y materiales.
 *
 * Es la pantalla que faltaba entre "tengo un curso" y "mis alumnos ven algo".
 * Sin ella, el aula de un centro real quedaba vacia para siempre: el contenido
 * solo existia en los datos de ejemplo.
 */
@Component({
  selector: 'app-consola-contenido',
  imports: [FormsModule, RouterLink],
  template: `
    <header class="titulo">
      <a class="volver tenue" routerLink="/consola/cursos">← Cursos</a>
      <h1>Contenido del curso</h1>
      <p class="tenue">
        Las clases nacen sin publicar. El alumno las ve recien cuando marca
        <strong>Publicada</strong>: asi se puede dejar una a medio preparar sin que aparezca
        en el aula.
      </p>
    </header>

    @if (error(); as mensaje) {
      <p class="aviso-error" role="alert">{{ mensaje }}</p>
    }
    @if (aviso(); as mensaje) {
      <p class="aviso-ok" role="status">{{ mensaje }}</p>
    }

    <form class="nuevo tarjeta" (ngSubmit)="crearModulo()">
      <label>
        <span>Nuevo modulo</span>
        <input
          type="text"
          name="modulo"
          [(ngModel)]="tituloModulo"
          placeholder="Modulo 1 · Fundamentos"
        />
      </label>
      <button type="submit" class="boton" [disabled]="!tituloModulo.trim()">Agregar modulo</button>
    </form>

    @for (modulo of modulos(); track modulo.id) {
      <section class="modulo tarjeta">
        <header class="cabecera-modulo">
          <h2>{{ modulo.titulo }}</h2>
          <button
            type="button"
            class="boton boton-secundario"
            (click)="eliminarModulo(modulo)"
          >
            Eliminar
          </button>
        </header>

        @for (leccion of modulo.lecciones; track leccion.id) {
          <article class="clase" [class.borrador]="!leccion.publicado">
            <div class="fila">
              <span class="orden">{{ leccion.orden }}</span>
              <div class="datos">
                <strong>{{ leccion.titulo }}</strong>
                <small class="tenue">
                  {{ leccion.tipo }}
                  @if (leccion.duracionMin) {
                    · {{ leccion.duracionMin }} min
                  }
                  @if (leccion.nombreArchivo) {
                    · {{ leccion.nombreArchivo }} ({{ peso(leccion.tamanoBytes) }})
                  } @else if (leccion.tipo === 'VIDEO') {
                    · <span class="falta">sin video</span>
                  }
                </small>
              </div>
              <label class="interruptor">
                <input
                  type="checkbox"
                  [checked]="leccion.publicado"
                  (change)="alternarPublicada(leccion)"
                />
                <span>Publicada</span>
              </label>
              <button type="button" class="boton boton-secundario" (click)="eliminarLeccion(leccion)">
                Quitar
              </button>
            </div>

            @if (leccion.tipo === 'VIDEO' || leccion.tipo === 'DOCUMENTO') {
              <div class="subida">
                <input
                  type="file"
                  [attr.accept]="leccion.tipo === 'VIDEO' ? 'video/*' : undefined"
                  (change)="subirParaLeccion($event, leccion)"
                />
                @if (subiendo() === leccion.id) {
                  <span class="tenue">Subiendo…</span>
                }
              </div>
            }
          </article>
        } @empty {
          <p class="tenue vacio">Este modulo todavia no tiene clases.</p>
        }

        <form class="nueva-clase" (ngSubmit)="crearLeccion(modulo)">
          <input
            type="text"
            name="clase-{{ modulo.id }}"
            [(ngModel)]="tituloClase[modulo.id]"
            placeholder="Titulo de la clase"
          />
          <select name="tipo-{{ modulo.id }}" [(ngModel)]="tipoClase[modulo.id]">
            @for (tipo of tipos; track tipo) {
              <option [value]="tipo">{{ tipo }}</option>
            }
          </select>
          <button type="submit" class="boton boton-secundario">Agregar clase</button>
        </form>
      </section>
    } @empty {
      <p class="tenue">
        El curso no tiene modulos. Empiece por agregar uno: es el contenedor de las clases.
      </p>
    }

    <section class="tarjeta materiales">
      <h2>Material del curso</h2>
      <p class="tenue">
        Separatas y documentos que el alumno ve en el aula, junto al temario.
      </p>

      @for (material of materiales(); track material.id) {
        <div class="material">
          <div class="datos">
            <strong>{{ material.titulo }}</strong>
            <small class="tenue">
              {{ material.nombreArchivo ?? 'sin archivo' }} · {{ peso(material.tamanoBytes) }}
            </small>
          </div>
          <button type="button" class="boton boton-secundario" (click)="quitarMaterial(material)">
            Quitar
          </button>
        </div>
      } @empty {
        <p class="tenue vacio">Todavia no hay materiales.</p>
      }

      <div class="subida">
        <input
          type="text"
          name="tituloMaterial"
          [(ngModel)]="tituloMaterial"
          placeholder="Titulo del material (ej. Separata del curso)"
        />
        <input type="file" (change)="subirMaterial($event)" />
        @if (subiendo() === 'material') {
          <span class="tenue">Subiendo…</span>
        }
      </div>
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
      max-width: 66ch;
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
    .nuevo {
      display: flex;
      align-items: flex-end;
      gap: 12px;
      padding: 16px 18px;
      margin-bottom: 18px;
    }
    .nuevo label {
      flex: 1;
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
    .modulo {
      padding: 18px 20px;
      margin-bottom: 16px;
    }
    .cabecera-modulo {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
    }
    .cabecera-modulo h2 {
      font-size: 18px;
      margin: 0;
    }
    .clase {
      border-top: 1px solid var(--borde);
      padding: 12px 0;
    }
    .clase.borrador {
      opacity: 0.72;
    }
    .fila {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .orden {
      width: 26px;
      height: 26px;
      border-radius: 999px;
      background: var(--marca-primario-suave);
      color: var(--marca-primario);
      display: grid;
      place-items: center;
      font-size: 13px;
      font-weight: 600;
      flex: none;
    }
    .datos {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
      flex: 1;
    }
    .falta {
      color: var(--aviso);
    }
    .interruptor {
      flex-direction: row;
      align-items: center;
      gap: 6px;
      text-transform: none;
      letter-spacing: 0;
      font-size: 13.5px;
      color: inherit;
    }
    .subida {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
      padding: 10px 0 0 38px;
      font-size: 13.5px;
    }
    .nueva-clase {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      border-top: 1px solid var(--borde);
      padding-top: 14px;
      margin-top: 4px;
    }
    .nueva-clase input {
      flex: 1;
      min-width: 180px;
    }
    .materiales {
      padding: 18px 20px;
      margin-top: 24px;
    }
    .materiales h2 {
      font-size: 18px;
      margin: 0 0 4px;
    }
    .materiales > p {
      margin: 0 0 12px;
    }
    .material {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      border-top: 1px solid var(--borde);
      padding: 11px 0;
    }
    .materiales .subida {
      padding-left: 0;
      border-top: 1px solid var(--borde);
      padding-top: 14px;
    }
    .materiales .subida input[type='text'] {
      flex: 1;
      min-width: 200px;
    }
    .vacio {
      margin: 8px 0;
      font-size: 14px;
    }
  `,
})
export class ConsolaContenidoPage implements OnInit {
  private readonly api = inject(MateduApi);

  /** Llega por la ruta gracias a withComponentInputBinding(). */
  readonly cursoId = input.required<string>();

  readonly modulos = signal<ModuloDetalle[]>([]);
  readonly materiales = signal<MaterialDetalle[]>([]);
  readonly subiendo = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly aviso = signal<string | null>(null);

  protected readonly tipos: TipoLeccion[] = ['VIDEO', 'DOCUMENTO', 'TEXTO', 'ENLACE', 'TAREA'];

  tituloModulo = '';
  tituloMaterial = '';
  tituloClase: Record<string, string> = {};
  tipoClase: Record<string, TipoLeccion> = {};

  readonly totalClases = computed(() =>
    this.modulos().reduce((suma, modulo) => suma + modulo.lecciones.length, 0),
  );

  ngOnInit(): void {
    this.cargar();
  }

  crearModulo(): void {
    const titulo = this.tituloModulo.trim();
    if (!titulo) {
      return;
    }

    this.api.crearModulo(this.cursoId(), { titulo }).subscribe({
      next: () => {
        this.tituloModulo = '';
        this.cargar();
      },
      error: (fallo) => this.mostrarError(fallo, 'No se pudo crear el modulo.'),
    });
  }

  eliminarModulo(modulo: ModuloDetalle): void {
    this.api.eliminarModulo(modulo.id).subscribe({
      next: () => this.cargar(),
      // El backend rechaza borrar un modulo con clases dentro y explica cuantas
      // son. Ese mensaje es mas util que uno generico nuestro.
      error: (fallo) => this.mostrarError(fallo, 'No se pudo eliminar el modulo.'),
    });
  }

  crearLeccion(modulo: ModuloDetalle): void {
    const titulo = (this.tituloClase[modulo.id] ?? '').trim();
    if (!titulo) {
      return;
    }

    this.api
      .crearLeccion(modulo.id, {
        titulo,
        tipo: this.tipoClase[modulo.id] ?? 'VIDEO',
      })
      .subscribe({
        next: () => {
          this.tituloClase[modulo.id] = '';
          this.cargar();
        },
        error: (fallo) => this.mostrarError(fallo, 'No se pudo crear la clase.'),
      });
  }

  alternarPublicada(leccion: LeccionDetalle): void {
    this.api
      .actualizarLeccion(leccion.id, {
        titulo: leccion.titulo,
        tipo: leccion.tipo,
        duracionMin: leccion.duracionMin,
        contenido: leccion.contenido,
        recursoUrl: leccion.recursoUrl,
        publicado: !leccion.publicado,
      })
      .subscribe({
        next: () => this.cargar(),
        error: (fallo) => this.mostrarError(fallo, 'No se pudo cambiar la publicacion.'),
      });
  }

  eliminarLeccion(leccion: LeccionDetalle): void {
    this.api.eliminarLeccion(leccion.id).subscribe({
      next: () => this.cargar(),
      error: (fallo) => this.mostrarError(fallo, 'No se pudo quitar la clase.'),
    });
  }

  /**
   * Sube el archivo y lo enlaza a la clase, en dos pasos.
   *
   * El primero descuenta la cuota del plan y controla el tamano; el segundo
   * solo asocia. Separarlos permite que un archivo grande falle por cuota sin
   * dejar la clase enlazada a nada.
   */
  subirParaLeccion(evento: Event, leccion: LeccionDetalle): void {
    const archivo = this.archivoDe(evento);
    if (!archivo) {
      return;
    }

    this.subiendo.set(leccion.id);
    this.api.subirArchivo(archivo).subscribe({
      next: (subido) => {
        this.api.asignarArchivoALeccion(leccion.id, subido.id).subscribe({
          next: () => {
            this.subiendo.set(null);
            this.aviso.set(`"${subido.nombreOriginal}" quedo en la clase ${leccion.titulo}.`);
            this.cargar();
          },
          error: (fallo) => this.mostrarError(fallo, 'Se subio el archivo pero no se pudo enlazar.'),
        });
      },
      error: (fallo) => {
        this.subiendo.set(null);
        this.mostrarError(fallo, 'No se pudo subir el archivo.');
      },
    });
  }

  subirMaterial(evento: Event): void {
    const archivo = this.archivoDe(evento);
    if (!archivo) {
      return;
    }

    const titulo = this.tituloMaterial.trim() || archivo.name;

    this.subiendo.set('material');
    this.api.subirArchivo(archivo).subscribe({
      next: (subido) => {
        this.api
          .agregarMaterial(this.cursoId(), {
            archivoId: subido.id,
            titulo,
            descargable: true,
          })
          .subscribe({
            next: () => {
              this.subiendo.set(null);
              this.tituloMaterial = '';
              this.aviso.set(`"${titulo}" ya esta disponible en el aula.`);
              this.cargar();
            },
            error: (fallo) => this.mostrarError(fallo, 'No se pudo agregar el material.'),
          });
      },
      error: (fallo) => {
        this.subiendo.set(null);
        this.mostrarError(fallo, 'No se pudo subir el archivo.');
      },
    });
  }

  quitarMaterial(material: MaterialDetalle): void {
    this.api.eliminarMaterial(material.id).subscribe({
      next: () => this.cargar(),
      error: (fallo) => this.mostrarError(fallo, 'No se pudo quitar el material.'),
    });
  }

  peso(bytes: number): string {
    return tamanoLegible(bytes);
  }

  private archivoDe(evento: Event): File | null {
    const entrada = evento.target as HTMLInputElement;
    const archivo = entrada.files?.[0] ?? null;
    // Se limpia para que elegir el mismo archivo otra vez vuelva a disparar el
    // evento: sin esto, reintentar tras un fallo parece no hacer nada.
    entrada.value = '';
    return archivo;
  }

  private cargar(): void {
    this.error.set(null);

    this.api.temarioDelCurso(this.cursoId()).subscribe({
      next: (modulos) => this.modulos.set(modulos),
      error: () => this.error.set('No se pudo cargar el temario.'),
    });

    this.api.materialesDelCurso(this.cursoId()).subscribe({
      next: (materiales) => this.materiales.set(materiales),
      error: () => this.error.set('No se pudieron cargar los materiales.'),
    });
  }

  private mostrarError(fallo: { error?: { detail?: string } }, respaldo: string): void {
    this.subiendo.set(null);
    this.aviso.set(null);
    this.error.set(fallo?.error?.detail ?? respaldo);
  }
}
