import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { ApiService } from '../../service/api.service';

interface ProveedorHome {
  Nombre: string;
  Descripcion: string;
  Categoria: string;
  Foto: any;
}

interface Categoria {
  nombre: string;
  icono?: string;
}

@Component({
  selector: 'app-colaboradores',
  imports: [CommonModule, TitleCasePipe],
  templateUrl: './colaboradores.html',
  styleUrl: './colaboradores.css'
})
export class Colaboradores implements OnInit {
  private apiService = inject(ApiService);

  // URL base del backend para imágenes
  private readonly BACKEND_URL = 'http://127.0.0.1:5000';

  proveedores = signal<ProveedorHome[]>([]);
  categorias = signal<Categoria[]>([]);
  categoriaSeleccionada = signal<string>('TODOS');
  loading = signal(false);
  error = signal<string>('');

  ngOnInit(): void {
    this.cargarTiposProveedor();
    this.cargarProveedores();
  }

  cargarTiposProveedor(): void {
    // Cargar tipos de proveedor desde la tabla proveedor_tipo (NO categorías de eventos)
    this.apiService.getTiposProveedor().subscribe({
      next: (tipos: any[]) => {
        const mapped = (tipos || []).map((t: any) => ({
          nombre: (t?.nombre || t?.nombre_tipo || 'OTRO').toString().toUpperCase(),
          icono: t?.icono || this.getIconoDefault(t?.nombre || t?.nombre_tipo)
        }));
        console.log('📂 Tipos de proveedor cargados:', mapped);
        this.categorias.set(mapped);
      },
      error: (err: any) => {
        console.warn('⚠️ Error al cargar tipos de proveedor:', err);
        this.categorias.set([]);
      }
    });
  }

  // Función helper para asignar iconos por defecto según el nombre del tipo
  private getIconoDefault(nombre: string): string {
    const n = (nombre || '').toString().toUpperCase();
    if (n.includes('MUSIC') || n.includes('MÚSIC')) return 'bi-music-note-beamed';
    if (n.includes('CATERING') || n.includes('COMIDA')) return 'bi-egg-fried';
    if (n.includes('DECORAC')) return 'bi-balloon-heart';
    if (n.includes('LUGAR') || n.includes('LOCAL')) return 'bi-geo-alt';
    if (n.includes('FOTOGRAF')) return 'bi-camera';
    if (n.includes('VIDEO')) return 'bi-camera-video';
    return 'bi-star';
  }

  cargarProveedores(): void {
    this.loading.set(true);
    this.error.set('');
    const categoriaFiltro = this.categoriaSeleccionada();

    // Traer todos los proveedores aprobados y filtrar por tipo
    this.apiService.getProveedoresAprobados().subscribe({
      next: (data: any[]) => {
        const filtrados = (data || []).filter((p: any) => {
          const estadoAprob = (p?.estado_aprobacion ?? '').toString().toLowerCase();
          const estadoBool = p?.estado;
          // Excluir suspendidos o desactivados del listado público
          return estadoAprob !== 'suspendido' && estadoBool !== false;
        });

        const normaliza = (v: any) => (v ?? '').toString().trim().toUpperCase();

        const mapped: ProveedorHome[] = filtrados.map((p: any) => {
          // Buscar imagen principal (es_principal = true) en proveedor_imagen
          let fotoPrincipal = null;
          
          if (Array.isArray(p?.proveedor_imagen) && p.proveedor_imagen.length > 0) {
            // Buscar la imagen marcada como principal
            const imgPrincipal = p.proveedor_imagen.find((img: any) => img?.es_principal === true || img?.es_principal === 1);
            if (imgPrincipal) {
              fotoPrincipal = imgPrincipal.url_imagen || imgPrincipal.url || imgPrincipal.ruta || null;
            } else {
              // Si no hay imagen principal, usar la primera disponible
              const primeraImg = p.proveedor_imagen[0];
              fotoPrincipal = primeraImg?.url_imagen || primeraImg?.url || primeraImg?.ruta || null;
            }
          }
          
          // Fallback a campos legacy si no hay imagen principal
          if (!fotoPrincipal) {
            fotoPrincipal = p?.foto || p?.imagen_proveedor || p?.imagen1_proveedor || null;
          }

          return {
            Nombre: p?.nombre || p?.nombre_proveedor || 'Proveedor',
            Descripcion: p?.descripcion || p?.descripcion_proveedor || '',
            // IMPORTANTE: usar tipo/nombre_tipo en lugar de categoria
            Categoria: p?.tipo || p?.nombre_tipo || p?.tipo_nombre || 'OTRO',
            Foto: fotoPrincipal
          };
        });

        const destino = normaliza(categoriaFiltro);
        const visibles = destino === 'TODOS'
          ? mapped
          : mapped.filter(p => normaliza(p.Categoria) === destino);
        
        console.log(`📋 Colaboradores filtrados por tipo "${categoriaFiltro}":`, visibles.length, 'de', mapped.length);
        this.proveedores.set(visibles);
        this.loading.set(false);
      },
      error: (err: any) => {
        console.error(`❌ Error al cargar proveedores (tipo: ${categoriaFiltro}):`, err);
        this.error.set(`Error al cargar proveedores de ${categoriaFiltro}`);
        this.proveedores.set([]);
        this.loading.set(false);
      }
    });
  }

  filtrarPorCategoria(categoria: string): void {
    console.log(`🔍 Filtrando por tipo de proveedor: ${categoria}`);
    this.categoriaSeleccionada.set(categoria);
    this.cargarProveedores();
  }

  trunc(text: string, length: number = 100): string {
    if (!text) return '';
    return text.length > length ? text.substring(0, length) + '...' : text;
  }

  /**
   * Detecta el tipo MIME de una imagen base64 o devuelve la URL si es externa
   * @param foto - Base64 string o URL de imagen
   * @returns URL completa con data URI o URL externa
   */
  getImageUrl(foto: any): string {
    if (!foto) return '';
    
    const fotoStr = foto.toString().trim();
    
    // Si ya es una URL completa (http/https), devolverla tal cual
    if (fotoStr.startsWith('http://') || fotoStr.startsWith('https://')) {
      return fotoStr;
    }
    
    // Si ya tiene data URI completo, devolverlo
    if (fotoStr.startsWith('data:image/')) {
      return fotoStr;
    }
    
    // Si es una ruta relativa que empieza con /uploads/ o /tmp_uploads/
    if (fotoStr.startsWith('/uploads/') || fotoStr.startsWith('/tmp_uploads/')) {
      return `${this.BACKEND_URL}${fotoStr}`;
    }
    
    // Si es un nombre de archivo (contiene extensión de imagen)
    const extensionesImagen = /\.(jpg|jpeg|png|gif|webp|avif|bmp|svg|tiff)$/i;
    if (extensionesImagen.test(fotoStr)) {
      // Es un nombre de archivo - construir la ruta completa
      // Usar /uploads/ (ruta estándar para imágenes de proveedores según el backend)
      return `${this.BACKEND_URL}/uploads/${fotoStr}`;
    }
    
    // Es base64 sin prefijo - detectar tipo por magic bytes
    const mimeType = this.detectImageMimeType(fotoStr);
    return `data:${mimeType};base64,${fotoStr}`;
  }

  /**
   * Detecta el MIME type de una imagen base64 por sus magic bytes
   * @param base64String - String base64 de la imagen
   * @returns MIME type detectado
   */
  private detectImageMimeType(base64String: string): string {
    // Decodificar los primeros bytes para detectar el tipo
    const firstBytes = base64String.substring(0, 50);
    
    // Magic bytes comunes (en base64):
    // JPEG: /9j/
    // PNG: iVBORw0KGgo
    // GIF: R0lGODlh o R0lGODdh
    // WebP: UklGR
    // AVIF: AAAAIGZ0eXBhdmlm (típicamente)
    // BMP: Qk
    // TIFF: SUkq o TU0A
    
    if (firstBytes.startsWith('/9j/')) return 'image/jpeg';
    if (firstBytes.startsWith('iVBORw0KGgo')) return 'image/png';
    if (firstBytes.startsWith('R0lGODlh') || firstBytes.startsWith('R0lGODdh')) return 'image/gif';
    if (firstBytes.startsWith('UklGR')) return 'image/webp';
    if (firstBytes.includes('ZnR5cGF2aWY') || firstBytes.includes('AAAAIGZ0eXBhdmlm')) return 'image/avif';
    if (firstBytes.startsWith('Qk')) return 'image/bmp';
    if (firstBytes.startsWith('SUkq') || firstBytes.startsWith('TU0A')) return 'image/tiff';
    
    // Fallback a JPEG si no se puede detectar
    console.warn('⚠️ No se pudo detectar el tipo de imagen, usando JPEG por defecto');
    return 'image/jpeg';
  }
}
