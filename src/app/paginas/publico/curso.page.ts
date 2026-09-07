import { DatePipe } from '@angular/common';
import { Component, inject, input, OnInit, signal } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { CursoPublico, GrupoPublico, importe } from '../../core/api/api.models';
import { MateduApi } from '../../core/api/matedu.api';

/**
 * Ficha publica de un curso.
 *
 * Es la pagina que el centro comparte por WhatsApp y la que idealmente
 * aparece en Google. Se renderiza en el servidor, con sus metadatos propios.
 *
 * Cada grupo abierto lleva su boton de matricula: el visitante llega al
 * checkout sin salir del dominio del centro.
 */
@Component({
  selector: 'app-curso-publico',
  imports: [RouterLink, DatePipe],
  template: `
    @if (cargando()) {
      <div class="bloque"><p class="tenue">Cargando...</p></div>
    } @else if (noExiste()) {
      <div class="bloque">
        <h1>Curso no encontrado</h1>
        <p class="tenue">Puede que ya no este publicado.</p>
        <a class="boton" routerLink="/cursos">Ver todos los cursos</a>
      </div>
    } @else if (curso(); as c) {
      <article>
        <header class="encabezado">
          <div class="interior">
            <a class="volver tenue" routerLink="/cursos">← Cursos</a>
            <h1>{{ c.nombre }}</h1>
            @if (c.sumilla) {
              <p class="sumilla">{{ c.sumilla }}</p>
            }
            <div class="marcas">
              <span class="etiqueta">{{ c.horasAcademicas }} horas academicas</span>
              @if (c.certificable) {
                <span class="etiqueta">Con certificado</span>
              }
            </div>
          </div>
        </header>

        <div class="cuerpo interior">
          <div class="detalle">
            @if (c.dirigidoA) {
              <section>
                <h2>Dirigido a</h2>
                <p>{{ c.dirigidoA }}</p>
              </section>
            }
            @if (c.temario) {
              <section>
                <h2>Temario</h2>
                <p class="temario">{{ c.temario }}</p>
              </section>
            }
            @if (c.requisitos) {
              <section>
                <h2>Requisitos</h2>
                <p>{{ c.requisitos }}</p>
              </section>
            }
          </div>

          <aside class="grupos">
            <h2>Proximos inicios</h2>

            @if (c.grupos.length === 0) {
              <p class="tenue">No hay grupos con matricula abierta ahora mismo.</p>
            } @else {
              @for (grupo of c.grupos; track grupo.id) {
                <div class="grupo tarjeta">
                  <p class="fecha">
                    {{ grupo.fechaInicio | date: 'dd MMM yyyy' }}
                  </p>
                  <p class="tenue modalidad">{{ modalidad(grupo) }}</p>
                  @if (grupo.horario) {
                    <p class="tenue">{{ grupo.horario }}</p>
                  }
                  @if (grupo.docente) {
                    <p class="tenue">Docente: {{ grupo.docente }}</p>
                  }
                  <p class="precio">{{ precio(grupo) }}</p>
                  <p class="vacantes tenue">{{ grupo.vacantes }} vacantes</p>
                  @if (grupo.vacantes > 0) {
                    <a class="boton" [routerLink]="['/cursos', c.slug, 'inscribirme', grupo.id]">
                      Inscribirme
                    </a>
                  } @else {
                    <span class="tenue sin-cupo">Sin vacantes</span>
                  }
                </div>
              }
            }
          </aside>
        </div>
      </article>
    }
  `,
  styles: `
    .interior {
      max-width: 1080px;
      margin: 0 auto;
      padding: 0 24px;
    }
    .bloque {
      max-width: 1080px;
      margin: 0 auto;
      padding: 50px 24px;
    }
    .encabezado {
      background: var(--superficie);
      border-bottom: 1px solid var(--linea);
      padding: 40px 0 34px;
    }
    .volver {
      display: inline-block;
      margin-bottom: 10px;
      font-size: 13.5px;
      text-decoration: none;
    }
    h1 {
      font-size: clamp(26px, 4vw, 36px);
      margin-bottom: 10px;
    }
    .sumilla {
      font-size: 17px;
      color: var(--texto-2);
      max-width: 62ch;
      margin: 0 0 16px;
    }
    .marcas {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .cuerpo {
      display: grid;
      grid-template-columns: 1fr 320px;
      gap: 40px;
      padding-top: 36px;
    }
    .detalle section {
      margin-bottom: 28px;
    }
    h2 {
      font-size: 13px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--texto-tenue);
      margin-bottom: 8px;
    }
    .detalle p {
      margin: 0;
      font-size: 15.5px;
      line-height: 1.65;
      max-width: 66ch;
    }
    .temario {
      white-space: pre-line;
    }
    .grupo {
      padding: 18px 20px;
      margin-bottom: 12px;
    }
    .grupo p {
      margin: 0 0 4px;
      font-size: 13.5px;
    }
    .fecha {
      font-size: 16px !important;
      font-weight: 700;
      text-transform: capitalize;
    }
    .modalidad {
      text-transform: capitalize;
    }
    .precio {
      font-size: 20px !important;
      font-weight: 700;
      color: var(--marca-primario);
      margin-top: 10px !important;
    }
    .sin-cupo {
      font-size: 13px;
    }
    .vacantes {
      margin-bottom: 12px !important;
    }
    .grupo .boton {
      width: 100%;
      text-decoration: none;
    }
    @media (max-width: 860px) {
      .cuerpo {
        grid-template-columns: 1fr;
        gap: 26px;
      }
    }
  `,
})
export class CursoPublicoPage implements OnInit {
  private readonly api = inject(MateduApi);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  readonly slug = input.required<string>();

  protected readonly curso = signal<CursoPublico | null>(null);
  protected readonly cargando = signal(true);
  protected readonly noExiste = signal(false);

  ngOnInit(): void {
    this.api.cursoPublico(this.slug()).subscribe({
      next: (curso) => {
        this.curso.set(curso);
        this.cargando.set(false);
        this.aplicarSeo(curso);
      },
      error: () => {
        this.noExiste.set(true);
        this.cargando.set(false);
      },
    });
  }

  protected precio(grupo: GrupoPublico): string {
    return importe(grupo.precio, grupo.moneda);
  }

  protected modalidad(grupo: GrupoPublico): string {
    return (
      {
        PRESENCIAL: 'Presencial',
        EN_VIVO: 'En vivo',
        ASINCRONO: 'A su ritmo',
        MIXTO: 'Mixto',
      }[grupo.modalidad] ?? grupo.modalidad
    );
  }

  private aplicarSeo(curso: CursoPublico): void {
    const descripcion =
      curso.sumilla ?? `Curso de ${curso.nombre}, ${curso.horasAcademicas} horas academicas.`;

    this.title.setTitle(curso.nombre);
    this.meta.updateTag({ name: 'description', content: descripcion });
    this.meta.updateTag({ property: 'og:title', content: curso.nombre });
    this.meta.updateTag({ property: 'og:description', content: descripcion });
    this.meta.updateTag({ property: 'og:type', content: 'website' });

    if (curso.portadaUrl) {
      this.meta.updateTag({ property: 'og:image', content: curso.portadaUrl });
    }
  }
}
