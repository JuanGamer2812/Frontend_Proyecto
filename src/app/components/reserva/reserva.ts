import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { FormBuilder, FormGroup, FormArray, Validators, AbstractControl, ReactiveFormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../service/api.service';
import { InvitacionService } from '../../service/invitacion.service';
import { Pago } from '../pago/pago';
import { PdfViewerModal } from '../pdf-viewer-modal/pdf-viewer-modal';
import * as XLSX from 'xlsx';


interface Proveedor {
  id_proveedor: number;
  nombre: string;
  categoria: string;
  tipo?: string;
  precio_base?: number;
  imagenes?: string[];
  [key: string]: any;
}

interface Categoria {
  // `id` se mapea desde el backend al cargar categorías; mantener `id_categoria` por compatibilidad
  id?: number;
  id_categoria?: number;
  nombre: string;
  icono?: string;
}

@Component({
  selector: 'app-reserva',
  standalone: true,
  imports: [CommonModule,         // Para *ngIf, *ngFor, ngClass, pipes, etc.
    FormsModule,          // Para ngModel
    ReactiveFormsModule,  // Para reactive forms
    DecimalPipe,          // Para el pipe number
    Pago,
    PdfViewerModal],
  templateUrl: './reserva.html',
  styleUrls: ['./reserva.css']
})
export class Reserva implements OnInit {
  private apiService = inject(ApiService);
  private invitacionService = inject(InvitacionService);
  private fb = inject(FormBuilder);
  private sanitizer = inject(DomSanitizer);
  private route = inject(ActivatedRoute);

  categorias = signal<Categoria[]>([]);
  planes: any[] = [];
  planSeleccionado = signal<any>(null); // Plan cargado desde la URL
  tiposProveedor: any[] = [];
  proveedoresPorCategoria = signal<Map<string, Proveedor[]>>(new Map());
  proveedoresPorTipo = signal<Map<string, Proveedor[]>>(new Map());
  proveedoresAll: Proveedor[] = [];
  // cache por plan para soportar selección por-proveedor sin perder otras listas
  private proveedoresPorPlanCache: { [planId: string]: Proveedor[] } = {};
  maxImagenesPorProveedor = 6;
  loading = signal(false);
  submitting = signal(false);

  mostrarPago = signal(false);
  datosPagoGuardados: any = null;
  filasVisiblesInvitados = signal<number>(3);
  opcionesFilas = [3, 5, 10, 25, 50, 75, 100];
  spotifyEmbedUrl: SafeResourceUrl | null = null;
  mostrarInvitadosDrawer = signal<boolean>(true);

  proveedorCaracteristicas: any[][] = [];
  proveedorCaracteristicasEditable: any[][] = [];
  // Guarda los valores originales (por proveedor) para detectar cambios
  proveedorCaracteristicasOriginal: any[][] = [];
  // ahora guardamos objetos para preservar el id de la imagen (id_proveedor_imagen)
  proveedorImagenes: Array<Array<{ id: string | number; url: string }>> = [];
  proveedorEsLugar: boolean[] = [];
  proveedorDescripcion: string[] = [];
  private proveedorSubscriptions: Array<Subscription | null> = [];
  private miscSubscriptions: Subscription[] = [];
  private proveedorCache: { [id: number]: any } = {};

  form: FormGroup;

  constructor() {
    this.form = this.fb.group({
      nombre_evento: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      cedula_reservacion: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(15)]],
      id_categoria: ['', Validators.required],
      descripcion_evento: ['', Validators.required],
      fecha_inicio_evento: ['', Validators.required],
      fecha_fin_evento: ['', Validators.required],
      id_plan: [''],
      hay_playlist_evento: [false],
      playlist_evento: [''],
      proveedoresSeleccionados: this.fb.array([]),
      invitados: this.fb.array([])
    });
    
  }

  loadCaracteristicasParaIndex(index: number): void {
    const grupo = this.proveedoresArray.at(index);
    if (!grupo) return;
    const idTipo = grupo.get('id_tipo')?.value || (grupo.get('categoria')?.value ? this.resolveTipoIdFromCategoria(grupo.get('categoria')?.value) : null);
    if (!idTipo) return;
    const idProv = grupo.get('id_proveedor')?.value;

    // Cargamos las características del tipo y (si se indica) los valores del proveedor
    this.apiService.getCaracteristicasByTipo(idTipo).subscribe((list: any[]) => {
      const baseList = (list || []).map(c => ({
        id_caracteristica: c.id_caracteristica || c.id,
        nombre: c.nombre,
        tipo: c.tipo_valor || c.tipo || 'texto',
        obligatorio: !!c.obligatorio,
        opciones: c.opciones || null,
        valorProveedor: null,
        valorUsuario: (c.tipo_valor === 'booleano' || c.tipo === 'booleano') ? false : (c.tipo_valor === 'numero' || c.tipo === 'numero' ? 0 : '')
      }));

      if (!idProv) {
        this.proveedorCaracteristicasEditable[index] = baseList;
        // almacenar originales
        this.proveedorCaracteristicasOriginal[index] = baseList.map((b: any) => ({ id_caracteristica: b.id_caracteristica, valor: b.valorUsuario }));
        return;
      }

      // Si hay proveedor, obtener sus valores y mezclarlos
      this.apiService.getProveedorCaracteristicasById(Number(idProv)).subscribe((valsRaw: any) => {
        // Normalizar respuesta del backend a un array para evitar errores cuando
        // el backend devuelve wrapper { proveedor, caracteristicas }, objeto paginado {data|rows},
        // o formas indexadas.
        let vals: any[] = [];
        if (Array.isArray(valsRaw)) {
          vals = valsRaw;
        } else if (valsRaw && typeof valsRaw === 'object') {
          // caso wrapper { proveedor, caracteristicas: [...] }
          if (Array.isArray((valsRaw as any).caracteristicas)) {
            vals = (valsRaw as any).caracteristicas;
          } else if (Array.isArray((valsRaw as any).data)) {
            vals = (valsRaw as any).data;
          } else if (Array.isArray((valsRaw as any).rows)) {
            vals = (valsRaw as any).rows;
          } else if (typeof (valsRaw as any).length === 'number' && (valsRaw as any).length > 0) {
            vals = Array.from(valsRaw as any);
          } else {
            // convertir a array de valores (por si viene como objeto indexado)
            vals = Object.values(valsRaw).filter(v => v != null);
          }
        } else {
          vals = [];
        }

        // Si la respuesta viene vacía, intentar usar la cache del proveedor (valores incluidos en getProveedorById)
        let valsToUse: any[] = vals;
        if ((!Array.isArray(valsToUse) || valsToUse.length === 0) && idProv && this.proveedorCache[Number(idProv)]) {
          valsToUse = this.proveedorCache[Number(idProv)].proveedor_caracteristica || this.proveedorCache[Number(idProv)].proveedor_caracteristicas || this.proveedorCache[Number(idProv)].caracteristicas || [];
        }

        const editList = baseList.map(b => {
          const v = (valsToUse || []).find((x: any) => Number(x.id_caracteristica || x.id) === Number(b.id_caracteristica));
          if (v) {
            if (b.tipo === 'numero') b.valorUsuario = v.valor_numero ?? v.valor ?? b.valorUsuario;
            else if (b.tipo === 'booleano' || b.tipo === 'boolean') b.valorUsuario = (v.valor_booleano ?? v.valor) === true;
            else b.valorUsuario = v.valor_texto ?? v.valor ?? b.valorUsuario;
            b.valorProveedor = v; // mantener referencia al valor original del proveedor
          }
          return b;
        });
        this.proveedorCaracteristicasEditable[index] = editList;
        // Guardar originales para detectar cambios del usuario (solo persistir si cambió)
        this.proveedorCaracteristicasOriginal[index] = editList.map((e: any) => ({ id_caracteristica: e.id_caracteristica, valor: e.valorProveedor != null ? (e.tipo === 'numero' ? Number(e.valorProveedor.valor_numero ?? e.valorProveedor.valor) : (e.tipo === 'booleano' ? !!(e.valorProveedor.valor_booleano ?? e.valorProveedor.valor) : (e.valorProveedor.valor_texto ?? e.valorProveedor.valor ?? '')) ) : e.valorUsuario }));
      }, () => {
        // si falla obtener valores del proveedor desde el endpoint, intentar usar valores incluidos en la cache del proveedor
        const cached = idProv ? this.proveedorCache[Number(idProv)] : null;
        if (cached) {
          const provVals = cached.proveedor_caracteristica || cached.proveedor_caracteristicas || cached.caracteristicas || [];
          const editList = baseList.map(b => {
            const v = (provVals || []).find((x: any) => Number(x.id_caracteristica || x.id) === Number(b.id_caracteristica));
            if (v) {
              if (b.tipo === 'numero') b.valorUsuario = v.valor_numero ?? v.valor ?? b.valorUsuario;
              else if (b.tipo === 'booleano' || b.tipo === 'boolean') b.valorUsuario = (v.valor_booleano ?? v.valor) === true;
              else b.valorUsuario = v.valor_texto ?? v.valor ?? b.valorUsuario;
              b.valorProveedor = v;
            }
            return b;
          });
          this.proveedorCaracteristicasEditable[index] = editList;
          this.proveedorCaracteristicasOriginal[index] = editList.map((e: any) => ({ id_caracteristica: e.id_caracteristica, valor: e.valorProveedor != null ? (e.tipo === 'numero' ? Number(e.valorProveedor.valor_numero ?? e.valorProveedor.valor) : (e.tipo === 'booleano' ? !!(e.valorProveedor.valor_booleano ?? e.valorProveedor.valor) : (e.valorProveedor.valor_texto ?? e.valorProveedor.valor ?? '')) ) : e.valorUsuario }));
        } else {
          // fallback: usar la lista base sin valores del proveedor
          this.proveedorCaracteristicasEditable[index] = baseList;
          this.proveedorCaracteristicasOriginal[index] = baseList.map((b: any) => ({ id_caracteristica: b.id_caracteristica, valor: b.valorUsuario }));
        }
      });
    }, () => {});
  }

  private resolveTipoIdFromCategoria(catName: string): number | null {
    if (!catName) return null;
    const found = (this.tiposProveedor || []).find((t: any) => String(t.nombre).toLowerCase() === String(catName).toLowerCase());
    return found ? found.id_tipo : null;
  }

  // Detectar si característica es tipo archivo/URL (contiene "PDF" o "URL" en nombre)
  esCaracteristicaFileUrl(car: any): boolean {
    const texto = `${car?.nombre || ''} ${car?.descripcion || ''}`.toUpperCase();
    return texto.includes('PDF') || texto.includes('URL');
  }

  // Modal PDF viewer signals
  showPdfModal = signal(false);
  pdfModalUrl = signal('');
  pdfModalFileName = signal('');

  abrirPdfCaracteristica(url: string, nombre: string = 'Documento'): void {
    this.pdfModalUrl.set(url);
    this.pdfModalFileName.set(nombre);
    this.showPdfModal.set(true);
  }

  cerrarPdfModal(): void {
    this.showPdfModal.set(false);
    this.pdfModalUrl.set('');
    this.pdfModalFileName.set('');
  }

  ngOnInit(): void {
    this.cargarCategorias();
    this.apiService.getPlanes().subscribe(planes => this.planes = planes);
    this.apiService.getTiposProveedor().subscribe(tipos => this.tiposProveedor = tipos);

    // Leer query param id_plan del catálogo y cargar evento del administrador
    this.route.queryParams.subscribe(params => {
      const idPlanFromUrl = params['id_plan'];
      if (idPlanFromUrl) {
        const planId = Number(idPlanFromUrl);
        if (Number.isFinite(planId)) {
          this.form.get('id_plan')?.setValue(planId);
          
          // Cargar evento creado por Administrador asociado a este plan
          this.apiService.getEventoByPlan(planId).subscribe({
            next: (evento) => {
              // NO guardar el id_evento porque esto es solo una plantilla
              this.planSeleccionado.set(evento);
              // Precargar los datos del evento en el formulario (sin id_evento)
              this.form.patchValue({
                nombre_evento: evento.nombre_evento,
                descripcion_evento: evento.descripcion_evento,
                fecha_inicio_evento: evento.fecha_inicio_evento,
                fecha_fin_evento: evento.fecha_fin_evento,
                id_categoria: evento.id_categoria,
                hay_playlist_evento: evento.hay_playlist_evento,
                playlist_evento: evento.playlist_evento
              });
              
              // Cargar proveedores asociados al evento (como plantilla)
              this.apiService.getProveedoresByEvento(evento.id_evento).subscribe({
                next: (proveedores) => {
                  this.cargarProveedoresDelEvento(proveedores);
                },
                error: (err) => {
                  console.error('Error al cargar proveedores:', err);
                }
              });
            },
            error: (err) => {
              console.log('No hay evento de administrador para este plan, creando uno nuevo');
            }
          });
        }
      }
    });

    // Si quieres cargar proveedores por plan, hazlo en onPlanSeleccionado()
    // Actualizar embed de Spotify cuando cambie el input
    const playlistCtrl = this.form.get('playlist_evento');
    if (playlistCtrl) {
      const sub = playlistCtrl.valueChanges.subscribe(() => this.actualizarSpotifyEmbed());
      this.miscSubscriptions.push(sub);
    }
  }

  get proveedoresArray(): FormArray {
    return this.form.get('proveedoresSeleccionados') as FormArray;
  }

  get invitadosArray(): FormArray {
    return this.form.get('invitados') as FormArray;
  }

  get planesVisibles(): any[] {
    return (this.planes || []).filter(p => {
      const idPlan = Number((p as any).id_plan ?? (p as any).id);
      const nombre = String((p as any).nombre_plan ?? (p as any).nombre ?? '').toLowerCase();
      if (Number.isFinite(idPlan) && idPlan === 4) return false;
      if (nombre.includes('personalizado')) return false;
      return true;
    });
  }

  agregarProveedor(cat: Categoria): void {
    // prevenir agregar si la categoría está deshabilitada (ya existe LUGAR/DECORACION)
    if (this.isAgregarDisabled(cat)) return;
    const planId = this.form.get('id_plan')?.value;
    // Permitir agregar proveedor aun si no hay un plan global seleccionado.

    const grupo = this.fb.group({
      categoria: [cat.nombre],
      id_proveedor: ['', Validators.required],
      id_tipo: [ (cat as any).id_tipo || '', Validators.required],
      id_plan: [ this.form.get('id_plan')?.value || '', Validators.required ],
      fecha_inicio_evento: [''],
      fecha_fin_evento: ['']
    });
    this.proveedoresArray.push(grupo);

    // Inicializa arrays para características e imágenes
    this.proveedorCaracteristicas.push([]);
    this.proveedorCaracteristicasEditable.push([]);
    this.proveedorImagenes.push([]);
    this.proveedorDescripcion.push('');
    this.proveedorEsLugar.push(false);
    this.proveedorSubscriptions.push(null);
    // suscribirse a cambios en id_proveedor para cargar automáticamente imágenes y detalles
    const index = this.proveedoresArray.length - 1;
    const control = grupo.get('id_proveedor');
    if (control) {
      const sub = control.valueChanges.subscribe((val: any) => {
        if (val) {
          this.onProveedorSeleccionado(index);
        } else {
          // limpiar si se deselecciona
          this.proveedorCaracteristicas[index] = [];
          this.proveedorCaracteristicasEditable[index] = [];
          this.proveedorImagenes[index] = [];
          this.proveedorEsLugar[index] = false;
        }
      });
      this.proveedorSubscriptions[index] = sub;
    }
    // Preseleccionar fechas del evento en el proveedor (evita pedirlas de nuevo)
    const fechaInicioEvento = this.form.get('fecha_inicio_evento')?.value;
    const fechaFinEvento = this.form.get('fecha_fin_evento')?.value;
    if (fechaInicioEvento) grupo.get('fecha_inicio_evento')?.setValue(fechaInicioEvento);
    if (fechaFinEvento) grupo.get('fecha_fin_evento')?.setValue(fechaFinEvento);
    // No cargar características ni imágenes aquí: hacerlo únicamente cuando
    // se seleccione un proveedor para evitar precargar datos al escoger sólo
    // la categoría/tipo.

  }

  eliminarProveedor(index: number): void {
    // capturar categoría antes de eliminar
    const removedCategoria = String((this.proveedoresArray.at(index)?.get('categoria')?.value) || '').trim();
    const key = this.normalizeCategoria(removedCategoria);
    const sub = this.proveedorSubscriptions[index];
    if (sub) {
      sub.unsubscribe();
    }
    this.proveedorSubscriptions.splice(index, 1);
    this.proveedoresArray.removeAt(index);
    this.proveedorCaracteristicas.splice(index, 1);
    this.proveedorCaracteristicasEditable.splice(index, 1);
    this.proveedorDescripcion.splice(index, 1);
    this.proveedorImagenes.splice(index, 1);
    this.proveedorEsLugar.splice(index, 1);
    // Si removimos un LUGAR o DECORACION, permitir volver a agregar esa categoría si ya no existe
    if (key === 'LUGAR' || key === 'DECORACION') {
      const exists = this.proveedoresArray.controls.some(g => this.normalizeCategoria(g.get('categoria')?.value) === key);
      if (!exists) this.setCategoriaDisabledByKey(key, false);
    }
  }

  onProveedorPlanChange(index: number): void {
    const grp = this.proveedoresArray.at(index);
    if (!grp) return;
    const planId = grp.get('id_plan')?.value;
    // Actualizar mapas para que el filtrado por plan se aplique inmediatamente
    try {
      if (!planId) {
        // Si se deseleccionó el plan, eliminar cache para este plan (si existiera) y recomputar
        // No conocemos el plan previo aquí, así que recomputar usando cache existente
        this.recomputeProveedoresAllFromCache();
        this.actualizarMapProveedores();
        return;
      }
      const key = String(planId);
      // Si ya tenemos cache para este plan, usarla
      if (this.proveedoresPorPlanCache[key] && this.proveedoresPorPlanCache[key].length > 0) {
        this.recomputeProveedoresAllFromCache();
        this.actualizarMapProveedores(planId);
        return;
      }

      // Consultar al backend los proveedores para este plan y almacenarlos en cache.
      this.apiService.getProveedoresPorPlan(planId).subscribe((provs: any[]) => {
        this.proveedoresPorPlanCache[key] = provs || [];
        this.recomputeProveedoresAllFromCache();
        this.actualizarMapProveedores(planId);
      }, err => {
        console.error('Error al obtener proveedores por plan (onProveedorPlanChange):', err);
        // fallback: intentar obtener todos los proveedores aprobados
        this.apiService.getProveedoresAprobados().subscribe((all: any[]) => {
          this.proveedoresPorPlanCache[key] = (all || []);
          this.recomputeProveedoresAllFromCache();
          this.actualizarMapProveedores();
        }, () => {
          // si falla, simplemente recomputar con lo que haya en cache
          this.recomputeProveedoresAllFromCache();
          this.actualizarMapProveedores();
        });
      });
    } catch (e) { /* ignore */ }
  }

  private recomputeProveedoresAllFromCache(): void {
    const seen = new Set<string>();
    const union: Proveedor[] = [];
    for (const k of Object.keys(this.proveedoresPorPlanCache)) {
      const arr = this.proveedoresPorPlanCache[k] || [];
      for (const p of arr) {
        const id = String((p as any).id_proveedor || (p as any)['id'] || '');
        if (!id) continue;
        if (!seen.has(id)) {
          seen.add(id);
          union.push(p);
        }
      }
    }
    this.proveedoresAll = union;
  }

  onPlanSeleccionado(): void {
    const planId = this.form.get('id_plan')?.value;
    // Limpia los proveedores seleccionados si cambia el plan
    while (this.proveedoresArray.length > 0) {
      this.eliminarProveedor(0);
    }

    if (!planId) {
      this.proveedoresAll = [];
      this.proveedoresPorCategoria.set(new Map());
      return;
    }

    // Cargar desde backend solo los proveedores del plan seleccionado
    this.apiService.getProveedoresPorPlan(planId).subscribe(provs => {
      console.log('getProveedoresPorPlan response:', provs);
      this.proveedoresAll = provs || [];
      this.actualizarMapProveedores(planId);
      console.log('proveedoresPorTipo map keys:', Array.from(this.proveedoresPorTipo().keys()));
    }, err => {
      console.error('Error al obtener proveedores por plan:', err);
      // fallback: cargar todos los proveedores si falla la consulta por plan
      this.apiService.getProveedoresAprobados().subscribe((all: any[]) => {
        console.log('getProveedores (fallback) response:', all);
        this.proveedoresAll = all || [];
        this.actualizarMapProveedores();
      });
    });
  }

  getProveedoresPorCategoriaYPlan(categoria: string, index?: number): Proveedor[] {
    // Determinar plan a usar: si se especificó un índice de proveedor, usar su id_plan local;
    // si no, usar el plan global del formulario. Si no hay plan, no filtrar por plan.
    let planId = this.form.get('id_plan')?.value;
    if (typeof index === 'number') {
      const grp = this.proveedoresArray.at(index);
      if (grp) {
        const localPlan = grp.get('id_plan')?.value;
        if (localPlan) planId = localPlan;
      }
    }
    const usePlanFilter = !!planId;
    const pid = usePlanFilter ? String(planId) : '';
    // Filtra proveedoresAll por plan seleccionado (solo si hay información de plan en proveedores)
    let filteredByPlan = (this.proveedoresAll || []).filter(p => {
      if (!usePlanFilter) return true;
      if (p.hasOwnProperty('id_plan') && p['id_plan'] != null) return String(p['id_plan']) === pid;
      if (p.hasOwnProperty('id_planes') && Array.isArray(p['id_planes'])) return p['id_planes'].map((x: any) => String(x)).includes(pid);
      if (p.hasOwnProperty('planes') && Array.isArray(p['planes'])) return p['planes'].map((x: any) => String(x)).includes(pid);
      if (p.hasOwnProperty('plan') && p['plan'] != null) return String(p['plan']) === pid;
      return true; // fallback: permitir si no hay info de plan
    });

    // Si se filtró por plan pero no hay resultados, relajar el filtro mostrando todos los proveedores
    // de la misma categoría (menos restrictivo)
    if (usePlanFilter && Array.isArray(filteredByPlan) && filteredByPlan.length === 0 && categoria) {
      const catKey = this.normalizeCategoria(categoria as string);
      filteredByPlan = (this.proveedoresAll || []).filter(p => this.normalizeCategoria(p.categoria || p['nombre_categoria'] || p['tipo'] || p['nombre_tipo'] || '') === catKey);
    }

    // Determinar el tipo seleccionado: si el formGroup tiene id_tipo, usarlo; si no, intentar resolver por el nombre pasado como 'categoria' (cuando usamos botones de tipo)
    let tipoSeleccionado: any = null;
    if (typeof index === 'number') {
      tipoSeleccionado = this.proveedoresArray.at(index).get('id_tipo')?.value || null;
    }
    if (!tipoSeleccionado && categoria) {
      // intentar resolver nombre de tipo a id_tipo
      const found = (this.tiposProveedor || []).find((t: any) => String(t.nombre).toLowerCase() === String(categoria).toLowerCase());
      if (found) tipoSeleccionado = found.id_tipo;
    }

    // Si hay tipo seleccionado, intentar usar el mapa por tipo para rendimiento
    let filtered: Proveedor[] = filteredByPlan;
    if (tipoSeleccionado) {
      let byTipo = this.proveedoresPorTipo().get(String(tipoSeleccionado));
      // intentar por nombre de tipo (lowercase key) si no hay resultado
      if ((!byTipo || byTipo.length === 0) && typeof tipoSeleccionado === 'string') {
        byTipo = this.proveedoresPorTipo().get(String(tipoSeleccionado).toLowerCase());
      }
      if (byTipo && byTipo.length > 0) {
        const ids = new Set(byTipo.map(p => String(p.id_proveedor)));
        filtered = filteredByPlan.filter(p => ids.has(String(p.id_proveedor)));
      } else {
        filtered = filteredByPlan.filter(p => String(p['id_tipo']) === String(tipoSeleccionado) || String(p.tipo || p['nombre_tipo'] || '').toLowerCase() === String(tipoSeleccionado).toLowerCase());
      }
    }
    return filtered;
  }

  private actualizarMapProveedores(planId?: number | string | null): void {
    const usePlanFilter = planId !== null && planId !== undefined;
    const pid = usePlanFilter ? String(planId) : '';
    const map = new Map<string, Proveedor[]>();
    const tipoMap = new Map<string, Proveedor[]>();
    const hasPlanInfo = (this.proveedoresAll || []).some(p => p.hasOwnProperty('id_plan') || p.hasOwnProperty('id_planes') || p.hasOwnProperty('planes') || p.hasOwnProperty('plan'));
    (this.proveedoresAll || []).forEach(p => {
      // filtrar por plan solo si al menos un proveedor tiene info de plan
      const matchesPlan = (() => {
        if (!hasPlanInfo || !usePlanFilter) return true; // fallback: permitir todos si no hay info de plan o no se quiere filtrar por plan
        if (p.hasOwnProperty('id_plan') && p['id_plan'] != null) return String(p['id_plan']) === pid;
        if (p.hasOwnProperty('id_planes') && Array.isArray(p['id_planes'])) return p['id_planes'].map(String).includes(pid as string);
        if (p.hasOwnProperty('planes') && Array.isArray(p['planes'])) return p['planes'].map((x: any) => String(x)).includes(pid as string);
        if (p.hasOwnProperty('plan') && p['plan'] != null) return String(p['plan']) === pid;
        return false;
      })();
      if (!matchesPlan) return;

      const rawCat = (p.categoria || p['nombre_categoria'] || p['tipo_categoria'] || p['nombre_tipo'] || p['tipo'] || 'OTRO') as string;
      const key = this.normalizeCategoria(rawCat);
      const lista = map.get(key) || [];
      lista.push(p);
      map.set(key, lista);
      // Mapear por tipo: crear entradas tanto por id_tipo (si existe) como por nombre_tipo/tipo
      const tipoIdKey = (p.hasOwnProperty('id_tipo') && p['id_tipo'] != null) ? String(p['id_tipo']) : null;
      const tipoNameRaw = String(p['nombre_tipo'] || p['tipo'] || '').trim();
      const tipoNameKey = tipoNameRaw ? tipoNameRaw.toLowerCase() : null;

      if (tipoIdKey) {
        const listaTipoId = tipoMap.get(tipoIdKey) || [];
        listaTipoId.push(p);
        tipoMap.set(tipoIdKey, listaTipoId);
      }
      if (tipoNameKey) {
        const listaTipoName = tipoMap.get(tipoNameKey) || [];
        listaTipoName.push(p);
        tipoMap.set(tipoNameKey, listaTipoName);
      }
    });
    this.proveedoresPorCategoria.set(map);
    this.proveedoresPorTipo.set(tipoMap);
  }

  onProveedorSeleccionado(index: number): void {
    const provGrp = this.proveedoresArray.at(index);
    const idProveedor = provGrp.get('id_proveedor')?.value;
    if (!idProveedor) return;

    // Cargar datos del proveedor
    this.apiService.getProveedorById(idProveedor).subscribe(prov => {
      // establecer descripción (campo libre en la tabla proveedor)
        let provObj: any = prov;
        let caracteristicasFromResp: any[] | null = null;
        if (prov && typeof prov === 'object' && prov.proveedor) {
          provObj = prov.proveedor;
          caracteristicasFromResp = prov.caracteristicas || prov.caracteristicas || prov.caracteristica || null;
        }
        const desc = provObj.descripcion || provObj.descripcion_proveedor || provObj.descripcion_evento || provObj.descripcion_corta || provObj.descripcion_larga || '';
      this.proveedorDescripcion[index] = desc;

        // Guardar en cache local para fallback (normalizar a estructura esperada)
        this.proveedorCache[Number(idProveedor)] = Object.assign({}, provObj, { proveedor_caracteristica: caracteristicasFromResp || provObj.proveedor_caracteristica || provObj.proveedor_caracteristicas || provObj.caracteristicas || [] });

        // Si el propio objeto ya incluye características (provObj) o vinieron en el wrapper, úsalas primero
        const provChars = (caracteristicasFromResp && Array.isArray(caracteristicasFromResp)) ? caracteristicasFromResp : (this.proveedorCache[Number(idProveedor)].proveedor_caracteristica || []);
        if (Array.isArray(provChars) && provChars.length > 0) {
          this.proveedorCaracteristicas[index] = provChars.map((r: any) => ({ nombre: r.nombre || r.nombre_caracteristica || r.caracteristica || '', tipo: r.tipo || r.tipo_valor || r.tipo_caracteristica || 'texto', valor: r.valor_texto ?? r.valor ?? r.valor_numero ?? r.valor_booleano ?? '' }));
        } else {
          // fallback: intentar desde la vista dedicada; si falla, usar la cache (que ya hay) o dejar vacío
          this.apiService.getCaracteristicasProveedor(Number(idProveedor)).subscribe((rawList: any) => {
            let list: any[] = [];
            if (Array.isArray(rawList)) list = rawList;
            else if (rawList && typeof rawList === 'object') {
              if (Array.isArray((rawList as any).data)) list = (rawList as any).data;
              else if (Array.isArray((rawList as any).rows)) list = (rawList as any).rows;
              else list = Object.values(rawList).filter(v => v != null);
            }
            this.proveedorCaracteristicas[index] = (list || []).map((r: any) => ({ nombre: r.nombre || r.nombre_caracteristica || r.caracteristica || '', tipo: r.tipo || r.tipo_valor || r.tipo_caracteristica || 'texto', valor: r.valor_texto ?? r.valor ?? r.valor_numero ?? r.valor_booleano ?? '' }));
          }, () => {
            // si incluso la vista falla, intentar extraer desde la cache (prov) ya guardada
            const cached = this.proveedorCache[Number(idProveedor)];
            if (cached) {
              const fallbackChars = cached.proveedor_caracteristica || cached.proveedor_caracteristicas || cached.caracteristicas || [];
              this.proveedorCaracteristicas[index] = (fallbackChars || []).map((r: any) => ({ nombre: r.nombre || r.nombre_caracteristica || r.caracteristica || '', tipo: r.tipo || r.tipo_valor || r.tipo_caracteristica || 'texto', valor: r.valor_texto ?? r.valor ?? r.valor_numero ?? r.valor_booleano ?? '' }));
            } else {
              this.proveedorCaracteristicas[index] = [];
            }
          });
        }
      // Construir lista de imágenes aceptando varias formas que el backend puede devolver
      const imgs: Array<{ id?: any; url?: any }> = [];
      // Priorizar imágenes que vienen de la relación `proveedor_imagen` (BD)
      const dbImgs: Array<{ id?: any; url?: any }> = [];
      if (Array.isArray(prov.proveedor_imagen) && prov.proveedor_imagen.length) {
        prov.proveedor_imagen.forEach((it: any) => {
          const idImg = it?.id_proveedor_imagen ?? it?.id ?? (`provimg-${Math.random().toString(36).slice(2,8)}`);
          const u = it?.url_imagen || it?.ruta || it?.url || it?.path || '';
          dbImgs.push({ id: idImg, url: u });
        });
      }

      // Recoger posibles formas legacy (array de imágenes o campos planos), pero los añadiremos
      // solo si su URL no coincide con alguna URL ya incluida desde la BD.
      const legacyImgs: Array<{ id?: any; url?: any }> = [];
      if (Array.isArray(prov.imagenes) && prov.imagenes.length) {
        prov.imagenes.forEach((it: any, idx: number) => legacyImgs.push({ id: `legacy-array-${idx}`, url: typeof it === 'string' ? it : (it?.ruta || it?.url || it?.path || '') }));
      }
      ['imagen_proveedor', 'imagen1_proveedor', 'imagen2_proveedor', 'imagen3_proveedor'].forEach((k, idx) => {
        if (prov[k]) legacyImgs.push({ id: `legacy-field-${idx}`, url: prov[k] });
      });

      const normalizeUrl = (u: string) => {
        const s = (typeof u === 'string' ? u : String(u || '')).trim();
        if (!s) return '';
        if (/^https?:\/\//i.test(s)) return s;
        if (s.startsWith('/')) return window.location.origin + s;
        return window.location.origin + '/' + s;
      };

      // Normalizar DB imgs first (permitir múltiples filas DB incluso con misma URL)
      const uniqueOrdered: Array<{ id: string | number; url: string }> = [];
      const dbUrls = new Set<string>();
      for (const o of dbImgs) {
        const url = normalizeUrl(o.url);
        if (url) {
          uniqueOrdered.push({ id: o.id ?? url, url });
          dbUrls.add(url);
        }
        if (uniqueOrdered.length >= this.maxImagenesPorProveedor) break;
      }

      // Añadir legacy sólo si su URL no está ya en dbUrls
      for (const o of legacyImgs) {
        if (uniqueOrdered.length >= this.maxImagenesPorProveedor) break;
        const url = normalizeUrl(o.url);
        if (!url) continue;
        if (dbUrls.has(url)) continue; // evitar duplicar una URL ya provista por la BD
        uniqueOrdered.push({ id: o.id ?? url, url });
      }

      this.proveedorImagenes[index] = uniqueOrdered.slice(0, this.maxImagenesPorProveedor);
      this.proveedorEsLugar[index] = (String(prov.tipo || prov.nombre_tipo || prov['categoria'] || '').toLowerCase() === 'lugar');
      // Si la categoría de este grupo es LUGAR o DECORACION, deshabilitar el botón de agregar para esa categoría
      const grupoCat = provGrp.get('categoria')?.value || '';
      const key = this.normalizeCategoria(grupoCat);
      if (key === 'LUGAR' || key === 'DECORACION') {
        this.setCategoriaDisabledByKey(key, true);
      }
      // Cargar y mezclar las características editables (incluye valores del proveedor)
      this.loadCaracteristicasParaIndex(index);
    }, err => {
      console.error('Error al obtener proveedor por id:', err);
      this.proveedorCaracteristicas[index] = [];
      this.proveedorCaracteristicasEditable[index] = [];
      this.proveedorImagenes[index] = [];
      this.proveedorEsLugar[index] = false;
      this.proveedorDescripcion[index] = '';
    });
  }

  placeholders(count: number): any[] {
    return new Array(Math.max(0, count));
  }

  onTipoSeleccionado(index: number): void {
    const provGrp = this.proveedoresArray.at(index);
    // Al cambiar el tipo, limpiar la selección de proveedor y datos dependientes
    provGrp.get('id_proveedor')?.setValue('');
    this.proveedorCaracteristicas[index] = [];
    this.proveedorCaracteristicasEditable[index] = [];
    this.proveedorImagenes[index] = [];
    this.proveedorEsLugar[index] = false;
  }

  agregarInvitado(): void {
    this.invitadosArray.push(this.fb.group({
      nombre: ['', Validators.required],
      email: [''],
      telefono: [''],
      acompanantes: [0],
      notas: ['']
    }));
  }

  eliminarInvitado(index: number): void {
    this.invitadosArray.removeAt(index);
  }

  get totalPersonasInvitadas(): number {
    return this.invitadosArray.controls.reduce((acc, grp) => {
      const acomp = Number(grp.get('acompanantes')?.value) || 0;
      return acc + 1 + acomp;
    }, 0);
  }

  get subtotal(): number {
    // Calcula el subtotal: suma de precios de proveedores seleccionados.
    // - Para CATERING: precio (precio_acordado o precio_base) * totalPersonasInvitadas
    // - Para otros proveedores: precio (precio_acordado o precio_base) una sola vez
    let total = 0;
    const totalGuests = Math.max(0, this.totalPersonasInvitadas);
    for (let i = 0; i < this.proveedoresArray.length; i++) {
      const g = this.proveedoresArray.at(i);
      if (!g) continue;
      const idProvRaw = g.get('id_proveedor')?.value;
      const idProv = idProvRaw ? Number(idProvRaw) : undefined;
      if (!idProv) continue;

      const calc = this.getPrecioAplicadoForIndex(i, totalGuests);
      total += calc.precioAplicado;
    }
    // Cargar cargo fijo: 25 por cada proveedor seleccionado
    const countSelected = this.proveedoresArray.controls.filter(g => !!g.get('id_proveedor')?.value).length;
    if (countSelected > 0) {
      total += 25 * countSelected;
    }
    return Number(Number.isFinite(total) ? total : 0);
  }

  // Intenta resolver el precio base de un proveedor consultando: proveedoresAll, proveedorCache y mapas
  private getPrecioProveedor(idProveedor: number): number | undefined {
    try {
      // buscar en la lista cargada
      const prov = (this.proveedoresAll || []).find(p => Number(p.id_proveedor) === Number(idProveedor));
      const candidates: any[] = [];
      if (prov) candidates.push(prov);
      // buscar en cache
      const cached = this.proveedorCache[Number(idProveedor)];
      if (cached) candidates.push(cached);
      // intentar buscar en mapas por id
      for (const map of [this.proveedoresPorCategoria(), this.proveedoresPorTipo()]) {
        for (const [, arr] of map.entries()) {
          const f = (arr || []).find((x: any) => Number(x.id_proveedor) === Number(idProveedor));
          if (f) candidates.push(f);
        }
      }
      const priceKeysPriority = ['precio_acordado','precio_base','precio','precio_evento','precio_unitario','precio_por_persona','precio_persona','valor','valor_unitario','costo','tarifa','rate','price'];
      const tryExtract = (obj: any): number | undefined => {
        if (!obj || typeof obj !== 'object') return undefined;
        // comprobar claves directas en orden
        for (const k of priceKeysPriority) {
          if (Object.prototype.hasOwnProperty.call(obj, k) && obj[k] != null) {
            const v = this.parseNumberSafe(obj[k]);
            if (typeof v === 'number' && !isNaN(v)) return v;
          }
        }
        // comprobar claves comunes en mayúsculas/minúsculas
        for (const key of Object.keys(obj)) {
          const lk = String(key).toLowerCase();
          if (lk.includes('precio') || lk.includes('valor') || lk.includes('costo') || lk.includes('tarifa') || lk.includes('price')) {
            const v = this.parseNumberSafe(obj[key]);
            if (typeof v === 'number' && !isNaN(v)) return v;
          }
        }
        // buscar en propiedades anidadas típicas
        if (obj.plan && typeof obj.plan === 'object') {
          const v = tryExtract(obj.plan);
          if (v) return v;
        }
        if (Array.isArray(obj.planes) && obj.planes.length > 0) {
          for (const p of obj.planes) {
            const v = tryExtract(p);
            if (v) return v;
          }
        }
        if (Array.isArray(obj.id_planes) && obj.id_planes.length > 0 && Array.isArray(obj.planes) && obj.planes.length === obj.id_planes.length) {
          for (const p of obj.planes) {
            const v = tryExtract(p);
            if (v) return v;
          }
        }
        return undefined;
      };

      for (const c of candidates) {
        if (!c) continue;
        const parsed = tryExtract(c);
        if (typeof parsed === 'number' && !isNaN(parsed)) return parsed;
      }
    } catch (e) {}
    return undefined;
  }

  private parseNumberSafe(v: any): number | undefined {
    if (v === null || v === undefined || v === '') return undefined;
    if (typeof v === 'number') return v;
    try {
      const s = String(v).replace(/[^0-9,\.\-]/g, '');
      // sustituir coma decimal si es el separador
      const commaCount = (s.match(/,/g) || []).length;
      const dotCount = (s.match(/\./g) || []).length;
      let normalized = s;
      if (commaCount > 0 && dotCount === 0) normalized = s.replace(/,/g, '.');
      else if (commaCount > 0 && dotCount > 0 && s.lastIndexOf(',') > s.lastIndexOf('.')) {
        // formato europeo 1.234,56 -> eliminar puntos y cambiar coma
        normalized = s.replace(/\./g, '').replace(/,/g, '.');
      } else {
        normalized = s.replace(/,/g, '');
      }
      const n = parseFloat(normalized);
      return isNaN(n) ? undefined : n;
    } catch (e) { return undefined; }
  }

  // Calcula el precio aplicado por proveedor en el índice dado.
  // Devuelve objeto con precioAplicado (number) e invitadosACobrar (number)
  private getPrecioAplicadoForIndex(index: number, totalGuests?: number): { precioAplicado: number; invitadosACobrar: number } {
    try {
      const g = this.proveedoresArray.at(index);
      if (!g) return { precioAplicado: 0, invitadosACobrar: 0 };
      const idProvRaw = g.get('id_proveedor')?.value;
      const idProv = idProvRaw ? Number(idProvRaw) : undefined;
      if (!idProv) return { precioAplicado: 0, invitadosACobrar: 0 };
      const precioUnit = this.getPrecioProveedor(idProv) || 0;
      const provObj = (this.proveedoresAll || []).find(p => Number(p.id_proveedor) === Number(idProv));
      const categoriaRaw = String(g.get('categoria')?.value || provObj?.categoria || provObj?.['nombre_categoria'] || provObj?.tipo || '').trim();
      const catNorm = this.normalizeCategoria(categoriaRaw);
      const guests = (typeof totalGuests === 'number' && Number.isFinite(totalGuests)) ? totalGuests : Math.max(0, this.totalPersonasInvitadas);
      if (catNorm === 'CATERING') {
        const platosIncluidos = this.getPlatosIncluidosForIndex(index);
        const invitadosACobrar = (platosIncluidos != null && Number.isFinite(platosIncluidos)) ? Math.min(guests, platosIncluidos as number) : guests;
        const precioAplicado = Number(Number(precioUnit * invitadosACobrar).toFixed(2));
        return { precioAplicado, invitadosACobrar };
      }
      const precioAplicado = Number(Number(precioUnit).toFixed(2));
      return { precioAplicado, invitadosACobrar: 0 };
    } catch (e) {
      return { precioAplicado: 0, invitadosACobrar: 0 };
    }
  }

  // Mostrar alerta bonita usando SweetAlert2 (import dinámico)
  private async showSweetAlert(icon: 'success' | 'error' | 'warning' | 'info' | 'question', title: string, text?: string): Promise<any> {
    try {
      const Swal = (await import('sweetalert2')).default;
      return Swal.fire({ icon, title, text });
    } catch (e) {
      // fallback a alert si SweetAlert no está disponible
      try { alert(title + (text ? '\n\n' + text : '')); } catch (e) {}
      return Promise.resolve(undefined);
    }
  }

  // Extrae el número de "platos incluidos" para el proveedor en el índice dado (si existe)
  private getPlatosIncluidosForIndex(index: number): number | null {
    try {
      const editableList = this.proveedorCaracteristicasEditable[index] || [];
      if (!Array.isArray(editableList)) return null;
      for (const c of editableList) {
        const name = String(c.nombre || '').toLowerCase();
        if (name.includes('plato') || name.includes('platos') || name.includes('cantidad')) {
          const raw = c.valorUsuario ?? c.valorProveedor?.valor_numero ?? c.valorProveedor?.valor ?? c.valorProveedor?.valor_texto ?? null;
          const val = Number(raw);
          if (!isNaN(val) && val >= 0) return Math.floor(val);
        }
      }
    } catch (e) {}
    return null;
  }

  get iva(): number {
    return this.subtotal * 0.15;
  }

  get totalEstimado(): number {
    return this.subtotal + this.iva;
  }

  isInvalid(name: string): boolean {
    const ctrl = this.form.get(name);
    return !!ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }

  actualizarSpotifyEmbed(): void {
    const url = this.form.get('playlist_evento')?.value;
    if (!url) {
      this.spotifyEmbedUrl = null;
      return;
    }
    // Extrae el ID de la playlist y arma el embed
    const match = url.match(/(?:playlist\/|embed\/playlist\/)([a-zA-Z0-9]+)/);
    const playlistId = match ? match[1] : null;
    if (playlistId) {
      this.spotifyEmbedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(`https://open.spotify.com/embed/playlist/${playlistId}`);
    } else {
      this.spotifyEmbedUrl = null;
    }
  }

  abrirModalPago(): void {
    this.mostrarPago.set(true);
  }

  cerrarModalPago(): void {
    this.mostrarPago.set(false);
  }

  onPagoCompletado(resultado: any): void {
    // Lógica para guardar la reserva con el resultado del pago
    // Guardar resultado del pago y proceder a crear registros en backend
    this.datosPagoGuardados = resultado;
    this.cerrarModalPago();
    // Evitar envíos duplicados
    try { this.onSubmit(); } catch (e) { console.error('Error al iniciar submit después del pago', e); }
  }

  onPagoCancelado(): void {
    this.cerrarModalPago();
  }

  async onSubmit(): Promise<void> {
    if (this.submitting && (this.submitting as any)() ) { return; }
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    // Validar rango de fechas: fecha_fin debe ser posterior a fecha_inicio
    const inicioVal = this.form.get('fecha_inicio_evento')?.value;
    const finVal = this.form.get('fecha_fin_evento')?.value;
    if (inicioVal && finVal) {
      const dInicio = new Date(inicioVal);
      const dFin = new Date(finVal);
      if (!(dFin > dInicio)) {
        await this.showSweetAlert('warning', 'Fechas inválidas', 'La fecha/hora de fin debe ser posterior a la fecha/hora de inicio. Corrige las fechas antes de continuar.');
        return;
      }
    }
    // Validar que el número total de invitados no exceda los "platos incluidos" de ningún proveedor CATERING
    const totalGuests = Math.max(0, this.totalPersonasInvitadas);
    for (let i = 0; i < this.proveedoresArray.length; i++) {
      const g = this.proveedoresArray.at(i);
      if (!g) continue;
      const idProvRaw = g.get('id_proveedor')?.value;
      const idProv = idProvRaw ? Number(idProvRaw) : undefined;
      if (!idProv) continue;
      const provObj = (this.proveedoresAll || []).find(p => Number(p.id_proveedor) === Number(idProv));
      const categoriaRaw = String(g.get('categoria')?.value || provObj?.categoria || provObj?.['nombre_categoria'] || provObj?.tipo || '').trim();
      const catNorm = this.normalizeCategoria(categoriaRaw);
      if (catNorm === 'CATERING') {
        const platosIncluidos = this.getPlatosIncluidosForIndex(i);
        if (platosIncluidos != null && totalGuests > platosIncluidos) {
          const nombreProv = provObj?.nombre || provObj?.['nombre_proveedor'] || `Proveedor en posición ${i+1}`;
          await this.showSweetAlert('warning', 'Límite de platos excedido', `El proveedor "${nombreProv}" tiene ${platosIncluidos} platos incluidos pero hay ${totalGuests} invitados. Reduce invitados o ajusta la característica "platos incluidos" antes de continuar.`);
          return;
        }
      }
    }
    this.submitting.set(true);
    const payloadEvento = {
      nombre_evento: this.form.get('nombre_evento')?.value,
      descripcion_evento: this.form.get('descripcion_evento')?.value,
      fecha_inicio_evento: this.form.get('fecha_inicio_evento')?.value,
      fecha_fin_evento: this.form.get('fecha_fin_evento')?.value,
      precio_evento: this.totalEstimado,
      hay_playlist_evento: !!this.form.get('hay_playlist_evento')?.value,
      playlist_evento: this.form.get('playlist_evento')?.value,
      creado_por: 'Usuario',
      id_usuario_creador: 1,
      id_plan: Number(this.form.get('id_plan')?.value),
      id_categoria: (() => { const v = this.form.get('id_categoria')?.value; const n = Number(v); return Number.isFinite(n) ? n : null; })(),
      tipoEvento: (() => {
        const sel = String(this.form.get('id_categoria')?.value || '');
        const found = (this.categorias() || []).find((c: any) => String(c.id) === sel || String(c.id) === String(Number(sel)));
        return found ? found.nombre : (this.form.get('id_categoria')?.value || null);
      })(),
      cedula_reservacion: this.form.get('cedula_reservacion')?.value,
      numero_invitados: this.totalPersonasInvitadas
    };

    console.log('Crear reserva (evento+reservacion) payload base:', payloadEvento);

    // Construir array de proveedores para el endpoint combinado /reservas
    const proveedoresForApi = this.proveedoresArray.controls.map((g: AbstractControl, idx: number) => {
      const idProv = Number(g.get('id_proveedor')?.value);
      const inicio = g.get('fecha_inicio_evento')?.value || this.form.get('fecha_inicio_evento')?.value || null;
      const fin = g.get('fecha_fin_evento')?.value || this.form.get('fecha_fin_evento')?.value || null;
      const categoria = g.get('categoria')?.value || '';
      const calc = this.getPrecioAplicadoForIndex(idx, Math.max(0, this.totalPersonasInvitadas));
      const planLocal = Number(g.get('id_plan')?.value);
      const planGlobal = Number(this.form.get('id_plan')?.value);
      // Además de enviar precio_calculado, incluir campos que el backend espera
      // para reproducir su cálculo: `precio_base` y, si aplica, `precio_persona`.
      const precioUnit = this.getPrecioProveedor(idProv) || 0;
      const catNorm = this.normalizeCategoria(String(categoria));
      const proveedorObj: any = {
        id_proveedor: idProv,
        categoria: String(categoria),
        horaInicio: inicio || null,
        horaFin: fin || null,
        precio_calculado: Number(calc.precioAplicado),
        precio_base: Number(precioUnit),
        id_plan: Number.isFinite(planLocal) ? planLocal : (Number.isFinite(planGlobal) ? planGlobal : undefined)
      };
      if (catNorm === 'CATERING') {
        proveedorObj.precio_persona = Number(precioUnit);
      }
      return proveedorObj;
    }).filter(p => p.id_proveedor);

    // Determinar plan del evento según planes de proveedores (mezcla => 4 personalizado)
    const planesSet = new Set(
      (proveedoresForApi || [])
        .map((p: any) => Number(p.id_plan ?? this.form.get('id_plan')?.value))
        .filter((n: number) => Number.isFinite(n))
    );
    const planEvento = planesSet.size === 0
      ? (Number.isFinite(Number(this.form.get('id_plan')?.value)) ? Number(this.form.get('id_plan')?.value) : null)
      : (planesSet.size === 1 ? [...planesSet][0] : 4);
    console.log('🎛️ planEvento detectado (front):', { planes: Array.from(planesSet), planEvento });

    // Preparar lista de invitados para enviar al backend (usar antes de construir reservasPayload)
    const invitadosForApi = this.invitadosArray.controls.map((g: AbstractControl) => {
      const nombre = g.get('nombre')?.value;
      const email = g.get('email')?.value || '';
      const telefono = g.get('telefono')?.value || '';
      const acompanantes = Math.max(0, Number(g.get('acompanantes')?.value) || 0);
      const notas = g.get('notas')?.value || '';
      return {
        nombre,
        email,
        telefono,
        acompanantes,
        notas,
        nombre_invitado: nombre,
        email_invitado: email,
        numero_acompanantes: acompanantes
      };
    });

    // Recalcular subtotal/iva/total basados en los proveedores calculados (para verificación)
    const countSelected = proveedoresForApi.filter((p: any) => !!p.id_proveedor).length;
    let subtotalCalc = proveedoresForApi.reduce((acc: number, p: any) => acc + Number(p.precio_calculado || 0), 0);
    if (countSelected > 0) subtotalCalc += 25 * countSelected;
    subtotalCalc = Number(Number(subtotalCalc).toFixed(2));
    const ivaCalc = Number((subtotalCalc * 0.15).toFixed(2));
    const totalCalc = Number((subtotalCalc + ivaCalc).toFixed(2));

    // Valores que se muestran en el front y QUE DEBEN SER ENVIADOS tal cual
    const frontSubtotal = Number(Number(this.subtotal).toFixed(2));
    const frontIva = Number(Number(this.iva).toFixed(2));
    const frontTotal = Number(Number(this.totalEstimado).toFixed(2));

    // Si hay discrepancia entre lo que se deriva de proveedores y lo mostrado en UI, poner advertencia en consola
    if (frontSubtotal !== subtotalCalc || frontIva !== ivaCalc || frontTotal !== totalCalc) {
      console.warn('Diferencia detectada entre subtotal derivado de proveedores y subtotal mostrado en UI', { frontSubtotal, subtotalCalc, frontIva, ivaCalc, frontTotal, totalCalc });
    }

    const reservasPayload: any = {
      nombreEvento: payloadEvento.nombre_evento,
      // Enviar id_categoria explícitamente para que el backend la inserte en la tabla `evento`
      id_categoria: Number.isFinite(Number(payloadEvento.id_categoria)) ? payloadEvento.id_categoria : null,
      tipoEvento: payloadEvento.tipoEvento || null,
      descripcion: payloadEvento.descripcion_evento,
      fechaInicio: payloadEvento.fecha_inicio_evento,
      fechaFin: payloadEvento.fecha_fin_evento,
      // Enviar los valores que muestra el front (usar frontSubtotal/frontIva/frontTotal)
      subtotal: frontSubtotal,
      iva: frontIva,
      total: frontTotal,
      // Enviar también el campo `precio_evento` por compatibilidad con backends que lo esperan
      precio_evento: Number(frontTotal),
      // Para depuración: incluir lo derivado desde proveedores (no lo use el backend si recibe front values)
      _subtotal_derivado_proveedores: subtotalCalc,
      _iva_derivado_proveedores: ivaCalc,
      _total_derivado_proveedores: totalCalc,
      hayPlaylist: !!payloadEvento.hay_playlist_evento,
      playlist: payloadEvento.playlist_evento || null,
      proveedores: proveedoresForApi,
      // enviar informacion de reserva y asistentes
      cedula_reservacion: payloadEvento.cedula_reservacion || null,
      numero_invitados: payloadEvento.numero_invitados || 0,
      invitados: invitadosForApi,
      // Enviar plan detectado en front (el backend debe recalcular/forzar si hay mezcla)
      id_plan: planEvento
    };

    // Incluir datos de pago si el usuario pagó desde el modal
    if (this.datosPagoGuardados) {
      try {
        const dp = this.datosPagoGuardados;
        // intentar obtener método normalizado desde datos del pago
        let metodoNorm: string | null = null;
        if (dp?.datos?.metodoPago) metodoNorm = dp.datos.metodoPago;
        else if (dp?.metodoPago) {
          const m = String(dp.metodoPago).toLowerCase();
          if (m.includes('visa') || m.includes('tarjeta') || m.includes('crédito') || m.includes('credito')) metodoNorm = 'tarjeta';
          else if (m.includes('paypal')) metodoNorm = 'paypal';
          else if (m.includes('transfer')) metodoNorm = 'transferencia';
          else if (m.includes('deposit') || m.includes('efectivo')) metodoNorm = 'deposito';
          else metodoNorm = dp.metodoPago;
        }

        // Sanitize payment datos: DO NOT send large base64 file in main payload.
        let datosToSend: any = null;
        if (dp && dp.datos && typeof dp.datos === 'object') {
          datosToSend = { ...dp.datos };
          // eliminar archivo grande si existe
          if (datosToSend.archivoComprobante) delete datosToSend.archivoComprobante;
          // evitar enviar número de tarjeta completo
          if (datosToSend.numeroTarjeta && typeof datosToSend.numeroTarjeta === 'string') {
            const s = datosToSend.numeroTarjeta.replace(/\s+/g, '');
            datosToSend.numeroTarjeta = s.length > 4 ? '**** **** **** ' + s.slice(-4) : s;
          }
        }

        reservasPayload.metodo_pago_factura = metodoNorm || null;
        reservasPayload.pago = {
          success: !!dp.success,
          estado: dp.success ? 'pagada' : (dp.estado || null),
          metodo: metodoNorm || null,
          transactionId: dp.transactionId || null,
          datos: datosToSend
        };
        // número comprobante si aplica (no es el archivo)
        reservasPayload.numero_comprobante = dp?.datos?.numeroComprobante || null;
      } catch (e) {
        // no bloquear el envío si la estructura es inesperada
        console.warn('No se pudo adjuntar datos de pago completos al payload:', e);
      }
    }

    try {
      console.log('POST /api/reservas payload (string):', JSON.stringify(reservasPayload));
    } catch (e) {
      console.log('POST /api/reservas payload (obj):', reservasPayload);
    }
    this.apiService.createReserva(reservasPayload).subscribe({
      next: async (resReservas) => {
        console.log('createReserva response:', resReservas);
        const idReservacion = resReservas?.id_reservacion || resReservas?.id_reservacion || resReservas?.id || resReservas?.insertId;
        const idEvento = resReservas?.id_evento || (resReservas?.evento && resReservas.evento.id_evento) || undefined;

        // Nota: el backend ya crea la factura al procesar POST /api/reservas.
        // No ejecutar POST /api/facturas desde el frontend (evitar duplicados).

        // Guardar SOLO las características que el usuario realmente modificó
        const caracteristicasPayload: any[] = [];
        console.log('🔍 Iniciando detección de cambios en características...');
        
        this.proveedorCaracteristicasEditable.forEach((lista, idx) => {
          const idProveedor = Number(this.proveedoresArray.at(idx).get('id_proveedor')?.value);
          if (!idProveedor) return;
          const originals = this.proveedorCaracteristicasOriginal[idx] || [];
          
          console.log(`📦 Proveedor ${idProveedor} - Comparando ${lista?.length || 0} características`);
          
          (lista || []).forEach((c: any) => {
            const val = c.valorUsuario;
            
            // Buscar el valor original para esta característica
            const origEntry = originals.find((o: any) => Number(o.id_caracteristica) === Number(c.id_caracteristica));
            const origVal = origEntry ? origEntry.valor : undefined;
            
            // Detectar si realmente cambió comparando tipos correctamente
            let changed = false;
            
            if (c.tipo === 'numero' || c.tipo === 'number') {
              // Para números: comparar numéricamente, considerar null/undefined/'' como mismo valor
              const valNum = (val === null || val === undefined || val === '') ? null : Number(val);
              const origNum = (origVal === null || origVal === undefined || origVal === '') ? null : Number(origVal);
              changed = valNum !== origNum;
              if (changed) {
                console.log(`  ✏️ ${c.nombre}: ${origNum} → ${valNum} (número)`);
              }
            } else if (c.tipo === 'booleano' || c.tipo === 'boolean') {
              // Para booleanos: normalizar a true/false
              const valBool = !!val;
              const origBool = !!origVal;
              changed = valBool !== origBool;
              if (changed) {
                console.log(`  ✏️ ${c.nombre}: ${origBool} → ${valBool} (booleano)`);
              }
            } else {
              // Para texto/json: comparar strings, considerar vacíos como iguales
              const valStr = (val === null || val === undefined) ? '' : String(val);
              const origStr = (origVal === null || origVal === undefined) ? '' : String(origVal);
              changed = valStr !== origStr;
              if (changed) {
                console.log(`  ✏️ ${c.nombre}: "${origStr}" → "${valStr}" (texto)`);
              }
            }
            
            // SOLO guardar si realmente cambió
            if (!changed) return;
            
            // Construir payload según el tipo
            const item: any = { 
              id_evento: idEvento, 
              id_proveedor: idProveedor, 
              id_caracteristica: Number(c.id_caracteristica) 
            };
            
            if (c.tipo === 'numero' || c.tipo === 'number') {
              item.valor_numero = (val === null || val === undefined || val === '') ? null : Number(val);
            } else if (c.tipo === 'booleano' || c.tipo === 'boolean') {
              item.valor_booleano = !!val;
            } else if (c.tipo === 'json') {
              item.valor_json = val;
            } else {
              item.valor_texto = (val === null || val === undefined) ? '' : String(val);
            }
            
            caracteristicasPayload.push(item);
          });
        });

        if (caracteristicasPayload.length > 0) {
          console.log('📝 Insertar características MODIFICADAS en evento_proveedor_caracteristica:', caracteristicasPayload);
          this.apiService.crearEventoProveedorCaracteristicas(caracteristicasPayload).subscribe({ 
            next: (resC) => { console.log('✅ Características guardadas:', resC); }, 
            error: (errC) => { console.error('❌ Error guardando características', errC); } 
          });
        } else {
          console.log('ℹ️ No hay características modificadas para guardar');
        }

        // Invitados ya se enviaron en el payload principal `reservasPayload`.
        // El backend debe insertar los invitados dentro de la misma transacción si lo soporta.
        if (invitadosForApi.length > 0) {
          console.log('Invitados incluidos en el payload de reserva; backend debe insertarlos automáticamente.');
        }

        // Mostrar comprobante bonito e imprimible
        try {
          const receiptHtml = `
            <div style="font-family: Arial, Helvetica, sans-serif; text-align: left;">
              <h2>Comprobante de Pago</h2>
              <p><strong>ID Reserva:</strong> ${idReservacion || '-'}<br>
              <strong>ID Evento:</strong> ${idEvento || '-'}<br>
              <strong>Evento:</strong> ${payloadEvento.nombre_evento || '-'}</p>
              <hr>
              <p><strong>Subtotal:</strong> $${frontSubtotal.toFixed(2)} &nbsp; <strong>IVA:</strong> $${frontIva.toFixed(2)} &nbsp; <strong>Total:</strong> $${frontTotal.toFixed(2)}</p>
              <p><strong>Método de pago:</strong> ${this.datosPagoGuardados?.metodoPago || (this.datosPagoGuardados?.datos?.metodoPago) || (reservasPayload.metodo_pago_factura || '-')}</p>
              <p><strong>Transacción / Comprobante:</strong> ${this.datosPagoGuardados?.transactionId || reservasPayload.numero_comprobante || '-'}</p>
              <hr>
              <h4>Proveedores</h4>
              <ul>
                ${ (proveedoresForApi || []).map((p:any) => `<li>${p.categoria || ''} - ${p.id_proveedor || ''} - $${Number(p.precio_calculado||0).toFixed(2)}</li>`).join('') }
              </ul>
              <p style="font-size:0.85em;color:#666">Generado: ${new Date().toLocaleString()}</p>
            </div>
          `;

          const Swal = (await import('sweetalert2')).default;
          const result = await Swal.fire({
            title: 'Pago y reserva completados',
            html: receiptHtml,
            showCancelButton: true,
            confirmButtonText: 'Imprimir',
            cancelButtonText: 'Regresar',
            width: '800px'
          });

          if (result.isConfirmed) {
            // abrir ventana imprimible
            const w = window.open('', '_blank');
            if (w) {
              w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Comprobante</title></head><body>${receiptHtml}</body></html>`);
              w.document.close();
              w.focus();
              w.print();
            }
            // después de imprimir, limpiar formulario
            this.resetAllForm();
          } else {
            // si el usuario regresa, limpiar formulario
            this.resetAllForm();
          }
        } catch (e) {
          console.warn('No se pudo mostrar comprobante interactivo:', e);
          await this.showSweetAlert('success', 'Reserva creada', 'La reserva se creó correctamente.');
        }

        this.submitting.set(false);
      },
      error: (err) => {
        console.error('Error creando reserva combinada', err);
        if (err && err.status === 409) {
          this.showSweetAlert('warning', 'Conflicto de proveedores', 'Algún proveedor seleccionado ya está ocupado en el periodo solicitado.');
        } else if (err && err.status === 400) {
          const msg = err?.error?.message || 'Petición mal formada al crear la reserva.';
          this.showSweetAlert('error', 'Error 400', `Error 400: ${msg}`);
        } else if (err && err.status === 404) {
          this.showSweetAlert('error', 'Endpoint no encontrado', 'Endpoint /api/reservas no encontrado (404). Verifica la configuración del backend.');
        } else {
          this.showSweetAlert('error', 'Error', 'Error al crear reserva. Revisa la consola para más detalles.');
        }
        this.submitting.set(false);
      }
    });
  }

  quitarTodosInvitados(): void {
    while (this.invitadosArray.length > 0) {
      this.invitadosArray.removeAt(0);
    }
  }

  // Importar invitados desde archivo Excel
  onImportarExcel(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        const data = e.target?.result;
        import('xlsx').then(async XLSX => {
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

          let importados = 0;
          // Primero recopilar filas válidas sin insertarlas aún para poder validar contra "platos incluidos"
          const tempRows: Array<{ nombre: string; email: string; telefono: string; acompanantes: number; notas: string }> = [];
          jsonData.forEach((row: any) => {
            const nombre = row['nombre'] || row['Nombre'] || row['NOMBRE'] || row['name'] || row['Name'];
            if (nombre && nombre.toString().trim()) {
              let acomp = Number(row['acompanantes'] ?? row['acompañantes'] ?? row['Acompañantes'] ?? row['cantidad_personas'] ?? 0);
              if (isNaN(acomp) || acomp < 0) acomp = 0;
              acomp = Math.max(0, Math.min(10, Math.floor(acomp)));
              tempRows.push({ nombre: nombre.toString().trim(), email: row['email'] || row['Email'] || row['EMAIL'] || row['correo'] || row['Correo'] || '', telefono: row['telefono'] || row['Telefono'] || row['TELEFONO'] || row['celular'] || row['Celular'] || '', acompanantes: acomp, notas: row['notas'] || row['Notas'] || row['NOTAS'] || row['observaciones'] || row['Observaciones'] || '' });
            }
          });

          if (tempRows.length === 0) {
            await this.showSweetAlert('warning', 'No hay invitados', '⚠️ No se encontraron invitados válidos en el archivo.\n\nAsegúrate de que el Excel tenga una columna "nombre" o "Nombre".');
            return;
          }

          // Calcular cuántas personas adicionales se quieren importar
          const importGuests = tempRows.reduce((acc, r) => acc + 1 + Math.max(0, Number(r.acompanantes)), 0);
          const currentGuests = this.totalPersonasInvitadas;
          const totalAfter = currentGuests + importGuests;

          // Validar contra platos incluidos por cada proveedor CATERING
          for (let i = 0; i < this.proveedoresArray.length; i++) {
            const g = this.proveedoresArray.at(i);
            if (!g) continue;
            const idProvRaw = g.get('id_proveedor')?.value;
            const idProv = idProvRaw ? Number(idProvRaw) : undefined;
            if (!idProv) continue;
            const provObj = (this.proveedoresAll || []).find(p => Number(p.id_proveedor) === Number(idProv));
            const categoriaRaw = String(g.get('categoria')?.value || provObj?.categoria || provObj?.['nombre_categoria'] || provObj?.tipo || '').trim();
            const catNorm = this.normalizeCategoria(categoriaRaw);
            if (catNorm === 'CATERING') {
              const platosIncluidos = this.getPlatosIncluidosForIndex(i);
              if (platosIncluidos != null && totalAfter > platosIncluidos) {
                const nombreProv = provObj?.nombre || provObj?.['nombre_proveedor'] || `Proveedor en posición ${i+1}`;
                await this.showSweetAlert('warning', 'Importación cancelada', `El proveedor "${nombreProv}" solo incluye ${platosIncluidos} platos pero con esta importación habría ${totalAfter} invitados. Ajusta la importación o la característica 'platos incluidos'.`);
                  return;
              }
            }
          }

          // Si pasa validación, agregar los invitados
          tempRows.forEach(row => {
            const invitadoGroup = this.fb.group({
              nombre: [row.nombre, [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
              email: [row.email || '', [Validators.email, Validators.maxLength(255)]],
              telefono: [row.telefono || '', [Validators.maxLength(20)]],
              acompanantes: [row.acompanantes],
              notas: [row.notas || '']
            });
            this.invitadosArray.push(invitadoGroup);
            try { invitadoGroup.updateValueAndValidity({ onlySelf: true }); } catch (e) {}
            importados++;
          });

          if (importados > 0) {
            await this.showSweetAlert('success', 'Importación completada', `Se importaron ${importados} invitados correctamente.`);
          }
        }).catch(err => {
          this.showSweetAlert('error', 'Error archivo', 'Error al procesar el archivo. Asegúrate de que sea un archivo Excel válido (.xlsx)');
        });
      } catch (error) {
        this.showSweetAlert('error', 'Error', 'Error al leer el archivo Excel.');
      }
    };

    reader.readAsBinaryString(file);
    input.value = '';
  }

  descargarPlantillaExcel(): void {
    import('exceljs').then(ExcelJS => {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Sistema de Reservas';
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet('Invitados', {
        properties: { tabColor: { argb: '4472C4' } }
      });

      worksheet.columns = [
        { header: 'nombre', key: 'nombre', width: 25 },
        { header: 'email', key: 'email', width: 28 },
        { header: 'telefono', key: 'telefono', width: 15 },
        { header: 'acompañantes', key: 'acompanantes', width: 14 },
        { header: 'notas', key: 'notas', width: 30 }
      ];

      const headerRow = worksheet.getRow(1);
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '4472C4' }
        };
        cell.font = {
          bold: true,
          color: { argb: 'FFFFFF' },
          size: 11
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: '2F5496' } },
          bottom: { style: 'thin', color: { argb: '2F5496' } },
          left: { style: 'thin', color: { argb: '2F5496' } },
          right: { style: 'thin', color: { argb: '2F5496' } }
        };
      });
      headerRow.height = 22;

      const datosEjemplo = [
        { nombre: 'Juan Pérez', email: 'juan@email.com', telefono: '0991234567', acompanantes: 2, notas: 'Vegetariano' },
        { nombre: 'María García', email: 'maria@email.com', telefono: '0987654321', acompanantes: 0, notas: '' },
        { nombre: 'Carlos López', email: '', telefono: '0998765432', acompanantes: 1, notas: 'Alergia a mariscos' }
      ];

      datosEjemplo.forEach((dato, index) => {
        const row = worksheet.addRow(dato);
        const isEven = index % 2 === 0;

        row.eachCell((cell, colNumber) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: isEven ? 'D6DCE5' : 'FFFFFF' }
          };
          cell.border = {
            top: { style: 'thin', color: { argb: 'B4C6E7' } },
            bottom: { style: 'thin', color: { argb: 'B4C6E7' } },
            left: { style: 'thin', color: { argb: 'B4C6E7' } },
            right: { style: 'thin', color: { argb: 'B4C6E7' } }
          };
          cell.alignment = { vertical: 'middle' };
        });

        row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
      });

      worksheet.getColumn('telefono').numFmt = '@';

      worksheet.autoFilter = {
        from: 'A1',
        to: 'E1'
      };

      worksheet.views = [{ state: 'frozen', ySplit: 1 }];

      workbook.xlsx.writeBuffer().then((buffer: ArrayBuffer) => {
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'plantilla_invitados.xlsx';
        link.click();
        window.URL.revokeObjectURL(url);
      });
    });
  }

  getDescripcionProveedor(index: number): string {
    const provGrp = this.proveedoresArray.at(index) as FormGroup;
    const idProv = provGrp?.get('id_proveedor')?.value;
    const categoria = this.normalizeCategoria(provGrp?.get('categoria')?.value ?? '');
    if (!idProv || !categoria) return '';
    const proveedor = this.getProveedoresPorCategoria(categoria)
      .find(p => p.id_proveedor === Number(idProv));
    const desc = proveedor
      ? (proveedor as any).descripcion
        ?? (proveedor as any).descripcion_proveedor
        ?? (proveedor as any).lugar_descripcion
        ?? (proveedor as any).plan_descripcion
        ?? (proveedor as any).descripcion_plan
        ?? (proveedor as any).descripcion_tipo
      : '';
    return typeof desc === 'string' ? desc : String(desc ?? '');
  }

  // === PAGINACIÓN DE INVITADOS ===
  get invitadosVisibles(): FormGroup[] {
    return this.invitadosArray.controls.slice(0, this.filasVisiblesInvitados()) as FormGroup[];
  }

  cargarCategorias(): void {
    this.loading.set(true);
    this.apiService.getCategorias().subscribe({
      next: (cats) => {
        try {
          const mapped = (cats || []).map((c: any) => ({
            id: c?.id || c?.id_categoria || undefined,
            nombre: c?.nombre || c?.Nombre || c?.tipo || 'OTRO',
            icono: c?.icono || c?.Icono || undefined
          }));
          this.categorias.set(mapped);
        } catch (e) {
          this.categorias.set(cats);
        }
        this.loading.set(false);
      },
      error: () => {
        this.categorias.set([
          { nombre: 'MUSICA', icono: 'bi-music-note-beamed' },
          { nombre: 'CATERING', icono: 'bi-egg-fried' },
          { nombre: 'DECORACION', icono: 'bi-balloon-heart' },
          { nombre: 'LUGAR', icono: 'bi-geo-alt' },
          { nombre: 'FOTOGRAFIA', icono: 'bi-camera' },
          { nombre: 'VIDEO', icono: 'bi-film' }
        ]);
        this.loading.set(false);
      }
    });
  }

  cargarProveedoresDelEvento(proveedores: any[]): void {
    try {
      // Limpiar proveedores existentes
      while (this.proveedoresArray.length > 0) {
        this.proveedoresArray.removeAt(0);
      }
      
      // Primero obtener el plan del formulario para cargar los proveedores disponibles
      const planId = this.form.get('id_plan')?.value;
      if (planId) {
        // Cargar proveedores disponibles para este plan
        this.apiService.getProveedoresPorPlan(planId).subscribe({
          next: (provDisponibles) => {
            this.proveedoresAll = provDisponibles || [];
            this.actualizarMapProveedores(planId);
            
            // Ahora agregar los proveedores del evento
            this.agregarProveedoresDelEventoInterno(proveedores);
          },
          error: (err) => {
            console.error('Error al cargar proveedores disponibles:', err);
            // Continuar igualmente
            this.agregarProveedoresDelEventoInterno(proveedores);
          }
        });
      } else {
        this.agregarProveedoresDelEventoInterno(proveedores);
      }
    } catch (err) {
      console.error('Error al cargar proveedores del evento:', err);
    }
  }

  private agregarProveedoresDelEventoInterno(proveedores: any[]): void {
    for (const prov of proveedores) {
      const grupo = this.fb.group({
        categoria: [prov.tipo_nombre || ''],
        id_proveedor: [prov.id_proveedor || '', Validators.required],
        id_tipo: [prov.id_tipo || '', Validators.required],
        id_plan: [this.form.get('id_plan')?.value || '', Validators.required],
        fecha_inicio_evento: [''],  // NO usar fechas de la plantilla
        fecha_fin_evento: ['']      // NO usar fechas de la plantilla
      });
      this.proveedoresArray.push(grupo);
      
      // Inicializar arrays para este proveedor
      this.proveedorCaracteristicas.push([]);
      this.proveedorCaracteristicasEditable.push([]);
      this.proveedorImagenes.push([]);
      this.proveedorDescripcion.push('');
      this.proveedorEsLugar.push(false);
      this.proveedorSubscriptions.push(null);
      
      // Cargar características e imágenes del proveedor
      const index = this.proveedoresArray.length - 1;
      this.onProveedorSeleccionado(index);
    }
    console.log(`[reserva] ${proveedores.length} proveedores cargados del evento`);
  }

  private normalizeCategoria(value: string | null | undefined): string {
    if (!value) return 'OTRO';
    const v = value
      .toString()
      .normalize('NFD')
      .replace(/\p{Diacritic}+/gu, '')
      .trim()
      .toUpperCase();
    if (v === 'MUSICA' || v === 'MÚSICA') return 'MUSICA';
    if (v === 'CATERING' || v === 'CATERIN') return 'CATERING';
    if (v === 'DECORACION' || v === 'DECORACIÓN') return 'DECORACION';
    if (v === 'LUGAR' || v === 'LUGARES') return 'LUGAR';
    if (v === 'FOTOGRAFIA' || v === 'FOTOGRAFÍA') return 'FOTOGRAFIA';
    if (v === 'VIDEO' || v === 'VIDEOS') return 'VIDEO';
    return v;
  }

  isAgregarDisabled(cat: Categoria | string): boolean {
    const key = typeof cat === 'string' ? this.normalizeCategoria(cat) : this.normalizeCategoria((cat as Categoria).nombre);
    if (key !== 'LUGAR' && key !== 'DECORACION') return false;
    // revisar estado en categorias signal si existe la propiedad disabled
    const found = (this.categorias() || []).find(c => this.normalizeCategoria(c.nombre) === key);
    if (found && (found as any).disabled) return true;
    // fallback: si ya existe un proveedor agregado con esa categoría
    return this.proveedoresArray.controls.some(g => this.normalizeCategoria(g.get('categoria')?.value) === key);
  }

  private setCategoriaDisabledByKey(key: string, disabled: boolean): void {
    const arr = (this.categorias() || []).map(c => {
      try {
        const k = this.normalizeCategoria(c.nombre);
        if (k === key) return { ...c, disabled };
      } catch (e) {}
      return c;
    });
    this.categorias.set(arr as Categoria[]);
  }

  ngOnDestroy(): void {
    this.proveedorSubscriptions.forEach(sub => { if (sub) sub.unsubscribe(); });
    this.miscSubscriptions.forEach(s => { if (s) s.unsubscribe(); });
  }

  toggleInvitadosDrawer(): void {
    this.mostrarInvitadosDrawer.set(!this.mostrarInvitadosDrawer());
  }

  getProveedoresPorCategoria(categoria: string): Proveedor[] {
    const key = this.normalizeCategoria(categoria);
    return this.proveedoresPorCategoria().get(key) || [];
  }

  // Limpia completamente el formulario de reserva y estado asociado (usar después de pagar/regresar)
  private resetAllForm(): void {
    try {
      // Reset reactive form fields
      this.form.reset();

      // Limpiar invitados
      this.quitarTodosInvitados();

      // Limpiar proveedores seleccionados
      while (this.proveedoresArray.length > 0) {
        this.eliminarProveedor(0);
      }

      // Reset displays y cachés locales
      this.proveedorCaracteristicas = [];
      this.proveedorCaracteristicasEditable = [];
      this.proveedorCaracteristicasOriginal = [];
      this.proveedorImagenes = [];
      this.proveedorDescripcion = [];
      this.proveedorEsLugar = [];
      this.datosPagoGuardados = null;
      this.mostrarPago.set(false);
      this.submitting.set(false);
    } catch (e) {
      console.error('Error al resetear el formulario de reserva:', e);
    }
  }
}