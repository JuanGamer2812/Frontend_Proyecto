/**
 * Servicio de Invitaciones
 * Gestiona invitados, RSVP y envío de invitaciones
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiConfigService } from './api-config.service';

export interface Invitacion {
  id_invitacion: number;
  nombre_invitado: string;
  email: string;
  telefono?: string;
  codigo_unico: string;
  estado: 'pendiente' | 'confirmado' | 'rechazado' | 'cancelado';
  numero_acompanantes: number;
  acompanantes_confirmados: number;
  categoria?: string;
  mesa_asignada?: string;
  enviado: boolean;
  fecha_confirmacion?: Date;
  notas?: string;
  restricciones_alimentarias?: string;
}

export interface InvitacionDetalle extends Invitacion {
  mensaje_personalizado?: string;
  nombre_evento: string;
  fecha_evento: Date;
  ubicacion: string;
  descripcion?: string;
  organizador_nombre: string;
  organizador_email: string;
}

export interface EstadisticasInvitaciones {
  total_invitados: number;
  pendientes: number;
  confirmados: number;
  rechazados: number;
  cancelados: number;
  invitaciones_enviadas: number;
  asistentes_confirmados: number;
  porcentaje_confirmacion: number;
}

export interface InvitacionPorCategoria {
  categoria: string;
  total: number;
  confirmados: number;
  pendientes: number;
}

@Injectable({
  providedIn: 'root'
})
export class InvitacionService {
  private apiUrl: string;

  constructor(
    private http: HttpClient,
    private apiConfig: ApiConfigService
  ) {
    this.apiUrl = this.apiConfig.getUrl('/api/invitaciones');
  }

  /**
   * Crear invitación individual
   */
  crearInvitacion(eventoId: number, invitadoData: Partial<Invitacion>): Observable<any> {
    return this.http.post(`${this.apiUrl}/${eventoId}`, invitadoData);
  }

  /**
   * Crear invitaciones masivas
   */
  crearInvitacionesMasivas(eventoId: number, invitados: Partial<Invitacion>[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/${eventoId}/masivo`, { invitados });
  }

  /**
   * Enviar invitación por email
   */
  enviarInvitacion(invitacionId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${invitacionId}/enviar`, {});
  }

  /**
   * Enviar invitaciones masivas
   */
  enviarInvitacionesMasivas(invitacionIds: number[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/enviar-masivo`, { invitacion_ids: invitacionIds });
  }

  /**
   * Obtener invitaciones de un evento
   */
  obtenerInvitacionesEvento(eventoId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/evento/${eventoId}`);
  }

  /**
   * Obtener invitación por código (público - RSVP)
   */
  obtenerInvitacionPorCodigo(codigo: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/codigo/${codigo}`);
  }

  /**
   * Confirmar asistencia (público - RSVP)
   */
  confirmarAsistencia(codigo: string, datos: {
    acompanantes_confirmados: number;
    restricciones_alimentarias?: string;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/rsvp/${codigo}/confirmar`, datos);
  }

  /**
   * Rechazar invitación (público - RSVP)
   */
  rechazarInvitacion(codigo: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/rsvp/${codigo}/rechazar`, {});
  }

  /**
   * Actualizar invitación
   */
  actualizarInvitacion(invitacionId: number, datos: Partial<Invitacion>): Observable<any> {
    return this.http.put(`${this.apiUrl}/${invitacionId}`, datos);
  }

  /**
   * Eliminar invitación
   */
  eliminarInvitacion(invitacionId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${invitacionId}`);
  }

  /**
   * Obtener estadísticas de invitaciones
   */
  obtenerEstadisticas(eventoId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/estadisticas/${eventoId}`);
  }

  /**
   * Obtener invitaciones por categoría
   */
  obtenerPorCategoria(eventoId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/categoria/${eventoId}`);
  }

  /**
   * Importar invitados desde CSV
   */
  importarDesdeCSV(csvContent: string): Partial<Invitacion>[] {
    const lines = csvContent.split('\n');
    const invitados: Partial<Invitacion>[] = [];

    // Saltar la primera línea (encabezados)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const columns = line.split(',').map(col => col.trim());
      
      if (columns.length >= 2) {
        invitados.push({
          nombre_invitado: columns[0],
          email: columns[1],
          telefono: columns[2] || undefined,
          numero_acompanantes: columns[3] ? parseInt(columns[3]) : 0,
          categoria: columns[4] || undefined
        });
      }
    }

    return invitados;
  }

  /**
   * Exportar invitados a CSV
   */
  exportarACSV(invitaciones: Invitacion[]): string {
    const headers = ['Nombre', 'Email', 'Teléfono', 'Estado', 'Acompañantes', 'Confirmados', 'Categoría', 'Mesa', 'Código'];
    const rows = invitaciones.map(inv => [
      inv.nombre_invitado,
      inv.email,
      inv.telefono || '',
      inv.estado,
      inv.numero_acompanantes.toString(),
      inv.acompanantes_confirmados.toString(),
      inv.categoria || '',
      inv.mesa_asignada || '',
      inv.codigo_unico
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return csv;
  }

  /**
   * Descargar CSV
   */
  descargarCSV(csv: string, nombreArchivo: string = 'invitados.csv'): void {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', nombreArchivo);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Generar URL de RSVP
   */
  generarURLRSVP(codigo: string): string {
    return `${window.location.origin}/rsvp/${codigo}`;
  }

  /**
   * Copiar al portapapeles
   */
  async copiarAlPortapapeles(texto: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(texto);
      return true;
    } catch (error) {
      console.error('Error al copiar al portapapeles:', error);
      return false;
    }
  }

  /**
   * Obtener icono por estado
   */
  obtenerIconoEstado(estado: string): string {
    switch (estado) {
      case 'confirmado': return 'bi-check-circle-fill text-success';
      case 'rechazado': return 'bi-x-circle-fill text-danger';
      case 'cancelado': return 'bi-slash-circle text-secondary';
      case 'pendiente':
      default: return 'bi-clock text-warning';
    }
  }

  /**
   * Obtener clase de badge por estado
   */
  obtenerBadgeEstado(estado: string): string {
    switch (estado) {
      case 'confirmado': return 'bg-success';
      case 'rechazado': return 'bg-danger';
      case 'cancelado': return 'bg-secondary';
      case 'pendiente':
      default: return 'bg-warning';
    }
  }

  /**
   * Validar email
   */
  validarEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validar teléfono (opcional)
   */
  validarTelefono(telefono: string): boolean {
    if (!telefono) return true;
    const phoneRegex = /^[+]?[\d\s\-()]+$/;
    return phoneRegex.test(telefono);
  }
}
