import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GrupoResumen, importe, ResumenCobranza } from '../../core/api/api.models';
import { MateduApi } from '../../core/api/matedu.api';
import { AuthService } from '../../core/auth/auth.service';
import { MarcaService } from '../../core/tenant/marca.service';

/**
 * Lo primero que ve alguien del centro al entrar.
 *
 * La pregunta que tiene que responder esta pantalla no es "que es esta
 * aplicacion" —eso ya lo sabe quien entra todos los dias— sino **que tengo
 * que hacer hoy**. Por eso lo primero que aparece son los pendientes que
 * necesitan una persona: constancias de pago esperando que alguien las mire,
 * deudas que se pasaron de fecha. Cuando no hay ninguno, se dice tal cual, y
 * eso tambien es informacion.
 *
 * Las cifras van despues, y los accesos al final: quien viene a crear un
 * curso ya sabe donde esta el menu.
 *
 * Un docente no ve nada de dinero. No es cosmetica: la API le responderia 403
 * y la pantalla se llenaria de errores rojos por pedir lo que no le toca.
 */
@Component({
  selector: 'app-consola-inicio',
  imports: [RouterLink],
  template: `
    <header class="titulo">
      <h1>Hola, {{ nombreCorto() }}</h1>
      <p class="tenue">{{ marca().nombre }} · {{ hoy }}</p>
    </header>

    @if (esGestion()) {
      <section class="pendientes">
        @if (cargando()) {
          <p class="tenue">Revisando que hay pendiente…</p>
        } @else if (pendientes().length === 0) {
          <p class="al-dia">
            <strong>Todo al día.</strong>
            <span class="tenue">Ninguna constancia por revisar y ninguna deuda vencida.</span>
          </p>
        } @else {
          @for (pendiente of pendientes(); track pendiente.texto) {
            <a class="pendiente" [class.urgente]="pendiente.urgente" [routerLink]="pendiente.ruta">
              <span class="cuenta">{{ pendiente.cuantos }}</span>
              <span class="detalle">
                <strong>{{ pendiente.texto }}</strong>
                <span class="tenue">{{ pendiente.accion }}</span>
              </span>
            </a>
          }
        }
      </section>
    }

    <section>
      <h2 class="seccion">El centro en números</h2>
      <div class="cifras">
        <a class="cifra tarjeta" routerLink="/consola/alumnos">
          <span class="rotulo">Alumnos</span>
          <strong>{{ alumnos() ?? '—' }}</strong>
        </a>
        <a class="cifra tarjeta" routerLink="/consola/cursos">
          <span class="rotulo">Cursos</span>
          <strong>{{ cursos() ?? '—' }}</strong>
        </a>
        <a class="cifra tarjeta" routerLink="/consola/grupos">
          <span class="rotulo">Grupos con matrícula abierta</span>
          <strong>{{ grupos().length }}</strong>
        </a>
        @if (esGestion() && cobranza(); as datos) {
          <a class="cifra tarjeta" routerLink="/consola/cobranza">
            <span class="rotulo">Por cobrar</span>
            <strong>{{ soles(datos.saldoPorCobrar) }}</strong>
          </a>
        }
      </div>
    </section>

    @if (grupos().length > 0) {
      <section>
        <h2 class="seccion">Matrícula abierta</h2>
        <div class="tabla-scroll tarjeta">
          <table>
            <thead>
              <tr>
                <th>Grupo</th>
                <th>Inicio</th>
                <th class="num">Vacantes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (grupo of grupos(); track grupo.id) {
                <tr>
                  <td class="mono">{{ grupo.codigo }}</td>
                  <td>{{ grupo.fechaInicio }}</td>
                  <td class="num" [class.ultimas]="grupo.vacantes <= 3">
                    {{ grupo.vacantes }} de {{ grupo.cupoMaximo }}
                  </td>
                  <td class="derecha">
                    <a [routerLink]="['/consola/grupos', grupo.id, 'matriculas']">
                      Ver matriculados
                    </a>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    } @else if (!cargando()) {
      <section class="tarjeta vacio">
        <strong>Todavía no hay ningún grupo con matrícula abierta</strong>
        <p class="tenue">
          Un curso es la plantilla —temario, horas, precio—; un grupo es el dictado
          concreto, con sus fechas y su cupo. Los alumnos se matriculan al grupo.
        </p>
        <a class="boton" routerLink="/consola/cursos">Empezar por crear un curso</a>
      </section>
    }
  `,
  styles: `
    .titulo {
      margin-bottom: 20px;
    }
    .titulo p {
      margin: 4px 0 0;
    }
    .seccion {
      margin: 26px 0 10px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.07em;
      text-transform: uppercase;
      color: var(--texto-tenue);
    }

    /* Pendientes: lo unico de la pantalla que pide una accion, asi que es lo
       unico que lleva color. */
    .pendientes {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    .pendiente {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1 1 260px;
      max-width: 420px;
      padding: 12px 14px;
      background: var(--superficie);
      border: 1px solid var(--linea);
      border-left: 3px solid var(--marca-primario);
      border-radius: var(--radio);
      color: inherit;
      text-decoration: none;
    }
    .pendiente:hover {
      background: var(--superficie-2);
      text-decoration: none;
    }
    .pendiente.urgente {
      border-left-color: var(--error);
    }
    .cuenta {
      font-size: 26px;
      font-weight: 700;
      line-height: 1;
      color: var(--marca-primario);
    }
    .pendiente.urgente .cuenta {
      color: var(--error);
    }
    .detalle {
      display: flex;
      flex-direction: column;
      line-height: 1.35;
    }
    .detalle strong {
      font-size: 13.5px;
    }
    .detalle span {
      font-size: 12px;
    }
    .al-dia {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: baseline;
      margin: 0;
      padding: 12px 14px;
      background: var(--exito-suave);
      border: 1px solid var(--linea);
      border-left: 3px solid var(--exito);
      border-radius: var(--radio);
      font-size: 13.5px;
    }
    .al-dia strong {
      color: var(--exito);
    }

    .cifras {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 12px;
    }
    .cifra {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 14px 16px;
      color: inherit;
      text-decoration: none;
    }
    .cifra:hover {
      background: var(--superficie-2);
      text-decoration: none;
    }
    .rotulo {
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--texto-tenue);
    }
    .cifra strong {
      font-size: 24px;
      font-weight: 600;
      letter-spacing: -0.02em;
    }

    .num {
      text-align: right;
    }
    .derecha {
      text-align: right;
    }
    .ultimas {
      color: var(--aviso);
      font-weight: 600;
    }

    .vacio {
      padding: 22px 24px;
    }
    .vacio strong {
      display: block;
      font-size: 15px;
      margin-bottom: 6px;
    }
    .vacio p {
      margin: 0 0 16px;
      max-width: 64ch;
    }
  `,
})
export class ConsolaInicioPage implements OnInit {
  private readonly api = inject(MateduApi);
  private readonly auth = inject(AuthService);
  private readonly marcaService = inject(MarcaService);

  protected readonly marca = this.marcaService.marca;
  protected readonly esGestion = this.auth.esGestion;

  protected readonly cargando = signal(true);
  protected readonly cobranza = signal<ResumenCobranza | null>(null);
  protected readonly grupos = signal<GrupoResumen[]>([]);
  protected readonly alumnos = signal<number | null>(null);
  protected readonly cursos = signal<number | null>(null);

  protected readonly hoy = new Date().toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  /** Solo el nombre de pila: "Hola, Coordinacion Escuela Tecnica Andina" no saluda a nadie. */
  protected readonly nombreCorto = computed(
    () => this.auth.usuario()?.nombreCompleto?.split(' ')[0] ?? '',
  );

  /**
   * Lo que espera a una persona, en orden de urgencia.
   *
   * Se construye a partir de lo que ya devuelve la API de cobranza; no hay
   * una lista de tareas guardada en ningun sitio, y no hace falta: un
   * pendiente es un hecho que se puede calcular, no un recordatorio que
   * alguien tiene que acordarse de crear.
   */
  protected readonly pendientes = computed(() => {
    const datos = this.cobranza();
    if (!datos) {
      return [];
    }

    const lista = [];
    if (datos.pagosPorConfirmar > 0) {
      lista.push({
        cuantos: datos.pagosPorConfirmar,
        texto: datos.pagosPorConfirmar === 1
          ? 'constancia por revisar'
          : 'constancias por revisar',
        accion: 'Un pago registrado no cobra nada hasta que alguien lo confirma',
        ruta: '/consola/cobranza',
        urgente: false,
      });
    }
    if (datos.ordenesMorosas > 0) {
      lista.push({
        cuantos: datos.ordenesMorosas,
        texto: datos.ordenesMorosas === 1 ? 'orden vencida' : 'órdenes vencidas',
        accion: 'Pasaron su fecha y siguen con saldo',
        ruta: '/consola/cobranza',
        urgente: true,
      });
    }
    return lista;
  });

  /** S/ 1928.32, como en el resto del sistema. */
  protected soles(monto: number): string {
    return importe(monto);
  }

  ngOnInit(): void {
    this.api.gruposAbiertos().subscribe({
      next: (pagina) => {
        this.grupos.set(pagina.content);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });

    this.api.alumnos(0, 1).subscribe({
      next: (pagina) => this.alumnos.set(pagina.totalElements),
      error: () => this.alumnos.set(null),
    });

    this.api.cursos(undefined, 0, 1).subscribe({
      next: (pagina) => this.cursos.set(pagina.totalElements),
      error: () => this.cursos.set(null),
    });

    // El dinero no se le pide a un docente: la API le respondería 403 y la
    // pantalla se llenaría de errores por preguntar lo que no le toca.
    if (this.esGestion()) {
      this.api.resumenCobranza().subscribe({
        next: (datos) => this.cobranza.set(datos),
        error: () => this.cobranza.set(null),
      });
    }
  }
}
