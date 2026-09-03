import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { CursoPublico, importe, SitioPublico } from '../../core/api/api.models';
import { MateduApi } from '../../core/api/matedu.api';

/**
 * Portada del centro.
 *
 * Se renderiza en el servidor, con lo cual el buscador recibe el HTML ya
 * armado: titulo, descripcion y los cursos. Una SPA entregaria un div vacio y
 * el centro no aparecería en Google.
 *
 * Los metadatos se ponen aqui y no en el index.html porque cada centro tiene
 * los suyos: el mismo codigo sirve un sitio distinto en cada dominio.
 */
@Component({
  selector: 'app-portada',
  imports: [RouterLink, DatePipe],
  template: `
    @if (sitio(); as centro) {
      <section class="hero" [class.con-imagen]="!!centro.portadaUrl">
        @if (centro.portadaUrl) {
          <img class="fondo" [src]="centro.portadaUrl" alt="" />
        }
        <div class="hero-texto">
          <h1>{{ centro.nombre }}</h1>
          @if (centro.lema) {
            <p class="lema">{{ centro.lema }}</p>
          }
          <a class="boton" routerLink="/cursos">Ver cursos</a>
        </div>
      </section>

      @if (centro.descripcion) {
        <section class="bloque">
          <p class="descripcion">{{ centro.descripcion }}</p>
        </section>
      }
    }

    <section class="bloque">
      <h2>Cursos con matricula abierta</h2>

      @if (cargando()) {
        <p class="tenue">Cargando cursos...</p>
      } @else if (cursos().length === 0) {
        <p class="tenue">No hay cursos con matricula abierta en este momento.</p>
      } @else {
        <div class="cursos">
          @for (curso of cursos(); track curso.id) {
            <a class="curso tarjeta" [routerLink]="['/cursos', curso.slug]">
              @if (curso.portadaUrl) {
                <img [src]="curso.portadaUrl" [alt]="curso.nombre" />
              }
              <div class="curso-texto">
                <h3>{{ curso.nombre }}</h3>
                @if (curso.sumilla) {
                  <p class="tenue">{{ curso.sumilla }}</p>
                }
                <dl class="datos">
                  <div>
                    <dt>Duracion</dt>
                    <dd>{{ curso.horasAcademicas }} h</dd>
                  </div>
                  <div>
                    <dt>Desde</dt>
                    <dd>{{ precio(curso) }}</dd>
                  </div>
                  @if (curso.grupos.length > 0) {
                    <div>
                      <dt>Inicio</dt>
                      <dd>{{ curso.grupos[0].fechaInicio | date: 'dd/MM/yyyy' }}</dd>
                    </div>
                  }
                </dl>
                @if (curso.certificable) {
                  <span class="etiqueta">Con certificado</span>
                }
              </div>
            </a>
          }
        </div>
      }
    </section>
  `,
  styles: `
    .hero {
      position: relative;
      padding: 72px 0 64px;
      background: var(--superficie);
      border-bottom: 1px solid var(--linea);
      overflow: hidden;
    }
    .hero .fondo {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0.18;
    }
    .hero-texto {
      position: relative;
      max-width: 1080px;
      margin: 0 auto;
      padding: 0 24px;
    }
    .hero h1 {
      font-size: clamp(30px, 5vw, 46px);
      margin-bottom: 10px;
    }
    .lema {
      font-size: 18px;
      color: var(--texto-2);
      max-width: 56ch;
      margin: 0 0 22px;
    }
    .hero .boton {
      text-decoration: none;
    }
    .bloque {
      max-width: 1080px;
      margin: 0 auto;
      padding: 40px 24px 0;
    }
    .descripcion {
      font-size: 16.5px;
      color: var(--texto-2);
      max-width: 68ch;
      margin: 0;
    }
    h2 {
      font-size: 21px;
      margin-bottom: 18px;
    }
    .cursos {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 18px;
    }
    .curso {
      display: flex;
      flex-direction: column;
      color: inherit;
      text-decoration: none;
      overflow: hidden;
    }
    .curso:hover {
      border-color: var(--marca-primario);
    }
    .curso img {
      width: 100%;
      height: 150px;
      object-fit: cover;
    }
    .curso-texto {
      padding: 18px 20px 20px;
    }
    .curso h3 {
      font-size: 17px;
      margin-bottom: 6px;
    }
    .curso p {
      margin: 0 0 12px;
      font-size: 14px;
    }
    .datos {
      display: flex;
      gap: 20px;
      margin: 0 0 12px;
    }
    .datos dt {
      font-size: 10.5px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--texto-tenue);
    }
    .datos dd {
      margin: 2px 0 0;
      font-size: 14px;
      font-weight: 600;
    }
  `,
})
export class PortadaPage implements OnInit {
  private readonly api = inject(MateduApi);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  protected readonly sitio = signal<SitioPublico | null>(null);
  protected readonly cursos = signal<CursoPublico[]>([]);
  protected readonly cargando = signal(true);

  ngOnInit(): void {
    this.api.sitioPublico().subscribe({
      next: (centro) => {
        this.sitio.set(centro);
        this.aplicarSeo(centro);
      },
      error: () => undefined,
    });

    this.api.catalogoPublico().subscribe({
      next: (cursos) => {
        this.cursos.set(cursos);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  protected precio(curso: CursoPublico): string {
    return importe(curso.precio, curso.moneda);
  }

  /** Metadatos por centro, incluidos los de Open Graph para cuando se comparte. */
  private aplicarSeo(centro: SitioPublico): void {
    const titulo = centro.lema ? `${centro.nombre} · ${centro.lema}` : centro.nombre;
    const descripcion =
      centro.descripcion ?? `Cursos y certificaciones de ${centro.nombre}.`;

    this.title.setTitle(titulo);
    this.meta.updateTag({ name: 'description', content: descripcion });
    this.meta.updateTag({ property: 'og:title', content: titulo });
    this.meta.updateTag({ property: 'og:description', content: descripcion });
    this.meta.updateTag({ property: 'og:type', content: 'website' });

    if (centro.portadaUrl) {
      this.meta.updateTag({ property: 'og:image', content: centro.portadaUrl });
    }
  }
}
