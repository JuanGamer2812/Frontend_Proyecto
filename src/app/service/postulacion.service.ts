import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PostulacionProveedorResponse {
  message: string;
  data: any;
}

export interface PostulacionTrabajadorResponse {
  message: string;
  data: any;
}

@Injectable({ providedIn: 'root' })
export class PostulacionService {
  private http = inject(HttpClient);
  private baseUrl = '/api/postulaciones';

  /**
   * POST /api/postulaciones/proveedores
   * Envia postulacion de proveedor con FormData (soporta archivos)
   */
  postularProveedor(data: {
    categoria: string;
    nombreEmpresa: string;
    correo: string;
    portafolio: string;
    portafolioLink?: string;
    archivo?: File;
  }): Observable<PostulacionProveedorResponse> {
    const formData = new FormData();
    formData.append('categoria', data.categoria);
    formData.append('nombreEmpresa', data.nombreEmpresa);
    formData.append('correo', data.correo);
    formData.append('portafolio', data.portafolio);

    if (data.portafolioLink) {
      formData.append('portafolioLink', data.portafolioLink);
    }

    if (data.archivo) {
      formData.append('archivo', data.archivo);
    }

    return this.http.post<PostulacionProveedorResponse>(`${this.baseUrl}/proveedores`, formData);
  }

  /**
   * POST /api/postulaciones/trabajadores
   * Envia postulacion de trabajador con FormData (soporta CV)
   */
  postularTrabajador(data: {
    cedula: string;
    nombre1: string;
    nombre2?: string;
    apellido1: string;
    apellido2?: string;
    fechaNacimiento: string;
    correo: string;
    telefono: string;
    archivo?: File;
  }): Observable<PostulacionTrabajadorResponse> {
    const formData = new FormData();
    formData.append('cedula', data.cedula);
    formData.append('nombre1', data.nombre1);
    formData.append('apellido1', data.apellido1);
    formData.append('fechaNacimiento', data.fechaNacimiento);
    formData.append('correo', data.correo);
    formData.append('telefono', data.telefono);

    if (data.nombre2) {
      formData.append('nombre2', data.nombre2);
    }

    if (data.apellido2) {
      formData.append('apellido2', data.apellido2);
    }

    if (data.archivo) {
      formData.append('archivo', data.archivo);
    }

    return this.http.post<PostulacionTrabajadorResponse>(`${this.baseUrl}/trabajadores`, formData);
  }
}
