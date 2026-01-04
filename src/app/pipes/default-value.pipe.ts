import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'defaultValue',
  standalone: true
})
export class DefaultValuePipe implements PipeTransform {
  transform(value: any, defaultValue: any = '—'): any {
    // Retorna el valor por defecto si es null, undefined o string vacío
    if (value === null || value === undefined || value === '') {
      return defaultValue;
    }
    return value;
  }
}
