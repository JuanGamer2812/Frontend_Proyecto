import { Component, OnInit, signal, inject, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../service/api.service';
import { PdfViewerModal } from '../pdf-viewer-modal/pdf-viewer-modal';

interface Resenia {
  id_resena: number;
  id_evento: number;
  id_usuario: number;
  calificacion: number;
  comentario: string;
  fecha_creacion: string;
  nombre_evento?: string;
  nombre_usuario?: string;
  apellido_usuario?: string;
  foto_perfil_usuario?: string;
}

interface Plan {
  id_plan: number;
  nombre_plan: string;
  pdfPath?: string;
}

@Component({
  selector: 'app-catalogo',
  imports: [CommonModule, RouterLink, PdfViewerModal],
  templateUrl: './catalogo.html',
  styleUrls: ['./catalogo.css'],
  encapsulation: ViewEncapsulation.Emulated
})
export class Catalogo implements OnInit {
  private apiService = inject(ApiService);
  private router = inject(Router);

  // Filtros
  filtroTipo = signal<string>('todos');
  filtroCategoria = signal<string>('todas');

  // Datos desde BD
  tipos = signal<string[]>([]);
  categorias = signal<string[]>([]);

  // Reseñas
  resenias = signal<Resenia[]>([]);
  loading = signal(false);
  error = signal<string>('');

  // Modal PDF
  showPdfModal = signal(false);
  pdfModalUrl = signal('');
  pdfModalFileName = signal('');  // Mapeo de planes a PDFs (archivos en carpeta /public)
  planesMap: Map<number, { nombre: string; pdfPath: string }> = new Map([
    [1, { nombre: 'Básico', pdfPath: '/plan-basico.pdf' }],
    [2, { nombre: 'Medio', pdfPath: '/plan-medio.pdf' }],
    [3, { nombre: 'Premium', pdfPath: '/plan-premium.pdf' }]
  ]);

  // Planes disponibles (excluyendo Personalizado)
  planesDisponibles = [
    {
      id: 1,
      nombre: 'Plan Básico',
      tipo: 'Básico',
      descripcion: 'Este es un ejemplo de tarjeta con una breve descripción del evento o paquete disponible.',
      imagen: 'cumBasico.jpg',
      categoria: 'Cumpleaños'
    },
    {
      id: 2,
      nombre: 'Plan Intermedio',
      tipo: 'Medio',
      descripcion: 'Descripción breve de este evento o paquete. Ideal para mostrar detalles llamativos.',
      imagen: 'cumMedio.jpg',
      categoria: 'Cumpleaños'
    },
    {
      id: 3,
      nombre: 'Plan Premium',
      tipo: 'Premium',
      descripcion: 'Un evento destacado para ocasiones especiales. Personaliza el contenido a tu gusto.',
      imagen: 'cumPremium.jpg',
      categoria: 'Cumpleaños'
    }
  ];

  ngOnInit(): void {
    this.cargarTiposDesdeTablaPlanes();
    this.cargarCategoriasDesdeTabla();
    this.cargarResenias();
  }

  cargarTiposDesdeTablaPlanes(): void {
    this.apiService.getPlanes().subscribe({
      next: (planes: any[]) => {
        const tiposUnicos = planes
          .map((p: any) => p.tipo || p.nombre_plan || p.nombre)
          .filter((v: string | null | undefined): v is string => !!v)
          .filter((tipo: string) => tipo !== 'Personalizado'); // Excluir Personalizado
        this.tipos.set([...new Set(tiposUnicos)].sort());
      },
      error: (err: any) => {
        console.error('Error al cargar planes:', err);
      }
    });
  }

  cargarCategoriasDesdeTabla(): void {
    this.apiService.getCategoriasEvento().subscribe({
      next: (categorias: any[]) => {
        const categoriasUnicas = categorias
          .map((c: any) => c.nombre_categoria || c.nombre || c.descripcion)
          .filter((v: string | null | undefined): v is string => !!v);
        this.categorias.set([...new Set(categoriasUnicas)].sort());
      },
      error: (err: any) => {
        console.error('Error al cargar categorías:', err);
      }
    });
  }

  // Cargar todas las reseñas desde el backend
  cargarResenias(): void {
    this.loading.set(true);
    this.error.set('');
    
    // Obtener todas las reseñas de todos los eventos
    this.apiService.getData('resena-evento/todas').subscribe({
      next: (resenias: any[]) => {
        console.log('Reseñas recibidas:', resenias);
        this.resenias.set(resenias);
        this.loading.set(false);
      },
      error: (err: any) => {
        console.error('Error al cargar reseñas:', err);
        this.error.set('No se pudieron cargar las reseñas.');
        this.loading.set(false);
        // Cargar reseñas de ejemplo si falla
        this.cargarReseniasDemoPorEvento();
      }
    });
  }

  // Método alternativo: obtener reseñas por evento específico
  cargarReseniasDemoPorEvento(): void {
    // Puedes implementar lógica para obtener reseñas de eventos específicos
    // Por ahora, dejamos el array vacío
    this.loading.set(false);
  }

  // Abrir modal con PDF del plan
  verPlan(planId: number, planNombre: string): void {
    const planInfo = this.planesMap.get(planId);
    if (planInfo) {
      this.pdfModalUrl.set(planInfo.pdfPath);
      this.pdfModalFileName.set(`${planInfo.nombre}.pdf`);
      this.showPdfModal.set(true);
    }
  }

  // Cerrar modal PDF
  cerrarPdfModal(): void {
    this.showPdfModal.set(false);
    this.pdfModalUrl.set('');
    this.pdfModalFileName.set('');
  }

  // Navegar a reserva con plan preseleccionado
  irAReserva(planId: number): void {
    this.router.navigate(['/reserva'], { queryParams: { id_plan: planId } });
  }

  // Cambiar filtro de tipo
  seleccionarTipo(tipo: string): void {
    this.filtroTipo.set(tipo === this.filtroTipo() ? 'todos' : tipo);
  }

  // Cambiar filtro de categoría
  seleccionarCategoria(categoria: string): void {
    this.filtroCategoria.set(categoria === this.filtroCategoria() ? 'todas' : categoria);
  }

  // Generar array de estrellas para la calificación
  getStars(calificacion: number): number[] {
    return Array(calificacion).fill(0);
  }

  // Generar array de estrellas vacías
  getEmptyStars(calificacion: number): number[] {
    const empty = 5 - calificacion;
    return Array(empty > 0 ? empty : 0).fill(0);
  }

  // Obtener nombre completo del usuario
  getNombreCompleto(resenia: Resenia): string {
    if (resenia.nombre_usuario && resenia.apellido_usuario) {
      return `${resenia.nombre_usuario} ${resenia.apellido_usuario}`;
    }
    return resenia.nombre_usuario || 'Usuario Anónimo';
  }

  // Obtener iniciales del nombre
  getInitials(nombre: string): string {
    const parts = nombre.split(' ');
    if (parts.length >= 2) {
      return parts[0][0] + parts[1][0];
    }
    return nombre.substring(0, 2).toUpperCase();
  }

  // Agrupar reseñas en pares para el carrusel
  getReseniasPairs(): Resenia[][] {
    const pairs: Resenia[][] = [];
    for (let i = 0; i < this.resenias().length; i += 2) {
      pairs.push(this.resenias().slice(i, i + 2));
    }
    return pairs;
  }

  // Obtener planes filtrados (excluyendo Personalizado)
  getPlanesFiltrados() {
    return this.planesDisponibles.filter(plan => {
      const cumpleTipo = this.filtroTipo() === 'todos' || plan.tipo === this.filtroTipo();
      const cumpleCategoria = this.filtroCategoria() === 'todas' || plan.categoria === this.filtroCategoria();
      return cumpleTipo && cumpleCategoria;
    });
  }
}
