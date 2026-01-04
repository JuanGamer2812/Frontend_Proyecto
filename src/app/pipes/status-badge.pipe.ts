import { Pipe, PipeTransform } from '@angular/core';

interface BadgeConfig {
  class: string;
  text: string;
}

@Pipe({
  name: 'statusBadge',
  standalone: true
})
export class StatusBadgePipe implements PipeTransform {
  private readonly badges: Record<string, BadgeConfig> = {
    'active': { class: 'badge bg-success', text: 'Activo' },
    'activo': { class: 'badge bg-success', text: 'Activo' },
    'inactive': { class: 'badge bg-secondary', text: 'Inactivo' },
    'inactivo': { class: 'badge bg-secondary', text: 'Inactivo' },
    'pending': { class: 'badge bg-warning text-dark', text: 'Pendiente' },
    'pendiente': { class: 'badge bg-warning text-dark', text: 'Pendiente' },
    'rejected': { class: 'badge bg-danger', text: 'Rechazado' },
    'rechazado': { class: 'badge bg-danger', text: 'Rechazado' },
    'approved': { class: 'badge bg-info', text: 'Aprobado' },
    'aprobado': { class: 'badge bg-info', text: 'Aprobado' },
    'completed': { class: 'badge bg-primary', text: 'Completado' },
    'completado': { class: 'badge bg-primary', text: 'Completado' }
  };
  
  transform(status: string | undefined | null, type: 'class' | 'text' = 'text'): string {
    if (!status) {
      const defaultBadge = this.badges['inactive'];
      return type === 'class' ? defaultBadge.class : defaultBadge.text;
    }
    
    const normalizedStatus = status.toLowerCase().trim();
    const badge = this.badges[normalizedStatus] || this.badges['inactive'];
    
    return type === 'class' ? badge.class : badge.text;
  }
}
