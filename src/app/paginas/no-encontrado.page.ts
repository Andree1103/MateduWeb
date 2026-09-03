import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';

@Component({
  selector: 'app-no-encontrado',
  imports: [RouterLink],
  template: `
    <div class="pantalla">
      <span class="codigo">404</span>
      <h1>Esta pagina no existe</h1>
      <p class="tenue">Puede que el enlace este mal o que la seccion aun no exista.</p>
      <a class="boton" [routerLink]="destino()">Volver al inicio</a>
    </div>
  `,
  styles: `
    .pantalla {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      min-height: 100vh;
      padding: 32px 20px;
      text-align: center;
    }
    .codigo {
      font-family: var(--fuente-mono);
      font-size: 13px;
      letter-spacing: 0.14em;
      color: var(--marca-primario);
    }
    h1 { font-size: 25px; }
    p { margin: 0 0 10px; }
    .boton { text-decoration: none; }
  `,
})
export class NoEncontradoPage {
  private readonly auth = inject(AuthService);

  protected destino(): string {
    return this.auth.autenticado() ? this.auth.destinoTrasIngresar() : '/ingresar';
  }
}
