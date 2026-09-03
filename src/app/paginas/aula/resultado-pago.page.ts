import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

/**
 * Cómo terminó el pago con tarjeta.
 *
 * Existe porque volver directo al estado de cuenta obliga al alumno a buscar
 * entre las filas si el cobro entró o no. Un pago necesita cierre: una pantalla
 * que lo diga con todas sus letras, repita el importe y la orden, y ofrezca un
 * solo camino de vuelta.
 *
 * Sirve igual para el sí y para el no. Un rechazo mostrado a medias —o
 * escondido en un parámetro de la URL— es lo que hace que el alumno vuelva a
 * intentar el pago sin saber si el primero pasó.
 */
@Component({
  selector: 'app-resultado-pago',
  imports: [RouterLink],
  template: `
    <main class="pantalla">
      <section class="tarjeta panel" [class.ok]="aprobado()" [class.no]="!aprobado()">
        <div class="marca" aria-hidden="true">{{ aprobado() ? '✓' : '!' }}</div>

        <h1>{{ aprobado() ? 'Pago aprobado' : 'El pago no se completó' }}</h1>

        @if (monto()) {
          <p class="importe">{{ moneda() }} {{ monto() }}</p>
        }
        @if (orden()) {
          <p class="tenue orden">Orden {{ orden() }}</p>
        }

        <p class="mensaje">{{ mensaje() }}</p>

        @if (aprobado()) {
          <p class="tenue nota">
            Su estado de cuenta ya está actualizado. Recibirá el comprobante en su correo.
          </p>
        } @else {
          <p class="tenue nota">
            No se realizó ningún cargo. Puede intentarlo de nuevo desde su estado de cuenta.
          </p>
        }

        <a class="boton" [routerLink]="['/aula/pagos']">Volver a mis pagos</a>
      </section>
    </main>
  `,
  styles: `
    .pantalla {
      min-height: 60dvh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
    }
    .panel {
      width: 100%;
      max-width: 440px;
      padding: 34px 32px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      text-align: center;
      border-top: 3px solid var(--borde);
    }
    .panel.ok {
      border-top-color: #12805a;
    }
    .panel.no {
      border-top-color: var(--error);
    }
    .marca {
      width: 52px;
      height: 52px;
      border-radius: 999px;
      display: grid;
      place-items: center;
      font-size: 26px;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .ok .marca {
      background: rgba(22, 130, 90, 0.14);
      color: #12805a;
    }
    .no .marca {
      background: rgba(190, 50, 50, 0.12);
      color: var(--error);
    }
    h1 {
      font-size: 22px;
      margin: 0;
    }
    .importe {
      margin: 4px 0 0;
      font-size: 30px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
    .orden {
      margin: 0;
      font-size: 13px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    }
    .mensaje {
      margin: 8px 0 0;
      font-size: 15px;
      max-width: 34ch;
    }
    .nota {
      margin: 0;
      font-size: 13.5px;
      max-width: 36ch;
      line-height: 1.55;
    }
    .boton {
      margin-top: 14px;
      text-decoration: none;
      display: inline-block;
    }
  `,
})
export class ResultadoPagoPage {
  private readonly ruta = inject(ActivatedRoute);

  private readonly parametros = toSignal(this.ruta.queryParamMap, {
    initialValue: this.ruta.snapshot.queryParamMap,
  });

  readonly aprobado = computed(() => this.parametros().get('estado') === 'aprobado');
  readonly monto = computed(() => this.parametros().get('monto'));
  /** El soles se escribe "S/", no "PEN": es lo que el alumno reconoce. */
  readonly moneda = computed(() => {
    const codigo = this.parametros().get('moneda');
    return !codigo || codigo === 'PEN' ? 'S/' : codigo;
  });
  readonly orden = computed(() => this.parametros().get('orden'));

  /**
   * El motivo lo escribe el backend con lo que dijo la pasarela.
   *
   * Se muestra tal cual: un "operación rechazada" genérico obliga al alumno a
   * llamar al centro para averiguar si fue la tarjeta, el saldo o un error
   * nuestro.
   */
  readonly mensaje = computed(
    () =>
      this.parametros().get('mensaje')
      || (this.aprobado() ? 'Su pago se registró correctamente.' : 'No se pudo procesar el pago.'),
  );
}
