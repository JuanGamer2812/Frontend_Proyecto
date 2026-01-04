/**
 * Componente RSVP
 * Página pública para que los invitados confirmen su asistencia
 */

import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { InvitacionService, InvitacionDetalle } from '../../service/invitacion.service';

@Component({
  selector: 'app-rsvp',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rsvp.component.html',
  styleUrls: ['./rsvp.component.css']
})
export class RsvpComponent implements OnInit {
  invitacion = signal<InvitacionDetalle | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);
  success = signal(false);
  
  // Formulario
  acompanantesConfirmados = 0;
  restriccionesAlimentarias = '';
  
  // Estados
  showDeclineConfirmation = signal(false);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private invitacionService: InvitacionService
  ) {}

  ngOnInit(): void {
    const codigo = this.route.snapshot.paramMap.get('codigo');
    
    if (!codigo) {
      this.error.set('Código de invitación no válido');
      this.isLoading.set(false);
      return;
    }

    this.cargarInvitacion(codigo);
  }

  /**
   * Cargar invitación
   */
  cargarInvitacion(codigo: string): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.invitacionService.obtenerInvitacionPorCodigo(codigo).subscribe({
      next: (response) => {
        if (response.success) {
          this.invitacion.set(response.data);
          
          // Pre-seleccionar acompañantes confirmados si ya confirmó antes
          if (response.data.estado === 'confirmado') {
            this.acompanantesConfirmados = response.data.acompanantes_confirmados;
            this.restriccionesAlimentarias = response.data.restricciones_alimentarias || '';
          }
        } else {
          this.error.set('No se pudo cargar la invitación');
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar invitación:', err);
        this.error.set('Código de invitación no válido o expirado');
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Confirmar asistencia
   */
  confirmarAsistencia(): void {
    const invitacion = this.invitacion();
    if (!invitacion) return;

    // Validar número de acompañantes
    if (this.acompanantesConfirmados > invitacion.numero_acompanantes) {
      alert(`Solo puedes traer hasta ${invitacion.numero_acompanantes} acompañante${invitacion.numero_acompanantes > 1 ? 's' : ''}`);
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    this.invitacionService.confirmarAsistencia(invitacion.codigo_unico, {
      acompanantes_confirmados: this.acompanantesConfirmados,
      restricciones_alimentarias: this.restriccionesAlimentarias
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.success.set(true);
          // Recargar invitación para mostrar estado actualizado
          setTimeout(() => {
            this.cargarInvitacion(invitacion.codigo_unico);
          }, 2000);
        } else {
          this.error.set('Error al confirmar asistencia');
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error al confirmar asistencia:', err);
        this.error.set(err.error?.message || 'Error al confirmar asistencia');
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Mostrar confirmación de rechazo
   */
  mostrarConfirmacionRechazo(): void {
    this.showDeclineConfirmation.set(true);
  }

  /**
   * Cancelar rechazo
   */
  cancelarRechazo(): void {
    this.showDeclineConfirmation.set(false);
  }

  /**
   * Rechazar invitación
   */
  rechazarInvitacion(): void {
    const invitacion = this.invitacion();
    if (!invitacion) return;

    this.isLoading.set(true);
    this.error.set(null);

    this.invitacionService.rechazarInvitacion(invitacion.codigo_unico).subscribe({
      next: (response) => {
        if (response.success) {
          this.success.set(true);
          this.showDeclineConfirmation.set(false);
          // Recargar invitación
          setTimeout(() => {
            this.cargarInvitacion(invitacion.codigo_unico);
          }, 2000);
        } else {
          this.error.set('Error al registrar respuesta');
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error al rechazar invitación:', err);
        this.error.set('Error al registrar respuesta');
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Formatear fecha
   */
  formatearFecha(fecha: Date): string {
    return new Date(fecha).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Obtener total de asistentes
   */
  getTotalAsistentes(): number {
    return 1 + this.acompanantesConfirmados;
  }

  /**
   * Verificar si ya respondió
   */
  yaRespondio(): boolean {
    const inv = this.invitacion();
    return inv ? inv.estado !== 'pendiente' : false;
  }

  /**
   * Verificar si confirmó
   */
  confirmo(): boolean {
    const inv = this.invitacion();
    return inv ? inv.estado === 'confirmado' : false;
  }

  /**
   * Verificar si rechazó
   */
  rechazo(): boolean {
    const inv = this.invitacion();
    return inv ? inv.estado === 'rechazado' : false;
  }
}
