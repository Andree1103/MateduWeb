import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AvisoEnviado, PlantillaAviso } from '../../core/api/api.models';
import { MateduApi } from '../../core/api/matedu.api';

/**
 * Avisos automaticos: que se manda y con que texto.
 *
 * Dos mitades. Arriba, el texto de cada aviso, que el centro puede reescribir
 * o apagar. Abajo, lo que efectivamente salio: cuando un alumno dice "nunca me
 * avisaron", esa lista cierra la discusion.
 */
@Component({
  selector: 'app-consola-avisos',
  imports: [DatePipe, FormsModule],
  template: `
    <header class="titulo">
      <h1>Avisos automaticos</h1>
      <p class="tenue">
        Los correos salen solos cuando ocurre el hecho. Aqui se cambia lo que dicen y
        se revisa lo que salio.
      </p>
    </header>

    @if (error(); as mensaje) {
      <p class="aviso-error" role="alert">{{ mensaje }}</p>
    }

    <div class="columnas">
      <nav class="lista tarjeta">
        @for (plantilla of plantillas(); track plantilla.tipo) {
          <button
            type="button"
            class="fila"
            [class.activa]="elegida()?.tipo === plantilla.tipo"
            (click)="elegir(plantilla)"
          >
            <span class="nombre">{{ plantilla.titulo }}</span>
            <span class="marcas">
              @if (!plantilla.activa) {
                <span class="etiqueta apagado">Apagado</span>
              } @else if (plantilla.personalizada) {
                <span class="etiqueta propio">Propio</span>
              }
            </span>
          </button>
        }
      </nav>

      @if (elegida(); as plantilla) {
        <section class="editor tarjeta">
          <h2>{{ plantilla.titulo }}</h2>

          <label class="interruptor">
            <input type="checkbox" [(ngModel)]="activa" name="activa" />
            <span>Mandar este aviso</span>
          </label>
          <p class="tenue nota">
            Apagarlo es distinto de dejarlo en blanco: hay centros que cobran en
            recepcion y no quieren que el sistema mande recordatorios por su cuenta.
          </p>

          <label>
            <span>Asunto</span>
            <input type="text" [(ngModel)]="asunto" name="asunto" />
          </label>

          <label>
            <span>Cuerpo (HTML)</span>
            <textarea rows="12" [(ngModel)]="cuerpo" name="cuerpo"></textarea>
          </label>

          <div class="variables">
            <span class="tenue">Puedes usar:</span>
            @for (variable of plantilla.variables; track variable) {
              <button type="button" class="chip" (click)="insertar(variable)">
                {{ hueco(variable) }}
              </button>
            }
          </div>

          <div class="acciones">
            <button type="button" class="boton" [disabled]="guardando()" (click)="guardar()">
              Guardar
            </button>
            <button type="button" class="boton boton-secundario" (click)="previsualizar()">
              Vista previa
            </button>
            @if (plantilla.personalizada) {
              <button
                type="button"
                class="boton boton-secundario"
                (click)="restablecer()"
              >
                Volver al texto original
              </button>
            }
          </div>

          @if (previa(); as vista) {
            <div class="previa">
              <p class="asunto-previa"><strong>Asunto:</strong> {{ vista.asunto }}</p>
              <div class="marco" [innerHTML]="cuerpoSeguro()"></div>
              <p class="tenue nota">
                Datos de ejemplo. Asi lo vera el alumno, con los valores reales.
              </p>
            </div>
          }
        </section>
      }
    </div>

    <section>
      <h2 class="seccion">Ultimos avisos enviados</h2>
      @if (enviados().length === 0) {
        <p class="tenue">Todavia no salio ningun aviso.</p>
      } @else {
        <div class="tabla-scroll tarjeta">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Para</th>
                <th>Asunto</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              @for (aviso of enviados(); track aviso.id) {
                <tr>
                  <td>{{ aviso.enviadoEn ?? aviso.creadoEn | date: 'dd/MM/yyyy HH:mm' }}</td>
                  <td>{{ aviso.destinatario }}</td>
                  <td>{{ aviso.asunto }}</td>
                  <td>
                    @if (aviso.estado === 'ENVIADA') {
                      <span class="etiqueta enviada">Enviado</span>
                    } @else if (aviso.estado === 'FALLIDA') {
                      <span class="etiqueta fallida" [title]="aviso.error ?? ''">Fallo</span>
                    } @else {
                      <span class="etiqueta pendiente">En cola</span>
                    }
                  </td>
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
    .columnas {
      display: grid;
      grid-template-columns: minmax(210px, 260px) 1fr;
      gap: 18px;
      align-items: start;
    }
    @media (max-width: 860px) {
      .columnas {
        grid-template-columns: 1fr;
      }
    }
    .lista {
      padding: 6px;
      display: flex;
      flex-direction: column;
    }
    .fila {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      background: none;
      border: 0;
      border-radius: 8px;
      padding: 10px 12px;
      text-align: left;
      cursor: pointer;
      color: inherit;
      font-size: 14px;
    }
    .fila.activa {
      background: var(--marca-primario-suave);
      color: var(--marca-primario);
      font-weight: 600;
    }
    .editor {
      padding: 20px 22px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .editor h2 {
      font-size: 18px;
      margin: 0;
    }
    .seccion {
      font-size: 13px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--texto-tenue);
      margin-bottom: 10px;
    }
    section {
      margin-top: 30px;
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
    .interruptor {
      flex-direction: row;
      align-items: center;
      gap: 8px;
      text-transform: none;
      letter-spacing: 0;
      font-size: 14px;
      color: inherit;
    }
    textarea {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 13px;
      line-height: 1.5;
    }
    .nota {
      margin: -6px 0 0;
      font-size: 12.5px;
    }
    .variables {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
      font-size: 12.5px;
    }
    .chip {
      border: 1px solid var(--borde);
      background: var(--fondo);
      border-radius: 999px;
      padding: 3px 10px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 12px;
      cursor: pointer;
      color: var(--texto-tenue);
    }
    .acciones {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .previa {
      border-top: 1px solid var(--borde);
      padding-top: 14px;
    }
    .asunto-previa {
      margin: 0 0 10px;
      font-size: 14px;
    }
    .marco {
      border: 1px solid var(--borde);
      border-radius: 10px;
      overflow: hidden;
      background: #fff;
    }
    .tabla-scroll {
      overflow-x: auto;
    }
    table {
      width: 100%;
      min-width: 620px;
      border-collapse: collapse;
      font-size: 14.5px;
    }
    th,
    td {
      text-align: left;
      padding: 10px 14px;
      border-bottom: 1px solid var(--borde);
    }
    th {
      font-size: 12px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--texto-tenue);
    }
    .etiqueta {
      font-size: 12px;
      padding: 3px 10px;
      border-radius: 999px;
    }
    .enviada,
    .propio {
      background: rgba(22, 130, 90, 0.14);
      color: #12805a;
    }
    .fallida {
      background: rgba(190, 50, 50, 0.14);
      color: var(--error);
    }
    .pendiente,
    .apagado {
      background: rgba(150, 150, 150, 0.16);
      color: var(--texto-tenue);
    }
  `,
})
export class ConsolaAvisosPage implements OnInit {
  private readonly api = inject(MateduApi);
  private readonly sanitizador = inject(DomSanitizer);

  readonly plantillas = signal<PlantillaAviso[]>([]);
  readonly elegida = signal<PlantillaAviso | null>(null);
  readonly previa = signal<PlantillaAviso | null>(null);
  readonly enviados = signal<AvisoEnviado[]>([]);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);

  asunto = '';
  cuerpo = '';
  activa = true;

  ngOnInit(): void {
    this.cargarPlantillas();
    this.cargarEnviados();
  }

  elegir(plantilla: PlantillaAviso): void {
    this.elegida.set(plantilla);
    this.asunto = plantilla.asunto;
    this.cuerpo = plantilla.cuerpo;
    this.activa = plantilla.activa;
    this.previa.set(null);
  }

  /**
   * El texto del chip, armado en TypeScript.
   *
   * Escribir las llaves dobles en la plantilla, aunque sea con entidades HTML,
   * no sirve: Angular las decodifica antes de analizar la expresion y termina
   * intentando interpolar lo que solo queria mostrar.
   */
  hueco(variable: string): string {
    return `{{${variable}}}`;
  }

  insertar(variable: string): void {
    this.cuerpo = `${this.cuerpo}${this.hueco(variable)}`;
  }

  guardar(): void {
    const plantilla = this.elegida();
    if (!plantilla) {
      return;
    }

    this.guardando.set(true);
    this.api
      .guardarPlantillaDeAviso(plantilla.tipo, {
        asunto: this.asunto,
        cuerpo: this.cuerpo,
        activa: this.activa,
      })
      .subscribe({
        next: (guardada) => {
          this.guardando.set(false);
          this.reemplazar(guardada);
        },
        error: () => {
          this.error.set('No se pudo guardar el aviso.');
          this.guardando.set(false);
        },
      });
  }

  restablecer(): void {
    const plantilla = this.elegida();
    if (!plantilla) {
      return;
    }

    this.api.restablecerPlantillaDeAviso(plantilla.tipo).subscribe({
      next: (fabrica) => this.reemplazar(fabrica),
      error: () => this.error.set('No se pudo restablecer el aviso.'),
    });
  }

  previsualizar(): void {
    const plantilla = this.elegida();
    if (!plantilla) {
      return;
    }

    // Se manda lo que hay en el formulario, no lo guardado: la gracia es ver
    // el cambio antes de aplicarlo a los correos de verdad.
    this.api
      .vistaPreviaDeAviso(plantilla.tipo, {
        asunto: this.asunto,
        cuerpo: this.cuerpo,
        activa: this.activa,
      })
      .subscribe({
        next: (vista) => this.previa.set(vista),
        error: () => this.error.set('No se pudo generar la vista previa.'),
      });
  }

  /**
   * El HTML de la vista previa se marca como confiable a proposito.
   *
   * Es el texto que el propio administrador acaba de escribir en el campo de
   * al lado, y el backend ya escapo los valores que se insertan dentro. Si
   * Angular lo desinfectara, el centro veria una vista previa distinta del
   * correo que va a salir, que es justo lo contrario de para lo que sirve.
   */
  cuerpoSeguro(): SafeHtml {
    return this.sanitizador.bypassSecurityTrustHtml(this.previa()?.cuerpo ?? '');
  }

  private reemplazar(plantilla: PlantillaAviso): void {
    this.plantillas.update((lista) =>
      lista.map((actual) => (actual.tipo === plantilla.tipo ? plantilla : actual)),
    );
    this.elegir(plantilla);
  }

  private cargarPlantillas(): void {
    this.api.plantillasDeAviso().subscribe({
      next: (lista) => {
        this.plantillas.set(lista);
        if (lista.length > 0) {
          this.elegir(lista[0]);
        }
      },
      error: () => this.error.set('No se pudieron cargar los avisos.'),
    });
  }

  private cargarEnviados(): void {
    this.api.avisosEnviados().subscribe({
      next: (lista) => this.enviados.set(lista),
      error: () => this.error.set('No se pudo leer el historial de avisos.'),
    });
  }
}
