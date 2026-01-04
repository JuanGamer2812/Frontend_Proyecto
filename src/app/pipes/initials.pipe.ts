import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'initials',
  standalone: true
})
export class InitialsPipe implements PipeTransform {
  transform(name: string | undefined | null, maxLetters: number = 2): string {
    if (!name || name.trim() === '') {
      return '??';
    }
    
    // Dividir el nombre en palabras
    const words = name.trim().split(/\s+/);
    
    // Tomar las primeras letras de las primeras N palabras
    const initials = words
      .slice(0, maxLetters)
      .map(word => {
        const firstChar = word[0];
        return firstChar ? firstChar.toUpperCase() : '';
      })
      .filter(char => char !== '') // Filtrar caracteres vacíos
      .join('');
    
    return initials || '??';
  }
}
