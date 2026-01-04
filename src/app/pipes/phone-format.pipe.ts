import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'phone',
  standalone: true
})
export class PhoneFormatPipe implements PipeTransform {
  transform(value: string | undefined | null, format: 'ec' | 'us' = 'ec'): string {
    if (!value) return '';
    
    // Remover todos los caracteres no numéricos
    const cleaned = value.replace(/\D/g, '');
    
    // Formato Ecuador/US: (099) 123-4567
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    
    // Si tiene 9 dígitos (sin código de área)
    if (cleaned.length === 9) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    
    // Si no coincide con formato esperado, retornar original
    return value;
  }
}
