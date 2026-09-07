import { DecimalPipe } from '@angular/common';
import { Component, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CursoPublico, GrupoPublico, InscripcionHecha } from '../../core/api/api.models';
import { MateduApi } from '../../core/api/matedu.api';

/**
 * Inscripción desde el sitio público del centro.
 *
 * Termina en una orden de pago, no en un acceso: la matrícula queda
 * **preinscrita**, que reserva la vacante pero no abre el aula. El alumno entra
 * a pagar y, al saldar la orden, el sistema la activa solo.
 *
 * Decirlo así, con todas sus letras, evita el malentendido más caro de este
 * flujo: creerse matriculado, no pagar, y aparecer el primer día de clase.
 */
@Component({
  selector: 'app-inscribirme',
  imports: [DecimalPipe, FormsModule, RouterLink],
  template: `
    <main class="pantalla">
      @if (hecha(); as resultado) {
        <section class="tarjeta panel listo">
          <div class="marca" aria-hidden="true">✓</div>
          <h1>Reservamos tu vacante</h1>

          <p class="curso">{{ resultado.curso }}</p>
          <p class="tenue grupo">Grupo {{ resultado.grupo }}</p>

          <p class="importe">
            {{ resultado.moneda === 'PEN' ? 'S/' : resultado.moneda }}
            {{ resultado.total | number: '1.2-2' }}
          </p>
          <p class="tenue orden">Orden {{ resultado.numeroOrden }}</p>

          <div class="aviso">
            <strong>Tu vacante está reservada, pero todavía no matriculada.</strong>
            Se confirma cuando registres el pago. Hasta entonces no verás el aula.
          </div>

          <ol class="siguiente">
            <li>Ingresa con <strong>{{ resultado.email }}</strong>.</li>
            @if (resultado.cuentaNueva) {
              <li>Usa la contraseña que acabas de elegir.</li>
            } @else {
              <li>
                Ya tenías cuenta con ese correo: entra con tu contraseña de siempre, no con
                la que escribiste ahora.
              </li>
            }
            <li>En <strong>Mis pagos</strong> paga con tarjeta, Yape o transferencia.</li>
          </ol>

          <a class="boton" [routerLink]="['/ingresar']">Ingresar y pagar</a>
        </section>
      } @else {
        <section class="tarjeta panel">
          <a class="volver tenue" [routerLink]="['/cursos', slug()]">← Volver al curso</a>

          @if (curso(); as c) {
            <h1>Inscríbete en {{ c.nombre }}</h1>

            @if (grupo(); as g) {
              <p class="tenue resumen">
                Grupo {{ g.codigo }} · inicia el {{ g.fechaInicio }} ·
                {{ g.moneda === 'PEN' ? 'S/' : g.moneda }} {{ g.precio | number: '1.2-2' }}
                @if (g.horario) {
                  · {{ g.horario }}
                }
              </p>
            }
          }

          @if (error(); as mensaje) {
            <p class="aviso-error" role="alert">{{ mensaje }}</p>
          }

          <form (ngSubmit)="inscribirme()" autocomplete="off">
            <div class="dos">
              <label>
                <span>Nombres</span>
                <input type="text" name="nombres" [(ngModel)]="nombres" required />
              </label>
              <label>
                <span>Apellidos</span>
                <input type="text" name="apellidos" [(ngModel)]="apellidos" required />
              </label>
            </div>

            <div class="dos">
              <label>
                <span>Documento</span>
                <input type="text" name="documento" [(ngModel)]="numeroDocumento" />
              </label>
              <label>
                <span>Teléfono</span>
                <input type="text" name="telefono" [(ngModel)]="telefono" />
              </label>
            </div>

            <label>
              <span>Correo</span>
              <input type="email" name="correo" [(ngModel)]="email" required />
              <small class="tenue">Con este correo entrarás al aula.</small>
            </label>

            <label>
              <span>Contraseña</span>
              <input
                type="password"
                name="clave"
                [(ngModel)]="password"
                autocomplete="new-password"
                minlength="8"
                required
              />
              <small class="tenue">Al menos 8 caracteres.</small>
            </label>

            <div class="aviso">
              Al inscribirte <strong>reservamos tu vacante</strong> y generamos tu orden de
              pago. La matrícula se confirma cuando pagues.
            </div>

            <button type="submit" class="boton" [disabled]="!puedeEnviar() || enviando()">
              {{ enviando() ? 'Reservando…' : 'Reservar mi vacante' }}
            </button>
          </form>
        </section>
      }
    </main>
  `,
  styles: `
    .pantalla {
      display: flex;
      justify-content: center;
      padding: 40px 20px 64px;
    }
    .panel {
      width: 100%;
      max-width: 480px;
      padding: 30px 32px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .listo {
      align-items: center;
      text-align: center;
    }
    h1 {
      font-size: 23px;
      margin: 0;
      text-wrap: balance;
    }
    .volver {
      font-size: 13.5px;
      text-decoration: none;
    }
    .resumen {
      margin: -8px 0 0;
      font-size: 14px;
      line-height: 1.55;
    }
    form {
      display: flex;
      flex-direction: column;
      gap: 13px;
    }
    .dos {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
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
    label small {
      text-transform: none;
      letter-spacing: 0;
      font-size: 12.5px;
    }
    .aviso {
      background: var(--marca-primario-suave);
      border-left: 3px solid var(--marca-primario);
      border-radius: 0 8px 8px 0;
      padding: 11px 14px;
      font-size: 13.5px;
      line-height: 1.55;
      text-align: left;
    }
    .marca {
      width: 52px;
      height: 52px;
      border-radius: 999px;
      display: grid;
      place-items: center;
      font-size: 26px;
      font-weight: 700;
      background: rgba(22, 130, 90, 0.14);
      color: #12805a;
    }
    .curso {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }
    .grupo {
      margin: 0;
      font-size: 13px;
    }
    .importe {
      margin: 6px 0 0;
      font-size: 30px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
    .orden {
      margin: 0;
      font-size: 12.5px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    }
    .siguiente {
      margin: 0;
      padding-left: 20px;
      text-align: left;
      font-size: 14px;
      line-height: 1.75;
      color: var(--texto-tenue);
    }
    .boton {
      text-decoration: none;
      text-align: center;
    }
  `,
})
export class InscribirmePage implements OnInit {
  private readonly api = inject(MateduApi);

  /** Llegan por la ruta gracias a withComponentInputBinding(). */
  readonly slug = input.required<string>();
  readonly grupoId = input.required<string>();

  readonly curso = signal<CursoPublico | null>(null);
  readonly grupo = signal<GrupoPublico | null>(null);
  readonly hecha = signal<InscripcionHecha | null>(null);
  readonly enviando = signal(false);
  readonly error = signal<string | null>(null);

  nombres = '';
  apellidos = '';
  numeroDocumento = '';
  email = '';
  telefono = '';
  password = '';

  ngOnInit(): void {
    this.api.cursoPublico(this.slug()).subscribe({
      next: (curso) => {
        this.curso.set(curso);
        this.grupo.set(curso.grupos.find((g) => g.id === this.grupoId()) ?? null);
      },
      error: () => this.error.set('No se pudo cargar el curso.'),
    });
  }

  puedeEnviar(): boolean {
    return (
      this.nombres.trim().length > 0
      && this.apellidos.trim().length > 0
      && this.email.includes('@')
      && this.password.length >= 8
    );
  }

  inscribirme(): void {
    if (!this.puedeEnviar()) {
      return;
    }

    this.enviando.set(true);
    this.error.set(null);

    this.api
      .inscribirmeEnGrupo({
        grupoId: this.grupoId(),
        nombres: this.nombres.trim(),
        apellidos: this.apellidos.trim(),
        numeroDocumento: this.numeroDocumento || null,
        email: this.email.trim(),
        telefono: this.telefono || null,
        password: this.password,
      })
      .subscribe({
        next: (resultado) => {
          this.enviando.set(false);
          this.hecha.set(resultado);
        },
        // El backend avisa si el grupo se quedó sin vacantes, si ya está
        // inscrito o si se hicieron demasiados intentos. Su mensaje dice qué
        // pasó; uno genérico dejaría al visitante sin saber qué hacer.
        error: (fallo: { error?: { detail?: string } }) => {
          this.enviando.set(false);
          this.error.set(fallo.error?.detail ?? 'No se pudo completar la inscripción.');
        },
      });
  }
}
