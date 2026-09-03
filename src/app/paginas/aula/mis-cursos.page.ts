import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CursoDelAlumno } from '../../core/api/api.models';
import { MateduApi } from '../../core/api/matedu.api';
import { AuthService } from '../../core/auth/auth.service';

/**
 * Cursos del alumno.
 *
 * Muestra solo las matriculas que dan acceso al aula. Una matricula
 * preinscrita, sin pagar, no aparece aqui: eso lo decide el backend.
 */
@Component({
  selector: 'app-aula-mis-cursos',
  imports: [DatePipe, RouterLink],
  template: `
    <header class="titulo">
      <h1>Hola, {{ usuario()?.nombreCompleto }}</h1>
      <p class="tenue">Estos son sus cursos.</p>
    </header>

    @if (cargando()) {
      <p class="tenue">Cargando...</p>
    } @else if (error(); as mensaje) {
      <p class="aviso-error" role="alert">{{ mensaje }}</p>
    } @else if (cursos().length === 0) {
      <div class="vacio tarjeta">
        <strong>Todavia no tiene cursos activos</strong>
        <p class="tenue">
          Cuando su centro confirme una matricula, el curso aparecera aqui con su aula.
        </p>
      </div>
    } @else {
      <div class="lista">
        @for (curso of cursos(); track curso.matriculaId) {
          <a class="curso tarjeta" [routerLink]="['/aula/cursos', curso.grupoId]">
            <span class="etiqueta">{{ curso.codigoGrupo }}</span>
            <h2>{{ curso.curso }}</h2>

            <p class="fechas tenue">
              Del {{ curso.fechaInicio | date: 'dd/MM/yyyy' }}
              al {{ curso.fechaFin | date: 'dd/MM/yyyy' }}
            </p>
            @if (curso.horario) {
              <p class="horario tenue">{{ curso.horario }}</p>
            }

            <div class="barra" [attr.aria-label]="'Avance ' + curso.porcentajeAvance + '%'">
              <span [style.width.%]="curso.porcentajeAvance"></span>
            </div>
            <p class="avance tenue">
              {{ curso.leccionesCompletadas }} de {{ curso.leccionesTotales }} clases ·
              {{ curso.porcentajeAvance }}%
            </p>

            <span class="entrar">Entrar al aula →</span>
          </a>
        }
      </div>
    }
  `,
  styles: `
    .titulo {
      margin-bottom: 24px;
    }
    .titulo h1 {
      font-size: 27px;
      margin-bottom: 6px;
    }
    .titulo p {
      margin: 0;
    }
    .lista {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
    }
    .curso {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 7px;
      padding: 20px;
      color: inherit;
      text-decoration: none;
    }
    .curso:hover {
      border-color: var(--marca-primario);
    }
    .curso h2 {
      font-size: 17px;
    }
    .curso p {
      margin: 0;
      font-size: 13px;
    }
    .barra {
      width: 100%;
      height: 6px;
      margin-top: 8px;
      background: var(--superficie-2);
      border: 1px solid var(--linea);
      border-radius: 99px;
      overflow: hidden;
    }
    .barra span {
      display: block;
      height: 100%;
      background: var(--marca-primario);
    }
    .avance {
      font-variant-numeric: tabular-nums;
    }
    .entrar {
      margin-top: 6px;
      font-size: 13.5px;
      font-weight: 600;
      color: var(--marca-primario);
    }
    .vacio {
      padding: 22px 24px;
      max-width: 60ch;
    }
    .vacio p {
      margin: 4px 0 0;
      font-size: 14px;
    }
  `,
})
export class AulaMisCursosPage implements OnInit {
  private readonly api = inject(MateduApi);

  protected readonly usuario = inject(AuthService).usuario;
  protected readonly cursos = signal<CursoDelAlumno[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.api.misCursos().subscribe({
      next: (cursos) => {
        this.cursos.set(cursos);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar sus cursos.');
        this.cargando.set(false);
      },
    });
  }
}
