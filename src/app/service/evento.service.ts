import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiConfigService } from './api-config.service';

export interface Evento {
  id_evento: number;
  nombre_evento: string;
  fecha_evento: Date;
  ubicacion: string;
  descripcion?: string;
}

@Injectable({
  providedIn: 'root'
})
export class EventoService {
  private apiUrl: string;

  constructor(
    private http: HttpClient,
    private apiConfig: ApiConfigService
  ) {
    this.apiUrl = this.apiConfig.getUrl('/api/reservas');
  }

  getEventosByUsuario(userId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/usuario/${userId}`);
  }
}
