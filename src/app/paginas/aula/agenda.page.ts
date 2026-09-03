import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ClaseDetalle, faltanPara } from '../../core/api/api.models';
import { MateduApi } from '../../core/api/matedu.api';
import { ProblemDetail } from '../../core/auth/auth.models';

/**
 * Agenda de clases del alumno.
 *
 * El boton de entrar se habilita solo dentro de la ventana horaria, y el
 * contador se refresca cada minuto: si el alumno deja la pantalla abierta
 * esperando a que empiece la clase, el boton se activa solo.
 *
 * Quien decide si la ventana esta abierta es el servidor. Aqui solo se refleja
 * lo que dijo, y al pulsar se vuelve a preguntar.
 */
@Component({
  selector: 'app-aula-agenda',
  imports: [DatePipe],
  template: `
    <header class="titulo">
      <h1>Mis clases</h1>
      <p class="tenue">Las clases en vivo de sus cursos.</p>
    </header>

    @if (cargando()) {
      <p class="tenue">Cargando...</p>
    } @else if (error(); as mensaje) {
      <p class="aviso-error" role="alert">{{ mensaje }}</p>
    } @else if (clases().length === 0) {
      <div class="vacio tarjeta">
        <strong>No tiene clases programadas</strong>
        <p class="tenue">Cuando su centro programe una, aparecera aqui con su enlace.</p>
      </div>
    } @else {
      @if (proximas().length > 0) {
        <h2 class="grupo-titulo">Proximas</h2>
        <div class="lista">
          @for (clase of proximas(); track clase.id) {
            <article class="clase tarjeta" [class.activa]="clase.ventanaAbierta">
              <div class="cuando">
                <span class="fecha">{{ clase.fecha | date: 'EEE dd MMM' }}</span>
                @if (clase.horaInicio) {
                  <span class="hora">{{ clase.horaInicio.substring(0, 5) }}</span>
                } @else {
                  <span class="hora tenue">Todo el dia</span>
                }
              </div>

              <div class="datos">
                <h3>{{ clase.titulo }}</h3>
                <p class="tenue">{{ clase.proveedorEtiqueta }}</p>
              </div>

              <div class="accion">
                @if (clase.ventanaAbierta && clase.tieneReunion) {
                  <button
                    type="button"
                    class="boton"
                    [disabled]="entrando() === clase.id"
                    (click)="entrar(clase)"
                  >
                    {{ entrando() === clase.id ? 'Abriendo...' : 'Entrar a clase' }}
                  </button>
                } @else if (!clase.tieneReunion) {
                  <span class="tenue">Sin enlace todavia</span>
                } @else {
                  <span class="espera tenue">Abre en {{ cuentaAtras(clase) }}</span>
                }
              </div>
            </article>
          }
        </div>
      }

      @if (pasadas().length > 0) {
        <h2 class="grupo-titulo">Anteriores</h2>
        <div class="lista">
          @for (clase of pasadas(); track clase.id) {
            <article class="clase tarjeta pasada">
              <div class="cuando">
                <span class="fecha">{{ clase.fecha | date: 'dd/MM/yyyy' }}</span>
              </div>
              <div class="datos">
                <h3>{{ clase.titulo }}</h3>
                @if (clase.tieneGrabacion) {
                  <p class="tenue">Grabacion disponible en el aula</p>
                }
              </div>
              <div class="accion"></div>
            </article>
          }
        </div>
      }
    }

    @if (errorEntrada(); as mensaje) {
      <p class="aviso-error entrada" role="alert">{{ mensaje }}</p>
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
    .grupo-titulo {
      font-size: 12px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--texto-tenue);
      margin: 26px 0 10px;
    }
    .lista {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .clase {
      display: grid;
      grid-template-columns: 110px 1fr auto;
      align-items: center;
      gap: 18px;
      padding: 16px 20px;
    }
    .clase.activa {
      border-color: var(--marca-primario);
    }
    .clase.pasada {
      opacity: 0.7;
    }
    .cuando {
      display: flex;
      flex-direction: column;
    }
    .fecha {
      font-size: 13px;
      text-transform: capitalize;
    }
    .hora {
      font-family: var(--fuente-mono);
      font-size: 19px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
    .datos h3 {
      font-size: 16px;
      margin-bottom: 2px;
    }
    .datos p {
      margin: 0;
      font-size: 13px;
    }
    .accion {
      text-align: right;
      white-space: nowrap;
    }
    .espera {
      font-size: 13px;
    }
    .entrada {
      margin-top: 16px;
    }
    .vacio {
      padding: 22px 24px;
      max-width: 60ch;
    }
    .vacio p {
      margin: 4px 0 0;
      font-size: 14px;
    }
    @media (max-width: 640px) {
      .clase {
        grid-template-columns: 1fr;
        gap: 10px;
      }
      .cuando {
        flex-direction: row;
        align-items: baseline;
        gap: 10px;
      }
      .accion {
        text-align: left;
      }
    }
  `,
})
export class AulaAgendaPage implements OnInit, OnDestroy {
  private readonly api = inject(MateduApi);

  protected readonly clases = signal<ClaseDetalle[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly errorEntrada = signal<string | null>(null);
  protected readonly entrando = signal<string | null>(null);

  protected readonly proximas = computed(() =>
    this.clases().filter((clase) => !this.yaPaso(clase)),
  );

  protected readonly pasadas = computed(() =>
    this.clases()
      .filter((clase) => this.yaPaso(clase))
      .reverse(),
  );

  private refresco?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.cargar();

    // La ventana se abre sola: refrescar cada minuto evita que el alumno
    // tenga que recargar para que el boton se active.
    this.refresco = setInterval(() => this.cargar(), 60_000);
  }

  ngOnDestroy(): void {
    clearInterval(this.refresco);
  }

  protected cuentaAtras(clase: ClaseDetalle): string {
    return faltanPara(clase.minutosParaAbrir);
  }

  protected entrar(clase: ClaseDetalle): void {
    this.entrando.set(clase.id);
    this.errorEntrada.set(null);

    this.api.entrarAClase(clase.id).subscribe({
      next: (acceso) => {
        this.entrando.set(null);
        window.open(acceso.enlace, '_blank', 'noopener');
      },
      error: (respuesta: unknown) => {
        this.entrando.set(null);
        this.errorEntrada.set(this.mensajeDe(respuesta));
        // El servidor sabe mas que la pantalla: se recarga para reflejarlo.
        this.cargar();
      },
    });
  }

  private yaPaso(clase: ClaseDetalle): boolean {
    return new Date(clase.cierraEn).getTime() < Date.now();
  }

  private cargar(): void {
    this.api.miAgenda().subscribe({
      next: (clases) => {
        this.clases.set(clases);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar su agenda de clases.');
        this.cargando.set(false);
      },
    });
  }

  private mensajeDe(respuesta: unknown): string {
    if (respuesta instanceof HttpErrorResponse) {
      const problema = respuesta.error as ProblemDetail | null;
      if (problema?.detail) {
        return problema.detail;
      }
    }
    return 'No se pudo entrar a la clase.';
  }
}
