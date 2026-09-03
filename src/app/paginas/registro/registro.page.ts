import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import {
  AltaRealizada,
  DisponibilidadSubdominio,
  NombrePlan,
  PlanPublico,
} from '../../core/api/api.models';
import { MateduApi } from '../../core/api/matedu.api';

/**
 * Alta de un centro, sin sesion y sin que nadie de MATEDU intervenga.
 *
 * La direccion del aula es lo unico que el centro tendra que recordar para
 * siempre, asi que se decide aqui, se comprueba mientras se escribe y se
 * muestra completa antes de confirmar.
 */
@Component({
  selector: 'app-registro',
  imports: [FormsModule, RouterLink],
  template: `
    <main class="pantalla">
      @if (creado(); as alta) {
        <section class="tarjeta panel listo">
          <h1>Tu aula ya existe</h1>
          <p class="tenue">
            Guarda esta direccion: es donde entran tu equipo y tus alumnos.
          </p>

          <p class="direccion">{{ alta.url }}</p>

          <ul class="siguiente">
            <li>Plan <strong>{{ alta.plan }}</strong>, {{ alta.diasDePrueba }} dias de prueba.</li>
            <li>Entra con el correo y la contrasena que acabas de elegir.</li>
            <li>Cuando conectes tu propio dominio, esta direccion sigue funcionando.</li>
          </ul>

          <a class="boton" [routerLink]="['/ingresar']">Ir a ingresar</a>
        </section>
      } @else {
        <form class="tarjeta panel" (ngSubmit)="registrar()">
          <h1>Crea tu centro</h1>
          <p class="tenue">
            {{ diasDePrueba() }} dias de prueba. La plataforma completa desde el primer
            minuto: arriba solo cambian los GB y los correos.
          </p>

          @if (error(); as mensaje) {
            <p class="aviso-error" role="alert">{{ mensaje }}</p>
          }

          <label>
            <span>Nombre del centro</span>
            <input
              type="text"
              name="nombre"
              required
              [(ngModel)]="nombre"
              (blur)="sugerir()"
              placeholder="Instituto San Martin"
            />
          </label>

          <label>
            <span>Direccion de tu aula</span>
            <div class="subdominio">
              <input
                type="text"
                name="subdominio"
                required
                [(ngModel)]="subdominio"
                (ngModelChange)="comprobar($event)"
                placeholder="san-martin"
              />
              <span class="sufijo">.matedu.pe</span>
            </div>
          </label>

          @if (disponibilidad(); as estado) {
            @if (estado.disponible) {
              <p class="libre">Disponible: {{ estado.url }}</p>
            } @else {
              <p class="ocupado">{{ estado.motivo }}</p>
            }
          }

          <fieldset class="planes">
            <legend>Plan</legend>
            @for (plan of planes(); track plan.plan) {
              <label class="opcion" [class.elegida]="planElegido === plan.plan">
                <input
                  type="radio"
                  name="plan"
                  [value]="plan.plan"
                  [(ngModel)]="planElegido"
                />
                <span class="nombre">{{ plan.plan }}</span>
                <span class="detalle">
                  {{ plan.almacenamientoGb }} GB · {{ plan.buzonesCorreo }} correos
                </span>
              </label>
            }
          </fieldset>

          <div class="dos">
            <label>
              <span>Nombres</span>
              <input type="text" name="nombres" required [(ngModel)]="nombres" />
            </label>
            <label>
              <span>Apellidos</span>
              <input type="text" name="apellidos" required [(ngModel)]="apellidos" />
            </label>
          </div>

          <label>
            <span>Correo del administrador</span>
            <input type="email" name="email" required [(ngModel)]="email" />
          </label>

          <label>
            <span>Contrasena</span>
            <input
              type="password"
              name="password"
              required
              minlength="8"
              [(ngModel)]="password"
            />
          </label>
          <p class="tenue nota">Al menos 8 caracteres.</p>

          <button type="submit" class="boton" [disabled]="enviando() || !puedeEnviar()">
            {{ enviando() ? 'Creando…' : 'Crear mi centro' }}
          </button>

          <p class="tenue nota">
            ¿Ya tienes cuenta? <a [routerLink]="['/ingresar']">Ingresa aqui</a>.
          </p>
        </form>
      }
    </main>
  `,
  styles: `
    .pantalla {
      min-height: 100dvh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 32px 20px;
      background: var(--fondo);
    }
    .panel {
      width: 100%;
      max-width: 470px;
      padding: 30px 32px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    h1 {
      font-size: 24px;
      margin: 0;
    }
    .panel > p.tenue {
      margin: 0;
      line-height: 1.6;
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
    .dos {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .subdominio {
      display: flex;
      align-items: stretch;
    }
    .subdominio input {
      border-top-right-radius: 0;
      border-bottom-right-radius: 0;
      flex: 1;
      min-width: 0;
    }
    .sufijo {
      display: flex;
      align-items: center;
      padding: 0 12px;
      border: 1px solid var(--borde);
      border-left: 0;
      border-radius: 0 8px 8px 0;
      background: var(--fondo);
      color: var(--texto-tenue);
      font-size: 14px;
      text-transform: none;
      letter-spacing: 0;
      white-space: nowrap;
    }
    .libre {
      margin: -8px 0 0;
      font-size: 13px;
      color: #12805a;
    }
    .ocupado {
      margin: -8px 0 0;
      font-size: 13px;
      color: var(--aviso);
    }
    .planes {
      border: 0;
      padding: 0;
      margin: 4px 0 0;
      display: grid;
      gap: 8px;
    }
    .planes legend {
      font-size: 12px;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--texto-tenue);
      margin-bottom: 6px;
      padding: 0;
    }
    .opcion {
      flex-direction: row;
      align-items: center;
      gap: 10px;
      border: 1px solid var(--borde);
      border-radius: 10px;
      padding: 11px 14px;
      cursor: pointer;
      text-transform: none;
      letter-spacing: 0;
      font-size: 14px;
      color: inherit;
    }
    .opcion.elegida {
      border-color: var(--marca-primario);
      background: var(--marca-primario-suave);
    }
    .opcion .nombre {
      font-weight: 600;
    }
    .opcion .detalle {
      margin-left: auto;
      color: var(--texto-tenue);
      font-size: 13px;
    }
    .nota {
      margin: -6px 0 0;
      font-size: 12.5px;
    }
    .listo {
      text-align: left;
    }
    .direccion {
      font-size: 20px;
      font-weight: 700;
      color: var(--marca-primario);
      word-break: break-all;
      margin: 0;
    }
    .siguiente {
      margin: 0;
      padding-left: 18px;
      color: var(--texto-tenue);
      font-size: 14px;
      line-height: 1.8;
    }
    .boton {
      text-align: center;
      text-decoration: none;
    }
  `,
})
export class RegistroPage {
  private readonly api = inject(MateduApi);

  readonly planes = signal<PlanPublico[]>([]);
  readonly disponibilidad = signal<DisponibilidadSubdominio | null>(null);
  readonly creado = signal<AltaRealizada | null>(null);
  readonly enviando = signal(false);
  readonly error = signal<string | null>(null);

  nombre = '';
  subdominio = '';
  planElegido: NombrePlan = 'ESENCIAL';
  nombres = '';
  apellidos = '';
  email = '';
  password = '';

  /**
   * Las pulsaciones se dejan reposar antes de preguntar.
   *
   * Sin esto, escribir "san-martin" dispara diez consultas y las respuestas
   * pueden llegar desordenadas: el usuario veria "disponible" para un texto
   * que ya no es el que tiene escrito. El switchMap descarta las anteriores.
   */
  private readonly escrito = new Subject<string>();

  constructor() {
    this.api.planesPublicos().subscribe({
      next: (planes) => this.planes.set(planes),
      error: () => this.error.set('No se pudieron cargar los planes.'),
    });

    this.escrito
      .pipe(
        debounceTime(350),
        distinctUntilChanged(),
        switchMap((valor) => this.api.disponibilidadDeSubdominio(valor)),
      )
      .subscribe({
        next: (estado) => this.disponibilidad.set(estado),
        error: () => this.disponibilidad.set(null),
      });
  }

  diasDePrueba(): number {
    return this.planes()[0]?.diasDePrueba ?? 14;
  }

  sugerir(): void {
    // Solo si el usuario no escribio ya su propia direccion: pisarsela seria
    // deshacerle una decision que ya tomo.
    if (!this.nombre.trim() || this.subdominio.trim()) {
      return;
    }

    this.api.sugerirSubdominio(this.nombre).subscribe({
      next: ({ subdominio }) => {
        this.subdominio = subdominio;
        this.comprobar(subdominio);
      },
    });
  }

  comprobar(valor: string): void {
    const limpio = (valor ?? '').trim().toLowerCase();
    if (limpio.length < 3) {
      this.disponibilidad.set(null);
      return;
    }
    this.escrito.next(limpio);
  }

  puedeEnviar(): boolean {
    return (
      this.nombre.trim().length > 0
      && this.disponibilidad()?.disponible === true
      && this.email.includes('@')
      && this.password.length >= 8
      && this.nombres.trim().length > 0
      && this.apellidos.trim().length > 0
    );
  }

  registrar(): void {
    if (!this.puedeEnviar()) {
      return;
    }

    this.enviando.set(true);
    this.error.set(null);

    this.api
      .registrarCentro({
        nombre: this.nombre.trim(),
        subdominio: this.subdominio.trim().toLowerCase(),
        plan: this.planElegido,
        email: this.email.trim(),
        password: this.password,
        nombres: this.nombres.trim(),
        apellidos: this.apellidos.trim(),
      })
      .subscribe({
        next: (alta) => {
          this.creado.set(alta);
          this.enviando.set(false);
        },
        error: (fallo: { error?: { detail?: string } }) => {
          // El servidor explica el motivo exacto (direccion tomada, reservada,
          // demasiados intentos). Sustituirlo por un texto generico dejaria al
          // usuario sin saber que cambiar.
          this.error.set(fallo.error?.detail ?? 'No se pudo crear el centro.');
          this.enviando.set(false);
        },
      });
  }
}
