import { Component, inject, input, OnInit, signal } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { PaginaPublicaVista } from '../../core/api/api.models';
import { MateduApi } from '../../core/api/matedu.api';

/** Pagina editable del sitio: nosotros, contacto, lo que el centro quiera. */
@Component({
  selector: 'app-pagina-publica',
  template: `
    <div class="bloque">
      @if (cargando()) {
        <p class="tenue">Cargando...</p>
      } @else if (noExiste()) {
        <h1>Pagina no encontrada</h1>
        <p class="tenue">Puede que ya no este publicada.</p>
      } @else if (pagina(); as p) {
        <h1>{{ p.titulo }}</h1>
        @if (p.contenido) {
          <div class="contenido">{{ p.contenido }}</div>
        }
      }
    </div>
  `,
  styles: `
    .bloque {
      max-width: 760px;
      margin: 0 auto;
      padding: 44px 24px 0;
    }
    h1 {
      font-size: 30px;
      margin-bottom: 18px;
    }
    .contenido {
      font-size: 16px;
      line-height: 1.7;
      color: var(--texto-2);
      white-space: pre-line;
    }
  `,
})
export class PaginaPublicaPage implements OnInit {
  private readonly api = inject(MateduApi);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  readonly slug = input.required<string>();

  protected readonly pagina = signal<PaginaPublicaVista | null>(null);
  protected readonly cargando = signal(true);
  protected readonly noExiste = signal(false);

  ngOnInit(): void {
    this.api.paginaPublica(this.slug()).subscribe({
      next: (pagina) => {
        this.pagina.set(pagina);
        this.cargando.set(false);

        this.title.setTitle(pagina.metaTitulo ?? pagina.titulo);
        if (pagina.metaDescripcion) {
          this.meta.updateTag({ name: 'description', content: pagina.metaDescripcion });
        }
      },
      error: () => {
        this.noExiste.set(true);
        this.cargando.set(false);
      },
    });
  }
}
