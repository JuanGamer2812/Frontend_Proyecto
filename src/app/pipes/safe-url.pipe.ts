import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Pipe({
  name: 'safeUrl',
  standalone: true
})
export class SafeUrlPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}
  
  transform(url: string | undefined | null): SafeResourceUrl | string {
    if (!url) return '';
    
    // Validación básica de seguridad
    // Solo permitir URLs que comiencen con http:// o https://
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      console.warn('SafeUrlPipe: URL no segura bloqueada:', url);
      return '';
    }
    
    // Bypass de la sanitización de Angular para URLs confiables
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}
