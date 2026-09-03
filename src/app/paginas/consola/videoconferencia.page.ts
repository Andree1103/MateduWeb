import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConexionVideoconferencia, ProveedorVideoconferencia } from '../../core/api/api.models';
import { MateduApi } from '../../core/api/matedu.api';
import { ProblemDetail } from '../../core/auth/auth.models';

/**
 * Conexion del centro con Zoom, Meet o Teams.
 *
 * La pantalla dice con todas sus letras que el secreto no vuelve a mostrarse y
 * que dejarlo vacio conserva el que ya estaba: son las dos cosas que todo el
 * mundo pregunta al editar credenciales.
 */
@Component({
  selector: 'app-consola-videoconferencia',
  imports: [DatePipe, FormsModule],
  template: `
    <header class="titulo">
      <h1>Videoconferencia</h1>
      <p class="tenue">
        Conecte la cuenta de su centro. Las reuniones se crearan alli, con su marca,
        y el dinero de sus licencias sigue siendo suyo.
      </p>
    </header>

    @if (error(); as mensaje) {
      <p class="aviso-error" role="alert">{{ mensaje }}</p>
    }

    <section class="conectadas">
      <h2>Conexiones</h2>

      @if (conexiones().length === 0) {
        <div class="vacio tarjeta">
          <strong>Sin conexiones todavia</strong>
          <p class="tenue">
            Mientras tanto puede programar clases con <b>enlace manual</b>: pega el enlace
            que genere en su plataforma y funciona igual.
          </p>
        </div>
      } @else {
        @for (conexion of conexiones(); track conexion.proveedor) {
          <article class="conexion tarjeta">
            <div>
              <strong>{{ conexion.etiqueta }}</strong>
              <p class="tenue">
                {{ conexion.modo }}
                @if (conexion.organizador) {
                  · {{ conexion.organizador }}
                }
                @if (conexion.clientSecretPista) {
                  · secreto {{ conexion.clientSecretPista }}
                }
              </p>
              @if (conexion.conectadoEn) {
                <small class="tenue">
                  Conectado el {{ conexion.conectadoEn | date: 'dd/MM/yyyy HH:mm' }}
                </small>
              }
              @if (conexion.ultimoError) {
                <p class="error-conexion">{{ conexion.ultimoError }}</p>
              }
            </div>
            <span class="estado" [class.activa]="conexion.activo">
              {{ conexion.activo ? 'Activa' : 'Inactiva' }}
            </span>
          </article>
        }
      }
    </section>

    <section class="formulario tarjeta">
      <h2>Conectar una plataforma</h2>

      <form (ngSubmit)="conectar()">
        <div class="fila">
          <div class="campo">
            <label for="proveedor">Plataforma</label>
            <select id="proveedor" name="proveedor" [(ngModel)]="proveedor" required>
              <option value="ZOOM">Zoom</option>
              <option value="MEET">Google Meet</option>
              <option value="TEAMS">Microsoft Teams</option>
            </select>
          </div>

          <div class="campo">
            <label for="modo">Modo</label>
            <select id="modo" name="modo" [(ngModel)]="modo">
              <option value="PRUEBAS">Pruebas</option>
              <option value="PRODUCCION">Produccion</option>
            </select>
          </div>
        </div>

        <div class="fila">
          <div class="campo">
            <label for="cuenta">{{ etiquetaCuenta() }}</label>
            <input id="cuenta" name="cuenta" type="text" [(ngModel)]="cuentaExterna" />
          </div>

          <div class="campo">
            <label for="organizador">Organizador de las reuniones</label>
            <input
              id="organizador"
              name="organizador"
              type="email"
              [(ngModel)]="organizador"
              placeholder="clases@sucentro.pe"
            />
          </div>
        </div>

        <div class="fila">
          <div class="campo">
            <label for="clientId">Client ID</label>
            <input id="clientId" name="clientId" type="text" [(ngModel)]="clientId" />
          </div>

          <div class="campo">
            <label for="clientSecret">Client secret</label>
            <input
              id="clientSecret"
              name="clientSecret"
              type="password"
              [(ngModel)]="clientSecret"
              autocomplete="new-password"
            />
            <span class="ayuda">
              Se guarda cifrado y no vuelve a mostrarse. Dejelo vacio para conservar el actual.
            </span>
          </div>
        </div>

        @if (proveedor === 'MEET') {
          <div class="campo">
            <label for="refresh">Refresh token</label>
            <input id="refresh" name="refresh" type="password" [(ngModel)]="refreshToken" />
            <span class="ayuda">
              Google lo entrega al autorizar el calendario con el scope calendar.events.
            </span>
          </div>
        }

        <button type="submit" class="boton" [disabled]="guardando()">
          {{ guardando() ? 'Conectando...' : 'Conectar' }}
        </button>
      </form>
    </section>

    <p class="nota tenue">
      Las integraciones con Zoom, Meet y Teams están escritas contra la documentación de
      cada proveedor pero todavía no se probaron contra una cuenta real. El enlace manual
      sí está verificado y funciona con cualquier plataforma.
    </p>
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
    h2 {
      font-size: 12px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--texto-tenue);
      margin-bottom: 10px;
    }
    section {
      margin-bottom: 26px;
    }
    .conexion {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      padding: 16px 20px;
      margin-bottom: 10px;
    }
    .conexion p {
      margin: 3px 0 0;
      font-size: 13px;
    }
    .conexion small {
      font-size: 12px;
    }
    .error-conexion {
      color: var(--error);
      font-size: 12.5px;
      margin-top: 6px;
    }
    .estado {
      flex: none;
      padding: 2px 9px;
      font-size: 11.5px;
      border-radius: 99px;
      border: 1px solid var(--linea);
      color: var(--texto-tenue);
    }
    .estado.activa {
      color: var(--exito);
      border-color: var(--exito);
    }
    .formulario {
      padding: 22px 24px;
      max-width: 70ch;
    }
    form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .fila {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .nota {
      font-size: 13px;
      max-width: 70ch;
    }
    .vacio {
      padding: 20px 22px;
      max-width: 62ch;
    }
    .vacio p {
      margin: 4px 0 0;
      font-size: 14px;
    }
    @media (max-width: 640px) {
      .fila {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class ConsolaVideoconferenciaPage implements OnInit {
  private readonly api = inject(MateduApi);

  protected readonly conexiones = signal<ConexionVideoconferencia[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly guardando = signal(false);

  protected proveedor: ProveedorVideoconferencia = 'ZOOM';
  protected modo = 'PRUEBAS';
  protected cuentaExterna = '';
  protected clientId = '';
  protected clientSecret = '';
  protected refreshToken = '';
  protected organizador = '';

  ngOnInit(): void {
    this.cargar();
  }

  /** Cada proveedor llama de otra forma al identificador de la cuenta. */
  protected etiquetaCuenta(): string {
    return {
      ZOOM: 'Account ID de Zoom',
      MEET: 'Dominio de Google Workspace',
      TEAMS: 'Tenant ID de Microsoft',
      MANUAL: 'Cuenta',
    }[this.proveedor];
  }

  protected conectar(): void {
    this.guardando.set(true);
    this.error.set(null);

    this.api
      .conectarVideoconferencia({
        proveedor: this.proveedor,
        modo: this.modo,
        cuentaExterna: this.cuentaExterna.trim() || null,
        clientId: this.clientId.trim() || null,
        clientSecret: this.clientSecret.trim() || null,
        refreshToken: this.refreshToken.trim() || null,
        organizador: this.organizador.trim() || null,
      })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          // El secreto no se conserva en pantalla ni un segundo de mas.
          this.clientSecret = '';
          this.refreshToken = '';
          this.cargar();
        },
        error: (respuesta: unknown) => {
          this.guardando.set(false);
          this.error.set(this.mensajeDe(respuesta));
        },
      });
  }

  private cargar(): void {
    this.api.conexionesVideoconferencia().subscribe({
      next: (lista) => this.conexiones.set(lista),
      error: () => this.error.set('No se pudieron cargar las conexiones.'),
    });
  }

  private mensajeDe(respuesta: unknown): string {
    if (respuesta instanceof HttpErrorResponse) {
      const problema = respuesta.error as ProblemDetail | null;
      if (problema?.detail) {
        return problema.detail;
      }
    }
    return 'No se pudo guardar la conexion.';
  }
}
