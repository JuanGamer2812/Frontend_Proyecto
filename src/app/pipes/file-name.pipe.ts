import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'fileName',
  standalone: true
})
export class FileNamePipe implements PipeTransform {
  transform(filePath: string | undefined | null): string {
    if (!filePath) return 'Sin archivo';
    
    // Extraer el nombre del archivo de una ruta completa
    // Soporta tanto barras / como barras invertidas \
    const parts = filePath.split(/[/\\]/);
    const fileName = parts[parts.length - 1];
    
    return fileName || filePath;
  }
}
