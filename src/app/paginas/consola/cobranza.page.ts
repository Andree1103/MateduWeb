import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import {
  DeudaAlumno,
  ETIQUETA_METODO,
  importe,
  PagoDetalle,
  ResumenCobranza,
} from '../../core/api/api.models';
import { MateduApi } from '../../core/api/matedu.api';

/**
 * Panel de cobranza.
 *
 * Tres cosas en una pantalla: cuanto entro hoy, que constancias esperan
 * revision y quien debe. Es lo que el coordinador mira cada manana.
 */
@Component({
  selector: 'app-consola-cobranza',
  imports: [DatePipe],
  template: `
    <header class="titulo">
      <h1>Cobranza</h1>
      <p class="tenue">
        Un pago registrado no cobra nada hasta que alguien lo confirma. Eso es lo que
        se revisa aqui.
      </p>
    </header>

    @if (error(); as mensaje) {
      <p class="aviso-error" role="alert">{{ mensaje }}</p>
    }

    @if (resumen(); as datos) {
      <dl class="tarjetas">
        <div class="dato tarjeta">
          <dt>Cobrado hoy</dt>
          <dd>{{ soles(datos.cobradoHoy) }}</dd>
        </div>
        <div class="dato tarjeta">
          <dt>Por confirmar</dt>
          <dd [class.atencion]="datos.pagosPorConfirmar > 0">{{ datos.pagosPorConfirmar }}</dd>
        </div>
        <div class="dato tarjeta">
          <dt>Saldo por cobrar</dt>
          <dd>{{ soles(datos.saldoPorCobrar) }}</dd>
        </div>
        <div class="dato tarjeta">
          <dt>Ordenes morosas</dt>
          <dd [class.alerta]="datos.ordenesMorosas > 0">{{ datos.ordenesMorosas }}</dd>
        </div>
      </dl>
    }

    <section>
      <h2>Constancias por revisar</h2>
      @if (porConfirmar().length === 0) {
        <p class="tenue">No hay pagos esperando confirmacion.</p>
      } @else {
        <div class="tabla-scroll tarjeta">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Metodo</th>
                <th>N.º operacion</th>
                <th class="num">Monto</th>
                <th class="acciones">Accion</th>
              </tr>
            </thead>
            <tbody>
              @for (pago of porConfirmar(); track pago.id) {
                <tr>
                  <td>{{ pago.creadoEn | date: 'dd/MM/yyyy HH:mm' }}</td>
                  <td>{{ metodo(pago) }}</td>
                  <td class="mono">{{ pago.numeroOperacion ?? '—' }}</td>
                  <td class="num">{{ soles(pago.monto, pago.moneda) }}</td>
                  <td class="acciones">
                    <button
                      type="button"
                      class="boton"
                      [disabled]="procesando() === pago.id"
                      (click)="confirmar(pago)"
                    >
                      Confirmar
                    </button>
                    <button
                      type="button"
                      class="boton boton-secundario"
                      [disabled]="procesando() === pago.id"
                      (click)="rechazar(pago)"
                    >
                      Rechazar
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>

    <section>
      <h2>Morosidad</h2>
      @if (morosidad().length === 0) {
        <p class="tenue">Ningun alumno con saldo vencido.</p>
      } @else {
        <div class="tabla-scroll tarjeta">
          <table>
            <thead>
              <tr>
                <th>Alumno</th>
                <th>Orden</th>
                <th>Vencio</th>
                <th class="num">Atraso</th>
                <th class="num">Saldo</th>
              </tr>
            </thead>
            <tbody>
              @for (deuda of morosidad(); track deuda.ordenId) {
                <tr>
                  <td>{{ deuda.alumno }}</td>
                  <td class="mono">{{ deuda.numeroOrden }}</td>
                  <td>{{ deuda.venceEn | date: 'dd/MM/yyyy' }}</td>
                  <td class="num" [class.alerta]="deuda.diasDeAtraso > 30">
                    {{ deuda.diasDeAtraso }} d
                  </td>
                  <td class="num">{{ soles(deuda.saldo, deuda.moneda) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>
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
      max-width: 64ch;
    }
    h2 {
      font-size: 13px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--texto-tenue);
      margin-bottom: 10px;
    }
    section {
      margin-top: 30px;
    }
    .tarjetas {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 14px;
      margin: 0;
    }
    .dato {
      padding: 16px 18px;
    }
    .dato dt {
      font-size: 11.5px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--texto-tenue);
      margin-bottom: 6px;
    }
    .dato dd {
      margin: 0;
      font-size: 22px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
    .atencion {
      color: var(--aviso);
    }
    .alerta {
      color: var(--error);
    }
    .tabla-scroll {
      overflow-x: auto;
    }
    table {
      width: 100%;
      min-width: 640px;
      border-collapse: collapse;
      font-size: 14.5px;
    }
    th,
    td {
      text-align: left;
      padding: 11px 16px;
      border-bottom: 1px solid var(--linea-2);
    }
    thead th {
      font-size: 11.5px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--texto-tenue);
      background: var(--superficie-2);
      border-bottom: 1px solid var(--linea);
    }
    tbody tr:last-child td {
      border-bottom: 0;
    }
    .num {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    .mono {
      font-family: var(--fuente-mono);
      font-size: 13px;
    }
    .acciones {
      text-align: right;
      white-space: nowrap;
    }
    .acciones .boton {
      padding: 6px 12px;
      font-size: 13px;
      margin-left: 6px;
    }
  `,
})
export class ConsolaCobranzaPage implements OnInit {
  private readonly api = inject(MateduApi);

  protected readonly resumen = signal<ResumenCobranza | null>(null);
  protected readonly porConfirmar = signal<PagoDetalle[]>([]);
  protected readonly morosidad = signal<DeudaAlumno[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly procesando = signal<string | null>(null);

  ngOnInit(): void {
    this.cargar();
  }

  protected confirmar(pago: PagoDetalle): void {
    this.procesando.set(pago.id);
    this.api.confirmarPago(pago.id).subscribe({
      next: () => this.cargar(),
      error: () => {
        this.error.set('No se pudo confirmar el pago.');
        this.procesando.set(null);
      },
    });
  }

  protected rechazar(pago: PagoDetalle): void {
    const motivo = window.prompt('Motivo del rechazo (lo vera el alumno):');
    if (!motivo || motivo.trim().length < 3) {
      return;
    }

    this.procesando.set(pago.id);
    this.api.rechazarPago(pago.id, motivo.trim()).subscribe({
      next: () => this.cargar(),
      error: () => {
        this.error.set('No se pudo rechazar el pago.');
        this.procesando.set(null);
      },
    });
  }

  protected metodo(pago: PagoDetalle): string {
    return ETIQUETA_METODO[pago.metodo];
  }

  protected soles(monto: number, moneda = 'PEN'): string {
    return importe(monto, moneda);
  }

  private cargar(): void {
    this.procesando.set(null);

    this.api.resumenCobranza().subscribe({
      next: (datos) => this.resumen.set(datos),
      error: () => this.error.set('No se pudo cargar el resumen de cobranza.'),
    });

    this.api.pagosPorConfirmar().subscribe({
      next: (pagos) => this.porConfirmar.set(pagos),
      error: () => this.error.set('No se pudieron cargar los pagos por confirmar.'),
    });

    this.api.morosidad().subscribe({
      next: (deudas) => this.morosidad.set(deudas),
      error: () => this.error.set('No se pudo cargar la morosidad.'),
    });
  }
}
