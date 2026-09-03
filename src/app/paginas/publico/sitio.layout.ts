import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MateduApi } from '../../core/api/matedu.api';
import { MarcaService } from '../../core/tenant/marca.service';
import { SitioPublico } from '../../core/api/api.models';

/**
 * Envoltura del sitio publico del centro.
 *
 * Es lo que ve quien llega por Google: cabecera con la marca del centro,
 * menu de sus paginas y pie con sus datos de contacto. Ni rastro de MATEDU,
 * que es justamente lo que el cliente paga.
 *
 * Se renderiza en el servidor, asi que no puede tocar window ni localStorage.
 */
@Component({
  selector: 'app-sitio-publico',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="sitio">
      <header class="cabecera">
        <div class="interior">
          <a class="marca" routerLink="/">
            @if (sitio()?.logoUrl) {
              <img [src]="sitio()!.logoUrl!" [alt]="sitio()!.nombre" />
            } @else {
              <span class="punto" aria-hidden="true"></span>
            }
            <span class="nombre">{{ sitio()?.nombre ?? 'Cargando...' }}</span>
          </a>

          <nav class="navegacion" aria-label="Secciones del sitio">
            <a routerLink="/cursos" routerLinkActive="activo">Cursos</a>
            @for (enlace of sitio()?.menu ?? []; track enlace.slug) {
              <a [routerLink]="['/p', enlace.slug]" routerLinkActive="activo">
                {{ enlace.titulo }}
              </a>
            }
          </nav>

          <a class="boton boton-secundario acceso" routerLink="/ingresar">Aula virtual</a>
        </div>
      </header>

      <main class="contenido">
        <router-outlet />
      </main>

      <footer class="pie">
        <div class="interior">
          <div>
            <strong>{{ sitio()?.nombre }}</strong>
            @if (sitio()?.contacto?.direccion) {
              <p class="tenue">{{ sitio()!.contacto.direccion }}</p>
            }
          </div>

          <div class="contacto">
            @if (sitio()?.contacto?.telefono) {
              <a [href]="'tel:' + sitio()!.contacto.telefono">{{ sitio()!.contacto.telefono }}</a>
            }
            @if (sitio()?.contacto?.correo) {
              <a [href]="'mailto:' + sitio()!.contacto.correo">{{ sitio()!.contacto.correo }}</a>
            }
            @if (sitio()?.contacto?.whatsapp) {
              <a
                [href]="'https://wa.me/' + sitio()!.contacto.whatsapp"
                target="_blank"
                rel="noopener"
              >
                WhatsApp
              </a>
            }
          </div>

          <div class="redes">
            @for (red of redes(); track red.nombre) {
              <a [href]="red.url" target="_blank" rel="noopener">{{ red.nombre }}</a>
            }
          </div>
        </div>
      </footer>
    </div>
  `,
  styles: `
    .sitio {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }
    .interior {
      max-width: 1080px;
      margin: 0 auto;
      padding: 0 24px;
      width: 100%;
    }
    .cabecera {
      background: var(--superficie);
      border-bottom: 1px solid var(--linea);
    }
    .cabecera .interior {
      display: flex;
      align-items: center;
      gap: 28px;
      padding-top: 14px;
      padding-bottom: 14px;
    }
    .marca {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      color: var(--texto);
    }
    .marca img {
      height: 34px;
      width: auto;
    }
    .punto {
      width: 14px;
      height: 14px;
      border-radius: 4px;
      background: var(--marca-primario);
    }
    .nombre {
      font-size: 17px;
      font-weight: 700;
      letter-spacing: -0.01em;
    }
    .navegacion {
      display: flex;
      gap: 4px;
      flex: 1;
    }
    .navegacion a {
      padding: 7px 13px;
      font-size: 14.5px;
      color: var(--texto-2);
      text-decoration: none;
      border-radius: var(--radio-sm);
    }
    .navegacion a:hover {
      background: var(--superficie-2);
      color: var(--texto);
    }
    .navegacion a.activo {
      color: var(--marca-primario);
      font-weight: 600;
    }
    .acceso {
      text-decoration: none;
      flex: none;
    }
    .contenido {
      flex: 1;
    }
    .pie {
      background: var(--superficie);
      border-top: 1px solid var(--linea);
      margin-top: 60px;
      padding: 30px 0;
    }
    .pie .interior {
      display: flex;
      flex-wrap: wrap;
      gap: 24px;
      justify-content: space-between;
      font-size: 14px;
    }
    .pie p {
      margin: 4px 0 0;
      font-size: 13.5px;
    }
    .contacto,
    .redes {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .redes {
      flex-direction: row;
      gap: 14px;
      align-items: flex-start;
    }
    @media (max-width: 760px) {
      .cabecera .interior {
        flex-wrap: wrap;
        gap: 12px 18px;
      }
      .navegacion {
        order: 3;
        width: 100%;
        flex: none;
        overflow-x: auto;
      }
    }
  `,
})
export class SitioPublicoLayout implements OnInit {
  private readonly api = inject(MateduApi);
  private readonly marca = inject(MarcaService);

  protected readonly sitio = signal<SitioPublico | null>(null);

  ngOnInit(): void {
    this.api.sitioPublico().subscribe({
      next: (datos) => {
        this.sitio.set(datos);
        // Aplica los colores del centro a toda la pagina.
        this.marca.aplicar({
          nombre: datos.nombre,
          colorPrimario: datos.colorPrimario,
          logoUrl: datos.logoUrl,
        });
      },
      error: () => undefined,
    });
  }

  /** Solo las redes que el centro completo. */
  protected redes(): { nombre: string; url: string }[] {
    const redes = this.sitio()?.redes;
    if (!redes) {
      return [];
    }
    return [
      { nombre: 'Facebook', url: redes.facebook },
      { nombre: 'Instagram', url: redes.instagram },
      { nombre: 'TikTok', url: redes.tiktok },
      { nombre: 'LinkedIn', url: redes.linkedin },
      { nombre: 'YouTube', url: redes.youtube },
    ].filter((red): red is { nombre: string; url: string } => !!red.url);
  }
}
