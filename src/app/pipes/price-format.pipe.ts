import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'priceFormat',
  standalone: true
})
export class PriceFormatPipe implements PipeTransform {
  transform(
    value: number | undefined | null, 
    perHour: boolean = false,
    currency: string = 'USD'
  ): string {
    // Si el valor es nulo, indefinido o no es un número
    if (value === undefined || value === null || isNaN(value)) {
      return 'Consultar';
    }
    
    // Formatear el precio
    const formatted = `$${value.toFixed(2)}`;
    
    // Agregar "/hora" si aplica
    if (perHour) {
      return `${formatted}/hora`;
    }
    
    return formatted;
  }
}
