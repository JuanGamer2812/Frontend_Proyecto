import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'timeRange',
  standalone: true
})
export class TimeRangePipe implements PipeTransform {
  transform(
    inicio: string | undefined | null, 
    fin: string | undefined | null, 
    separator: string = ' - '
  ): string {
    if (!inicio || !fin) {
      return '—';
    }
    
    return `${inicio}${separator}${fin}`;
  }
}
