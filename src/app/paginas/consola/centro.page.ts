import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DominioDelCentro, MarcaCentroVista } from '../../core/api/api.models';
import { MateduApi } from '../../core/api/matedu.api';
import { MarcaService } from '../../core/tenant/marca.service';

/**
 * La identidad del centro: su marca y su dominio.
 *
 * Es lo que justifica el precio de la plataforma —el cliente ve su marca, no la
 * nuestra— y hasta ahora solo se podía tocar por API. Un centro que no puede
 * cambiar su color ni conectar su dominio está usando *nuestro* producto, no el
 * suyo.
 */
@Component({
  selector: 'app-consola-centro',
  imports: [FormsModule],
  template: `
    <header class="titulo">
      <h1>Mi centro</h1>
      <p class="tenue">
        Lo que ven sus alumnos y sus visitantes: colores, contacto, redes y la dirección
        de su aula.
      </p>
    </header>

    @if (error(); as mensaje) {
      <p class="aviso-error" role="alert">{{ mensaje }}</p>
    }
    @if (aviso(); as mensaje) {
      <p class="aviso-ok" role="status">{{ mensaje }}</p>
    }

    @if (marca(); as datos) {
      <div class="columnas">
        <section class="tarjeta panel">
          <h2>Marca</h2>

          <form (ngSubmit)="guardar()">
            <div class="dos">
              <label>
                <span>Color principal</span>
                <div class="color">
                  <input type="color" name="colorPrimario" [(ngModel)]="colorPrimario" />
                  <input type="text" name="colorPrimarioTexto" [(ngModel)]="colorPrimario" />
                </div>
              </label>
              <label>
                <span>Color secundario</span>
                <div class="color">
                  <input type="color" name="colorSecundario" [(ngModel)]="colorSecundario" />
                  <input type="text" name="colorSecundarioTexto" [(ngModel)]="colorSecundario" />
                </div>
              </label>
            </div>
            <p class="tenue nota">
              El color principal se aplica a toda la consola y al aula en cuanto guarda.
            </p>

            <label>
              <span>Lema</span>
              <input
                type="text"
                name="lema"
                [(ngModel)]="lema"
                placeholder="Formación técnica para el trabajo real"
              />
            </label>

            <label>
              <span>Descripción pública</span>
              <textarea rows="3" name="descripcion" [(ngModel)]="descripcionPublica"></textarea>
              <small class="tenue">Sale en la portada de su sitio y en los buscadores.</small>
            </label>

            <label>
              <span>Logo (URL)</span>
              <input type="url" name="logoUrl" [(ngModel)]="logoUrl" />
              <small class="tenue">
                Súbalo primero como material desde un curso y pegue aquí su enlace.
              </small>
            </label>

            <h3>Contacto</h3>
            <div class="dos">
              <label>
                <span>Teléfono</span>
                <input type="text" name="telefono" [(ngModel)]="telefono" />
              </label>
              <label>
                <span>WhatsApp</span>
                <input type="text" name="whatsapp" [(ngModel)]="whatsapp" />
              </label>
            </div>
            <div class="dos">
              <label>
                <span>Correo público</span>
                <input type="email" name="correoPublico" [(ngModel)]="correo" />
              </label>
              <label>
                <span>Dirección</span>
                <input type="text" name="direccion" [(ngModel)]="direccion" />
              </label>
            </div>

            <h3>Redes</h3>
            <div class="dos">
              <label>
                <span>Facebook</span>
                <input type="url" name="facebook" [(ngModel)]="facebook" />
              </label>
              <label>
                <span>Instagram</span>
                <input type="url" name="instagram" [(ngModel)]="instagram" />
              </label>
            </div>
            <div class="dos">
              <label>
                <span>TikTok</span>
                <input type="url" name="tiktok" [(ngModel)]="tiktok" />
              </label>
              <label>
                <span>YouTube</span>
                <input type="url" name="youtube" [(ngModel)]="youtube" />
              </label>
            </div>

            <button type="submit" class="boton" [disabled]="guardando()">
              {{ guardando() ? 'Guardando…' : 'Guardar marca' }}
            </button>
          </form>
        </section>

        <section class="tarjeta panel">
          <h2>Dirección del aula</h2>

          <div class="direccion-actual">
            <span class="tenue">Su dirección de siempre</span>
            <strong class="mono">{{ datos.subdominio }}.matedu.pe</strong>
            <small class="tenue">
              Funciona desde el primer día y sigue funcionando aunque conecte un dominio propio.
            </small>
          </div>

          <h3>Su propio dominio</h3>
          <p class="tenue">
            Para usar <em>aula.sucentro.com</em> hay que demostrar que el dominio es suyo:
            se publica un registro TXT en su DNS y nosotros lo comprobamos. Sin ese paso,
            cualquiera podría reclamar el dominio de otro.
          </p>

          @for (dominio of dominios(); track dominio.id) {
            <article class="dominio">
              <div class="cabecera">
                <strong class="mono">{{ dominio.dominio }}</strong>
                <span class="estado" [class]="'estado-' + dominio.estado.toLowerCase()">
                  {{ etiquetaEstado(dominio.estado) }}
                </span>
              </div>

              @if (dominio.estado === 'DECLARADO' || dominio.estado === 'FALLIDO') {
                <div class="registro">
                  <p class="tenue">Publique este registro en el DNS de su dominio:</p>
                  <table>
                    <tr><td class="clave">Tipo</td><td class="mono">{{ dominio.tipoRegistro }}</td></tr>
                    <tr><td class="clave">Nombre</td><td class="mono">{{ dominio.nombreRegistro }}</td></tr>
                    <tr><td class="clave">Valor</td><td class="mono valor">{{ dominio.valorRegistro }}</td></tr>
                  </table>
                  <p class="tenue nota">
                    Los cambios de DNS pueden tardar unos minutos en propagarse.
                  </p>
                </div>
              }

              @if (dominio.ultimoError) {
                <p class="fallo">{{ dominio.ultimoError }}</p>
              }

              <div class="acciones">
                @if (dominio.estado === 'DECLARADO' || dominio.estado === 'FALLIDO') {
                  <button type="button" class="boton boton-secundario chico" (click)="verificar(dominio)">
                    Verificar ahora
                  </button>
                }
                @if (dominio.estado === 'VERIFICADO') {
                  <button type="button" class="boton chico" (click)="activar(dominio)">
                    Activar
                  </button>
                }
                @if (dominio.estado !== 'ACTIVO') {
                  <button type="button" class="enlace" (click)="retirar(dominio)">Retirar</button>
                }
              </div>
            </article>
          } @empty {
            <p class="tenue vacio">Todavía no ha declarado ningún dominio propio.</p>
          }

          <form class="nuevo" (ngSubmit)="declarar()">
            <input
              type="text"
              name="dominioNuevo"
              [(ngModel)]="dominioNuevo"
              placeholder="aula.sucentro.com"
            />
            <button type="submit" class="boton boton-secundario" [disabled]="!dominioNuevo.trim()">
              Declarar
            </button>
          </form>
        </section>
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
      max-width: 66ch;
    }
    .aviso-ok {
      background: rgba(22, 130, 90, 0.12);
      color: #12805a;
      border-radius: 8px;
      padding: 10px 14px;
      margin: 0 0 14px;
      font-size: 14.5px;
    }
    .columnas {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(330px, 1fr));
      gap: 18px;
      align-items: start;
    }
    .panel {
      padding: 20px 22px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .panel h2 {
      margin: 0;
      font-size: 18px;
    }
    .panel h3 {
      margin: 6px 0 0;
      font-size: 12.5px;
      letter-spacing: 0.07em;
      text-transform: uppercase;
      color: var(--texto-tenue);
    }
    form {
      display: flex;
      flex-direction: column;
      gap: 13px;
    }
    .dos {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
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
      line-height: 1.5;
    }
    .color {
      display: flex;
      gap: 7px;
    }
    .color input[type='color'] {
      width: 44px;
      padding: 2px;
      flex: none;
    }
    .color input[type='text'] {
      flex: 1;
      min-width: 0;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    }
    .nota {
      margin: -8px 0 0;
      font-size: 12.5px;
    }
    .mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    }
    .direccion-actual {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 14px 16px;
      border: 1px solid var(--borde);
      border-radius: 10px;
      background: var(--marca-primario-suave);
    }
    .direccion-actual strong {
      font-size: 16px;
    }
    .dominio {
      border: 1px solid var(--borde);
      border-radius: 10px;
      padding: 13px 15px;
      display: flex;
      flex-direction: column;
      gap: 9px;
    }
    .cabecera {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
    }
    .estado {
      font-size: 11.5px;
      padding: 2px 9px;
      border-radius: 999px;
      border: 1px solid var(--borde);
      color: var(--texto-tenue);
      white-space: nowrap;
    }
    .estado-activo {
      color: #12805a;
      border-color: #12805a;
    }
    .estado-verificado {
      color: var(--marca-primario);
      border-color: var(--marca-primario);
    }
    .estado-fallido {
      color: var(--error);
      border-color: var(--error);
    }
    .registro table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      margin-top: 4px;
    }
    .registro td {
      padding: 4px 0;
      vertical-align: top;
    }
    .clave {
      color: var(--texto-tenue);
      width: 70px;
    }
    .valor {
      word-break: break-all;
    }
    .fallo {
      margin: 0;
      font-size: 13px;
      color: var(--error);
    }
    .acciones {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .chico {
      padding: 5px 12px;
      font-size: 13px;
    }
    .enlace {
      background: none;
      border: 0;
      padding: 0;
      color: var(--texto-tenue);
      font-size: 13px;
      cursor: pointer;
    }
    .nuevo {
      flex-direction: row;
      gap: 8px;
      border-top: 1px solid var(--borde);
      padding-top: 14px;
    }
    .nuevo input {
      flex: 1;
      min-width: 0;
    }
    .vacio {
      margin: 0;
      font-size: 14px;
    }
  `,
})
export class ConsolaCentroPage implements OnInit {
  private readonly api = inject(MateduApi);
  private readonly marcaService = inject(MarcaService);

  readonly marca = signal<MarcaCentroVista | null>(null);
  readonly dominios = signal<DominioDelCentro[]>([]);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  readonly aviso = signal<string | null>(null);

  colorPrimario = '#0E6E76';
  colorSecundario = '#0E6E76';
  lema = '';
  descripcionPublica = '';
  logoUrl = '';
  telefono = '';
  whatsapp = '';
  correo = '';
  direccion = '';
  facebook = '';
  instagram = '';
  tiktok = '';
  youtube = '';
  dominioNuevo = '';

  ngOnInit(): void {
    this.cargar();
  }

  guardar(): void {
    this.guardando.set(true);
    this.limpiar();

    this.api
      .guardarMarca({
        colorPrimario: this.colorPrimario,
        colorSecundario: this.colorSecundario,
        lema: this.lema || null,
        descripcionPublica: this.descripcionPublica || null,
        logoUrl: this.logoUrl || null,
        telefono: this.telefono || null,
        whatsapp: this.whatsapp || null,
        correo: this.correo || null,
        direccion: this.direccion || null,
        facebook: this.facebook || null,
        instagram: this.instagram || null,
        tiktok: this.tiktok || null,
        youtube: this.youtube || null,
      })
      .subscribe({
        next: (marca) => {
          this.guardando.set(false);
          this.marca.set(marca);
          // Se aplica al instante para que el administrador vea el cambio en la
          // propia consola, no solo en el sitio público.
          this.marcaService.aplicar({
            nombre: marca.nombre,
            colorPrimario: marca.colorPrimario,
            logoUrl: marca.logoUrl,
          });
          this.aviso.set('Marca actualizada.');
        },
        error: (fallo) => this.mostrarError(fallo, 'No se pudo guardar la marca.'),
      });
  }

  declarar(): void {
    const dominio = this.dominioNuevo.trim();
    if (!dominio) {
      return;
    }

    this.limpiar();
    this.api.declararDominio(dominio).subscribe({
      next: () => {
        this.dominioNuevo = '';
        this.aviso.set('Dominio declarado. Publique el registro TXT y pulse Verificar.');
        this.cargarDominios();
      },
      error: (fallo) => this.mostrarError(fallo, 'No se pudo declarar el dominio.'),
    });
  }

  verificar(dominio: DominioDelCentro): void {
    this.limpiar();
    this.api.verificarDominio(dominio.id).subscribe({
      next: (actualizado) => {
        this.cargarDominios();
        this.aviso.set(
          actualizado.estado === 'VERIFICADO'
            ? 'Dominio verificado. Ya puede activarlo.'
            : 'Todavía no encontramos el registro. Los DNS tardan en propagarse.',
        );
      },
      error: (fallo) => this.mostrarError(fallo, 'No se pudo verificar el dominio.'),
    });
  }

  activar(dominio: DominioDelCentro): void {
    this.limpiar();
    this.api.activarDominio(dominio.id).subscribe({
      next: () => {
        this.aviso.set('Dominio activo. Su aula ya responde en esa dirección.');
        this.cargar();
      },
      error: (fallo) => this.mostrarError(fallo, 'No se pudo activar el dominio.'),
    });
  }

  retirar(dominio: DominioDelCentro): void {
    this.limpiar();
    this.api.retirarDominio(dominio.id).subscribe({
      next: () => this.cargarDominios(),
      error: (fallo) => this.mostrarError(fallo, 'No se pudo retirar el dominio.'),
    });
  }

  etiquetaEstado(estado: string): string {
    const etiquetas: Record<string, string> = {
      DECLARADO: 'Falta verificar',
      VERIFICADO: 'Verificado',
      ACTIVO: 'Activo',
      FALLIDO: 'No se encontró',
      RETIRADO: 'Retirado',
    };
    return etiquetas[estado] ?? estado;
  }

  private cargar(): void {
    this.api.marcaDelCentro().subscribe({
      next: (marca) => {
        this.marca.set(marca);
        this.volcar(marca);
      },
      error: () => this.error.set('No se pudo cargar la marca del centro.'),
    });

    this.cargarDominios();
  }

  private cargarDominios(): void {
    this.api.dominiosDelCentro().subscribe({
      next: (dominios) => this.dominios.set(dominios),
      error: () => this.error.set('No se pudieron cargar los dominios.'),
    });
  }

  private volcar(marca: MarcaCentroVista): void {
    this.colorPrimario = marca.colorPrimario || '#0E6E76';
    this.colorSecundario = marca.colorSecundario || marca.colorPrimario || '#0E6E76';
    this.lema = marca.lema ?? '';
    this.descripcionPublica = marca.descripcionPublica ?? '';
    this.logoUrl = marca.logoUrl ?? '';
    this.telefono = marca.telefono ?? '';
    this.whatsapp = marca.whatsapp ?? '';
    this.correo = marca.correo ?? '';
    this.direccion = marca.direccion ?? '';
    this.facebook = marca.facebook ?? '';
    this.instagram = marca.instagram ?? '';
    this.tiktok = marca.tiktok ?? '';
    this.youtube = marca.youtube ?? '';
  }

  private limpiar(): void {
    this.error.set(null);
    this.aviso.set(null);
  }

  private mostrarError(fallo: { error?: { detail?: string } }, respaldo: string): void {
    this.guardando.set(false);
    this.aviso.set(null);
    this.error.set(fallo?.error?.detail ?? respaldo);
  }
}
