import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { URL_BASE_API } from './core/api/url-base.token';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';

const serverConfig: ApplicationConfig = {
  providers: [
    // El renderizado del servidor llama a la API por su direccion interna.
    // Sin una base absoluta, HttpClient no puede resolver /api y la pagina
    // se entrega sin contenido.
    {
      provide: URL_BASE_API,
      useValue: process.env['API_INTERNA'] ?? 'http://localhost:8080',
    },
    provideServerRendering(withRoutes(serverRoutes))
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
