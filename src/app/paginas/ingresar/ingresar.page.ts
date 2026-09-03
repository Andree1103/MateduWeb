import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ProblemDetail } from '../../core/auth/auth.models';
import { AuthService } from '../../core/auth/auth.service';
import { TokenStore } from '../../core/auth/token.store';
import { MarcaService } from '../../core/tenant/marca.service';

@Component({
  selector: 'app-ingresar',
  imports: [ReactiveFormsModule],
  templateUrl: './ingresar.page.html',
  styleUrl: './ingresar.page.css',
})
export class IngresarPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);
  private readonly store = inject(TokenStore);

  protected readonly marca = inject(MarcaService).marca;
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

  /** El selector de centro solo aparece en desarrollo; en produccion lo da el dominio. */
  protected readonly pideCentro = environment.enviarCabeceraCentro;

  protected readonly formulario = this.fb.nonNullable.group({
    centro: [this.store.centro ?? ''],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  /** Mensaje cuando el usuario llega aqui porque se le vencio la sesion. */
  protected readonly avisoSesion = computed(() =>
    this.ruta.snapshot.queryParamMap.get('motivo') === 'sesion-expirada'
      ? 'Su sesion expiro. Vuelva a ingresar.'
      : null,
  );

  protected ingresar(): void {
    if (this.formulario.invalid || this.enviando()) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    this.error.set(null);

    const { centro, email, password } = this.formulario.getRawValue();

    this.auth.iniciarSesion({ email, password }, this.pideCentro ? centro : undefined).subscribe({
      next: () => {
        const volverA = this.ruta.snapshot.queryParamMap.get('volverA');
        void this.router.navigateByUrl(volverA ?? this.auth.destinoTrasIngresar());
      },
      error: (respuesta: unknown) => {
        this.enviando.set(false);
        this.error.set(this.mensajeDe(respuesta));
      },
    });
  }

  protected campoInvalido(nombre: 'email' | 'password'): boolean {
    const campo = this.formulario.controls[nombre];
    return campo.invalid && (campo.dirty || campo.touched);
  }

  /** Traduce el problema del backend a algo que el usuario pueda entender. */
  private mensajeDe(respuesta: unknown): string {
    if (!(respuesta instanceof HttpErrorResponse)) {
      return 'No se pudo completar el ingreso.';
    }
    if (respuesta.status === 401) {
      return 'Correo o contrasena incorrectos.';
    }

    const problema = respuesta.error as ProblemDetail | null;
    if (problema?.detail) {
      return problema.detail;
    }

    // Sin cuerpo RFC 7807 no hubo backend que respondiera: o no hay red, o el
    // proxy de desarrollo no alcanzo la API. El proxy traduce eso a 500, asi
    // que un 500 sin detalle tambien cae aqui.
    const sinBackend = [0, 500, 502, 503, 504].includes(respuesta.status);
    return sinBackend
      ? 'No hay conexion con la API. Verifique que el backend este levantado en el puerto 8080.'
      : 'No se pudo completar el ingreso.';
  }
}
