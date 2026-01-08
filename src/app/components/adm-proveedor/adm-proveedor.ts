import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../service/api.service';
import { AuthJwtService } from '../../service/auth-jwt.service';
import { JsonPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';

type Categoria = string;
type Vista = 'proveedores' | 'postulaciones';
type EstadoAprobacion = 'pendiente' | 'aprobado' | 'rechazado' | 'suspendido';

interface Proveedor {
  id_proveedor?: number;
  nombre?: string;
  precio_base?: number;
  estado?: boolean;
  descripcion?: string;
  id_plan?: number;
  id_tipo?: number;
  tipo_nombre?: string;
  descripcion_tipo?: string;
  nombre_plan?: string;
  plan_descripcion?: string;
  verificado?: boolean;  // true = proveedores registrados, false/null = postulaciones
  estado_aprobacion?: EstadoAprobacion;
  razon_rechazo?: string | null;  // Razón del rechazo/suspensión (nombre de columna en BD)
  // Campos de auditoría (usar los existentes en BD)
  aprobado_por?: number | null;  // Se usa tanto para aprobación como para suspensión
  fecha_aprobacion?: string | null;  // Fecha de aprobación (trigger automático)
  // Campos de música
  genero?: string;
  por_hora?: boolean;
  hora_inicio?: string;
  hora_fin?: string;
  // Campos de catering
  tipo_comida?: string;
  menu?: string;
  // Campos de lugar
  capacidad?: number;
  direccion?: string;
  lugar_descripcion?: string;
  seguridad?: boolean;
  // Campos de decoración
  nivel?: string;
  pdf_catalogo?: string;
  // Campos adicionales para compatibilidad
  categoria?: string;
  nombre_empresa?: string;
  correo?: string;
  portafolio?: string;
  fecha_postulacion?: string;
  fecha_registro?: string;
  [key: string]: any;
}

interface PostulacionProveedor {
  id_postu_proveedor?: number;
  categoria_postu_proveedor: string;
  nom_empresa_postu_proveedor: string;
  correo_postu_proveedor: string;
  portafolio_postu_proveedor: string;
  fecha_postu_proveedor: string;
}

@Component({
  selector: 'app-adm-proveedor',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './adm-proveedor.html',
  styleUrls: ['./adm-proveedor.css']
})
export class AdmProveedor implements OnInit {
  private apiService = inject(ApiService);
  private authService = inject(AuthJwtService);
  private router = inject(Router);
  
  // Exponer Object para el template
  Object = Object;

  // Vista activa
  vistaActiva = signal<Vista>('proveedores');

  // Proveedores
  categorias: Categoria[] = [];
  private categoriasBase: Categoria[] = [];
  categoria = signal<Categoria>('');
  planes: any[] = [];
  planDefault: number | null = null;
  proveedores = signal<Proveedor[]>([]);
  loadingProveedores = signal(false);
  errorProveedores = signal<string | null>(null);

  // Postulaciones
  postulaciones = signal<PostulacionProveedor[]>([]);
  loadingPostulaciones = signal(false);
  errorPostulaciones = signal<string | null>(null);

  // Acciones en proceso
  procesando = signal<{ [key: number]: boolean }>({});

  // Proveedores registrados (verificado = true)
  listado = computed(() => {
    const cat = this.categoria();
    const allProveedores = this.proveedores();

    if (allProveedores.length === 0) {
      return [];
    }

    if (!cat) {
      const visibles = allProveedores.filter(p => {
        const estado = (p.estado_aprobacion ?? '').toString().toLowerCase();
        return estado === 'aprobado' || estado === 'suspendido' || p.verificado === true;
      });
      return visibles;
    }

    const normaliza = (v?: any) => this.normalizarCategoriaNombre(v);
    const buscada = normaliza(cat);
    const categoriaDe = (p: any): string => normaliza(
      p.tipo_nombre ?? p['nombre_tipo'] ?? p['tipo'] ?? p.categoria ?? p['categoria_proveedor'] ?? p['categoria_postu_proveedor']
    );

    const filtrados = allProveedores.filter((p) => {
      const catProv = categoriaDe(p);
      const coincide = buscada ? catProv === buscada : !!catProv;
      const estado = (p.estado_aprobacion ?? '').toString().toLowerCase();
      const visible = estado === 'aprobado' || estado === 'suspendido' || p.verificado === true;
      return coincide && visible;
    });

    console.log('Filtro aplicado:', { 
      categoriaSeleccionada: cat,
      buscada,
      totalProveedores: allProveedores.length, 
      filtrados: filtrados.length,
      ejemploCategoria: allProveedores[0]?.tipo_nombre 
    });

    return filtrados;
  });

  // Postulaciones pendientes (verificado = false o null Y estado_aprobacion = 'pendiente' o 'rechazado')
  postulacionesPendientes = computed(() => {
    return this.proveedores().filter(p => 
      !p.verificado && (p.estado_aprobacion === 'pendiente' || p.estado_aprobacion === 'rechazado')
    );
  });

  ngOnInit(): void {
    this.cargarCategorias();
    this.cargarPlanes();
    this.cargarProveedores();
    this.cargarPostulaciones();
  }

  // =================== PROVEEDORES ===================
  cargarProveedores(): void {
    this.loadingProveedores.set(true);
    this.errorProveedores.set(null);

    forkJoin([
      this.apiService.getProveedores(),
      this.apiService.getProveedoresPorEstado('suspendido')
    ]).subscribe({
      next: ([todos, suspendidos]) => {
        const tipoNombrePorId: Record<number, string> = { 1: 'CATERING', 2: 'MUSICA', 3: 'DECORACION', 4: 'LUGAR', 5: 'FOTOGRAFIA' };
        const normaliza = (v: any) => (v ?? '').toString().trim();
        const aMayus = (v: any) => normaliza(v).toUpperCase();
        const aMinus = (v: any) => normaliza(v).toLowerCase();

        // Unir y deduplicar (algunos backends excluyen suspendidos del listado base)
        const unidos = [...(todos || []), ...(suspendidos || [])];
        const sinDuplicados = Array.from(
          new Map(unidos.map((p: any) => [p.id_proveedor ?? p.id, p])).values()
        );

        const mapeados = sinDuplicados.map((p: any) => {
          // Log para diagnóstico
          console.log('Proveedor raw:', { 
            nombre: p.nombre, 
            id_tipo: p.id_tipo, 
            tipo_nombre: p.tipo_nombre,
            categoria: p.categoria,
            categoria_proveedor: p.categoria_proveedor
          });

          const tipoNombre = aMayus(
            p.tipo_nombre ?? p['nombre_tipo'] ?? p['tipo'] ?? p.categoria ?? p['categoria_proveedor'] ?? p['categoria_postu_proveedor'] ?? tipoNombrePorId[p.id_tipo] ?? ''
          );
          const descripcion = normaliza(p.descripcion ?? p.descripcion_proveedor ?? p.lugar_descripcion ?? p.plan_descripcion ?? '');
          const estadoAprob = aMinus(p.estado_aprobacion ?? (p.verificado === true ? 'aprobado' : 'pendiente')) as EstadoAprobacion;
          const verificado = p.verificado === true || aMinus(p.estado_aprobacion) === 'aprobado' || p.estado === true;

          return {
            ...p,
            tipo_nombre: tipoNombre, // ej: 'MUSICA', 'CATERING'
            descripcion,
            estado_aprobacion: estadoAprob,
            verificado
          } as Proveedor;
        });

        console.log('Proveedores mapeados:', mapeados);

        // Ordenar alfabéticamente por nombre y luego por ID para numeración estable
        const ordenados = [...mapeados].sort((a, b) => {
          const nombreA = (a.nombre || '').toString().toLowerCase();
          const nombreB = (b.nombre || '').toString().toLowerCase();
          if (nombreA < nombreB) return -1;
          if (nombreA > nombreB) return 1;
          return (this.getId(a) || 0) - (this.getId(b) || 0);
        });

        this.proveedores.set(ordenados);
        this.actualizarCategoriasDesdeDatos();
        this.loadingProveedores.set(false);
      },
      error: (err) => {
        console.error('Error al cargar proveedores:', err);
        this.errorProveedores.set('Error al cargar proveedores desde el servidor');
        this.loadingProveedores.set(false);
      }
    });
  }

  // =================== POSTULACIONES ===================
  cargarPostulaciones(): void {
    this.loadingPostulaciones.set(true);
    this.errorPostulaciones.set(null);

    this.apiService.getTrabajaNosotrosProveedor().subscribe({
      next: (data) => {
        const ordenadas = [...(data || [])].sort((a, b) => {
          const nombreA = (a.nom_empresa_postu_proveedor || '').toString().toLowerCase();
          const nombreB = (b.nom_empresa_postu_proveedor || '').toString().toLowerCase();
          if (nombreA < nombreB) return -1;
          if (nombreA > nombreB) return 1;
          return (a.id_postu_proveedor ?? 0) - (b.id_postu_proveedor ?? 0);
        });
        this.postulaciones.set(ordenadas);
        this.loadingPostulaciones.set(false);
      },
      error: (err) => {
        console.error('Error al cargar postulaciones:', err);
        this.errorPostulaciones.set('Error al cargar postulaciones desde el servidor');
        this.loadingPostulaciones.set(false);
      }
    });
  }

  async aprobarPostulacion(post: PostulacionProveedor): Promise<void> {
    const idPost = post.id_postu_proveedor;
    if (!idPost) return;

    const confirmacion = await Swal.fire({
      icon: 'question',
      title: 'Aprobar postulante',
      text: `¿Aprobar postulante "${post.nom_empresa_postu_proveedor}" y convertirlo en proveedor?`,
      showCancelButton: true,
      confirmButtonText: 'Sí, aprobar',
      cancelButtonText: 'Cancelar'
    });

    if (!confirmacion.isConfirmed) return;

    const proc = this.procesando();
    proc[idPost] = true;
    this.procesando.set({ ...proc });

    const categoriaNormalizada = this.normalizarCategoriaNombre(post.categoria_postu_proveedor);
    const payloadUpdate = {
      categoria_postu_proveedor: categoriaNormalizada,
      nom_empresa_postu_proveedor: post.nom_empresa_postu_proveedor,
      correo_postu_proveedor: post.correo_postu_proveedor,
      portafolio_postu_proveedor: post.portafolio_postu_proveedor,
      fecha_postu_proveedor: post.fecha_postu_proveedor
    };

    // 1) Normalizar categoría y mantener datos obligatorios para que el PUT no falle
    this.apiService.updateTrabajaNosotrosProveedor(idPost, payloadUpdate).subscribe({
      next: () => this.convertirPostulacion(idPost, post, categoriaNormalizada),
      error: (err) => {
        console.warn('No se pudo normalizar la categoría antes de convertir:', err);
        this.convertirPostulacion(idPost, post, categoriaNormalizada);
      }
    });
  }

  private convertirPostulacion(idPost: number, post: PostulacionProveedor, categoriaNormalizada?: string): void {
    // 2) Convertir postulante en proveedor
    // El backend real exige id_postu_proveedor, precio_base (>0) e id_plan.
    // No tenemos esos campos en la UI, así que usamos valores mínimos por defecto y el primer plan disponible.
    const plan = this.planDefault ?? (this.planes[0]?.id_plan ?? this.planes[0]?.id ?? null);
    if (!plan) {
      const p = this.procesando();
      delete p[idPost];
      this.procesando.set({ ...p });
      Swal.fire({ icon: 'warning', title: 'Plan no disponible', text: 'No hay un plan válido para convertir. Reintenta cuando se carguen los planes.' });
      return;
    }

    const descripcionBase = (post.portafolio_postu_proveedor || post.nom_empresa_postu_proveedor || '').toString().trim();
    const descripcion = descripcionBase.length >= 10
      ? descripcionBase
      : 'Proveedor en revisión. Descripción pendiente.';

    const idTipo = this.getIdTipoFromCategoria(categoriaNormalizada || post.categoria_postu_proveedor);

    const conversionPayload = {
      id_postu_proveedor: idPost,
      precio_base: 10,
      id_plan: plan,
      descripcion,
      categoria: categoriaNormalizada || this.normalizarCategoriaNombre(post.categoria_postu_proveedor),
      nombre: post.nom_empresa_postu_proveedor,
      correo: post.correo_postu_proveedor,
      id_tipo: idTipo
    };

    console.log('Payload convertir-postulante:', conversionPayload);

    this.apiService.convertirPostulanteAProveedor(conversionPayload).subscribe({
      next: (res: any) => {
        const newProvId = res?.id_proveedor ?? res?.id ?? res?.data?.id_proveedor ?? null;

        const finalize = (mensaje: string) => {
          const restantes = this.postulaciones().filter(p => p.id_postu_proveedor !== idPost);
          this.postulaciones.set(restantes);
          this.cargarProveedores();

          const p = this.procesando();
          delete p[idPost];
          this.procesando.set({ ...p });
          Swal.fire({ icon: 'success', title: 'Conversión completada', text: mensaje });
        };

        const limpiarPostulacion = () => {
          this.apiService.deleteTrabajaNosotrosProveedor(idPost).subscribe({
            next: () => finalize('Postulante convertido y creado como proveedor pendiente'),
            error: () => finalize('Postulante convertido; no se pudo limpiar la postulación (se intentó borrar).')
          });
        };

        // 2) Registrar proveedor como pendiente (no aprobado) para flujo de validación
        const marcarPendiente$ = newProvId
          ? this.apiService.updateProveedor(newProvId, { estado_aprobacion: 'pendiente', verificado: false, estado: false })
          : null;

        if (marcarPendiente$) {
          marcarPendiente$.subscribe({
            next: limpiarPostulacion,
            error: (err) => {
              console.error('Error al marcar proveedor como pendiente:', err);
              limpiarPostulacion();
            }
          });
        } else {
          limpiarPostulacion();
        }
      },
      error: (err) => {
        console.error('Error al convertir postulante a proveedor:', err);
        const p = this.procesando();
        delete p[idPost];
        this.procesando.set({ ...p });
        const msg = err.error?.message || err.error?.error || err.message || 'Error al convertir postulante';
        Swal.fire({ icon: 'error', title: 'No se pudo convertir', text: 'Error al convertir postulante: ' + msg + ' Revisa que el backend reciba precio_base e id_plan.' });
      }
    });
  }

  async eliminarPostulacion(post: PostulacionProveedor): Promise<void> {
    const idPost = post.id_postu_proveedor;
    if (!idPost) return;

    const confirmacion = await Swal.fire({
      icon: 'question',
      title: 'Eliminar postulación',
      text: `¿Eliminar la postulación de "${post.nom_empresa_postu_proveedor}"? Esta acción no se puede deshacer.`,
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (!confirmacion.isConfirmed) return;

    const proc = this.procesando();
    proc[idPost] = true;
    this.procesando.set({ ...proc });

    this.apiService.deleteTrabajaNosotrosProveedor(idPost).subscribe({
      next: () => {
        const restantes = this.postulaciones().filter(p => p.id_postu_proveedor !== idPost);
        this.postulaciones.set(restantes);

        const p = this.procesando();
        delete p[idPost];
        this.procesando.set({ ...p });
        Swal.fire({ icon: 'success', title: 'Postulación eliminada', text: 'La postulación se eliminó correctamente.' });
      },
      error: (err) => {
        console.error('Error al eliminar postulación:', err);
        const p = this.procesando();
        delete p[idPost];
        this.procesando.set({ ...p });
        Swal.fire({ icon: 'error', title: 'No se pudo eliminar', text: 'Error al eliminar: ' + (err.error?.message || err.message) });
      }
    });
  }

  cambiarVista(vista: Vista): void {
    this.vistaActiva.set(vista);
  }

  cambiarCategoria(cat: Categoria): void {
    this.categoria.set(cat);
  }

  private normalizarCategoriaNombre(cat?: string): string {
    const raw = (cat || '').toString().trim();
    if (!raw) return '';
    const upper = raw.toUpperCase();
    const normalized = upper.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const sinAcentos = normalized
      .replace('Ç?', 'A')
      .replace('Ç%', 'E')
      .replace('Ç?', 'I')
      .replace('Ç"', 'O')
      .replace('Çs', 'U')
      .replace('Ço', 'U')
      .replace("Ç'", 'N');

    if (sinAcentos.includes('DECORACION')) return 'DECORACION';
    if (sinAcentos.includes('MUSICA')) return 'MUSICA';
    if (sinAcentos.includes('CATERING')) return 'CATERING';
    if (sinAcentos.includes('LUGAR')) return 'LUGAR';
    if (sinAcentos.includes('FOTO')) return 'FOTOGRAFIA';

    return sinAcentos;
  }

  private getIdTipoFromCategoria(cat?: string): number | null {
    const c = this.normalizarCategoriaNombre(cat);
    if (c.includes('MUSICA')) return 1;
    if (c.includes('CATERING')) return 2;
    if (c.includes('DECORACION')) return 3;
    if (c.includes('LUGAR')) return 4;
    if (c.includes('FOTOGRAFIA')) return 5;
    return null;
  }

  cargarPlanes(): void {
    this.apiService.getPlanes().subscribe({
      next: (planes) => {
        this.planes = planes || [];
        if (!this.planDefault && this.planes.length > 0) {
          const primero = this.planes[0];
          this.planDefault = primero?.id_plan ?? primero?.id ?? 1;
        }
      },
      error: () => {
        if (!this.planDefault) {
          this.planDefault = 1;
        }
      }
    });
  }

  cargarCategorias(): void {
    // Usar getTiposProveedor() en lugar de getCategorias() (que es para eventos)
    this.apiService.getTiposProveedor().subscribe({
      next: (tipos) => {
        const lista = (tipos || [])
          .map((t: any) => t?.nombre || t?.tipo || t?.categoria || t)
          .filter((v: any) => !!v)
          .map((v: any) => v.toString());

        if (lista.length) {
          this.categoriasBase = lista;
        } else if (this.categoriasBase.length === 0) {
          this.categoriasBase = ['Musica', 'Catering', 'Lugar', 'Decoracion', 'Fotografia'];
        }

        this.actualizarCategoriasDesdeDatos();
      },
      error: () => {
        if (this.categoriasBase.length === 0) {
          this.categoriasBase = ['Musica', 'Catering', 'Lugar', 'Decoracion', 'Fotografia'];
        }
        this.actualizarCategoriasDesdeDatos();
      }
    });
  }

  private actualizarCategoriasDesdeDatos(): void {
    const proveedores = this.proveedores();
    const merged = this.construirCategorias(proveedores, this.categoriasBase);
    this.categorias = merged.length ? merged : (this.categoriasBase || []);

    const actual = this.categoria();
    if (!actual || !this.categorias.some(c => this.normalizarCategoriaNombre(c) === this.normalizarCategoriaNombre(actual))) {
      if (this.categorias.length > 0) {
        this.categoria.set(this.categorias[0]);
      }
    }
  }

  private construirCategorias(proveedores: Proveedor[], base: Categoria[]): Categoria[] {
    const map = new Map<string, string>();

    const add = (raw: any) => {
      const nombre = (raw ?? '').toString().trim();
      if (!nombre) return;
      const key = this.normalizarCategoriaNombre(nombre);
      if (!key) return;
      if (!map.has(key)) {
        map.set(key, nombre);
      }
    };

    (base || []).forEach(add);
    (proveedores || []).forEach((p) =>
      add(p.tipo_nombre ?? p['nombre_tipo'] ?? p['tipo'] ?? p.categoria ?? p['categoria_proveedor'] ?? p['categoria_postu_proveedor'])
    );

    return Array.from(map.values()).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  }

  getId(p: Proveedor): number {
    return p.id_proveedor ?? p['id'] ?? 0;
  }

  trunc(txt?: string, len = 60): string {
    if (!txt) return '-';
    return txt.length > len ? txt.slice(0, len) + '…' : txt;
  }

  formatCurrency(value?: number | string): string {
    if (!value && value !== 0) return '-';
    
    // Convertir a número si es string
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    
    // Verificar si es un número válido
    if (isNaN(numValue)) return '-';
    
    return `$${numValue.toFixed(2)}`;
  }

  // =================== ACCIONES DE PROVEEDOR ===================
  
  verDetalles(id: number): void {
    this.router.navigate(['/ver-proveedor', id]);
  }

  editarProveedor(id: number): void {
    this.router.navigate(['/editar-proveedor', id]);
  }

  async eliminarProveedor(id: number): Promise<void> {
    const confirmacion = await Swal.fire({
      icon: 'question',
      title: 'Eliminar proveedor',
      text: '¿Está seguro de eliminar este proveedor? Esta acción no se puede deshacer.',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (!confirmacion.isConfirmed) return;

    const procesandoActual = this.procesando();
    procesandoActual[id] = true;
    this.procesando.set({ ...procesandoActual });

    this.apiService.deleteProveedor(id).subscribe({
      next: () => {
        // Eliminar del array
        const nuevosProveedores = this.proveedores().filter(p => p.id_proveedor !== id);
        this.proveedores.set(nuevosProveedores);
        
        const procesandoActual = this.procesando();
        delete procesandoActual[id];
        this.procesando.set({ ...procesandoActual });
        Swal.fire({ icon: 'success', title: 'Proveedor eliminado', text: 'El proveedor fue eliminado exitosamente.' });
      },
      error: (err) => {
        console.error('Error al eliminar proveedor:', err);
        const procesandoActual = this.procesando();
        delete procesandoActual[id];
        this.procesando.set({ ...procesandoActual });
        Swal.fire({ icon: 'error', title: 'No se pudo eliminar', text: 'Error al eliminar el proveedor: ' + (err.error?.message || err.message) });
      }
    });
  }

  cambiarEstado(proveedor: Proveedor): void {
    if (!proveedor.id_proveedor) return;

    const nuevoEstado = !proveedor.estado;
    const id = proveedor.id_proveedor;

    const procesandoActual = this.procesando();
    procesandoActual[id] = true;
    this.procesando.set({ ...procesandoActual });

    this.apiService.updateProveedor(id, { estado: nuevoEstado }).subscribe({
      next: () => {
        // Actualizar en el array
        const nuevosProveedores = this.proveedores().map(p => 
          p.id_proveedor === id ? { ...p, estado: nuevoEstado } : p
        );
        this.proveedores.set(nuevosProveedores);
        
        const procesandoActual = this.procesando();
        delete procesandoActual[id];
        this.procesando.set({ ...procesandoActual });
      },
      error: (err) => {
        console.error('Error al cambiar estado:', err);
        const procesandoActual = this.procesando();
        delete procesandoActual[id];
        this.procesando.set({ ...procesandoActual });
        Swal.fire({ icon: 'error', title: 'No se pudo cambiar el estado', text: err.error?.message || err.message });
      }
    });
  }

  async aprobarProveedor(proveedor: Proveedor): Promise<void> {
    if (!proveedor.id_proveedor) return;

    const confirmacion = await Swal.fire({
      icon: 'question',
      title: 'Aprobar proveedor',
      text: `¿Aprobar el proveedor "${proveedor.nombre}"?`,
      showCancelButton: true,
      confirmButtonText: 'Sí, aprobar',
      cancelButtonText: 'Cancelar'
    });

    if (!confirmacion.isConfirmed) return;

    const currentUser = this.authService.getCurrentUser();
    const userId = currentUser?.id || null;

    const id = proveedor.id_proveedor;
    const procesandoActual = this.procesando();
    procesandoActual[id] = true;
    this.procesando.set({ ...procesandoActual });

    // Aprobar: verificado = true, estado_aprobacion = 'aprobado'
    this.apiService.updateProveedor(id, { 
      verificado: true,
      estado_aprobacion: 'aprobado',
      aprobado_por: userId,
      fecha_aprobacion: new Date().toISOString()
    }).subscribe({
      next: () => {
        // Actualizar en el array
        const nuevosProveedores = this.proveedores().map(p => 
          p.id_proveedor === id ? { 
            ...p, 
            verificado: true,
            estado_aprobacion: 'aprobado' as EstadoAprobacion,
            aprobado_por: userId,
            fecha_aprobacion: new Date().toISOString()
          } : p
        );
        this.proveedores.set(nuevosProveedores);
        
        const procesandoActual = this.procesando();
        delete procesandoActual[id];
        this.procesando.set({ ...procesandoActual });
        Swal.fire({ icon: 'success', title: 'Proveedor aprobado', text: 'El proveedor fue aprobado exitosamente.' });
      },
      error: (err) => {
        console.error('Error al aprobar proveedor:', err);
        const procesandoActual = this.procesando();
        delete procesandoActual[id];
        this.procesando.set({ ...procesandoActual });
        Swal.fire({ icon: 'error', title: 'No se pudo aprobar', text: 'Error al aprobar el proveedor: ' + (err.error?.message || err.message) });
      }
    });
  }

  async rechazarProveedor(proveedor: Proveedor): Promise<void> {
    if (!proveedor.id_proveedor) return;

    const { value: motivo } = await Swal.fire({
      icon: 'warning',
      title: 'Rechazar proveedor',
      text: `¿Por qué rechazar a "${proveedor.nombre}"?`,
      input: 'text',
      inputPlaceholder: 'Motivo del rechazo',
      showCancelButton: true,
      confirmButtonText: 'Rechazar',
      cancelButtonText: 'Cancelar'
    });

    if (!motivo || !motivo.trim()) return;

    const currentUser = this.authService.getCurrentUser();
    const userId = currentUser?.id || null;

    const id = proveedor.id_proveedor;
    const procesandoActual = this.procesando();
    procesandoActual[id] = true;
    this.procesando.set({ ...procesandoActual });

    // Rechazar: verificado = false, estado_aprobacion = 'rechazado'
    this.apiService.updateProveedor(id, { 
      verificado: false,
      estado_aprobacion: 'rechazado',
      razon_rechazo: motivo.trim(),
      aprobado_por: userId  // Usar aprobado_por para registrar quién rechazó
    }).subscribe({
      next: () => {
        // Actualizar en el array
        const nuevosProveedores = this.proveedores().map(p => 
          p.id_proveedor === id ? { 
            ...p, 
            verificado: false,
            estado_aprobacion: 'rechazado' as EstadoAprobacion,
            razon_rechazo: motivo.trim(),
            aprobado_por: userId
          } : p
        );
        this.proveedores.set(nuevosProveedores);
        
        const procesandoActual = this.procesando();
        delete procesandoActual[id];
        this.procesando.set({ ...procesandoActual });
        Swal.fire({ icon: 'success', title: 'Proveedor rechazado', text: 'Proveedor rechazado con motivo: ' + motivo.trim() });
      },
      error: (err) => {
        console.error('Error al rechazar proveedor:', err);
        const procesandoActual = this.procesando();
        delete procesandoActual[id];
        this.procesando.set({ ...procesandoActual });
        Swal.fire({ icon: 'error', title: 'No se pudo rechazar', text: 'Error al rechazar el proveedor: ' + (err.error?.message || err.message) });
      }
    });
  }

  async suspenderProveedor(proveedor: Proveedor): Promise<void> {
    if (!proveedor.id_proveedor) return;

    const { value: razon } = await Swal.fire({
      icon: 'warning',
      title: 'Suspender proveedor',
      text: 'Ingrese la razón de la suspensión:',
      input: 'text',
      inputPlaceholder: 'Motivo',
      showCancelButton: true,
      confirmButtonText: 'Suspender',
      cancelButtonText: 'Cancelar'
    });

    if (!razon) return;

    const currentUser = this.authService.getCurrentUser();
    const userId = currentUser?.id || null;

    const id = proveedor.id_proveedor;
    const procesandoActual = this.procesando();
    procesandoActual[id] = true;
    this.procesando.set({ ...procesandoActual });

    // Suspender: verificado se mantiene en true, estado_aprobacion = 'suspendido'
    this.apiService.updateProveedor(id, {
      verificado: true,  // CRÍTICO: Mantener verificado en true al suspender
      estado_aprobacion: 'suspendido',
      razon_rechazo: razon.trim(),
      aprobado_por: userId  // Usar aprobado_por para registrar quién suspendió
    }).subscribe({
      next: () => {
        // Actualizar en el array
        const nuevosProveedores = this.proveedores().map(p => 
          p.id_proveedor === id ? { 
            ...p, 
            estado_aprobacion: 'suspendido' as EstadoAprobacion,
            razon_rechazo: razon.trim(),
            aprobado_por: userId
          } : p
        );
        this.proveedores.set(nuevosProveedores);
        
        const procesandoActual = this.procesando();
        delete procesandoActual[id];
        this.procesando.set({ ...procesandoActual });
        Swal.fire({ icon: 'success', title: 'Proveedor suspendido', text: 'El proveedor fue suspendido (no aparecerá en /colaboradores).' });
      },
      error: (err) => {
        console.error('Error al suspender proveedor:', err);
        const procesandoActual = this.procesando();
        delete procesandoActual[id];
        this.procesando.set({ ...procesandoActual });
        Swal.fire({ icon: 'error', title: 'No se pudo suspender', text: 'Error al cambiar el estado del proveedor: ' + (err.error?.message || err.message) });
      }
    });
  }

  desuspenderProveedor(proveedor: Proveedor): void {
    if (!proveedor.id_proveedor) return;

    const id = proveedor.id_proveedor;
    const procesandoActual = this.procesando();
    procesandoActual[id] = true;
    this.procesando.set({ ...procesandoActual });

    // Al desuspender: aprobar y activar para que reaparezca en /colaboradores
    this.apiService.updateProveedor(id, { estado_aprobacion: 'aprobado', verificado: true, estado: true }).subscribe({
      next: () => {
        // Actualizar en el array
        const nuevosProveedores = this.proveedores().map(p => 
          p.id_proveedor === id ? { ...p, estado_aprobacion: 'aprobado' as EstadoAprobacion, verificado: true, estado: true } : p
        );
        this.proveedores.set(nuevosProveedores);
        
        const procesandoActual = this.procesando();
        delete procesandoActual[id];
        this.procesando.set({ ...procesandoActual });
        Swal.fire({ icon: 'success', title: 'Proveedor reactivado', text: 'Proveedor desuspendido, aprobado y activado.' });
      },
      error: (err) => {
        console.error('Error al desuspender proveedor:', err);
        const procesandoActual = this.procesando();
        delete procesandoActual[id];
        this.procesando.set({ ...procesandoActual });
        Swal.fire({ icon: 'error', title: 'No se pudo reactivar', text: 'Error al desuspender el proveedor: ' + (err.error?.message || err.message) });
      }
    });
  }

  getEstadoAprobacionClase(estado?: EstadoAprobacion): string {
    switch (estado) {
      case 'aprobado': return 'bg-success';
      case 'rechazado': return 'bg-danger';
      case 'suspendido': return 'bg-warning';
      case 'pendiente':
      default: return 'bg-secondary';
    }
  }

  getEstadoAprobacionTexto(estado?: EstadoAprobacion): string {
    switch (estado) {
      case 'aprobado': return 'Aprobado';
      case 'rechazado': return 'Rechazado';
      case 'suspendido': return 'Suspendido';
      case 'pendiente':
      default: return 'Pendiente';
    }
  }

  isProcesando(id?: number): boolean {
    return id ? !!this.procesando()[id] : false;
  }
}
