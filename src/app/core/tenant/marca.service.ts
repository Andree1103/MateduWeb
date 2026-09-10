import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { MateduApi } from '../api/matedu.api';

export interface MarcaCentro {
  nombre: string;
  colorPrimario: string;
  logoUrl: string | null;
}

const MARCA_POR_DEFECTO: MarcaCentro = {
  nombre: 'MATEDU',
  colorPrimario: '#0E6E76',
  logoUrl: null,
};

/**
 * Marca del centro que se esta viendo.
 *
 * En la fase 0 usa valores por defecto; en la fase 6 los traera del backend
 * segun el dominio. Lo importante es que ya se aplica por variables CSS: el dia
 * que llegue la personalizacion no habra que tocar ni un componente.
 */
@Injectable({ providedIn: 'root' })
export class MarcaService {
  private readonly documento = inject(DOCUMENT);
  private readonly enNavegador = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly api = inject(MateduApi);
  private readonly _marca = signal<MarcaCentro>(MARCA_POR_DEFECTO);

  readonly marca = this._marca.asReadonly();

  /** Para no volver a pedirla en cada navegacion. */
  private cargada = false;

  /**
   * Trae la marca del centro y la aplica.
   *
   * Hasta ahora esto solo pasaba en el sitio publico, asi que un
   * administrador entraba a SU consola y leia "MATEDU" en la barra, con el
   * color de MATEDU. Justo lo contrario de lo que se le vende: la
   * plataforma se ve del centro, no nuestra.
   *
   * Se pide al sitio publico y no a /api/marca porque aquella ruta la puede
   * leer cualquiera —tambien un docente o un alumno— y esta solo la gestion.
   */
  cargar(): void {
    if (this.cargada || !this.enNavegador) {
      return;
    }
    this.cargada = true;

    this.api.sitioPublico().subscribe({
      next: (sitio) => this.aplicar({
        nombre: sitio.nombre,
        colorPrimario: sitio.colorPrimario,
        logoUrl: sitio.logoUrl,
      }),
      // Sin marca la aplicacion funciona igual, con la de fabrica. No hay
      // nada que avisarle al usuario.
      error: () => { this.cargada = false; },
    });
  }

  aplicar(marca: Partial<MarcaCentro>): void {
    const combinada = { ...this._marca(), ...marca };
    this._marca.set(combinada);

    // Solo en el navegador: durante el renderizado del servidor no hay un DOM
    // real, y tocar documentElement.style aborta el render y devuelve una
    // pagina vacia, que es justo lo contrario de lo que busca el SSR.
    if (!this.enNavegador) {
      return;
    }

    const raiz = this.documento.documentElement;
    raiz.style.setProperty('--marca-primario', combinada.colorPrimario);
    raiz.style.setProperty('--marca-primario-suave', this.conAlfa(combinada.colorPrimario, 0.12));
  }

  restablecer(): void {
    this.aplicar(MARCA_POR_DEFECTO);
  }

  /** #0E6E76 -> rgba(14, 110, 118, 0.12), para fondos suaves derivados del color del centro. */
  private conAlfa(hex: string, alfa: number): string {
    const limpio = hex.replace('#', '');
    if (limpio.length !== 6) {
      return hex;
    }
    const r = parseInt(limpio.slice(0, 2), 16);
    const g = parseInt(limpio.slice(2, 4), 16);
    const b = parseInt(limpio.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alfa})`;
  }
}
