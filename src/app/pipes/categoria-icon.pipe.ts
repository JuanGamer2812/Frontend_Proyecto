import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'categoriaIcon',
  standalone: true
})
export class CategoriaIconPipe implements PipeTransform {
  private readonly icons: Record<string, string> = {
    'Musica': 'bi-music-note-beamed',
    'Catering': 'bi-egg-fried',
    'Lugar': 'bi-geo-alt',
    'Decoracion': 'bi-balloon-heart'
  };
  
  transform(categoria: string | undefined | null): string {
    if (!categoria) return 'bi-circle';
    
    return this.icons[categoria] || 'bi-circle';
  }
}
