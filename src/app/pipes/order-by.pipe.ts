import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'orderBy',
  standalone: true,
  pure: false // Permite que el pipe se ejecute en cada detección de cambios
})
export class OrderByPipe implements PipeTransform {
  transform<T>(
    array: T[] | null | undefined, 
    field: keyof T, 
    direction: 'asc' | 'desc' = 'asc'
  ): T[] {
    if (!array || array.length === 0) {
      return array || [];
    }
    
    // Crear una copia del array para no mutar el original
    const sortedArray = [...array].sort((a, b) => {
      const valueA = a[field];
      const valueB = b[field];
      
      // Manejar valores nulos/undefined
      if (valueA === null || valueA === undefined) return 1;
      if (valueB === null || valueB === undefined) return -1;
      
      // Comparación
      let comparison = 0;
      
      if (valueA < valueB) {
        comparison = -1;
      } else if (valueA > valueB) {
        comparison = 1;
      }
      
      // Aplicar dirección
      return direction === 'asc' ? comparison : -comparison;
    });
    
    return sortedArray;
  }
}
