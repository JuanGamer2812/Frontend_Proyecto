import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiConfigService {
  private readonly apiUrl: string;

  constructor() {
    this.apiUrl = environment.apiUrl;
  }

  /**
   * Obtiene la URL completa del endpoint
   * @param path Ruta del endpoint (ej: '/api/auth/login')
   * @returns URL completa del endpoint
   */
  getUrl(path: string): string {
    // Si apiUrl está vacío (desarrollo), usa ruta relativa con proxy
    if (!this.apiUrl) {
      return path;
    }
    // En producción, concatena la URL base
    return `${this.apiUrl}${path}`;
  }

  /**
   * Obtiene la URL base del API
   * @returns URL base del API
   */
  getBaseUrl(): string {
    return this.apiUrl;
  }
}
