import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../service/api.service';

interface ProveedorPendiente {
  id_proveedor: number;
  nombre: string;
  descripcion: string;
  categoria: string;
  estado_aprobacion: string;
  precio_base: number;
  // calificacion_promedio eliminado
}

@Component({
  selector: 'app-admin-postulaciones',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-postulaciones.html',
  styleUrl: './admin-postulaciones.css'
})
export class AdminPostulaciones implements OnInit {
  private apiService = inject(ApiService);

  proveedoresPendientes = signal<ProveedorPendiente[]>([]);
  loading = signal(false);
  error = signal<string>('');
  successMessage = signal<string>('');
  categorias = signal<any[]>([]);
  categoriaSeleccionada = signal<string>('TODOS');

  ngOnInit(): void {
    this.cargarCategorias();
    this.cargarProveedoresPendientes();
  }

  cargarCategorias(): void {
    this.apiService.getCategorias().subscribe({
      next: (cats: any[]) => {
        const mapped = (cats || []).map((c: any) => ({
          nombre: c?.nombre || c?.Nombre || 'OTRO',
          icono: c?.icono || c?.Icono
        }));
        this.categorias.set(mapped);
      },
      error: (err: any) => {
        console.error('Error al cargar categorías:', err);
      }
    });
  }

  cargarProveedoresPendientes(): void {
    this.loading.set(true);
    this.error.set('');
    this.successMessage.set('');

    this.apiService.getProveedoresPendientes().subscribe({
      next: (data: any[]) => {
        let pendientes = (data || []).map((p: any) => ({
          id_proveedor: p?.id_proveedor || p?.id || 0,
          nombre: p?.nombre || 'Proveedor',
          descripcion: p?.descripcion || '',
          categoria: p?.categoria || 'OTRO',
          estado_aprobacion: p?.estado_aprobacion || 'pendiente',
          precio_base: p?.precio_base || 0,
          // calificacion_promedio eliminado
        }));

        // Filtrar por categoría si no es TODOS
        if (this.categoriaSeleccionada() !== 'TODOS') {
          pendientes = pendientes.filter(
            p => p.categoria === this.categoriaSeleccionada()
          );
        }

        console.log(`📋 Proveedores pendientes (${this.categoriaSeleccionada()}): ${pendientes.length}`);
        this.proveedoresPendientes.set(pendientes);
        this.loading.set(false);
      },
      error: (err: any) => {
        console.error('Error al cargar proveedores pendientes:', err);
        this.error.set('Error al cargar postulaciones');
        this.loading.set(false);
      }
    });
  }

  filtrarPorCategoria(categoria: string): void {
    this.categoriaSeleccionada.set(categoria);
    this.cargarProveedoresPendientes();
  }

  aprobarProveedor(id: number): void {
    if (!confirm('¿Estás seguro de que deseas aprobar este proveedor?')) {
      return;
    }

    this.apiService.aprobarProveedor(id).subscribe({
      next: () => {
        console.log(`✅ Proveedor ${id} aprobado`);
        this.successMessage.set('Proveedor aprobado exitosamente');
        setTimeout(() => this.successMessage.set(''), 3000);
        this.cargarProveedoresPendientes();
      },
      error: (err: any) => {
        console.error('Error al aprobar proveedor:', err);
        this.error.set('Error al aprobar proveedor');
      }
    });
  }

  rechazarProveedor(id: number): void {
    if (!confirm('¿Estás seguro de que deseas rechazar este proveedor?')) {
      return;
    }

    this.apiService.rechazarProveedor(id).subscribe({
      next: () => {
        console.log(`❌ Proveedor ${id} rechazado`);
        this.successMessage.set('Proveedor rechazado');
        setTimeout(() => this.successMessage.set(''), 3000);
        this.cargarProveedoresPendientes();
      },
      error: (err: any) => {
        console.error('Error al rechazar proveedor:', err);
        this.error.set('Error al rechazar proveedor');
      }
    });
  }

  // Normalizar categoría para mostrar
  getNombreCategoria(categoria: string): string {
    const map: { [key: string]: string } = {
      'MUSICA': '🎵 Música',
      'CATERING': '🍽️ Catering',
      'DECORACION': '✨ Decoración',
      'LUGAR': '📍 Lugar',
      'FOTOGRAFIA': '📸 Fotografía',
      'VIDEO': '🎬 Video'
    };
    return map[categoria] || categoria;
  }

  getIconoCategoria(categoria: string): string {
    const map: { [key: string]: string } = {
      'MUSICA': 'bi-music-note-beamed',
      'CATERING': 'bi-egg-fried',
      'DECORACION': 'bi-balloon-heart',
      'LUGAR': 'bi-geo-alt',
      'FOTOGRAFIA': 'bi-camera',
      'VIDEO': 'bi-film'
    };
    return map[categoria] || 'bi-tag';
  }

  get contadorPendientes(): number {
    return this.proveedoresPendientes().length;
  }
}
