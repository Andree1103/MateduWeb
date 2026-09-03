import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MiembroEquipo, NombreRol, RolDisponible } from '../../core/api/api.models';
import { MateduApi } from '../../core/api/matedu.api';

/**
 * Cuentas del equipo del centro.
 *
 * Faltaba entera: un centro podía cobrar y emitir certificados, pero no podía
 * dar de alta a su propio coordinador. La única salida era pedirle a alguien de
 * MATEDU que insertara la fila a mano, que no es forma de operar un producto
 * que se vende como self-service.
 */
@Component({
  selector: 'app-consola-equipo',
  imports: [DatePipe, FormsModule],
  template: `
    <header class="titulo">
      <h1>Equipo</h1>
      <p class="tenue">
        Las cuentas con las que su gente entra a MATEDU. El rol decide qué ve cada una.
      </p>
    </header>

    @if (error(); as mensaje) {
      <p class="aviso-error" role="alert">{{ mensaje }}</p>
    }
    @if (aviso(); as mensaje) {
      <p class="aviso-ok" role="status">{{ mensaje }}</p>
    }

    <div class="columnas">
      <section class="tarjeta panel">
        <h2>Agregar una cuenta</h2>

        <form (ngSubmit)="crear()" autocomplete="off">
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

          <label>
            <span>Correo</span>
            <input
              type="email"
              name="correoNuevo"
              [(ngModel)]="email"
              autocomplete="off"
              required
            />
          </label>

          <label>
            <span>Rol</span>
            <select name="rol" [(ngModel)]="rol">
              @for (opcion of roles(); track opcion.rol) {
                <option [value]="opcion.rol">{{ opcion.nombre }}</option>
              }
            </select>
            <small class="tenue">{{ descripcionDelRol() }}</small>
          </label>

          <label>
            <span>Contraseña inicial</span>
            <!-- new-password evita que el gestor del navegador rellene aquí las
                 credenciales del propio administrador. -->
            <input
              type="password"
              name="passwordNueva"
              [(ngModel)]="password"
              autocomplete="new-password"
              minlength="8"
              required
            />
            <small class="tenue">
              Al menos 8 caracteres. Entréguesela a la persona; ella podrá cambiarla después.
            </small>
          </label>

          <button type="submit" class="boton" [disabled]="guardando() || !puedeCrear()">
            {{ guardando() ? 'Creando…' : 'Crear cuenta' }}
          </button>
        </form>
      </section>

      <section class="tarjeta panel">
        <h2>Cuentas del centro</h2>

        @if (miembros().length === 0) {
          <p class="tenue">Todavía no hay cuentas.</p>
        }

        @for (miembro of miembros(); track miembro.id) {
          <article class="miembro" [class.inactivo]="!miembro.activo">
            <div class="datos">
              <strong>
                {{ miembro.nombres }} {{ miembro.apellidos }}
                @if (miembro.esUsted) {
                  <span class="usted">usted</span>
                }
              </strong>
              <small class="tenue">{{ miembro.email }}</small>
              <small class="tenue">
                @if (miembro.ultimoAcceso) {
                  Último acceso {{ miembro.ultimoAcceso | date: 'dd/MM/yyyy HH:mm' }}
                } @else {
                  Todavía no ha entrado
                }
              </small>
            </div>

            <div class="controles">
              <select
                [ngModel]="miembro.rol"
                [name]="'rol-' + miembro.id"
                [disabled]="miembro.esUsted"
                (ngModelChange)="cambiarRol(miembro, $event)"
              >
                @for (opcion of roles(); track opcion.rol) {
                  <option [value]="opcion.rol">{{ opcion.nombre }}</option>
                }
              </select>

              @if (miembro.activo) {
                <span class="estado activa">Activa</span>
              } @else {
                <span class="estado">Inactiva</span>
              }

              <div class="acciones">
                @if (!miembro.esUsted) {
                  <button
                    type="button"
                    class="enlace"
                    (click)="cambiarEstado(miembro, !miembro.activo)"
                  >
                    {{ miembro.activo ? 'Desactivar' : 'Reactivar' }}
                  </button>
                }
                <button type="button" class="enlace" (click)="abrirPassword(miembro)">
                  Cambiar contraseña
                </button>
              </div>

              @if (cambiandoPassword() === miembro.id) {
                <form class="password" (ngSubmit)="guardarPassword(miembro)" autocomplete="off">
                  <input
                    type="password"
                    [name]="'nueva-' + miembro.id"
                    [(ngModel)]="passwordNueva"
                    autocomplete="new-password"
                    placeholder="Nueva contraseña"
                    minlength="8"
                  />
                  <button type="submit" class="boton boton-secundario chico">Guardar</button>
                </form>
              }
            </div>
          </article>
        }

        <p class="tenue nota">
          Las cuentas no se borran: pueden haber confirmado pagos o tomado asistencia, y
          borrarlas dejaría esos movimientos sin responsable. Desactivar impide entrar,
          que es lo que se busca.
        </p>
      </section>
    </div>
  `,
  styles: `
    .titulo {
      margin-bottom: 22px;
    }
    .titulo h1 {
      font-size: 27px;
      margin-bottom: 6px;
    }
    .titulo p {
      margin: 0;
      max-width: 66ch;
    }
    .aviso-ok {
      background: rgba(22, 130, 90, 0.12);
      color: #12805a;
      border-radius: 8px;
      padding: 10px 14px;
      margin: 0 0 14px;
      font-size: 14.5px;
    }
    .columnas {
      display: grid;
      grid-template-columns: minmax(280px, 360px) 1fr;
      gap: 18px;
      align-items: start;
    }
    @media (max-width: 900px) {
      .columnas {
        grid-template-columns: 1fr;
      }
    }
    .panel {
      padding: 20px 22px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .panel h2 {
      margin: 0;
      font-size: 18px;
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
      line-height: 1.5;
    }
    .miembro {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      justify-content: space-between;
      border-top: 1px solid var(--borde);
      padding: 13px 0;
    }
    .miembro.inactivo {
      opacity: 0.6;
    }
    .datos {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .usted {
      font-size: 11px;
      font-weight: 600;
      background: var(--marca-primario-suave);
      color: var(--marca-primario);
      border-radius: 999px;
      padding: 2px 8px;
      margin-left: 6px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .controles {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 7px;
    }
    .controles select {
      min-width: 160px;
    }
    .estado {
      font-size: 11.5px;
      padding: 2px 9px;
      border-radius: 999px;
      border: 1px solid var(--borde);
      color: var(--texto-tenue);
    }
    .estado.activa {
      color: #12805a;
      border-color: #12805a;
    }
    .acciones {
      display: flex;
      gap: 12px;
    }
    .enlace {
      background: none;
      border: 0;
      padding: 0;
      color: var(--marca-primario);
      font-size: 13px;
      cursor: pointer;
    }
    .password {
      flex-direction: row;
      gap: 7px;
      align-items: center;
    }
    .chico {
      padding: 5px 12px;
      font-size: 13px;
    }
    .nota {
      margin: 6px 0 0;
      font-size: 12.5px;
      line-height: 1.55;
    }
  `,
})
export class ConsolaEquipoPage implements OnInit {
  private readonly api = inject(MateduApi);

  readonly miembros = signal<MiembroEquipo[]>([]);
  readonly roles = signal<RolDisponible[]>([]);
  readonly guardando = signal(false);
  readonly cambiandoPassword = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly aviso = signal<string | null>(null);

  nombres = '';
  apellidos = '';
  email = '';
  password = '';
  rol: NombreRol = 'COORDINADOR';
  passwordNueva = '';

  ngOnInit(): void {
    this.api.rolesDelEquipo().subscribe({
      next: (roles) => this.roles.set(roles),
      error: () => this.error.set('No se pudieron cargar los roles.'),
    });
    this.cargar();
  }

  descripcionDelRol(): string {
    return this.roles().find((opcion) => opcion.rol === this.rol)?.descripcion ?? '';
  }

  puedeCrear(): boolean {
    return (
      this.nombres.trim().length > 0
      && this.apellidos.trim().length > 0
      && this.email.includes('@')
      && this.password.length >= 8
    );
  }

  crear(): void {
    if (!this.puedeCrear()) {
      return;
    }

    this.guardando.set(true);
    this.limpiarMensajes();

    this.api
      .crearMiembro({
        email: this.email.trim(),
        nombres: this.nombres.trim(),
        apellidos: this.apellidos.trim(),
        rol: this.rol,
        password: this.password,
      })
      .subscribe({
        next: (miembro) => {
          this.guardando.set(false);
          this.aviso.set(`Cuenta creada para ${miembro.nombres}. Entréguele la contraseña.`);
          this.nombres = '';
          this.apellidos = '';
          this.email = '';
          this.password = '';
          this.cargar();
        },
        error: (fallo) => this.mostrarError(fallo, 'No se pudo crear la cuenta.'),
      });
  }

  cambiarRol(miembro: MiembroEquipo, rol: NombreRol): void {
    this.limpiarMensajes();

    this.api.cambiarRolDeMiembro(miembro.id, rol).subscribe({
      next: () => this.cargar(),
      // El backend impide dejar al centro sin administrador activo y explica
      // por que; repetirlo aqui con un texto generico seria esconderlo.
      error: (fallo) => this.mostrarError(fallo, 'No se pudo cambiar el rol.'),
    });
  }

  cambiarEstado(miembro: MiembroEquipo, activo: boolean): void {
    this.limpiarMensajes();

    this.api.cambiarEstadoDeMiembro(miembro.id, activo).subscribe({
      next: () => this.cargar(),
      error: (fallo) => this.mostrarError(fallo, 'No se pudo cambiar el estado.'),
    });
  }

  abrirPassword(miembro: MiembroEquipo): void {
    this.passwordNueva = '';
    this.cambiandoPassword.set(
      this.cambiandoPassword() === miembro.id ? null : miembro.id,
    );
  }

  guardarPassword(miembro: MiembroEquipo): void {
    if (this.passwordNueva.length < 8) {
      this.error.set('La contraseña necesita al menos 8 caracteres.');
      return;
    }

    this.limpiarMensajes();
    this.api.cambiarPasswordDeMiembro(miembro.id, this.passwordNueva).subscribe({
      next: () => {
        this.cambiandoPassword.set(null);
        this.passwordNueva = '';
        this.aviso.set(`Contraseña actualizada. Entréguesela a ${miembro.nombres}.`);
      },
      error: (fallo) => this.mostrarError(fallo, 'No se pudo cambiar la contraseña.'),
    });
  }

  private cargar(): void {
    this.api.equipoDelCentro().subscribe({
      next: (miembros) => this.miembros.set(miembros),
      error: () => this.error.set('No se pudo cargar el equipo.'),
    });
  }

  private limpiarMensajes(): void {
    this.error.set(null);
    this.aviso.set(null);
  }

  private mostrarError(fallo: { error?: { detail?: string } }, respaldo: string): void {
    this.guardando.set(false);
    this.aviso.set(null);
    this.error.set(fallo?.error?.detail ?? respaldo);
    // Se recarga para deshacer el cambio optimista del selector de rol.
    this.cargar();
  }
}
