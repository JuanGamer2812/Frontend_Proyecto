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
  caracteristicas = signal<any[]>([]);
  imagenes = signal<any[]>([]);

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam ? parseInt(idParam, 10) : NaN;
    if (!id || Number.isNaN(id)) {
      this.error.set('ID de proveedor inválido');
      return;
    }

    this.cargarDatosCompletos(id);
  }

  private cargarDatosCompletos(id: number): void {
    this.loading.set(true);

    this.api.getProveedorCompleto(id).subscribe({
      next: (data) => {
        const provObj = this.normalizarProveedor(data?.proveedor ?? data);
        const caract = this.normalizarCaracteristicas(data?.caracteristicas ?? []);

        this.proveedor.set(provObj);
        this.caracteristicas.set(caract);

        // Cargar imágenes entregadas por el endpoint
        const provConImagenes = {
          ...provObj,
          imagenes: data?.imagenes ?? provObj?.imagenes ?? [],
          proveedor_imagen: data?.proveedor_imagen ?? provObj?.proveedor_imagen ?? []
        };
        this.cargarImagenes(provConImagenes);

        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar datos del proveedor:', err);
        this.error.set('No se pudo cargar la información del proveedor');
        this.loading.set(false);
      }
    });
  }

  private normalizarProveedor(raw: any): any {
    if (!raw) return {};
    const base = Array.isArray(raw) ? raw[0] : raw;
    // Algunas respuestas vienen como { proveedor: {...}, proveedor_imagen: [...] }
    const objBase = base?.proveedor ? (Array.isArray(base.proveedor) ? base.proveedor[0] : base.proveedor) : base;
    const obj = objBase || {};

    const firstVal = (source: any, keys: string[]): any => {
      if (!source || typeof source !== 'object') return undefined;
      for (const k of keys) {
        if (Object.prototype.hasOwnProperty.call(source, k)) {
          const v = source[k];
          if (v !== undefined && v !== null && (typeof v !== 'string' || v.toString().trim() !== '')) return v;
        }
      }
      return undefined;
    };

    const tipoObj = firstVal(obj, ['tipo', 'tipoInfo', 'categoria_detalle']) as any;
    const planObj = firstVal(obj, ['plan', 'planInfo', 'plan_data', 'planDetails']) as any;

    const idTipoClean = (firstVal(obj, ['id_tipo', 'idTipo', 'tipo_id', 'tipoId', 'categoria_id', 'categoriaId']) ?? firstVal(tipoObj, ['id', 'id_tipo', 'tipo_id', 'categoria_id'])) as any;
    const idPlanClean = (firstVal(obj, ['id_plan', 'idPlan', 'plan_id', 'planId']) ?? firstVal(planObj, ['id', 'id_plan', 'plan_id'])) as any;

    const nombrePlanClean = (firstVal(obj, ['nombre_plan', 'plan_nombre', 'planNombre', 'planName', 'planTitulo', 'plan_titulo']) ?? firstVal(planObj, ['nombre', 'name', 'title', 'nombre_plan', 'plan_nombre', 'planName', 'planTitulo'])) as any;
    const tipoNombreClean = (firstVal(obj, ['tipo_nombre', 'nombre_tipo', 'categoria', 'categoria_nombre']) ?? firstVal(tipoObj, ['nombre', 'name', 'tipo_nombre', 'categoria'])) as any;

    const normalizeBool = (v: any) => {
      const s = (v ?? '').toString().trim().toLowerCase();
      if (v === true || v === 1) return true;
      if (['true', '1', 't', 'si', 'sí', 'y', 'yes'].includes(s)) return true;
      if (['false', '0', 'f', 'no', 'n'].includes(s)) return false;
      return !!v;
    };

    const estadoAprob = (obj.estado_aprobacion || '').toString().toLowerCase();

    const fechaDirecta = firstVal(obj, [
      'fecha_registro', 'fechaRegistro', 'fecha_aprobacion', 'fecha_registro_proveedor', 'fecha_creacion',
      'created_at', 'createdAt', 'fecha', 'fecha_alta', 'registration_date', 'registro', 'fecha_ingreso'
    ]);

    let fechaRegistro = fechaDirecta ?? null;
    if (!fechaRegistro) {
      const entry = Object.entries(obj).find(([k, v]) => {
        if (v === null || v === undefined) return false;
        if (!/fecha|date|registro|creacion|creation|alta/i.test(k)) return false;
        const d = new Date(v as any);
        return !Number.isNaN(d.getTime());
      });
      if (entry) fechaRegistro = entry[1];
    }

    return {
      ...obj,
      estado_aprobacion: estadoAprob || 'pendiente',
      estado: normalizeBool(obj.estado ?? obj.activo ?? obj.enabled ?? obj.habilitado ?? obj.estado_registro),
      verificado: normalizeBool(obj.verificado ?? obj.email_verificado ?? obj.verificado_email),
      id_tipo: idTipoClean ?? obj.tipo?.id ?? obj.categoria_id ?? obj.tipo,
      tipo_nombre: tipoNombreClean ?? obj.tipo?.nombre ?? obj.categoria,
      id_plan: idPlanClean ?? obj.plan?.id ?? obj.plan?.id_plan,
      nombre_plan: nombrePlanClean ?? obj.plan?.nombre ?? obj.plan?.nombre_plan ?? obj.plan?.nombrePlan,
      fecha_registro: fechaRegistro
    };
  }

  private normalizarCaracteristicas(valsRaw: any): any[] {
    if (!valsRaw) return [];

    let vals: any[] = [];
    if (Array.isArray(valsRaw)) {
      vals = valsRaw;
    } else if (valsRaw && typeof valsRaw === 'object') {
      if (Array.isArray(valsRaw.caracteristicas)) {
        vals = valsRaw.caracteristicas;
      } else if (Array.isArray(valsRaw.data)) {
        vals = valsRaw.data;
      } else if (Array.isArray(valsRaw.rows)) {
        vals = valsRaw.rows;
      } else {
        vals = Object.values(valsRaw).filter(v => v != null);
      }
    }

    return vals.map((v: any, idx) => ({
      id_caracteristica: v.id_caracteristica ?? v.id ?? idx,
      nombre_caracteristica: v.nombre_caracteristica ?? v.nombre ?? 'Característica',
      valor: v.valor ?? v.valor_texto ?? v.valor_numero ?? v.valor_booleano ?? '',
      tipo: v.tipo_valor ?? v.tipo ?? 'texto'
    }));
  }

  private cargarImagenes(provObj: any): void {
    const imgs: any[] = [];
    
    // Extraer imágenes de diferentes estructuras posibles
    const fuentes = [provObj?.imagenes, provObj?.proveedor_imagen];

    fuentes.forEach((arr: any) => {
      if (!Array.isArray(arr)) return;
      arr.forEach((it: any) => {
        const idImg = it?.id_proveedor_imagen ?? it?.id ?? `provimg-${Math.random().toString(36).slice(2,8)}`;
        const u = it?.url_imagen || it?.ruta || it?.url || it?.path || '';
        imgs.push({ id: idImg, url: u });
      });
    });
    
    // Normalizar URLs
    const normalizeUrl = (u: string) => {
      const s = (typeof u === 'string' ? u : String(u || '')).trim();
      if (!s) return '';
      if (/^https?:\/\//i.test(s)) return s;
      if (s.startsWith('/')) return window.location.origin + s;
      return window.location.origin + '/' + s;
    };
    
    const imagenesNormalizadas = imgs.map(o => ({ 
      id: o.id ?? o.url, 
      url: normalizeUrl(o.url) 
    })).filter(o => o.url);
    
    this.imagenes.set(imagenesNormalizadas);
    console.log('Imágenes cargadas:', imagenesNormalizadas);
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

  formatFecha(fecha: any): string {
    if (!fecha) return '—';
    const d = new Date(fecha);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toISOString().split('T')[0];
  }

  getTipoTexto(): string {
    const p = this.proveedor();
    if (!p) return '—';
    const raw = p.tipo_nombre ?? p.categoria ?? p.id_tipo;
    if (raw && typeof raw === 'object') return JSON.stringify(raw);
    const s = raw?.toString().trim();
    return s && s.length > 0 ? s : '—';
  }

  getPlanTexto(): string {
    const p = this.proveedor();
    if (!p) return '—';
    const raw = p.nombre_plan ?? p.id_plan ?? p.plan;
    if (raw && typeof raw === 'object') return JSON.stringify(raw);
    const s = raw?.toString().trim();
    return s && s.length > 0 ? s : '—';
  }

  volver(): void {
    this.router.navigate(['/adm-proveedor']);
  }
}
