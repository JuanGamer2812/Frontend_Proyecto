import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filter',
  standalone: true,
  pure: false // Permite que el pipe se ejecute en cada detección de cambios
})
export class FilterPipe implements PipeTransform {
  transform<T>(items: T[] | null | undefined, searchText: string, property?: keyof T): T[] {
    // Si no hay items o texto de búsqueda, retornar el array original
    if (!items || !searchText) {
      return items || [];
    }
    
    searchText = searchText.toLowerCase().trim();
    
    return items.filter(item => {
      // Si se especifica una propiedad, buscar solo en esa propiedad
      if (property) {
        const value = item[property];
        return String(value).toLowerCase().includes(searchText);
      }
      
      // Si no se especifica propiedad, buscar en todas las propiedades del objeto
      return Object.values(item as any).some(val => {
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(searchText);
      });
    });
  }
}
