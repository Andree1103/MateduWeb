import { DatePipe } from '@angular/common';
import { Component, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { VerificacionCertificado } from '../../core/api/api.models';
import { MateduApi } from '../../core/api/matedu.api';

/**
 * Verificacion publica de un certificado.
 *
 * Es la pagina que abre el QR impreso. Quien llega aqui suele ser un empleador
 * comprobando si el certificado que le presentaron es real, y no tiene cuenta
 * en la plataforma: por eso no hay sesion, ni menu, ni nada que iniciar.
 *
 * Un codigo anulado se muestra como anulado, no como inexistente: son dos
 * cosas distintas y quien verifica necesita saber cual de las dos es.
 */
@Component({
  selector: 'app-validar-certificado',
  imports: [DatePipe, FormsModule],
  template: `
    <div class="pantalla">
      <main class="panel">
        <header class="marca">
          <span class="punto" aria-hidden="true"></span>
          <span>MATEDU</span>
        </header>

        <h1>Verificacion de certificado</h1>

        <form class="buscador" (ngSubmit)="buscar()">
          <input
            type="text"
            name="codigo"
            [(ngModel)]="codigoIngresado"
            placeholder="Codigo del certificado"
            aria-label="Codigo del certificado"
            autocomplete="off"
          />
          <button type="submit" class="boton" [disabled]="consultando()">Verificar</button>
        </form>

        @if (consultando()) {
          <p class="tenue">Consultando...</p>
        } @else if (noExiste()) {
          <section class="resultado invalido">
            <span class="sello">✕</span>
            <h2>No existe ningun certificado con ese codigo</h2>
            <p class="tenue">
              Revise que lo haya escrito completo. Si el codigo viene de un documento impreso
              y no aparece, el certificado podria no haber sido emitido por esta plataforma.
            </p>
          </section>
        } @else if (verificacion(); as datos) {
          <section class="resultado" [class.valido]="datos.valido" [class.invalido]="!datos.valido">
            <span class="sello">{{ datos.valido ? '✓' : '!' }}</span>

            @if (datos.valido) {
              <h2>Certificado autentico</h2>
            } @else {
              <h2>Este certificado fue anulado</h2>
              @if (datos.anuladoMotivo) {
                <p class="motivo">{{ datos.anuladoMotivo }}</p>
              }
            }

            <dl class="datos">
              <div><dt>Otorgado a</dt><dd>{{ datos.alumno }}</dd></div>
              <div><dt>Curso</dt><dd>{{ datos.curso }}</dd></div>
              <div><dt>Centro emisor</dt><dd>{{ datos.centro }}</dd></div>
              <div><dt>Duracion</dt><dd>{{ datos.horasAcademicas }} horas academicas</dd></div>
              @if (datos.fechaFin) {
                <div><dt>Culminacion</dt><dd>{{ datos.fechaFin }}</dd></div>
              }
              @if (datos.emitidoEn) {
                <div>
                  <dt>Emitido</dt>
                  <dd>{{ datos.emitidoEn | date: 'dd/MM/yyyy' }}</dd>
                </div>
              }
              <div><dt>Codigo</dt><dd class="mono">{{ datos.codigo }}</dd></div>
            </dl>
          </section>
        }
      </main>

      <p class="pie tenue">Verificacion emitida por MATEDU</p>
    </div>
  `,
  styles: `
    .pantalla {
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
      padding: 40px 20px;
      gap: 16px;
    }
    .panel {
      width: 100%;
      max-width: 520px;
      padding: 32px 30px 34px;
      background: var(--superficie);
      border: 1px solid var(--linea);
      border-radius: var(--radio);
      box-shadow: var(--sombra);
    }
    .marca {
      display: flex;
      align-items: center;
      gap: 9px;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.04em;
      margin-bottom: 18px;
    }
    .punto {
      width: 11px;
      height: 11px;
      background: var(--marca-primario);
      border-radius: 3px;
    }
    h1 {
      font-size: 22px;
      margin-bottom: 18px;
    }
    .buscador {
      display: flex;
      gap: 10px;
      margin-bottom: 22px;
    }
    .buscador input {
      flex: 1;
      min-width: 0;
      padding: 10px 12px;
      font: inherit;
      font-size: 14.5px;
      font-family: var(--fuente-mono);
      letter-spacing: 1px;
      text-transform: uppercase;
      color: var(--texto);
      background: var(--superficie);
      border: 1px solid var(--linea);
      border-radius: var(--radio-sm);
    }
    .resultado {
      padding: 22px 24px;
      border-radius: var(--radio-sm);
      border: 1px solid var(--linea);
      background: var(--superficie-2);
    }
    .resultado.valido {
      border-color: var(--exito);
    }
    .resultado.invalido {
      border-color: var(--error);
    }
    .sello {
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      font-size: 22px;
      font-weight: 700;
      color: #fff;
      border-radius: 50%;
      margin-bottom: 14px;
    }
    .valido .sello {
      background: var(--exito);
    }
    .invalido .sello {
      background: var(--error);
    }
    h2 {
      font-size: 18px;
      margin-bottom: 6px;
    }
    .motivo {
      margin: 0 0 12px;
      font-size: 14px;
      color: var(--error);
    }
    .datos {
      display: flex;
      flex-direction: column;
      gap: 11px;
      margin: 18px 0 0;
    }
    .datos dt {
      font-size: 11px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--texto-tenue);
      margin-bottom: 2px;
    }
    .datos dd {
      margin: 0;
      font-size: 15px;
    }
    .mono {
      font-family: var(--fuente-mono);
      letter-spacing: 1px;
    }
    .pie {
      font-size: 12px;
    }
  `,
})
export class ValidarCertificadoPage implements OnInit {
  private readonly api = inject(MateduApi);
  private readonly router = inject(Router);

  /** Llega por la ruta cuando el QR trae el codigo. */
  readonly codigo = input<string>('');

  protected readonly verificacion = signal<VerificacionCertificado | null>(null);
  protected readonly noExiste = signal(false);
  protected readonly consultando = signal(false);

  protected codigoIngresado = '';

  ngOnInit(): void {
    const desdeLaRuta = this.codigo();
    if (desdeLaRuta) {
      this.codigoIngresado = desdeLaRuta;
      this.consultar(desdeLaRuta);
    }
  }

  protected buscar(): void {
    const codigo = this.codigoIngresado.trim();
    if (!codigo) {
      return;
    }
    // Deja el codigo en la URL, para que la verificacion se pueda compartir.
    void this.router.navigate(['/validar', codigo.toUpperCase()]);
    this.consultar(codigo);
  }

  private consultar(codigo: string): void {
    this.consultando.set(true);
    this.noExiste.set(false);
    this.verificacion.set(null);

    this.api.verificarCertificado(codigo.trim().toUpperCase()).subscribe({
      next: (datos) => {
        this.verificacion.set(datos);
        this.consultando.set(false);
      },
      error: () => {
        this.noExiste.set(true);
        this.consultando.set(false);
      },
    });
  }
}
