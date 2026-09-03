import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { CursoPublico, importe } from '../../core/api/api.models';
import { MateduApi } from '../../core/api/matedu.api';

/** Catalogo publico del centro. Se renderiza en el servidor para que posicione. */
@Component({
  selector: 'app-catalogo-publico',
  imports: [RouterLink, DatePipe],
  template: `
    <div class="bloque">
      <h1>Cursos</h1>
      <p class="tenue">Programas con matricula abierta.</p>

      @if (cargando()) {
        <p class="tenue">Cargando...</p>
      } @else if (cursos().length === 0) {
        <p class="tenue">No hay cursos con matricula abierta en este momento.</p>
      } @else {
        <div class="lista">
          @for (curso of cursos(); track curso.id) {
            <a class="curso tarjeta" [routerLink]="['/cursos', curso.slug]">
              <div>
                <h2>{{ curso.nombre }}</h2>
                @if (curso.sumilla) {
                  <p class="tenue">{{ curso.sumilla }}</p>
                }
                <p class="meta tenue">
                  {{ curso.horasAcademicas }} horas
                  @if (curso.grupos.length > 0) {
                    · inicia el {{ curso.grupos[0].fechaInicio | date: 'dd/MM/yyyy' }}
                  }
                  @if (curso.certificable) {
                    · con certificado
                  }
                </p>
              </div>
              <span class="precio">{{ precio(curso) }}</span>
            </a>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .bloque {
      max-width: 1080px;
      margin: 0 auto;
      padding: 40px 24px 0;
    }
    h1 {
      font-size: 30px;
      margin-bottom: 6px;
    }
    .bloque > p {
      margin: 0 0 24px;
    }
    .lista {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .curso {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      padding: 20px 22px;
      color: inherit;
      text-decoration: none;
    }
    .curso:hover {
      border-color: var(--marca-primario);
    }
    h2 {
      font-size: 18px;
      margin-bottom: 4px;
    }
    .curso p {
      margin: 0;
      font-size: 14px;
      max-width: 68ch;
    }
    .meta {
      margin-top: 6px !important;
      font-size: 13px !important;
    }
    .precio {
      flex: none;
      font-size: 19px;
      font-weight: 700;
      color: var(--marca-primario);
    }
    @media (max-width: 640px) {
      .curso {
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
      }
    }
  `,
})
export class CatalogoPublicoPage implements OnInit {
  private readonly api = inject(MateduApi);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  protected readonly cursos = signal<CursoPublico[]>([]);
  protected readonly cargando = signal(true);

  ngOnInit(): void {
    this.title.setTitle('Cursos');
    this.meta.updateTag({
      name: 'description',
      content: 'Programas de capacitacion con matricula abierta.',
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
}
