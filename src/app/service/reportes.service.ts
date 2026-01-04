import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiConfigService } from './api-config.service';

export interface ReporteProveedor {
  categoria: string | null;
  nombreEmpresa: string | null;
  correo: string | null;
  descripcion: string | null;
  fechaPostulacion: string | null;
  portafolioLink?: string | null;
  portafolioFile?: string | null;
}

export interface ReporteTrabajador {
  cedula: string | null;
  nombres: string | null;
  apellidos: string | null;
  correo: string | null;
  telefono: string | null;
  fechaNacimiento: string | null;
  fechaPostulacion: string | null;
  cvUrl?: string | null;
}

export interface FiltroProveedor {
  from?: string;
  to?: string;
  categoria?: string;
}

export interface FiltroTrabajador {
  from?: string;
  to?: string;
  tieneCv?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ReportesService {
  private http = inject(HttpClient);
  private apiConfig = inject(ApiConfigService);
  private baseUrl = this.apiConfig.getUrl('/api/reportes');

  getProveedores(filters: FiltroProveedor): Observable<ReporteProveedor[]> {
    const params = this.buildParams(filters);
    return this.http.get<ReporteProveedor[]>(`${this.baseUrl}/proveedores`, { params });
  }

  getTrabajadores(filters: FiltroTrabajador): Observable<ReporteTrabajador[]> {
    const params = this.buildParams(filters);
    return this.http.get<ReporteTrabajador[]>(`${this.baseUrl}/trabajadores`, { params });
  }

  descargarProveedoresPdf(filters: FiltroProveedor): Observable<Blob> {
    const params = this.buildParams(filters);
    return this.http.get(`${this.baseUrl}/proveedores/pdf`, { params, responseType: 'blob' });
  }

  descargarTrabajadoresPdf(filters: FiltroTrabajador): Observable<Blob> {
    const params = this.buildParams(filters);
    return this.http.get(`${this.baseUrl}/trabajadores/pdf`, { params, responseType: 'blob' });
  }

  private buildParams(filters: Record<string, any>): HttpParams {
    let params = new HttpParams();
    Object.entries(filters || {}).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      params = params.set(key, String(value));
    });
    return params;
  }
}
