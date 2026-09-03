import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  effect,
  untracked,
  ElementRef,
  inject,
  input,
  OnDestroy,
  output,
  PLATFORM_ID,
  signal,
  viewChild,
} from '@angular/core';
import { SesionDePagoNiubiz } from '../core/api/api.models';
import { MateduApi } from '../core/api/matedu.api';

/**
 * Botón de pago de Niubiz.
 *
 * El formulario de tarjeta lo dibuja `checkout.js`, que se carga desde los
 * servidores de Niubiz. **La tarjeta no pasa nunca por MATEDU**: eso es lo que
 * evita tener que cumplir PCI DSS por nuestra cuenta.
 *
 * El script se inserta a mano con `createElement` y no en la plantilla porque
 * Angular no ejecuta los `<script>` que encuentra en el HTML de un componente.
 * Sin esto, el botón sencillamente no aparecería y no habría ningún error que
 * lo explicara.
 *
 * Al terminar, Niubiz hace que el NAVEGADOR envíe el formulario a nuestra URL
 * de respuesta. No es una llamada de servidor a servidor, y por eso todo esto
 * funciona en localhost sin publicar nada.
 */
@Component({
  selector: 'app-boton-niubiz',
  template: `
    @if (error(); as mensaje) {
      <p class="aviso-error" role="alert">{{ mensaje }}</p>
    }

    @if (!sesion() && !cargando()) {
      <button
        type="button"
        class="boton"
        [disabled]="monto() <= 0"
        (click)="preparar()"
      >
        Continuar al pago
      </button>
    }

    @if (cargando()) {
      <p class="tenue">Preparando el pago seguro…</p>
    }

    <div #contenedor class="contenedor"></div>

    @if (sesion(); as datos) {
      <p class="tenue nota">
        Pago procesado por Niubiz. Sus datos de tarjeta no pasan por esta plataforma.
        @if (datos.modo === 'PRUEBAS') {
          <strong class="pruebas">Entorno de pruebas: no se cobra dinero real.</strong>
        }
      </p>
    }
  `,
  styles: `
    .contenedor {
      display: flex;
      justify-content: flex-start;
      min-height: 0;
    }
    :host {
      display: block;
    }
    .nota {
      margin: 10px 0 0;
      font-size: 12.5px;
      line-height: 1.55;
    }
    .pruebas {
      display: block;
      color: var(--aviso);
      margin-top: 3px;
    }
  `,
})
export class BotonNiubiz implements OnDestroy {
  private readonly api = inject(MateduApi);
  private readonly enNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  readonly ordenId = input.required<string>();
  readonly monto = input.required<number>();
  readonly cuotaId = input<string | null>(null);

  readonly fallo = output<string>();

  protected readonly contenedor = viewChild<ElementRef<HTMLDivElement>>('contenedor');
  protected readonly sesion = signal<SesionDePagoNiubiz | null>(null);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);

  private formulario: HTMLFormElement | null = null;

  /**
   * Si cambia el importe, lo ya preparado deja de valer.
   *
   * Cada sesión de Niubiz queda atada a un monto y es de **un solo uso**. Un
   * botón dibujado para S/ 150 seguiría cobrando 150 aunque el alumno hubiera
   * escrito 300 después, y el descuadre solo se vería al conciliar la caja.
   *
   * No se prepara solo: preparar es pedirle una sesión a Niubiz y dejar un pago
   * a la espera, y eso tiene que ser una decisión del alumno, no un efecto de
   * haber tecleado un número.
   */
  constructor() {
    effect(() => {
      this.monto();
      this.cuotaId();

      // untracked evita que limpiar la señal de sesión vuelva a disparar el
      // efecto: se leería a sí mismo y entraría en bucle.
      untracked(() => {
        if (this.sesion() !== null) {
          this.limpiar();
        }
      });
    });
  }

  /** Pide la sesión y dibuja el botón. */
  preparar(): void {
    if (!this.enNavegador || this.cargando()) {
      return;
    }

    this.limpiar();
    this.cargando.set(true);
    this.error.set(null);

    this.api
      .sesionDePagoNiubiz({
        ordenId: this.ordenId(),
        monto: this.monto(),
        cuotaId: this.cuotaId(),
      })
      .subscribe({
        next: (sesion) => {
          this.cargando.set(false);
          this.sesion.set(sesion);
          this.dibujar(sesion);
        },
        error: (fallo: { error?: { detail?: string } }) => {
          this.cargando.set(false);
          const mensaje = fallo.error?.detail ?? 'No se pudo iniciar el pago con tarjeta.';
          this.error.set(mensaje);
          this.fallo.emit(mensaje);
        },
      });
  }

  ngOnDestroy(): void {
    this.limpiar();
  }

  private dibujar(sesion: SesionDePagoNiubiz): void {
    const anfitrion = this.contenedor()?.nativeElement;
    if (!anfitrion) {
      return;
    }

    const formulario = document.createElement('form');
    formulario.method = 'POST';
    // El número de pedido viaja en la URL porque Niubiz no siempre lo devuelve
    // entre los campos del formulario, y sin él no sabríamos a qué pago
    // corresponde el cobro que acaba de aprobarse.
    formulario.action = `${sesion.urlRespuesta}?id=${encodeURIComponent(sesion.purchaseNumber)}`;

    const script = document.createElement('script');
    // La marca de tiempo obliga al navegador a tratarlo como un recurso nuevo.
    // Sin ella, volver a insertar el mismo `src` no reejecuta el script y el
    // botón no se vuelve a dibujar tras el primer intento: el alumno se queda
    // mirando un hueco vacío.
    script.src = `${sesion.urlScript}?v=${Date.now()}`;

    const atributos: Record<string, string> = {
      'data-sessiontoken': sesion.sessionToken,
      'data-channel': 'web',
      'data-merchantid': sesion.merchantId,
      'data-purchasenumber': sesion.purchaseNumber,
      'data-amount': sesion.amount,
      'data-expirationminutes': String(sesion.expirationMinutes),
      'data-timeouturl': sesion.urlTimeout,
      'data-merchantname': 'MATEDU',
      'data-formbuttoncolor': '#0E6E76',
      'data-buttonsize': 'MEDIUM',
      'data-showamount': 'TRUE',
    };

    for (const [clave, valor] of Object.entries(atributos)) {
      script.setAttribute(clave, valor);
    }

    script.onerror = () => {
      // Sin este aviso, el alumno se queda mirando un hueco en blanco sin
      // saber si tiene que esperar o si algo se rompió.
      const mensaje = 'No se pudo cargar el formulario de pago de Niubiz.';
      this.error.set(mensaje);
      this.fallo.emit(mensaje);
    };

    formulario.appendChild(script);
    anfitrion.appendChild(formulario);
    this.formulario = formulario;
  }

  private limpiar(): void {
    this.formulario?.remove();
    this.formulario = null;
    this.sesion.set(null);
  }
}
