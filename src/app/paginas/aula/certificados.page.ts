import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { CertificadoResumen } from '../../core/api/api.models';
import { MateduApi } from '../../core/api/matedu.api';

/**
 * Certificados del alumno.
 *
 * Un certificado recien emitido aparece en estado GENERANDO mientras el PDF se
 * arma en segundo plano. La pantalla lo dice y ofrece recargar, en vez de
 * mostrar un boton de descarga que fallaria.
 */
@Component({
  selector: 'app-aula-certificados',
  imports: [DatePipe],
  template: `
    <header class="titulo">
      <h1>Certificados</h1>
      <p class="tenue">
        Al aprobar un curso, su certificado se emite solo y queda verificable por su codigo QR.
      </p>
    </header>

    @if (cargando()) {
      <p class="tenue">Cargando...</p>
    } @else if (error(); as mensaje) {
      <p class="aviso-error" role="alert">{{ mensaje }}</p>
    } @else if (certificados().length === 0) {
      <div class="vacio tarjeta">
        <strong>Todavia no tiene certificados</strong>
        <p class="tenue">
          Aparecen aqui cuando aprueba un curso: hace falta alcanzar la nota minima y el
          porcentaje de asistencia que pide su centro.
        </p>
      </div>
    } @else {
      <div class="lista">
        @for (certificado of certificados(); track certificado.id) {
          <article class="certificado tarjeta">
            <header class="cabecera">
              <div>
                <h2>{{ certificado.curso }}</h2>
                <p class="tenue">{{ certificado.centro }}</p>
              </div>
              <span class="estado" [class]="'estado-' + certificado.estado.toLowerCase()">
                {{ etiquetaEstado(certificado) }}
              </span>
            </header>

            <dl class="datos">
              <div><dt>Codigo</dt><dd class="mono">{{ certificado.codigo }}</dd></div>
              <div><dt>Horas</dt><dd>{{ certificado.horasAcademicas }}</dd></div>
              @if (certificado.notaFinal !== null) {
                <div><dt>Nota final</dt><dd>{{ certificado.notaFinal }}</dd></div>
              }
              @if (certificado.emitidoEn) {
                <div>
                  <dt>Emitido</dt>
                  <dd>{{ certificado.emitidoEn | date: 'dd/MM/yyyy' }}</dd>
                </div>
              }
            </dl>

            @if (certificado.pdfListo) {
              <a class="boton" [href]="urlPdf(certificado)" target="_blank" rel="noopener">
                Descargar PDF
              </a>
            } @else if (certificado.estado === 'GENERANDO') {
              <p class="tenue generando">
                Su certificado se esta generando. Vuelva a cargar la pagina en unos segundos.
              </p>
              <button type="button" class="boton boton-secundario" (click)="recargar()">
                Actualizar
              </button>
            } @else if (certificado.estado === 'ERROR') {
              <p class="aviso-error">
                Hubo un problema al generar el PDF. Avise a su centro para que lo regenere.
              </p>
            }
          </article>
        }
      </div>
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
    .lista {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
    }
    .certificado {
      padding: 20px 22px;
    }
    .cabecera {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 14px;
    }
    .cabecera h2 {
      font-size: 17px;
      margin-bottom: 3px;
    }
    .cabecera p {
      margin: 0;
      font-size: 13px;
    }
    .estado {
      flex: none;
      padding: 2px 9px;
      font-size: 11.5px;
      border-radius: 99px;
      border: 1px solid var(--linea);
      color: var(--texto-tenue);
    }
    .estado-emitido {
      color: var(--exito);
      border-color: var(--exito);
    }
    .estado-generando {
      color: var(--aviso);
      border-color: var(--aviso);
    }
    .estado-anulado,
    .estado-error {
      color: var(--error);
      border-color: var(--error);
    }
    .datos {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px 14px;
      margin: 0 0 16px;
    }
    .datos dt {
      font-size: 11px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--texto-tenue);
    }
    .datos dd {
      margin: 2px 0 0;
      font-size: 14px;
    }
    .mono {
      font-family: var(--fuente-mono);
      font-size: 13px;
      letter-spacing: 1px;
    }
    .boton {
      text-decoration: none;
    }
    .generando {
      font-size: 13.5px;
      margin: 0 0 10px;
    }
    .vacio {
      padding: 22px 24px;
      max-width: 60ch;
    }
    .vacio p {
      margin: 4px 0 0;
      font-size: 14px;
    }
  `,
})
export class AulaCertificadosPage implements OnInit {
  private readonly api = inject(MateduApi);

  protected readonly certificados = signal<CertificadoResumen[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.recargar();
  }

  protected recargar(): void {
    this.api.misCertificados().subscribe({
      next: (lista) => {
        this.certificados.set(lista);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar sus certificados.');
        this.cargando.set(false);
      },
    });
  }

  protected urlPdf(certificado: CertificadoResumen): string {
    return this.api.urlPdfCertificado(certificado.id);
  }

  protected etiquetaEstado(certificado: CertificadoResumen): string {
    return {
      GENERANDO: 'Generando',
      EMITIDO: 'Valido',
      ANULADO: 'Anulado',
      ERROR: 'Con error',
    }[certificado.estado];
  }
}
