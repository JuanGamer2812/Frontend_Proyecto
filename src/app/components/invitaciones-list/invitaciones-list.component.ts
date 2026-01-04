/**
 * Componente de Gestión de Invitaciones
 * Página admin para gestionar invitaciones de un evento
 */

import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { InvitacionService, InvitacionDetalle, EstadisticasInvitaciones } from '../../service/invitacion.service';

interface Evento {
  id_evento: number;
  nombre_evento: string;
  fecha_evento: Date;
  ubicacion: string;
}

@Component({
  selector: 'app-invitaciones-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './invitaciones-list.component.html',
  styleUrls: ['./invitaciones-list.component.css']
})
export class InvitacionesListComponent implements OnInit {
  // Eventos disponibles (mock - en producción vendría de EventoService)
  eventos = signal<Evento[]>([]);
  eventoSeleccionado = signal<number | null>(null);
  
  // Invitaciones
  invitaciones = signal<InvitacionDetalle[]>([]);
  invitacionesFiltradas = computed(() => {
    let lista = this.invitaciones();
    
    // Filtro por estado
    if (this.filtroEstado() !== 'todos') {
      lista = lista.filter(inv => inv.estado === this.filtroEstado());
    }
    
    // Filtro por categoría
    if (this.filtroCategoria() !== 'todas') {
      lista = lista.filter(inv => inv.categoria === this.filtroCategoria());
    }
    
    // Búsqueda
    if (this.busqueda().trim() !== '') {
      const termino = this.busqueda().toLowerCase();
      lista = lista.filter(inv => 
        inv.nombre_invitado.toLowerCase().includes(termino) ||
        inv.email.toLowerCase().includes(termino) ||
        inv.codigo_unico.toLowerCase().includes(termino)
      );
    }
    
    return lista;
  });
  
  // Estadísticas
  estadisticas = signal<EstadisticasInvitaciones | null>(null);
  
  // Filtros
  filtroEstado = signal<string>('todos');
  filtroCategoria = signal<string>('todas');
  busqueda = signal<string>('');
  
  // Estados
  isLoading = signal(false);
  error = signal<string | null>(null);
  
  // Modal
  showModal = signal(false);
  modalMode = signal<'crear' | 'editar'>('crear');
  invitacionSeleccionada = signal<InvitacionDetalle | null>(null);
  
  // Formulario
  // Formulario - objeto simple para ngModel (NO usar signal)
  form: {
    nombre: string;
    email: string;
    telefono: string;
    categoria: string;
    acompanantes: number;
    restricciones: string;
    mensaje: string;
  } = {
    nombre: '',
    email: '',
    telefono: '',
    categoria: 'general',
    acompanantes: 0,
    restricciones: '',
    mensaje: ''
  };
  
  // Selección múltiple
  invitacionesSeleccionadas = signal<number[]>([]);
  
  constructor(
    private invitacionService: InvitacionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarEventos();
  }

  /**
   * Cargar eventos disponibles
   */
  cargarEventos(): void {
    // TODO: Implementar EventoService
    // Por ahora mock data
    this.eventos.set([
      {
        id_evento: 1,
        nombre_evento: 'Boda María y Juan',
        fecha_evento: new Date('2024-06-15T18:00:00'),
        ubicacion: 'Jardín Las Rosas'
      },
      {
        id_evento: 2,
        nombre_evento: 'Aniversario Corporativo',
        fecha_evento: new Date('2024-07-20T19:00:00'),
        ubicacion: 'Hotel Intercontinental'
      }
    ]);
  }

  /**
   * Seleccionar evento
   */
  seleccionarEvento(idEvento: number): void {
    this.eventoSeleccionado.set(idEvento);
    this.cargarInvitaciones(idEvento);
    this.cargarEstadisticas(idEvento);
  }

  /**
   * Cargar invitaciones del evento
   */
  cargarInvitaciones(idEvento: number): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.invitacionService.obtenerInvitacionesEvento(idEvento).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.invitaciones.set(response.data);
        } else {
          this.error.set('Error al cargar invitaciones');
        }
        this.isLoading.set(false);
      },
      error: (err: any) => {
        console.error('Error al cargar invitaciones:', err);
        this.error.set('Error al cargar invitaciones');
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Cargar estadísticas
   */
  cargarEstadisticas(idEvento: number): void {
    this.invitacionService.obtenerEstadisticas(idEvento).subscribe({
      next: (response) => {
        if (response.success) {
          this.estadisticas.set(response.data);
        }
      },
      error: (err) => {
        console.error('Error al cargar estadísticas:', err);
      }
    });
  }

  /**
   * Abrir modal para crear
   */
  abrirModalCrear(): void {
    this.modalMode.set('crear');
    this.invitacionSeleccionada.set(null);
    this.resetFormulario();
    this.showModal.set(true);
  }

  /**
   * Abrir modal para editar
   */
  abrirModalEditar(invitacion: InvitacionDetalle): void {
    this.modalMode.set('editar');
    this.invitacionSeleccionada.set(invitacion);
    this.form = {
      nombre: invitacion.nombre_invitado || '',
      email: invitacion.email || '',
      telefono: invitacion.telefono || '',
      categoria: invitacion.categoria || 'general',
      acompanantes: invitacion.numero_acompanantes || 0,
      restricciones: invitacion.restricciones_alimentarias || '',
      mensaje: invitacion.mensaje_personalizado || ''
    };
    this.showModal.set(true);
  }

  /**
   * Cerrar modal
   */
  cerrarModal(): void {
    this.showModal.set(false);
    this.resetFormulario();
  }

  /**
   * Reset formulario
   */
  resetFormulario(): void {
    this.form = {
      nombre: '',
      email: '',
      telefono: '',
      categoria: 'general',
      acompanantes: 0,
      restricciones: '',
      mensaje: ''
    };
  }

  /**
   * Guardar invitación
   */
  guardarInvitacion(): void {
    const eventoId = this.eventoSeleccionado();
    if (!eventoId) return;

    const data = this.form;

    // Validaciones
    if (!data.nombre.trim() || !data.email.trim()) {
      alert('Nombre y email son obligatorios');
      return;
    }
    // Validación de teléfono (10 dígitos)
    if (data.telefono && !/^\d{10}$/.test(data.telefono)) {
      alert('El teléfono debe tener exactamente 10 dígitos');
      return;
    }

    this.isLoading.set(true);

    const invitacion = {
      id_evento: eventoId,
      ...data
    };

    if (this.modalMode() === 'crear') {
      // Crear nueva invitación
      this.invitacionService.crearInvitacion(eventoId, data).subscribe({
        next: (response: any) => {
          if (response.success) {
            this.cargarInvitaciones(eventoId);
            this.cargarEstadisticas(eventoId);
            this.cerrarModal();
          }
          this.isLoading.set(false);
        },
        error: (err: any) => {
          console.error('Error al crear invitación:', err);
          alert('Error al crear invitación');
          this.isLoading.set(false);
        }
      });
    } else {
      // Editar invitación existente
      const id = this.invitacionSeleccionada()?.id_invitacion;
      if (!id) return;

      this.invitacionService.actualizarInvitacion(id, data).subscribe({
        next: (response) => {
          if (response.success) {
            this.cargarInvitaciones(eventoId);
            this.cerrarModal();
          }
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Error al actualizar invitación:', err);
          alert('Error al actualizar invitación');
          this.isLoading.set(false);
        }
      });
    }
  }

  /**
   * Eliminar invitación
   */
  eliminarInvitacion(id: number): void {
    if (!confirm('¿Estás seguro de eliminar esta invitación?')) return;

    const eventoId = this.eventoSeleccionado();
    if (!eventoId) return;

    this.invitacionService.eliminarInvitacion(id).subscribe({
      next: (response) => {
        if (response.success) {
          this.cargarInvitaciones(eventoId);
          this.cargarEstadisticas(eventoId);
        }
      },
      error: (err) => {
        console.error('Error al eliminar invitación:', err);
        alert('Error al eliminar invitación');
      }
    });
  }

  /**
   * Enviar email a invitación
   */
  enviarEmail(id: number): void {
    this.invitacionService.enviarInvitacion(id).subscribe({
      next: (response) => {
        if (response.success) {
          alert('Email enviado exitosamente');
          const eventoId = this.eventoSeleccionado();
          if (eventoId) this.cargarInvitaciones(eventoId);
        }
      },
      error: (err) => {
        console.error('Error al enviar email:', err);
        alert('Error al enviar email');
      }
    });
  }

  /**
   * Copiar código RSVP
   */
  copiarCodigo(codigo: string): void {
    this.invitacionService.copiarAlPortapapeles(codigo);
    alert('Código copiado al portapapeles');
  }

  /**
   * Copiar link RSVP
   */
  copiarLink(codigo: string): void {
    const link = `${window.location.origin}/rsvp/${codigo}`;
    navigator.clipboard.writeText(link).then(() => {
      alert('Link copiado al portapapeles');
    });
  }

  /**
   * Toggle selección de invitación
   */
  toggleSeleccion(id: number): void {
    const seleccionadas = this.invitacionesSeleccionadas();
    const index = seleccionadas.indexOf(id);
    
    if (index > -1) {
      seleccionadas.splice(index, 1);
    } else {
      seleccionadas.push(id);
    }
    
    this.invitacionesSeleccionadas.set([...seleccionadas]);
  }

  /**
   * Seleccionar todas
   */
  seleccionarTodas(): void {
    const todas = this.invitacionesFiltradas().map(inv => inv.id_invitacion);
    this.invitacionesSeleccionadas.set(todas);
  }

  /**
   * Deseleccionar todas
   */
  deseleccionarTodas(): void {
    this.invitacionesSeleccionadas.set([]);
  }

  /**
   * Enviar emails masivos
   */
  enviarEmailsMasivos(): void {
    const seleccionadas = this.invitacionesSeleccionadas();
    if (seleccionadas.length === 0) {
      alert('Selecciona al menos una invitación');
      return;
    }

    if (!confirm(`¿Enviar emails a ${seleccionadas.length} invitados?`)) return;

    this.isLoading.set(true);

    this.invitacionService.enviarInvitacionesMasivas(seleccionadas).subscribe({
      next: (response: any) => {
        if (response.success) {
          alert(`Emails enviados: ${response.data.exitosos}/${response.data.total}`);
          const eventoId = this.eventoSeleccionado();
          if (eventoId) this.cargarInvitaciones(eventoId);
          this.deseleccionarTodas();
        }
        this.isLoading.set(false);
      },
      error: (err: any) => {
        console.error('Error al enviar emails:', err);
        alert('Error al enviar emails masivos');
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Exportar a CSV
   */
  exportarCSV(): void {
    const invitaciones = this.invitaciones();
    const csv = this.invitacionService.exportarACSV(invitaciones);
    const eventoId = this.eventoSeleccionado();
    this.invitacionService.descargarCSV(csv, `invitaciones_evento_${eventoId}.csv`);
  }

  /**
   * Formatear fecha
   */
  formatearFecha(fecha: Date): string {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Obtener clase de badge por estado
   */
  getEstadoBadgeClass(estado: string): string {
    return this.invitacionService.obtenerBadgeEstado(estado);
  }

  /**
   * Obtener icono por estado
   */
  getEstadoIcon(estado: string): string {
    return this.invitacionService.obtenerIconoEstado(estado);
  }

  /**
   * Obtener icono por categoría
   */
  getCategoriaIcon(categoria: string): string {
    // Helper local
    switch (categoria) {
      case 'vip': return 'bi-star-fill text-warning';
      case 'familia': return 'bi-people-fill text-info';
      case 'amigos': return 'bi-heart-fill text-danger';
      case 'trabajo': return 'bi-briefcase-fill text-primary';
      default: return 'bi-person-fill text-secondary';
    }
  }

  /**
   * Calcular porcentaje de confirmación
   */
  getPorcentajeConfirmacion(): number {
    const stats = this.estadisticas();
    if (!stats || stats.total_invitados === 0) return 0;
    return Math.round((stats.confirmados / stats.total_invitados) * 100);
  }

  /**
   * Calcular porcentaje de respuesta
   */
  getPorcentajeRespuesta(): number {
    const stats = this.estadisticas();
    if (!stats || stats.total_invitados === 0) return 0;
    const respondidos = stats.confirmados + stats.rechazados;
    return Math.round((respondidos / stats.total_invitados) * 100);
  }
}
