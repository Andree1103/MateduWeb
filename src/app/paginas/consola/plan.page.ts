import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ConsumoDelCentro, NombrePlan, PlanPosible } from '../../core/api/api.models';
import { MateduApi } from '../../core/api/matedu.api';

/**
 * Plan del centro y lo que esta usando.
 *
 * Es tambien la pantalla a la que se llega cuando la API responde 402: si el
 * acceso esta cortado, el administrador tiene que aterrizar donde se arregla,
 * no en un error suelto.
 */
@Component({
  selector: 'app-consola-plan',
  imports: [DatePipe, DecimalPipe],
  template: `
    <header class="titulo">
      <h1>Plan y consumo</h1>
      <p class="tenue">
        La plataforma es la misma en los tres niveles. Lo unico que cambia es el
        almacenamiento y la cantidad de correos corporativos.
      </p>
    </header>

    @if (suspendida()) {
      <div class="corte" role="alert">
        <strong>El acceso esta suspendido.</strong>
        La suscripcion vencio y pasaron los dias de gracia. Nada se ha borrado: al
        regularizar el pago, todo vuelve tal como estaba. Los certificados ya emitidos
        siguen validandose.
      </div>
    }

    @if (error(); as mensaje) {
      <p class="aviso-error" role="alert">{{ mensaje }}</p>
    }

    @if (consumo(); as datos) {
      <dl class="tarjetas">
        <div class="dato tarjeta">
          <dt>Plan actual</dt>
          <dd>{{ datos.plan }}</dd>
        </div>
        <div class="dato tarjeta">
          <dt>Estado</dt>
          <dd [class.alerta]="datos.estado === 'SUSPENDIDA'"
              [class.atencion]="datos.estado === 'VENCIDA'">
            {{ etiquetaEstado(datos.estado) }}
          </dd>
        </div>
        <div class="dato tarjeta">
          <dt>Vigente hasta</dt>
          <dd class="chico">{{ datos.vigenteHasta | date: 'dd/MM/yyyy' }}</dd>
        </div>
        <div class="dato tarjeta">
          <dt>{{ datos.diasRestantes >= 0 ? 'Dias restantes' : 'Dias vencida' }}</dt>
          <dd [class.atencion]="datos.diasRestantes < 7">
            {{ abs(datos.diasRestantes) }}
          </dd>
        </div>
      </dl>

      <section>
        <h2>Almacenamiento</h2>
        <div class="tarjeta medidor">
          <div class="barra">
            <div
              class="relleno"
              [class.lleno]="datos.almacenamiento.porcentaje >= 90"
              [style.width.%]="anchoBarra(datos.almacenamiento.porcentaje)"
            ></div>
          </div>
          <p class="cifras">
            <strong>{{ datos.almacenamiento.usadoLegible }}</strong>
            de {{ datos.almacenamiento.totalLegible }}
            <span class="tenue">({{ datos.almacenamiento.porcentaje }}%)</span>
          </p>
          @if (datos.almacenamiento.porcentaje >= 80) {
            <p class="tenue nota">
              Cerca del limite. Al llegar al 100% no se podran subir mas materiales.
            </p>
          }
        </div>
      </section>

      <section>
        <h2>Incluido, sin tope</h2>
        <dl class="tarjetas">
          <div class="dato tarjeta">
            <dt>Alumnos</dt>
            <dd>{{ datos.volumen.alumnos | number }}</dd>
          </div>
          <div class="dato tarjeta">
            <dt>Cursos</dt>
            <dd>{{ datos.volumen.cursos | number }}</dd>
          </div>
          <div class="dato tarjeta">
            <dt>Grupos</dt>
            <dd>{{ datos.volumen.grupos | number }}</dd>
          </div>
          <div class="dato tarjeta">
            <dt>Correos corporativos</dt>
            <dd>{{ datos.buzones.enUso }} / {{ datos.buzones.incluidos }}</dd>
          </div>
        </dl>
      </section>

      <section>
        <h2>Cambiar de plan</h2>
        <div class="planes">
          @for (plan of datos.planes; track plan.plan) {
            <article class="tarjeta plan" [class.actual]="plan.esElActual">
              <h3>{{ plan.plan }}</h3>
              <ul>
                <li>{{ plan.almacenamientoGb }} GB de almacenamiento</li>
                <li>{{ plan.buzonesCorreo }} correos corporativos</li>
                <li>Todo lo demas, igual que los otros</li>
              </ul>

              @if (plan.esElActual) {
                <p class="marca-actual">Tu plan actual</p>
              } @else if (!plan.disponible) {
                <!-- Se dice el motivo aqui mismo: hacerle probar el cambio para
                     descubrir que no puede seria gastarle un clic y darle un
                     error donde deberia haber una explicacion. -->
                <p class="impedimento">
                  @for (impedimento of plan.impedimentos; track impedimento) {
                    {{ impedimento }}
                  }
                </p>
                <button type="button" class="boton boton-secundario" disabled>
                  No disponible
                </button>
              } @else {
                <button
                  type="button"
                  class="boton"
                  [disabled]="cambiando()"
                  (click)="cambiar(plan)"
                >
                  Pasar a {{ plan.plan }}
                </button>
              }
            </article>
          }
        </div>
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
    .corte {
      border: 1px solid var(--error);
      background: rgba(190, 50, 50, 0.08);
      color: var(--error);
      border-radius: 10px;
      padding: 14px 18px;
      margin-bottom: 20px;
      font-size: 14.5px;
      line-height: 1.55;
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
    .dato dd.chico {
      font-size: 17px;
    }
    .atencion {
      color: var(--aviso);
    }
    .alerta {
      color: var(--error);
    }
    .medidor {
      padding: 18px 20px;
    }
    .barra {
      height: 12px;
      border-radius: 999px;
      background: var(--fondo);
      border: 1px solid var(--borde);
      overflow: hidden;
    }
    .relleno {
      height: 100%;
      background: var(--marca-primario);
      transition: width 0.3s ease;
    }
    .relleno.lleno {
      background: var(--error);
    }
    .cifras {
      margin: 12px 0 0;
      font-size: 15px;
    }
    .nota {
      margin: 6px 0 0;
      font-size: 13px;
    }
    .planes {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
      gap: 14px;
    }
    .plan {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .plan.actual {
      border-color: var(--marca-primario);
    }
    .plan h3 {
      margin: 0;
      font-size: 17px;
    }
    .plan ul {
      margin: 0;
      padding-left: 18px;
      font-size: 14px;
      color: var(--texto-tenue);
      line-height: 1.7;
    }
    .plan button {
      margin-top: auto;
    }
    .marca-actual {
      margin: auto 0 0;
      font-size: 13.5px;
      font-weight: 600;
      color: var(--marca-primario);
    }
    .impedimento {
      margin: 0;
      font-size: 13px;
      color: var(--aviso);
      line-height: 1.5;
    }
  `,
})
export class ConsolaPlanPage implements OnInit {
  private readonly api = inject(MateduApi);
  private readonly ruta = inject(ActivatedRoute);

  readonly consumo = signal<ConsumoDelCentro | null>(null);
  readonly cambiando = signal(false);
  readonly error = signal<string | null>(null);

  /**
   * El corte se detecta por el estado, no solo por el parametro de la URL.
   *
   * Si dependiera del parametro, entrar por el menu a un centro suspendido no
   * mostraria nada y el administrador seguiria sin entender por que falla todo.
   */
  readonly suspendida = computed(
    () =>
      this.consumo()?.estado === 'SUSPENDIDA'
      || this.ruta.snapshot.queryParamMap.get('motivo') === 'suspendida',
  );

  ngOnInit(): void {
    this.cargar();
  }

  cambiar(plan: PlanPosible): void {
    this.cambiando.set(true);
    this.error.set(null);

    this.api.cambiarPlan(plan.plan as NombrePlan).subscribe({
      next: () => {
        this.cambiando.set(false);
        this.cargar();
      },
      error: (fallo: { error?: { detail?: string } }) => {
        // El backend explica el impedimento con numeros concretos; repetirlo
        // aqui con un texto generico seria esconder la unica informacion util.
        this.error.set(fallo.error?.detail ?? 'No se pudo cambiar el plan.');
        this.cambiando.set(false);
      },
    });
  }

  etiquetaEstado(estado: string): string {
    const etiquetas: Record<string, string> = {
      PRUEBA: 'En prueba',
      ACTIVA: 'Al dia',
      VENCIDA: 'Vencida',
      SUSPENDIDA: 'Suspendida',
      CANCELADA: 'Cancelada',
      SIN_SUSCRIPCION: 'Sin registrar',
    };
    return etiquetas[estado] ?? estado;
  }

  /** La barra no pasa del 100 aunque el consumo si: no cabe en la caja. */
  anchoBarra(porcentaje: number): number {
    return Math.min(100, Math.max(0, porcentaje));
  }

  abs(valor: number): number {
    return Math.abs(valor);
  }

  private cargar(): void {
    this.api.consumoDelCentro().subscribe({
      next: (datos) => this.consumo.set(datos),
      error: () => this.error.set('No se pudo leer el consumo del centro.'),
    });
  }
}
