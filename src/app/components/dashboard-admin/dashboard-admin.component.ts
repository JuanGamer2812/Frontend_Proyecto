/**
 * Dashboard Admin - Panel de Administración Principal
 * KPIs, estadísticas y acceso rápido a funciones administrativas
 */

import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

interface DashboardStats {
  usuarios: {
    total: number;
    activos: number;
    nuevos_mes: number;
    administradores: number;
  };
  eventos: {
    total: number;
    proximos: number;
    completados: number;
    cancelados: number;
  };
  pagos: {
    total_ingresos: number;
    pendientes: number;
    completados: number;
    reembolsos: number;
  };
  proveedores: {
    total: number;
    aprobados: number;
    pendientes: number;
    rechazados: number;
  };
  invitaciones: {
    total: number;
    confirmadas: number;
    pendientes: number;
    rechazadas: number;
  };
}

interface ActividadReciente {
  id: number;
  tipo: string;
  descripcion: string;
  usuario: string;
  fecha: Date;
  icono: string;
  color: string;
}

@Component({
  selector: 'app-dashboard-admin',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard-admin.component.html',
  styleUrls: ['./dashboard-admin.component.css']
})
export class DashboardAdminComponent implements OnInit {
  // Estadísticas
  stats = signal<DashboardStats>({
    usuarios: {
      total: 0,
      activos: 0,
      nuevos_mes: 0,
      administradores: 0
    },
    eventos: {
      total: 0,
      proximos: 0,
      completados: 0,
      cancelados: 0
    },
    pagos: {
      total_ingresos: 0,
      pendientes: 0,
      completados: 0,
      reembolsos: 0
    },
    proveedores: {
      total: 0,
      aprobados: 0,
      pendientes: 0,
      rechazados: 0
    },
    invitaciones: {
      total: 0,
      confirmadas: 0,
      pendientes: 0,
      rechazadas: 0
    }
  });

  // Actividad reciente
  actividadReciente = signal<ActividadReciente[]>([]);

  // Estados
  isLoading = signal(true);

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.cargarEstadisticas();
    this.cargarActividadReciente();
  }

  /**
   * Cargar estadísticas del dashboard
   */
  cargarEstadisticas(): void {
    // TODO: Implementar llamadas a APIs reales
    // Mock data para demostración
    setTimeout(() => {
      this.stats.set({
        usuarios: {
          total: 1547,
          activos: 892,
          nuevos_mes: 143,
          administradores: 8
        },
        eventos: {
          total: 287,
          proximos: 45,
          completados: 231,
          cancelados: 11
        },
        pagos: {
          total_ingresos: 458750,
          pendientes: 12500,
          completados: 437800,
          reembolsos: 8450
        },
        proveedores: {
          total: 89,
          aprobados: 67,
          pendientes: 15,
          rechazados: 7
        },
        invitaciones: {
          total: 3421,
          confirmadas: 2187,
          pendientes: 834,
          rechazadas: 400
        }
      });
      this.isLoading.set(false);
    }, 1000);
  }

  /**
   * Cargar actividad reciente
   */
  cargarActividadReciente(): void {
    // Mock data
    this.actividadReciente.set([
      {
        id: 1,
        tipo: 'pago',
        descripcion: 'Nuevo pago recibido - $2,500',
        usuario: 'María García',
        fecha: new Date('2024-01-15T14:30:00'),
        icono: 'bi-credit-card',
        color: 'success'
      },
      {
        id: 2,
        tipo: 'proveedor',
        descripcion: 'Proveedor pendiente de aprobación',
        usuario: 'Catering Del Sol',
        fecha: new Date('2024-01-15T13:15:00'),
        icono: 'bi-shop',
        color: 'warning'
      },
      {
        id: 3,
        tipo: 'usuario',
        descripcion: 'Nuevo usuario registrado',
        usuario: 'Juan Pérez',
        fecha: new Date('2024-01-15T12:00:00'),
        icono: 'bi-person-plus',
        color: 'info'
      },
      {
        id: 4,
        tipo: 'evento',
        descripcion: 'Evento creado: Boda María & Juan',
        usuario: 'Ana López',
        fecha: new Date('2024-01-15T10:45:00'),
        icono: 'bi-calendar-event',
        color: 'primary'
      },
      {
        id: 5,
        tipo: 'invitacion',
        descripcion: '50 invitaciones enviadas',
        usuario: 'Sistema',
        fecha: new Date('2024-01-15T09:30:00'),
        icono: 'bi-envelope',
        color: 'secondary'
      }
    ]);
  }

  /**
   * Formatear moneda
   */
  formatearMoneda(valor: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(valor);
  }

  /**
   * Formatear fecha relativa
   */
  formatearFechaRelativa(fecha: Date): string {
    const ahora = new Date();
    const diff = ahora.getTime() - new Date(fecha).getTime();
    const minutos = Math.floor(diff / 60000);
    const horas = Math.floor(diff / 3600000);
    const dias = Math.floor(diff / 86400000);

    if (minutos < 1) return 'Ahora';
    if (minutos < 60) return `Hace ${minutos} min`;
    if (horas < 24) return `Hace ${horas} h`;
    return `Hace ${dias} d`;
  }

  /**
   * Calcular porcentaje
   */
  calcularPorcentaje(valor: number, total: number): number {
    return total > 0 ? Math.round((valor / total) * 100) : 0;
  }
}
