import { DatePipe } from '@angular/common';
import { BotonNiubiz } from '../../componentes/boton-niubiz';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CuotaDetalle,
  ETIQUETA_METODO,
  importe,
  METODOS_DEL_ALUMNO,
  MetodoPago,
  OrdenDetalle,
  PagoDetalle,
} from '../../core/api/api.models';
import { MateduApi } from '../../core/api/matedu.api';
import { ProblemDetail } from '../../core/auth/auth.models';

/**
 * Estado de cuenta del alumno.
 *
 * Puede registrar su pago de Yape o Plin con el numero de operacion, pero eso
 * no salda nada: queda pendiente hasta que el centro revisa la constancia. La
 * pantalla lo dice con todas sus letras para que nadie crea que ya pago.
 */
@Component({
  selector: 'app-aula-mis-pagos',
  imports: [DatePipe, FormsModule, BotonNiubiz],
  template: `
    <header class="titulo">
      <h1>Mis pagos</h1>
      <p class="tenue">Estado de cuenta de sus cursos.</p>
    </header>

    @if (cargando()) {
      <p class="tenue">Cargando...</p>
    } @else if (error(); as mensaje) {
      <p class="aviso-error" role="alert">{{ mensaje }}</p>
    } @else if (ordenes().length === 0) {
      <div class="vacio tarjeta">
        <strong>No tiene ordenes de pago</strong>
        <p class="tenue">Cuando su centro emita una, aparecera aqui con sus cuotas.</p>
      </div>
    } @else {
      @for (orden of ordenes(); track orden.id) {
        <article class="orden tarjeta">
          <header class="orden-cabecera">
            <div>
              <span class="mono">{{ orden.numero }}</span>
              <span class="estado" [class]="'estado-' + orden.estado.toLowerCase()">
                {{ orden.estado }}
              </span>
            </div>
            <div class="saldo">
              <span class="tenue">Saldo</span>
              <strong>{{ soles(orden.saldo, orden.moneda) }}</strong>
            </div>
          </header>

          <table class="cuotas">
            <thead>
              <tr>
                <th>Cuota</th>
                <th>Vence</th>
                <th class="num">Monto</th>
                <th class="num">Pagado</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              @for (cuota of orden.cuotas; track cuota.id) {
                <tr [class.vencida]="cuota.estado === 'VENCIDA'">
                  <td>{{ cuota.numero }}</td>
                  <td>{{ cuota.fechaVencimiento | date: 'dd/MM/yyyy' }}</td>
                  <td class="num">{{ soles(cuota.monto, orden.moneda) }}</td>
                  <td class="num">{{ soles(cuota.montoPagado, orden.moneda) }}</td>
                  <td>
                    <span class="estado" [class]="'estado-' + cuota.estado.toLowerCase()">
                      {{ cuota.estado }}
                    </span>
                  </td>
                </tr>
              }
            </tbody>
          </table>

          @if (orden.saldo > 0 && orden.estado !== 'ANULADA') {
            @if (formularioAbierto() === orden.id) {
              <form class="pago" (ngSubmit)="registrar(orden)">
                @if (pagaConTarjeta()) {
                  <p class="aviso tenue">
                    El cobro es <strong>inmediato</strong>. El formulario de tarjeta lo abre
                    Niubiz; sus datos no pasan por esta plataforma.
                  </p>
                } @else {
                  <p class="aviso tenue">
                    Al enviar, su pago queda <strong>pendiente de revision</strong>. El centro lo
                    confirma tras verificar la constancia.
                  </p>
                }

                <div class="fila">
                  <div class="campo">
                    <label for="metodo">Metodo</label>
                    <select
                      id="metodo"
                      name="metodo"
                      [(ngModel)]="metodoElegido"
                      (ngModelChange)="alCambiarMetodo()"
                      required
                    >
                      @for (m of metodosDisponibles; track m) {
                        <option [value]="m">{{ etiqueta(m) }}</option>
                      }
                    </select>
                  </div>

                  <div class="campo">
                    <label for="cuota">Cuota</label>
                    <select
                      id="cuota"
                      name="cuota"
                      [(ngModel)]="cuotaElegida"
                      (ngModelChange)="alCambiarCuota(orden)"
                    >
                      <option [ngValue]="null">
                        Todo el saldo · {{ soles(orden.saldo, orden.moneda) }}
                      </option>
                      @for (cuota of cuotasPendientes(orden); track cuota.id) {
                        <option [ngValue]="cuota.id">
                          Cuota {{ cuota.numero }} · {{ soles(cuota.saldo, orden.moneda) }}
                        </option>
                      }
                    </select>
                  </div>
                </div>

                <div class="fila">
                  <div class="campo">
                    <label for="monto">Monto a pagar</label>
                    <!-- Lo decide la cuota elegida, no se escribe. Un importe
                         libre deja pagar 1 sol de una cuota de 296 y el alumno
                         se queda creyendo que la salvo; y con tarjeta, cada
                         cifra tecleada obligaba a pedirle otra sesion a Niubiz. -->
                    <output id="monto" class="monto-fijo">
                      {{ soles(montoIngresado ?? 0, orden.moneda) }}
                    </output>
                  </div>

                  @if (!pagaConTarjeta()) {
                    <div class="campo">
                      <label for="operacion">N.º de operacion</label>
                      <input
                        id="operacion"
                        name="operacion"
                        type="text"
                        [(ngModel)]="numeroOperacion"
                        placeholder="El que figura en su constancia"
                      />
                    </div>
                  }
                </div>

                @if (errorPago(); as mensaje) {
                  <p class="aviso-error" role="alert">{{ mensaje }}</p>
                }

                @if (!pagaConTarjeta()) {
                  <div class="acciones">
                    <button type="submit" class="boton" [disabled]="enviando()">
                      {{ enviando() ? 'Enviando...' : 'Registrar pago' }}
                    </button>
                    <button type="button" class="boton boton-secundario" (click)="cerrar()">
                      Cancelar
                    </button>
                  </div>
                }
              </form>

              @if (pagaConTarjeta()) {
                <!-- Fuera del <form> de arriba a proposito: el boton de Niubiz
                     trae su propio formulario, y un formulario dentro de otro
                     es HTML invalido. Anidados, pulsar "Paga aqui" enviaba el
                     nuestro y registraba un pago pendiente en vez de abrir el
                     modal de la tarjeta. -->
                <div class="tarjeta-pago">
                  <app-boton-niubiz
                    [ordenId]="orden.id"
                    [monto]="montoIngresado ?? 0"
                    [cuotaId]="cuotaElegida"
                    (fallo)="errorPago.set($event)"
                  />
                  <button type="button" class="boton boton-secundario" (click)="cerrar()">
                    Cancelar
                  </button>
                </div>
              }
            } @else {
              <button type="button" class="boton" (click)="abrir(orden)">Pagar</button>
            }
          }

          @if (pagosDe(orden.id).length > 0) {
            <section class="historial">
              <h3>Pagos registrados</h3>
              @for (pago of pagosDe(orden.id); track pago.id) {
                <div class="pago-fila">
                  <span>
                    {{ pago.creadoEn | date: 'dd/MM/yyyy' }} ·
                    {{ etiqueta(pago.metodo) }} ·
                    {{ soles(pago.monto, pago.moneda) }}
                  </span>
                  <span class="estado" [class]="'estado-' + pago.estado.toLowerCase()">
                    {{ pago.estado }}
                  </span>
                </div>
                @if (pago.rechazadoMotivo) {
                  <p class="motivo tenue">{{ pago.rechazadoMotivo }}</p>
                }
              }
            </section>
          }
        </article>
      }
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
    }
    .orden {
      padding: 20px 22px;
      margin-bottom: 18px;
    }
    .orden-cabecera {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 16px;
    }
    .mono {
      font-family: var(--fuente-mono);
      font-size: 14px;
      font-weight: 600;
      margin-right: 10px;
    }
    .monto-fijo {
      display: block;
      padding: 9px 12px;
      border: 1px solid var(--linea);
      border-radius: 8px;
      background: var(--fondo);
      font-size: 16px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
    .estado {
      display: inline-block;
      padding: 2px 9px;
      font-size: 11.5px;
      border-radius: 99px;
      border: 1px solid var(--linea);
      color: var(--texto-tenue);
    }
    .estado-pagada,
    .estado-confirmado {
      color: var(--exito);
      border-color: var(--exito);
    }
    .estado-vencida,
    .estado-rechazado {
      color: var(--error);
      border-color: var(--error);
    }
    .estado-parcial,
    .estado-pendiente {
      color: var(--aviso);
      border-color: var(--aviso);
    }
    .saldo {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      flex: none;
    }
    .saldo span {
      font-size: 11.5px;
    }
    .saldo strong {
      font-size: 19px;
      font-variant-numeric: tabular-nums;
    }
    .cuotas {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
      margin-bottom: 16px;
    }
    .cuotas th,
    .cuotas td {
      text-align: left;
      padding: 8px 10px;
      border-bottom: 1px solid var(--linea-2);
    }
    .cuotas thead th {
      font-size: 11px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--texto-tenue);
    }
    .cuotas .num {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    .cuotas tr.vencida td {
      color: var(--error);
    }
    .pago {
      display: flex;
      flex-direction: column;
      gap: 14px;
      padding: 16px;
      background: var(--superficie-2);
      border: 1px solid var(--linea);
      border-radius: var(--radio-sm);
    }
    .aviso {
      margin: 0;
      font-size: 13px;
    }
    .fila {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }
    .acciones {
      display: flex;
      gap: 10px;
    }
    .historial {
      margin-top: 18px;
      padding-top: 14px;
      border-top: 1px solid var(--linea-2);
    }
    .historial h3 {
      font-size: 11.5px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--texto-tenue);
      margin-bottom: 8px;
    }
    .pago-fila {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      font-size: 13.5px;
      padding: 5px 0;
    }
    .motivo {
      margin: 0 0 6px;
      font-size: 12.5px;
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
      .fila {
        grid-template-columns: 1fr;
      }
    }
    .acciones-pago {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .tarjeta-pago {
      margin-top: 14px;
      padding-top: 14px;
      border-top: 1px solid var(--borde);
    }
    .tarjeta-pago p {
      margin: 0 0 12px;
      font-size: 14px;
    }
  `,
})
export class AulaMisPagosPage implements OnInit {
  private readonly api = inject(MateduApi);

  protected readonly ordenes = signal<OrdenDetalle[]>([]);
  protected readonly pagos = signal<Record<string, PagoDetalle[]>>({});
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly errorPago = signal<string | null>(null);
  protected readonly enviando = signal(false);
  protected readonly formularioAbierto = signal<string | null>(null);

  protected readonly metodosDisponibles = METODOS_DEL_ALUMNO;

  protected metodoElegido: MetodoPago = 'YAPE';
  protected cuotaElegida: string | null = null;
  protected montoIngresado: number | null = null;
  protected numeroOperacion = '';

  ngOnInit(): void {
    this.cargar();
  }

  protected pagaConTarjeta(): boolean {
    return this.metodoElegido === 'TARJETA_CREDITO' || this.metodoElegido === 'TARJETA_DEBITO';
  }

  protected alCambiarMetodo(): void {
    this.errorPago.set(null);
  }

  protected abrir(orden: OrdenDetalle): void {
    this.formularioAbierto.set(orden.id);
    this.errorPago.set(null);
    this.numeroOperacion = '';

    // Se propone la cuota mas antigua pendiente, que es lo que casi siempre
    // paga; si no queda ninguna, el saldo entero.
    const pendiente = this.cuotasPendientes(orden)[0];
    this.cuotaElegida = pendiente ? pendiente.id : null;
    this.alCambiarCuota(orden);
  }

  /**
   * El importe lo fija la cuota elegida.
   *
   * Antes se escribia a mano, y eso permitia pagar 1 sol de una cuota de 296
   * —el sistema lo aceptaba, la cuota seguia pendiente y el alumno se quedaba
   * creyendo que la habia salvado—. Con tarjeta era peor: cada cifra tecleada
   * invalidaba la sesion de Niubiz y habia que pedir otra.
   *
   * Sin cuota elegida se paga el saldo entero, y el backend lo reparte entre
   * las cuotas en orden.
   */
  protected alCambiarCuota(orden: OrdenDetalle): void {
    const elegida = orden.cuotas.find((cuota) => cuota.id === this.cuotaElegida);
    this.montoIngresado = elegida ? elegida.saldo : orden.saldo;
  }

  protected cerrar(): void {
    this.formularioAbierto.set(null);
    this.errorPago.set(null);
  }

  protected registrar(orden: OrdenDetalle): void {
    // Con tarjeta no hay nada que registrar a mano: el cobro lo cierra Niubiz.
    // Sin esta guarda, pulsar Enter en cualquier campo enviaba el formulario y
    // dejaba un pago pendiente de revision, que es exactamente lo que el pago
    // con tarjeta viene a evitar.
    if (this.pagaConTarjeta()) {
      return;
    }

    if (!this.montoIngresado || this.montoIngresado <= 0) {
      this.errorPago.set('Ingrese un monto mayor que cero.');
      return;
    }

    this.enviando.set(true);
    this.errorPago.set(null);

    this.api
      .registrarPago({
        ordenId: orden.id,
        metodo: this.metodoElegido,
        monto: this.montoIngresado,
        cuotaId: this.cuotaElegida,
        numeroOperacion: this.numeroOperacion.trim() || null,
      })
      .subscribe({
        next: () => {
          this.enviando.set(false);
          this.cerrar();
          this.cargar();
        },
        error: (respuesta: unknown) => {
          this.enviando.set(false);
          this.errorPago.set(this.mensajeDe(respuesta));
        },
      });
  }

  protected cuotasPendientes(orden: OrdenDetalle): CuotaDetalle[] {
    return orden.cuotas.filter((cuota) => cuota.saldo > 0);
  }

  protected pagosDe(ordenId: string): PagoDetalle[] {
    return this.pagos()[ordenId] ?? [];
  }

  protected etiqueta(metodo: MetodoPago): string {
    return ETIQUETA_METODO[metodo];
  }

  protected soles(monto: number, moneda = 'PEN'): string {
    return importe(monto, moneda);
  }

  private cargar(): void {
    this.api.misOrdenes().subscribe({
      next: (ordenes) => {
        this.ordenes.set(ordenes);
        this.cargando.set(false);
        ordenes.forEach((orden) => this.cargarPagos(orden.id));
      },
      error: () => {
        this.error.set('No se pudo cargar su estado de cuenta.');
        this.cargando.set(false);
      },
    });
  }

  private cargarPagos(ordenId: string): void {
    this.api.pagosDeOrden(ordenId).subscribe({
      next: (lista) => this.pagos.update((actual) => ({ ...actual, [ordenId]: lista })),
      error: () => undefined,
    });
  }

  private mensajeDe(respuesta: unknown): string {
    if (respuesta instanceof HttpErrorResponse) {
      const problema = respuesta.error as ProblemDetail | null;
      if (problema?.detail) {
        return problema.detail;
      }
    }
    return 'No se pudo registrar el pago.';
  }
}
