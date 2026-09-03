import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  ETIQUETA_ESTADO_GRUPO,
  ETIQUETA_MODALIDAD,
  GrupoResumen,
} from '../../core/api/api.models';
import { MateduApi } from '../../core/api/matedu.api';

@Component({
  selector: 'app-consola-grupos',
  imports: [DatePipe, RouterLink],
  template: `
    <header class="titulo">
      <h1>Grupos</h1>
      <p class="tenue">
        Cada grupo es una edicion del curso, con sus propias fechas, su docente y su cupo.
        Es donde se matriculan los alumnos.
      </p>
    </header>

    @if (cargando()) {
      <p class="tenue">Cargando grupos...</p>
    } @else if (error(); as mensaje) {
      <p class="aviso-error" role="alert">{{ mensaje }}</p>
    } @else if (grupos().length === 0) {
      <div class="vacio tarjeta">
        <strong>Todavia no hay grupos abiertos</strong>
        <p class="tenue">Un grupo se abre a partir de un curso existente.</p>
      </div>
    } @else {
      <div class="lista">
        @for (grupo of grupos(); track grupo.id) {
          <article class="grupo tarjeta">
            <div class="grupo-cabecera">
              <span class="mono">{{ grupo.codigo }}</span>
              <span class="estado">{{ estadoTexto(grupo) }}</span>
            </div>

            <dl class="datos">
              <div>
                <dt>Modalidad</dt>
                <dd>{{ modalidadTexto(grupo) }}</dd>
              </div>
              <div>
                <dt>Inicio</dt>
                <dd>{{ grupo.fechaInicio | date: 'dd/MM/yyyy' }}</dd>
              </div>
              <div>
                <dt>Fin</dt>
                <dd>{{ grupo.fechaFin | date: 'dd/MM/yyyy' }}</dd>
              </div>
              <div>
                <dt>Vacantes</dt>
                <dd [class.sin-vacantes]="grupo.vacantes === 0">
                  {{ grupo.vacantes }} de {{ grupo.cupoMaximo }}
                </dd>
              </div>
            </dl>

            @if (grupo.horario) {
              <p class="horario tenue">{{ grupo.horario }}</p>
            }

            <!-- Sin este enlace no habia forma de meter a un alumno en el
                 grupo, y su aula quedaba vacia sin explicacion. -->
            <a
              class="boton boton-secundario matriculados"
              [routerLink]="['/consola/grupos', grupo.id, 'matriculas']"
            >
              Ver matriculados
            </a>
          </article>
        }
      </div>
    }
  `,
  styles: `
    .matriculados {
      align-self: flex-start;
      margin-top: 10px;
      text-decoration: none;
      display: inline-block;
      font-size: 13px;
      padding: 6px 13px;
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
    .lista {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 14px;
    }
    .grupo {
      padding: 18px 20px;
    }
    .grupo-cabecera {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 14px;
    }
    .mono {
      font-family: var(--fuente-mono);
      font-size: 13.5px;
      font-weight: 600;
    }
    .estado {
      padding: 2px 9px;
      font-size: 11.5px;
      color: var(--marca-primario);
      background: var(--marca-primario-suave);
      border-radius: 99px;
    }
    .datos {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px 14px;
      margin: 0;
    }
    .datos div {
      display: flex;
      flex-direction: column;
    }
    .datos dt {
      font-size: 11px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--texto-tenue);
    }
    .datos dd {
      margin: 2px 0 0;
      font-size: 14px;
      font-variant-numeric: tabular-nums;
    }
    .sin-vacantes {
      color: var(--error);
      font-weight: 600;
    }
    .horario {
      margin: 14px 0 0;
      padding-top: 12px;
      font-size: 13px;
      border-top: 1px solid var(--linea-2);
    }
    .vacio {
      padding: 22px 24px;
    }
    .vacio p {
      margin: 4px 0 0;
      font-size: 14px;
    }
  `,
})
export class ConsolaGruposPage implements OnInit {
  private readonly api = inject(MateduApi);

  protected readonly grupos = signal<GrupoResumen[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.api.grupos().subscribe({
      next: (pagina) => {
        this.grupos.set(pagina.content);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los grupos.');
        this.cargando.set(false);
      },
    });
  }

  protected estadoTexto(grupo: GrupoResumen): string {
    return ETIQUETA_ESTADO_GRUPO[grupo.estado];
  }

  protected modalidadTexto(grupo: GrupoResumen): string {
    return ETIQUETA_MODALIDAD[grupo.modalidad];
  }
}
