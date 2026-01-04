import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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
  private apiUrl = '/api/reservas';

  constructor(private http: HttpClient) {}

  getEventosByUsuario(userId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/usuario/${userId}`);
  }
}
