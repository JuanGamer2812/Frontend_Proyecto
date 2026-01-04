import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'relativeTime',
  standalone: true
})
export class RelativeTimePipe implements PipeTransform {
  transform(value: string | Date | undefined | null): string {
    if (!value) return '';
    
    const now = new Date().getTime();
    const then = new Date(value).getTime();
    
    if (isNaN(then)) return 'Fecha inválida';
    
    const diff = now - then;
    
    // Si es futuro
    if (diff < 0) {
      const futureDiff = Math.abs(diff);
      const seconds = Math.floor(futureDiff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      
      if (days > 0) return `En ${days} día${days > 1 ? 's' : ''}`;
      if (hours > 0) return `En ${hours} hora${hours > 1 ? 's' : ''}`;
      if (minutes > 0) return `En ${minutes} minuto${minutes > 1 ? 's' : ''}`;
      return 'Pronto';
    }
    
    // Si es pasado
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);
    
    if (years > 0) return `Hace ${years} año${years > 1 ? 's' : ''}`;
    if (months > 0) return `Hace ${months} mes${months > 1 ? 'es' : ''}`;
    if (days > 0) return `Hace ${days} día${days > 1 ? 's' : ''}`;
    if (hours > 0) return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `Hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    
    return 'Recién';
  }
}
