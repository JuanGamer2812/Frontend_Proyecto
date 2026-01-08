import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../service/api.service';
import { PdfViewerModal } from '../pdf-viewer-modal/pdf-viewer-modal';

@Component({
  selector: 'app-ver-proveedor',
  standalone: true,
  imports: [CommonModule, PdfViewerModal],
  templateUrl: './ver-proveedor.html',
  styleUrls: ['./ver-proveedor.css']
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
  showPdfModal = signal(false);
  pdfModalUrl = signal('');
  pdfModalFileName = signal('Documento.pdf');
  private planesById = new Map<string, string>();
  private proveedorCache: { [id: number]: any } = {};
  private proveedorCompletoSupported = true;
  private readonly planArraySeparator = ', ';
  private loggedPlan = false;

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam ? parseInt(idParam, 10) : NaN;
    if (!id || Number.isNaN(id)) {
      this.error.set('ID de proveedor inválido');
      return;
    }

    this.api.getPlanes().subscribe({
      next: (planes) => {
        const entries = (planes || []).map((p: any) => {
          const idPlan = p?.id_plan ?? p?.id;
          const nombre = p?.nombre_plan ?? p?.nombre ?? p?.name ?? '';
          return [String(idPlan), String(nombre || idPlan)] as [string, string];
        });
        this.planesById = new Map(entries);
        const current = this.proveedor();
        if (current && !current.nombre_plan) {
          const resolved = this.resolvePlanName(current);
          if (resolved) this.proveedor.set({ ...current, nombre_plan: resolved });
        }
      },
      error: () => {}
    });

    this.cargarDatosCompletos(id);
  }

  private cargarDatosCompletos(id: number): void {
    this.loading.set(true);
    // Preferir el endpoint por id que devuelve la entidad proveedor y luego construir dinámicamente
    this.api.getProveedorById(id).subscribe({
      next: (resp) => {
        // Normalizar respuesta del backend a objeto proveedor
        const rawProv = Array.isArray(resp) ? (resp[0] || {}) : (resp || {});
        console.log('[ver-proveedor] raw proveedor payload:', rawProv);

        // Usar el normalizador central para obtener un objeto consistente
        const provObj = this.normalizarProveedor(rawProv || {});

        // Forzar campos desde la respuesta cruda si el normalizador no los dejó
        const mergedProv: any = { ...provObj };
        if ((mergedProv.id_tipo === undefined || mergedProv.id_tipo === null) && (rawProv?.id_tipo ?? rawProv?.idTipo ?? rawProv?.tipo ?? rawProv?.categoria_id) != null) {
          mergedProv.id_tipo = rawProv.id_tipo ?? rawProv.idTipo ?? rawProv.tipo ?? rawProv.categoria_id;
        }
        if ((mergedProv.id_plan === undefined || mergedProv.id_plan === null) && (rawProv?.id_plan ?? rawProv?.idPlan ?? rawProv?.plan) != null) {
          mergedProv.id_plan = rawProv.id_plan ?? rawProv.idPlan ?? (rawProv.plan && (rawProv.plan.id ?? rawProv.plan.id_plan));
        }
        if (!Array.isArray(mergedProv.id_planes) && Array.isArray(rawProv?.id_planes)) {
          mergedProv.id_planes = rawProv.id_planes;
        }
        if (!Array.isArray(mergedProv.planes) && Array.isArray(rawProv?.planes)) {
          mergedProv.planes = rawProv.planes;
        }
        if (!mergedProv.tipo_nombre && rawProv?.categoria) mergedProv.tipo_nombre = rawProv.categoria;
        if (!mergedProv.nombre_plan && rawProv?.plan && (rawProv.plan.nombre || rawProv.plan.name)) mergedProv.nombre_plan = rawProv.plan.nombre ?? rawProv.plan.name;
        const rawPlanName = rawProv?.nombre_plan ?? rawProv?.plan_nombre ?? (typeof rawProv?.plan === 'string' ? rawProv.plan : null);
        if (!mergedProv.nombre_plan && rawPlanName) mergedProv.nombre_plan = rawPlanName;
        const resolvedPlanName = this.resolvePlanName(mergedProv);
        if (!mergedProv.nombre_plan && resolvedPlanName) mergedProv.nombre_plan = resolvedPlanName;
        if (!mergedProv.fecha_registro && rawProv?.fecha_registro) mergedProv.fecha_registro = rawProv.fecha_registro;
        if ((mergedProv.precio_base === undefined || mergedProv.precio_base === null) && (rawProv.precio_base ?? rawProv.precio) != null) mergedProv.precio_base = rawProv.precio_base ?? rawProv.precio;

        // Guardar en cache y en el signal usando el objeto fusionado
        this.proveedorCache[id] = mergedProv;
        this.proveedor.set(mergedProv);

        // Cargar imágenes/archivos desde la respuesta original
        this.cargarImagenes({ ...mergedProv, archivos: rawProv?.archivos ?? rawProv?.files ?? [], proveedor_imagen: rawProv?.proveedor_imagen ?? rawProv?.imagenes ?? [] });

        // --- Resolver tipo/plan de forma inmediata desde la respuesta cruda (no depender sólo del signal)
        if (!provObj.tipo_nombre) {
          // Si la respuesta trae una categoría textual, usarla inmediatamente
          if (rawProv?.categoria) {
            this.proveedor.set({ ...this.proveedor(), tipo_nombre: rawProv.categoria });
          }
          // Si viene id_tipo, intentar resolver nombre consultando al endpoint
          const rawTipoId = rawProv?.id_tipo ?? rawProv?.tipo ?? rawProv?.idTipo;
          if (rawTipoId != null) {
            const tid = Number(rawTipoId);
            if (!Number.isNaN(tid)) {
              this.api.getTiposProveedor().subscribe({ next: (types) => {
                try {
                  if (Array.isArray(types)) {
                    const found = types.find((t:any) => String(t.id ?? t.id_tipo) === String(tid));
                    if (found) this.proveedor.set({ ...this.proveedor(), tipo_nombre: found.nombre ?? found.name ?? String(found.id) });
                  }
                } catch(e) { console.error('[ver-proveedor] error resolving tipo from raw:', e); }
              }, error: (e) => console.error('[ver-proveedor] error fetching tipos-proveedor:', e) });
            }
          }
        }

        if (!provObj.nombre_plan) {
          const rawPlanId = rawProv?.id_plan ?? rawProv?.plan ?? rawProv?.idPlan;
          if (rawPlanId != null) {
            const pid = Number(rawPlanId);
            if (!Number.isNaN(pid)) {
              this.api.getPlanById(pid).subscribe({ next: plan => {
                try {
                  if (plan) this.proveedor.set({ ...this.proveedor(), nombre_plan: plan.nombre ?? plan.title ?? plan.name ?? String(plan.id) });
                } catch(e) { console.error('[ver-proveedor] error setting plan name:', e); }
              }, error: (e) => console.error('[ver-proveedor] error fetching plan by id:', e) });
            }
          } else if (rawProv?.plan && (rawProv.plan.nombre || rawProv.plan.title || rawProv.plan.name)) {
            this.proveedor.set({ ...this.proveedor(), nombre_plan: rawProv.plan.nombre ?? rawProv.plan.title ?? rawProv.plan.name });
          }
        }

        // Si faltan campos importantes, intentar obtener la versión completa del proveedor
        const missingKeyInfo = (mergedProv.id_plan === undefined || mergedProv.id_plan === null || !mergedProv.fecha_registro || mergedProv.precio_base === undefined || mergedProv.precio_base === null);
        if (missingKeyInfo && this.proveedorCompletoSupported) {
          this.api.getProveedorCompleto(Number(id)).subscribe({ next: (fullResp) => {
            const rawFull = Array.isArray(fullResp) ? (fullResp[0] || {}) : (fullResp || {});
            const fullNorm = this.normalizarProveedor(rawFull || {});
            const finalProv = { ...mergedProv, ...fullNorm };
            if (!finalProv.nombre_plan || this.isEmptyPlanLabel(finalProv.nombre_plan)) {
              const rawPlanName = rawFull?.nombre_plan ?? rawFull?.plan_nombre ?? null;
              finalProv.nombre_plan = mergedProv.nombre_plan ?? rawPlanName ?? finalProv.nombre_plan ?? null;
            }
            if (finalProv.id_plan === undefined || finalProv.id_plan === null) {
              finalProv.id_plan = mergedProv.id_plan ?? rawFull?.id_plan ?? rawFull?.idPlan ?? finalProv.id_plan ?? null;
            }
            this.proveedorCache[id] = finalProv;
            this.proveedor.set(finalProv);
            // recargar imagenes con posible lista completa
            this.cargarImagenes({ ...finalProv, archivos: rawFull?.archivos ?? rawFull?.files ?? [], proveedor_imagen: rawFull?.proveedor_imagen ?? rawFull?.imagenes ?? finalProv.proveedor_imagen });
            // Re-ejecutar la resolución de campos dependientes con la versión completa
            try { resolveDependentFields(finalProv); } catch (e) { console.error('[ver-proveedor] error re-resolving dependent fields:', e); }
          }, error: (e) => {
            console.warn('[ver-proveedor] getProveedorCompleto failed, continuing with partial data:', e);
            try {
              if (e && e.status === 500 && e.error && typeof e.error.message === 'string' && e.error.message.includes('v_proveedores_completo')) {
                this.proveedorCompletoSupported = false;
                console.warn('[ver-proveedor] proveedor completo endpoint appears unsupported; disabling further attempts.');
              }
            } catch (ex) { /* ignore */ }
          } });
        }

        // Agrupar resolución dependiente de tipo/plan/características en una función
        const resolveDependentFields = (provObjForDeps: any) => {
          // Tipo: si viene id_tipo resolver nombre
          const tipoIdUse = provObjForDeps.id_tipo ?? provObjForDeps.tipo ?? provObjForDeps.idTipo ?? provObjForDeps.tipo_nombre ?? null;
          if (!provObjForDeps.tipo_nombre && provObjForDeps.categoria) {
            this.proveedor.set({ ...this.proveedor(), tipo_nombre: provObjForDeps.categoria });
          }
          if (tipoIdUse != null && !Number.isNaN(Number(tipoIdUse))) {
            this.api.getTiposProveedor().subscribe({ next: (types) => {
              try {
                if (Array.isArray(types)) {
                  const found = types.find((t:any) => String(t.id ?? t.id_tipo) === String(tipoIdUse));
                  if (found) this.proveedor.set({ ...this.proveedor(), tipo_nombre: found.nombre ?? found.name ?? String(found.id) });
                }
              } catch(e) { console.error('[ver-proveedor] error resolving tipo:', e); }
            }, error: (e) => console.error('[ver-proveedor] error fetching tipos-proveedor:', e) });
          }

          // Plan: si viene id_plan resolver nombre
          if (provObjForDeps.id_plan != null) {
            const pidNum = Number(provObjForDeps.id_plan);
            if (!Number.isNaN(pidNum)) {
              this.api.getPlanById(pidNum).subscribe({ next: plan => {
                try {
                  if (plan) this.proveedor.set({ ...this.proveedor(), nombre_plan: plan.nombre ?? plan.title ?? plan.name ?? String(plan.id) });
                } catch(e) { console.error('[ver-proveedor] error setting plan name:', e); }
              }, error: (e) => console.error('[ver-proveedor] error fetching plan by id:', e) });
            }
          } else if (provObjForDeps.nombre_plan) {
            this.proveedor.set({ ...this.proveedor(), nombre_plan: provObjForDeps.nombre_plan });
          }

          // Asegurar precio_base
          if ((provObjForDeps.precio_base === undefined || provObjForDeps.precio_base === null) && (provObjForDeps.precio ?? provObjForDeps.price) != null) {
            this.proveedor.set({ ...this.proveedor(), precio_base: provObjForDeps.precio ?? provObjForDeps.price });
          }

          // Cargar características: primero valores del proveedor, luego definiciones por tipo si hay
          this.api.getProveedorCaracteristicasById(Number(id)).subscribe({
            next: (valsRaw) => {
              const vals = this.normalizarCaracteristicas(valsRaw);

              const tipoId = provObjForDeps.id_tipo ?? provObjForDeps.tipo ?? provObjForDeps.idTipo ?? tipoIdUse;
              const tipoIdNum = Number(tipoId);

              if (Number.isFinite(tipoIdNum)) {
                this.api.getCaracteristicasByTipo(tipoIdNum).subscribe({
                  next: (list) => {
                    const baseList = (list || []).map((c: any) => ({
                      id_caracteristica: c.id_caracteristica ?? c.id,
                      nombre_caracteristica: c.nombre ?? c.titulo ?? c.name ?? 'Característica',
                      tipo: c.tipo_valor ?? c.tipo ?? 'texto',
                      obligatorio: !!c.obligatorio,
                      opciones: c.opciones || null,
                      valorProveedor: null,
                      valorUsuario: (c.tipo_valor === 'booleano' || c.tipo === 'booleano') ? false : (c.tipo_valor === 'numero' || c.tipo === 'numero' ? 0 : '')
                    }));

                    const merged = baseList.map(b => {
                      const copy = { ...b } as any;
                      const v = (vals || []).find((x: any) => String(x.id_caracteristica ?? x.id) === String(copy.id_caracteristica));
                      if (v) {
                        if (copy.tipo === 'numero') copy.valorUsuario = v.valor_numero ?? v.valor ?? copy.valorUsuario;
                        else if (copy.tipo === 'booleano' || copy.tipo === 'boolean') copy.valorUsuario = (v.valor_booleano ?? v.valor) === true;
                        else copy.valorUsuario = v.valor_texto ?? v.valor ?? copy.valorUsuario;
                        copy.valorProveedor = v;
                      }
                      copy.valor = copy.valorUsuario ?? (copy.valorProveedor && (copy.valorProveedor.valor_texto ?? copy.valorProveedor.valor_numero ?? copy.valorProveedor.valor_booleano ?? copy.valorProveedor.valor)) ?? '';
                      return copy;
                    });

                    this.caracteristicas.set(merged);
                  },
                  error: () => {
                    const fallback = (vals || []).map((v: any, idx: number) => ({
                      id_caracteristica: v.id_caracteristica ?? v.id ?? idx,
                      nombre_caracteristica: v.nombre_caracteristica ?? v.nombre ?? 'Característica',
                      tipo: v.tipo_valor ?? v.tipo ?? 'texto',
                      valor: v.valor ?? v.valor_texto ?? v.valor_numero ?? v.valor_booleano ?? ''
                    }));
                    this.caracteristicas.set(fallback);
                  }
                });
              } else {
                // No hay tipo asociado: usar sólo los valores del proveedor
                const fallback = (vals || []).map((v: any, idx: number) => ({
                  id_caracteristica: v.id_caracteristica ?? v.id ?? idx,
                  nombre_caracteristica: v.nombre_caracteristica ?? v.nombre ?? 'Característica',
                  tipo: v.tipo_valor ?? v.tipo ?? 'texto',
                  valor: v.valor ?? v.valor_texto ?? v.valor_numero ?? v.valor_booleano ?? ''
                }));
                this.caracteristicas.set(fallback);
              }
            },
            error: () => {
              // En caso de fallo al obtener valores del proveedor, devolver lista vacía
              this.caracteristicas.set([]);
            }
          });
        };

        // Ejecutar resolución dependiente para el proveedor parcial
        resolveDependentFields(mergedProv);

        

        // Asegurar fecha_registro explícita si viene en rawProv
        if (rawProv?.fecha_registro && !this.proveedor()?.fecha_registro) {
          this.proveedor.set({ ...this.proveedor(), fecha_registro: rawProv.fecha_registro });
        }

        // asegurar precio
        const price = rawProv.precio_base ?? rawProv.precio ?? rawProv.price ?? rawProv.precioBase ?? null;
        if (price != null) this.proveedor.set({ ...this.proveedor(), precio_base: price });

        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar proveedor por id:', err);
        this.error.set('No se pudo cargar la información del proveedor');
        this.loading.set(false);
      }
    });
  }

  private normalizarProveedor(raw: any): any {
    if (!raw) return {};
    const base = Array.isArray(raw) ? raw[0] : raw;
    // La vista devuelve campos ya aplanados (ej: nombre_empresa, tipo_empresa)
    const obj = base?.proveedor ?? base;

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

    const tipoObj = firstVal(obj, ['tipo', 'tipoInfo', 'categoria_detalle', 'tipo_empresa']) as any;
    const planObj = firstVal(obj, ['plan', 'planInfo', 'plan_data', 'planDetails']) as any;

    const idTipoClean = (firstVal(obj, ['id_tipo', 'idTipo', 'tipo_id', 'tipoId', 'categoria_id', 'categoriaId']) ?? firstVal(tipoObj, ['id', 'id_tipo', 'tipo_id', 'categoria_id'])) as any;
    const idPlanClean = (firstVal(obj, ['id_plan', 'idPlan', 'plan_id', 'planId']) ?? firstVal(planObj, ['id', 'id_plan', 'plan_id'])) as any;

    const nombrePlanClean = (firstVal(obj, ['nombre_plan', 'plan_nombre', 'planNombre', 'planName', 'planTitulo', 'plan_titulo']) ?? firstVal(planObj, ['nombre', 'name', 'title', 'nombre_plan', 'plan_nombre', 'planName', 'planTitulo'])) as any;
    const tipoNombreClean = (firstVal(obj, ['tipo_nombre', 'nombre_tipo', 'categoria', 'categoria_nombre', 'tipo_empresa']) ?? firstVal(tipoObj, ['nombre', 'name', 'tipo_nombre', 'categoria'])) as any;
    const precioBaseClean = firstVal(obj, ['precio_base', 'precio', 'price', 'precioBase']) as any;

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
      // Mantener todos los campos originales y añadir nombres normalizados que usa la UI
      ...obj,
      nombre: obj.nombre ?? obj.nombre_empresa ?? obj.nom_empresa_proveedor ?? obj.nombre_proveedor,
      estado_aprobacion: estadoAprob || (obj.estado_aprobacion ?? 'pendiente'),
      estado: normalizeBool(obj.estado ?? obj.activo ?? obj.enabled ?? obj.habilitado ?? obj.estado_registro),
      verificado: normalizeBool(obj.verificado ?? obj.email_verificado ?? obj.verificado_email),
      id_tipo: idTipoClean ?? obj.tipo?.id ?? obj.categoria_id ?? obj.tipo,
      tipo_nombre: tipoNombreClean ?? obj.tipo?.nombre ?? obj.categoria ?? obj.tipo_empresa,
      id_plan: idPlanClean ?? obj.plan?.id ?? obj.plan?.id_plan,
      nombre_plan: nombrePlanClean ?? obj.plan?.nombre ?? obj.plan?.nombre_plan ?? obj.plan?.nombrePlan,
      precio_base: precioBaseClean ?? obj.precio_base ?? obj.precio ?? obj.price,
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
    if (!p) return '-';
    const direct = p.nombre_plan ?? p.plan_nombre ?? null;
    const resolved = this.resolvePlanName(p);
    if (!this.loggedPlan) {
      console.log('[ver-proveedor] plan debug:', { direct, resolved, proveedor: p });
      this.loggedPlan = true;
    }
    if (direct && !this.isEmptyPlanLabel(direct)) return String(direct);
    return resolved || '-';
  }

  private resolvePlanName(p: any): string {
    if (!p) return '';
    const rawPlan = p.nombre_plan ?? p.plan_nombre ?? p.plan ?? null;
    if (Array.isArray(rawPlan)) {
      const names = this.resolvePlanNamesFromArray(rawPlan);
      if (names.length) return names.join(this.planArraySeparator);
    } else if (rawPlan && typeof rawPlan === 'object') {
      const name = rawPlan.nombre_plan ?? rawPlan.nombre ?? rawPlan.name ?? rawPlan.title ?? '';
      if (name && !this.isEmptyPlanLabel(name)) return String(name);
      const idObj = rawPlan.id_plan ?? rawPlan.id ?? '';
      if (idObj && this.planesById.has(String(idObj))) return this.planesById.get(String(idObj)) as string;
    } else if (rawPlan) {
      const s = String(rawPlan).trim();
      if (!this.isEmptyPlanLabel(s)) {
        if (this.planesById.has(s)) return this.planesById.get(s) as string;
        return s;
      }
    }

    const idPlanesRaw = p.id_planes ?? p.planes ?? null;
    if (Array.isArray(idPlanesRaw)) {
      const names = this.resolvePlanNamesFromArray(idPlanesRaw);
      if (names.length) return names.join(this.planArraySeparator);
    }

    const idPlan = p.id_plan ?? p.plan_id ?? p.idPlan ?? null;
    if (idPlan != null && this.planesById.has(String(idPlan))) {
      return this.planesById.get(String(idPlan)) as string;
    }
    return '';
  }

  private resolvePlanNamesFromArray(list: any[]): string[] {
    const result: string[] = [];
    for (const item of list) {
      if (item === null || item === undefined) continue;
      if (typeof item === 'object') {
        const name = item.nombre_plan ?? item.nombre ?? item.name ?? item.title ?? '';
        if (name && !this.isEmptyPlanLabel(name)) {
          result.push(String(name));
          continue;
        }
        const idObj = item.id_plan ?? item.id ?? '';
        if (idObj && this.planesById.has(String(idObj))) {
          result.push(this.planesById.get(String(idObj)) as string);
          continue;
        }
        const asString = String(idObj || '').trim();
        if (asString && !this.isEmptyPlanLabel(asString)) {
          result.push(asString);
        }
      } else {
        const raw = String(item).trim();
        if (!raw || this.isEmptyPlanLabel(raw)) continue;
        if (this.planesById.has(raw)) {
          result.push(this.planesById.get(raw) as string);
        } else {
          result.push(raw);
        }
      }
    }
    return Array.from(new Set(result));
  }

  private isEmptyPlanLabel(value: any): boolean {
    if (value === null || value === undefined) return true;
    const s = String(value).trim();
    if (!s) return true;
    const lower = s.toLowerCase();
    return s === '?' || s === '-' || lower === 'null' || lower === 'undefined';
  }

  esCaracteristicaFileUrl(caract: any): boolean {
    const value = caract?.valor ?? '';
    if (!value) return false;
    const raw = typeof value === 'string' ? value.trim() : String(value);
    if (!raw) return false;
    const lower = raw.toLowerCase();
    if (lower.startsWith('http://') || lower.startsWith('https://')) return true;
    if (lower.endsWith('.pdf')) return true;
    return lower.includes('cloudinary') || lower.includes('upload/');
  }

  esMenuCaracteristica(caract: any): boolean {
    const name = (caract?.nombre_caracteristica ?? caract?.nombre ?? '').toString().toLowerCase();
    return name.includes('menu');
  }

  abrirPdfCaracteristica(valor: any, nombre?: string): void {
    const resolved = this.resolveAssetUrl(valor);
    if (!resolved) return;
    this.pdfModalFileName.set(nombre ? `${nombre}.pdf` : 'Documento.pdf');
    this.pdfModalUrl.set(resolved);
    this.showPdfModal.set(true);
  }

  cerrarPdfModal(): void {
    this.showPdfModal.set(false);
    this.pdfModalUrl.set('');
  }

  private resolveAssetUrl(valor: any): string {
    if (!valor) return '';
    if (typeof valor === 'object') {
      const url = valor.url ?? valor.secure_url ?? '';
      if (url) return String(url);
    }
    let raw = typeof valor === 'string' ? valor.trim() : String(valor);
    if (!raw) return '';
    if (raw.startsWith('{') && raw.endsWith('}')) {
      try {
        const parsed = JSON.parse(raw);
        const url = parsed?.url ?? parsed?.secure_url ?? '';
        if (url) return String(url);
      } catch (e) {
        // ignore parse errors, treat as raw string
      }
    }
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
    if (raw.startsWith('/')) return `${window.location.origin}${raw}`;
    return `${window.location.origin}/${raw}`;
  }

  volver(): void {
    this.router.navigate(['/adm-proveedor']);
  }
}
