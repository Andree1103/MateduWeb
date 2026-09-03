import {
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Reproduccion } from '../core/api/api.models';
import { MateduApi } from '../core/api/matedu.api';

/**
 * Reproductor de la clase.
 *
 * Nunca recibe la URL del video por entrada: pide autorizacion al backend cada
 * vez que cambia la leccion y usa el enlace firmado que le devuelven, que vence
 * en minutos. Asi el enlace no vive en el estado de la aplicacion ni queda en
 * el historial de navegacion.
 *
 * El avance se manda cada 15 segundos, no en cada latido del video, para no
 * castigar a la API con una peticion por segundo y por alumno.
 */
@Component({
  selector: 'app-reproductor',
  template: `
    @if (cargando()) {
      <div class="marco cargando">
        <span class="tenue">Autorizando la reproduccion...</span>
      </div>
    } @else if (error(); as mensaje) {
      <div class="marco">
        <p class="aviso-error" role="alert">{{ mensaje }}</p>
      </div>
    } @else if (fuente(); as datos) {
      @if (datos.formato === 'IFRAME') {
        <div class="marco">
          <iframe
            [src]="urlIframe()"
            title="Clase"
            allow="encrypted-media; picture-in-picture; fullscreen"
            allowfullscreen
          ></iframe>
        </div>
      } @else {
        <div class="marco">
          <video
            #video
            [src]="datos.url"
            controls
            controlsList="nodownload"
            disablePictureInPicture
            preload="metadata"
            (contextmenu)="$event.preventDefault()"
            (timeupdate)="alAvanzar()"
            (ended)="alTerminar()"
            (error)="alFallarVideo()"
          ></video>
        </div>
      }

      <p class="pie tenue">
        Este enlace es personal y vence a las {{ horaExpiracion() }}. Al recargar se pide uno nuevo.
      </p>
    } @else {
      <div class="marco vacio">
        <span class="tenue">Esta leccion todavia no tiene video cargado.</span>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .marco {
      position: relative;
      background: #0b1116;
      border: 1px solid var(--linea);
      border-radius: var(--radio);
      overflow: hidden;
      aspect-ratio: 16 / 9;
    }
    .marco.cargando,
    .marco.vacio {
      display: grid;
      place-items: center;
      background: var(--superficie-2);
      padding: 20px;
      text-align: center;
    }
    video,
    iframe {
      display: block;
      width: 100%;
      height: 100%;
      border: 0;
    }
    .aviso-error {
      margin: 0;
      max-width: 46ch;
    }
    .pie {
      margin: 10px 0 0;
      font-size: 12.5px;
    }
  `,
})
export class Reproductor implements OnDestroy {
  private readonly api = inject(MateduApi);
  private readonly sanitizador = inject(DomSanitizer);

  /** Leccion a reproducir. Al cambiar, se pide una autorizacion nueva. */
  readonly leccionId = input.required<string>();
  readonly tieneVideo = input.required<boolean>();
  readonly segundosPrevios = input(0);

  /** Avisa al contenedor cuando la leccion queda completada. */
  readonly completada = output<string>();

  private readonly elementoVideo = viewChild<ElementRef<HTMLVideoElement>>('video');

  protected readonly fuente = signal<Reproduccion | null>(null);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);

  /**
   * Angular bloquea una URL puesta a mano en el src de un iframe, y hace bien.
   * Aqui se marca como confiable porque la construyo el backend, no el usuario:
   * es el enlace firmado del proveedor de video.
   */
  protected readonly urlIframe = computed<SafeResourceUrl | null>(() => {
    const datos = this.fuente();
    return datos && datos.formato === 'IFRAME'
      ? this.sanitizador.bypassSecurityTrustResourceUrl(datos.url)
      : null;
  });

  protected readonly horaExpiracion = computed(() => {
    const datos = this.fuente();
    if (!datos) {
      return '';
    }
    return new Date(datos.expiraEn).toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
    });
  });

  private ultimoEnvio = 0;
  private posicionRestaurada = false;

  constructor() {
    effect(() => {
      const id = this.leccionId();
      const hayVideo = this.tieneVideo();

      this.fuente.set(null);
      this.error.set(null);
      this.posicionRestaurada = false;
      this.ultimoEnvio = 0;

      if (!hayVideo) {
        return;
      }

      this.cargando.set(true);
      this.api.autorizarReproduccion(id).subscribe({
        next: (reproduccion) => {
          this.fuente.set(reproduccion);
          this.cargando.set(false);
        },
        error: () => {
          this.error.set('No se pudo autorizar la reproduccion de esta clase.');
          this.cargando.set(false);
        },
      });
    });
  }

  ngOnDestroy(): void {
    this.enviarAvance(true);
  }

  protected alAvanzar(): void {
    const video = this.elementoVideo()?.nativeElement;
    if (!video) {
      return;
    }

    // Retomar donde quedo, una sola vez y solo si vale la pena.
    if (!this.posicionRestaurada) {
      this.posicionRestaurada = true;
      const previos = this.segundosPrevios();
      if (previos > 5 && Number.isFinite(video.duration) && previos < video.duration - 5) {
        video.currentTime = previos;
        return;
      }
    }

    const ahora = Date.now();
    if (ahora - this.ultimoEnvio >= 15_000) {
      this.ultimoEnvio = ahora;
      this.enviarAvance(false);
    }
  }

  protected alTerminar(): void {
    const id = this.leccionId();
    const video = this.elementoVideo()?.nativeElement;
    this.api.registrarAvance(id, video?.currentTime ?? 0, true).subscribe({
      next: () => this.completada.emit(id),
      error: () => undefined,
    });
  }

  protected alFallarVideo(): void {
    this.error.set(
      'El navegador no pudo reproducir este archivo. Si es el contenido de ejemplo, '
        + 'no es un video real: suba un MP4 desde la consola del centro.',
    );
  }

  private enviarAvance(silencioso: boolean): void {
    const video = this.elementoVideo()?.nativeElement;
    if (!video || video.currentTime <= 0) {
      return;
    }
    this.api.registrarAvance(this.leccionId(), video.currentTime, false).subscribe({
      error: () => {
        if (!silencioso) {
          this.error.set('No se pudo guardar su avance.');
        }
      },
    });
  }
}
