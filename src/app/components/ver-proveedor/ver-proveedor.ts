import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../service/api.service';

@Component({
  selector: 'app-ver-proveedor',
  imports: [CommonModule],
  templateUrl: './ver-proveedor.html',
  styleUrl: './ver-proveedor.css'
})
export class VerProveedor implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(ApiService);

  loading = signal(false);
  error = signal<string | null>(null);
  proveedor = signal<any | null>(null);

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam ? parseInt(idParam, 10) : NaN;
    if (!id || Number.isNaN(id)) {
      this.error.set('ID de proveedor inválido');
      return;
    }

    this.loading.set(true);
    this.api.getProveedorById(id).subscribe({
      next: (data) => {
        this.proveedor.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar proveedor:', err);
        this.error.set('No se pudo cargar el proveedor');
        this.loading.set(false);
      }
    });
  }

  formatCurrency(value?: number | string): string {
    if (!value && value !== 0) return '-';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return '-';
    return `$${numValue.toFixed(2)}`;
  }

  getEstadoAprobacionTexto(estado?: string): string {
    switch (estado) {
      case 'aprobado': return 'Aprobado';
      case 'rechazado': return 'Rechazado';
      case 'suspendido': return 'No aprobado';
      case 'pendiente':
      default: return 'Pendiente';
    }
  }

  getEstadoAprobacionClase(estado?: string): string {
    switch (estado) {
      case 'aprobado': return 'bg-success';
      case 'rechazado': return 'bg-danger';
      case 'suspendido': return 'bg-warning';
      case 'pendiente':
      default: return 'bg-secondary';
    }
  }

  volver(): void {
    this.router.navigate(['/adm-proveedor']);
  }
}
