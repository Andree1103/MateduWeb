import { Component, computed, effect, inject, OnInit, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CredencialPasarela,
  FichaPasarela,
  ModoPasarela,
  NombreProveedor,
  PruebaDeConexion,
} from '../../core/api/api.models';
import { MateduApi } from '../../core/api/matedu.api';

/**
 * Cuenta de cobro del centro.
 *
 * El dinero de los cursos va a la cuenta del centro, no a la nuestra, asi que
 * cada uno carga aqui sus propias credenciales. El formulario se arma con el
 * catalogo que publica el backend: agregar una pasarela nueva no obliga a tocar
 * esta pantalla.
 */
@Component({
  selector: 'app-consola-cobros',
  imports: [FormsModule],
  template: `
    <header class="titulo">
      <h1>Cobros online</h1>
      <p class="tenue">
        La cuenta es del centro: el dinero de sus cursos entra a su cuenta comercial. La
        contrasena se guarda cifrada y no vuelve a mostrarse completa.
      </p>
    </header>

    @if (error(); as mensaje) {
      <p class="aviso-error" role="alert">{{ mensaje }}</p>
    }

    <nav class="pestanas">
      @for (ficha of catalogo(); track ficha.proveedor) {
        <button
          type="button"
          class="pestana"
          [class.activa]="elegido() === ficha.proveedor"
          (click)="elegir(ficha)"
        >
          {{ ficha.nombre }}
          @if (configurado(ficha.proveedor); as credencial) {
            <span class="punto" [class.produccion]="credencial.modo === 'PRODUCCION'"></span>
          }
        </button>
      }
    </nav>

    @if (fichaActual(); as ficha) {
      <section class="tarjeta panel">
        <h2>{{ ficha.nombre }}</h2>
        <p class="tenue descripcion">{{ ficha.descripcion }}</p>

        @if (!ficha.soportado) {
          <p class="marca-no">
            Todavia no hay adaptador para esta pasarela. Puede guardar la credencial, pero
            los avisos de cobro no se procesan.
          </p>
        } @else if (!ficha.verificado && ficha.proveedor !== 'MANUAL') {
          <p class="marca-ojo">
            Adaptador sin verificar contra una cuenta real. Deje el modo en
            <strong>Pruebas</strong> y confirme un cobro de punta a punta antes de pasar a
            produccion.
          </p>
        }

        @if (ficha.campos.length === 0) {
          <p class="tenue">
            No necesita credenciales: los pagos se confirman a mano desde Cobranza.
          </p>
        } @else {
          <!-- autocomplete="off" en el formulario y "new-password" en el campo
               secreto: sin ellos, el gestor de contrasenas del navegador ve un
               campo de texto seguido de uno de tipo password y rellena el
               usuario y la clave con los que el administrador usa para entrar a
               MATEDU. Guardar sin mirar sustituiria las credenciales de la
               pasarela por las de su propia cuenta, y los cobros dejarian de
               funcionar sin ninguna pista del motivo. -->
          <form (ngSubmit)="guardar(ficha)" autocomplete="off">
            <label class="modo">
              <span>Entorno</span>
              <select name="modo" [(ngModel)]="modo">
                <option value="PRUEBAS">Pruebas</option>
                <option value="PRODUCCION">Produccion</option>
              </select>
            </label>
            <p class="tenue nota">
              Cobrar de verdad con llaves de prueba —o al reves— es el error mas comun.
              El endpoint cambia solo con el entorno.
            </p>

            @for (campo of ficha.campos; track campo.clave) {
              <label>
                <span>
                  {{ campo.etiqueta }}
                  @if (!campo.obligatorio) {
                    <em class="opcional">opcional</em>
                  }
                </span>
                <input
                  [type]="campo.secreto ? 'password' : 'text'"
                  [name]="campo.clave"
                  [ngModel]="valores[campo.clave]"
                  (ngModelChange)="valores[campo.clave] = $event"
                  [placeholder]="marcador(campo.clave, ficha)"
                  [attr.autocomplete]="campo.secreto ? 'new-password' : 'off'"
                  spellcheck="false"
                  autocapitalize="off"
                />
                <small class="tenue">{{ campo.ayuda }}</small>
              </label>
            }

            @if (guardada(); as credencial) {
              @if (credencial.llaveSecretaPista) {
                <p class="tenue nota">
                  Hay una contrasena guardada ({{ credencial.llaveSecretaPista }}). Deje el
                  campo vacio para conservarla.
                </p>
              }
              <p class="tenue nota">
                Endpoint en uso: <code>{{ credencial.endpointEfectivo }}</code>
              </p>
            }

            <div class="acciones">
              <button type="submit" class="boton" [disabled]="guardando()">
                {{ guardando() ? 'Guardando…' : 'Guardar' }}
              </button>
              @if (guardada()) {
                <button
                  type="button"
                  class="boton boton-secundario"
                  [disabled]="probando()"
                  (click)="probar(ficha)"
                >
                  {{ probando() ? 'Probando…' : 'Probar conexion' }}
                </button>
              }
            </div>
          </form>

          @if (prueba(); as resultado) {
            <div
              class="resultado"
              [class.bien]="resultado.credencialesAceptadas"
              [class.mal]="!resultado.credencialesAceptadas"
              role="status"
            >
              <strong>
                {{ resultado.credencialesAceptadas ? 'Conexion correcta' : 'No paso la prueba' }}
              </strong>
              <p>{{ resultado.mensaje }}</p>
              <small class="tenue">
                Se probo contra {{ resultado.urlProbada }}
                @if (resultado.codigo > 0) {
                  · HTTP {{ resultado.codigo }}
                }
              </small>
            </div>
          }
        }
      </section>
    }
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
    .pestanas {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 16px;
    }
    .pestana {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      border: 1px solid var(--borde);
      background: var(--fondo-tarjeta);
      color: var(--texto-tenue);
      border-radius: 999px;
      padding: 7px 15px;
      font-size: 13.5px;
      cursor: pointer;
    }
    .pestana.activa {
      background: var(--marca-primario);
      border-color: var(--marca-primario);
      color: #fff;
    }
    .punto {
      width: 7px;
      height: 7px;
      border-radius: 999px;
      background: #d9a441;
    }
    .punto.produccion {
      background: #12805a;
    }
    .panel {
      padding: 22px 24px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      max-width: 620px;
    }
    .panel h2 {
      margin: 0;
      font-size: 19px;
    }
    .descripcion {
      margin: -8px 0 0;
      line-height: 1.6;
    }
    form {
      display: flex;
      flex-direction: column;
      gap: 14px;
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
    .opcional {
      font-style: normal;
      text-transform: none;
      letter-spacing: 0;
      opacity: 0.75;
      margin-left: 6px;
    }
    .modo select {
      max-width: 220px;
    }
    .nota {
      margin: -8px 0 0;
      font-size: 12.5px;
    }
    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 12px;
      word-break: break-all;
    }
    .acciones {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .marca-ojo {
      margin: 0;
      background: rgba(214, 161, 67, 0.14);
      border-left: 3px solid #b9821f;
      border-radius: 0 8px 8px 0;
      padding: 10px 14px;
      font-size: 14px;
      line-height: 1.55;
    }
    .marca-no {
      margin: 0;
      background: rgba(190, 50, 50, 0.1);
      border-left: 3px solid var(--error);
      border-radius: 0 8px 8px 0;
      padding: 10px 14px;
      font-size: 14px;
      line-height: 1.55;
    }
    .resultado {
      border-radius: 10px;
      padding: 12px 16px;
      border-left: 3px solid;
    }
    .resultado p {
      margin: 4px 0 6px;
      font-size: 14.5px;
    }
    .resultado.bien {
      background: rgba(22, 130, 90, 0.12);
      border-color: #12805a;
    }
    .resultado.mal {
      background: rgba(190, 50, 50, 0.1);
      border-color: var(--error);
    }
  `,
})
export class ConsolaCobrosPage implements OnInit {
  private readonly api = inject(MateduApi);

  readonly catalogo = signal<FichaPasarela[]>([]);
  readonly credenciales = signal<CredencialPasarela[]>([]);
  readonly elegido = signal<NombreProveedor | null>(null);
  readonly prueba = signal<PruebaDeConexion | null>(null);
  readonly guardando = signal(false);
  readonly probando = signal(false);
  readonly error = signal<string | null>(null);

  modo: ModoPasarela = 'PRUEBAS';
  valores: Record<string, string> = {};

  readonly fichaActual = computed(() =>
    this.catalogo().find((ficha) => ficha.proveedor === this.elegido()) ?? null,
  );

  readonly guardada = computed(() =>
    this.credenciales().find((credencial) => credencial.proveedor === this.elegido()) ?? null,
  );

  /**
   * El formulario se rellena cuando llegan los datos, no cuando se pinta.
   *
   * El catalogo y las credenciales se piden en paralelo, y antes esto se
   * rellenaba en cuanto llegaba el catalogo. Si las credenciales tardaban un
   * poco mas —cosa que pasa una de cada dos veces— los campos quedaban vacios
   * aunque el centro los tuviera guardados, y al recargar la pagina el codigo
   * de comercio aparecia en blanco sin motivo aparente.
   *
   * Con un efecto sobre las dos señales, el orden de llegada deja de importar.
   */
  constructor() {
    effect(() => {
      const proveedor = this.elegido();
      const guardada = this.credenciales().find((c) => c.proveedor === proveedor);

      untracked(() => this.rellenar(guardada ?? null));
    });
  }

  ngOnInit(): void {
    this.api.catalogoDePasarelas().subscribe({
      next: (catalogo) => {
        this.catalogo.set(catalogo);
        // Se abre en la primera que pide credenciales: MANUAL no tiene nada que
        // configurar y abrir ahi haria parecer que la pantalla esta vacia.
        const primera = catalogo.find((ficha) => ficha.campos.length > 0) ?? catalogo[0];
        if (primera) {
          this.elegir(primera);
        }
      },
      error: () => this.error.set('No se pudo cargar el catalogo de pasarelas.'),
    });

    this.cargarCredenciales();
  }

  elegir(ficha: FichaPasarela): void {
    this.elegido.set(ficha.proveedor);
    this.prueba.set(null);
    this.error.set(null);
  }

  /**
   * Vuelca lo guardado en los campos.
   *
   * La contrasena nunca vuelve del servidor, asi que su campo arranca siempre
   * vacio: dejarlo asi significa "no la cambies".
   */
  private rellenar(guardada: CredencialPasarela | null): void {
    this.modo = guardada?.modo ?? 'PRUEBAS';
    this.valores = {
      comercioId: guardada?.comercioId ?? '',
      usuarioApi: guardada?.usuarioApi ?? '',
      llavePublica: guardada?.llavePublica ?? '',
      urlBase: guardada?.urlBase ?? '',
      llaveSecreta: '',
    };
  }

  configurado(proveedor: NombreProveedor): CredencialPasarela | null {
    return this.credenciales().find((credencial) => credencial.proveedor === proveedor) ?? null;
  }

  /** Muestra el endpoint de fabrica del entorno elegido, sin imponerlo. */
  marcador(clave: string, ficha: FichaPasarela): string {
    if (clave !== 'urlBase') {
      return '';
    }
    const url = this.modo === 'PRODUCCION' ? ficha.urlProduccion : ficha.urlPruebas;
    return url ?? '';
  }

  guardar(ficha: FichaPasarela): void {
    this.guardando.set(true);
    this.error.set(null);
    this.prueba.set(null);

    this.api
      .guardarCredencial({
        proveedor: ficha.proveedor,
        modo: this.modo,
        comercioId: this.valores['comercioId'] || null,
        usuarioApi: this.valores['usuarioApi'] || null,
        llavePublica: this.valores['llavePublica'] || null,
        llaveSecreta: this.valores['llaveSecreta'] || null,
        urlBase: this.valores['urlBase'] || null,
      })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.valores['llaveSecreta'] = '';
          this.cargarCredenciales();
        },
        error: (fallo: { error?: { detail?: string } }) => {
          this.guardando.set(false);
          this.error.set(fallo.error?.detail ?? 'No se pudo guardar la credencial.');
        },
      });
  }

  probar(ficha: FichaPasarela): void {
    this.probando.set(true);
    this.error.set(null);

    this.api.probarPasarela(ficha.proveedor).subscribe({
      next: (resultado) => {
        this.probando.set(false);
        this.prueba.set(resultado);
      },
      error: (fallo: { error?: { detail?: string } }) => {
        this.probando.set(false);
        this.error.set(fallo.error?.detail ?? 'No se pudo completar la prueba.');
      },
    });
  }

  private cargarCredenciales(): void {
    this.api.credencialesDePasarela().subscribe({
      next: (credenciales) => this.credenciales.set(credenciales),
      error: () => this.error.set('No se pudieron leer las credenciales guardadas.'),
    });
  }
}
