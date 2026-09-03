import { DatePipe } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ExportacionResumen,
  ReporteDisponible,
  TipoReporte,
  VistaPreviaReporte,
} from '../../core/api/api.models';
import { MateduApi } from '../../core/api/matedu.api';

/**
 * Reportes del centro y descargas en Excel.
 *
 * La tabla de pantalla muestra como mucho doscientas filas. No es una
 * limitacion tecnica: nadie lee cuatro mil filas en un navegador. Cuando el
 * reporte esta recortado se dice en voz alta, porque tomar decisiones creyendo
 * que se ve todo es peor que no ver nada.
 */
@Component({
  selector: 'app-consola-reportes',
  imports: [DatePipe, FormsModule],
  template: `
    <header class="titulo">
      <h1>Reportes</h1>
      <p class="tenue">
        Miralo en pantalla o descargalo en Excel. El archivo trae todas las filas, sin
        el recorte de la vista previa.
      </p>
    </header>

    @if (error(); as mensaje) {
      <p class="aviso-error" role="alert">{{ mensaje }}</p>
    }

    <nav class="pestanas">
      @for (reporte of disponibles(); track reporte.tipo) {
        <button
          type="button"
          class="pestana"
          [class.activa]="tipo() === reporte.tipo"
          (click)="elegir(reporte.tipo)"
        >
          {{ reporte.titulo }}
        </button>
      }
    </nav>

    <form class="filtros tarjeta" (ngSubmit)="cargar()">
      <label>
        <span>Desde</span>
        <input type="date" [(ngModel)]="desde" name="desde" />
      </label>
      <label>
        <span>Hasta</span>
        <input type="date" [(ngModel)]="hasta" name="hasta" />
      </label>
      <div class="acciones-filtro">
        <button type="submit" class="boton boton-secundario" [disabled]="cargando()">
          Aplicar
        </button>
        <button type="button" class="boton" [disabled]="exportando()" (click)="exportar()">
          {{ exportando() ? 'Generando…' : 'Descargar Excel' }}
        </button>
      </div>
    </form>

    @if (vista(); as datos) {
      @if (datos.recortada) {
        <p class="recorte">
          Se muestran las primeras {{ datos.cantidad }} filas. El Excel incluye todas.
        </p>
      }

      @if (datos.filas.length === 0) {
        <p class="tenue">No hay datos para este reporte con los filtros aplicados.</p>
      } @else {
        <div class="tabla-scroll tarjeta">
          <table>
            <thead>
              <tr>
                @for (columna of datos.columnas; track columna.titulo) {
                  <th [class.num]="esNumero(columna.tipo)">{{ columna.titulo }}</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (fila of datos.filas; track $index) {
                <tr>
                  @for (celda of fila; track $index) {
                    <td [class.num]="esNumero(datos.columnas[$index].tipo)">
                      {{ celda ?? '—' }}
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    }

    <section>
      <h2>Descargas recientes</h2>
      @if (exportaciones().length === 0) {
        <p class="tenue">Todavia no pediste ninguna descarga.</p>
      } @else {
        <div class="tabla-scroll tarjeta">
          <table>
            <thead>
              <tr>
                <th>Reporte</th>
                <th>Pedido</th>
                <th class="num">Filas</th>
                <th>Estado</th>
                <th class="acciones">Archivo</th>
              </tr>
            </thead>
            <tbody>
              @for (exportacion of exportaciones(); track exportacion.id) {
                <tr>
                  <td>{{ exportacion.titulo }}</td>
                  <td>{{ exportacion.creadoEn | date: 'dd/MM/yyyy HH:mm' }}</td>
                  <td class="num">{{ exportacion.filas ?? '—' }}</td>
                  <td>
                    @switch (exportacion.estado) {
                      @case ('LISTA') {
                        <span class="etiqueta lista">Lista</span>
                      }
                      @case ('FALLIDA') {
                        <span class="etiqueta fallida" [title]="exportacion.error ?? ''">
                          Fallo
                        </span>
                      }
                      @default {
                        <span class="etiqueta pendiente">Generando…</span>
                      }
                    }
                  </td>
                  <td class="acciones">
                    @if (exportacion.descargable) {
                      <button
                        type="button"
                        class="boton boton-secundario"
                        (click)="descargar(exportacion)"
                      >
                        Descargar
                      </button>
                    } @else {
                      <span class="tenue">—</span>
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
    .pestanas {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 16px;
    }
    .pestana {
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
    .filtros {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: 14px;
      padding: 16px 18px;
      margin-bottom: 18px;
    }
    .filtros label {
      display: flex;
      flex-direction: column;
      gap: 5px;
      font-size: 12px;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--texto-tenue);
    }
    .acciones-filtro {
      display: flex;
      gap: 8px;
      margin-left: auto;
    }
    .recorte {
      color: var(--aviso);
      font-size: 13.5px;
      margin: 0 0 10px;
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
      padding: 10px 14px;
      border-bottom: 1px solid var(--borde);
      white-space: nowrap;
    }
    th {
      font-size: 12px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--texto-tenue);
    }
    .num {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    .acciones {
      text-align: right;
    }
    .etiqueta {
      font-size: 12px;
      padding: 3px 10px;
      border-radius: 999px;
    }
    .lista {
      background: rgba(22, 130, 90, 0.14);
      color: #12805a;
    }
    .fallida {
      background: rgba(190, 50, 50, 0.14);
      color: var(--error);
    }
    .pendiente {
      background: rgba(150, 150, 150, 0.16);
      color: var(--texto-tenue);
    }
  `,
})
export class ConsolaReportesPage implements OnInit, OnDestroy {
  private readonly api = inject(MateduApi);

  readonly disponibles = signal<ReporteDisponible[]>([]);
  readonly tipo = signal<TipoReporte>('MATRICULAS');
  readonly vista = signal<VistaPreviaReporte | null>(null);
  readonly exportaciones = signal<ExportacionResumen[]>([]);
  readonly cargando = signal(false);
  readonly exportando = signal(false);
  readonly error = signal<string | null>(null);

  desde: string | null = null;
  hasta: string | null = null;

  /**
   * Sondeo mientras haya exportaciones generandose.
   *
   * Se detiene solo cuando no queda ninguna pendiente. Un intervalo que sigue
   * corriendo para siempre gasta bateria del portatil del coordinador y
   * mantiene la API contestando preguntas cuya respuesta ya no cambia.
   */
  private sondeo: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.api.reportesDisponibles().subscribe({
      next: (reportes) => this.disponibles.set(reportes),
      error: () => this.error.set('No se pudieron cargar los reportes disponibles.'),
    });

    this.cargar();
    this.cargarExportaciones();
  }

  ngOnDestroy(): void {
    this.detenerSondeo();
  }

  elegir(tipo: TipoReporte): void {
    this.tipo.set(tipo);
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.api
      .vistaPreviaDeReporte(this.tipo(), { desde: this.desde, hasta: this.hasta })
      .subscribe({
        next: (vista) => {
          this.vista.set(vista);
          this.cargando.set(false);
        },
        error: () => {
          this.error.set('No se pudo generar el reporte.');
          this.cargando.set(false);
        },
      });
  }

  exportar(): void {
    this.exportando.set(true);

    this.api.exportarReporte(this.tipo(), { desde: this.desde, hasta: this.hasta }).subscribe({
      next: () => {
        this.exportando.set(false);
        this.cargarExportaciones();
      },
      error: () => {
        this.error.set('No se pudo encargar la descarga.');
        this.exportando.set(false);
      },
    });
  }

  descargar(exportacion: ExportacionResumen): void {
    this.api.descargarExportacion(exportacion.id).subscribe({
      next: (blob) => this.guardar(blob, this.nombreDeArchivo(exportacion)),
      error: () => this.error.set('No se pudo descargar el archivo.'),
    });
  }

  esNumero(tipo: string): boolean {
    return tipo === 'NUMERO' || tipo === 'DINERO' || tipo === 'PORCENTAJE';
  }

  private cargarExportaciones(): void {
    this.api.exportaciones().subscribe({
      next: (lista) => {
        this.exportaciones.set(lista);
        this.ajustarSondeo(lista);
      },
      error: () => this.error.set('No se pudo leer el historial de descargas.'),
    });
  }

  private ajustarSondeo(lista: ExportacionResumen[]): void {
    const hayPendientes = lista.some((exportacion) => exportacion.estado === 'PENDIENTE');

    if (hayPendientes && this.sondeo === null) {
      this.sondeo = setInterval(() => this.cargarExportaciones(), 3000);
    } else if (!hayPendientes) {
      this.detenerSondeo();
    }
  }

  private detenerSondeo(): void {
    if (this.sondeo !== null) {
      clearInterval(this.sondeo);
      this.sondeo = null;
    }
  }

  /**
   * Guarda el blob como archivo.
   *
   * Se revoca la URL temporal despues de usarla: sin eso, el navegador
   * mantiene el archivo en memoria mientras la pestaña siga abierta, y unas
   * cuantas descargas de actas grandes se notan.
   */
  private guardar(blob: Blob, nombre: string): void {
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombre;
    enlace.click();
    URL.revokeObjectURL(url);
  }

  private nombreDeArchivo(exportacion: ExportacionResumen): string {
    return `${exportacion.tipo.toLowerCase()}-${exportacion.creadoEn.slice(0, 10)}.xlsx`;
  }
}
