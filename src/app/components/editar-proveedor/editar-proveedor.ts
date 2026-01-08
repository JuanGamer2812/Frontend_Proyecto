import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../service/api.service';
import { of } from 'rxjs';
import { PdfViewerModal } from '../pdf-viewer-modal/pdf-viewer-modal';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-editar-proveedor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, PdfViewerModal],
  templateUrl: './editar-proveedor.html',
  styleUrl: './editar-proveedor.css'
})
export class EditarProveedor implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private apiService = inject(ApiService);

  // Component state
  formProveedor!: FormGroup;
  selectedCategory = '';
  proveedorId: number = 0;
  id_tipo: number = 0;
  loading = false;
  error: string | null = null;
  estadoAprobacionOriginal: string = 'aprobado'; // Valor por defecto
  
  // CaracterÃ­sticas dinÃ¡micas
  caracteristicas: any[] = [];
  planes: any[] = [];
  imagenes: any[] = [];
  
  // Control de imÃ¡genes existentes y nuevas
  imagenesExistentes: any[] = []; // ImÃ¡genes que ya estÃ¡n en BD
  imagenesAEliminar: number[] = []; // IDs de imÃ¡genes a eliminar
  
  // Nuevas imÃ¡genes
  nuevasImagenesSlots: number[] = [];
  nuevasImagenes: Record<number, File> = {};
  nuevasImagenesUrls: Record<number, string> = {};
  nuevasImagenesPreviews: Record<number, string | ArrayBuffer | null> = {};
  nuevasImagenesModos: Record<number, 'file' | 'url'> = {};

  // Menus (caracteristicas)
  menuInputModes: Record<number, 'file' | 'url'> = {};
  menuUrlInputs: Record<number, string> = {};
  menuFiles: Record<number, File> = {};
  
  // Modal de PDF
  mostrarPdfModal = false;
  pdfUrl = '';
  pdfFileName = 'documento.pdf';

  ngOnInit(): void {
    this.crearFormulario();
    
    // Obtener ID del proveedor desde la ruta
    this.route.params.subscribe(params => {
      this.proveedorId = +params['id'];
      if (this.proveedorId) {
        this.cargarProveedor();
      } else {
        this.error = 'ID de proveedor no vÃ¡lido';
      }
    });
  }

  crearFormulario(): void {
    this.formProveedor = this.fb.group({
      // DATOS GENERALES
      nom_empresa_proveedor: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(100),
          Validators.pattern(/^[a-zA-ZÃ¡Ã©Ã­Ã³ÃºÃÃ‰ÃÃ“ÃšÃ±Ã‘\s&.\-0-9]+$/),
        ],
      ],
      categoria_proveedor: ['', Validators.required],
      estado: [true],
      estado_aprobacion: ['pendiente'],

      // MÃšSICA
      musica: this.fb.group(
        {
          genero: ['', [Validators.minLength(3), Validators.maxLength(50)]],
          precio: [null, [Validators.min(1), Validators.max(999999)]],
          porHora: [''],
          horaInicio: [''],
          horaFin: [''],
          descripcion: ['', [Validators.minLength(10), Validators.maxLength(500)]],
          plan: [''],
        },
        { validators: this.validarHorario }
      ),

      // CATERING
      catering: this.fb.group({
        tipoComida: ['', [Validators.minLength(3), Validators.maxLength(50)]],
        precioPersona: [null, [Validators.min(1), Validators.max(999999)]],
        menuFile: [''],
        descripcion: ['', [Validators.minLength(10), Validators.maxLength(500)]],
        plan: [''],
      }),

      // LUGAR
      lugar: this.fb.group({
        capacidad: [null, [Validators.min(1), Validators.max(10000)]],
        precio: [null, [Validators.min(1), Validators.max(999999)]],
        direccion: ['', [Validators.minLength(5), Validators.maxLength(200)]],
        descripcion: ['', [Validators.minLength(10), Validators.maxLength(500)]],
        seguridad: [''],
        plan: [''],
      }),

      // DECORACIÃ“N
      decoracion: this.fb.group({
        nivel: [''],
        tipo: ['', [Validators.minLength(3), Validators.maxLength(50)]],
        precio: [null, [Validators.min(1), Validators.max(999999)]],
        catalogoFile: [''],
        logoFile: [''],
      }),
    });
  }

  cargarProveedor(): void {
    this.loading = true;
    this.error = null;

    // Primero obtener el listado para conseguir el id_tipo
    this.apiService.getProveedores().subscribe({
      next: (listaProveedores) => {
        const proveedorEnLista = listaProveedores.find((p: any) => Number(p.id_proveedor) === this.proveedorId);
        
        if (!proveedorEnLista || !proveedorEnLista.id_tipo) {
          this.loading = false;
          this.error = 'No se pudo obtener la informaciÃ³n del proveedor.';
          return;
        }

        this.id_tipo = Number(proveedorEnLista.id_tipo);

        // Obtener el nombre del tipo desde la base de datos
        this.apiService.getTiposProveedor().subscribe({
          next: (tipos: any[]) => {
            const tipoEncontrado = tipos.find(t => t.id === this.id_tipo || t.id_tipo === this.id_tipo);
            if (tipoEncontrado) {
              // Normalizar el nombre del tipo (primera mayÃºscula, resto minÃºscula)
              const nombreTipo = tipoEncontrado.nombre || tipoEncontrado.nombre_tipo || '';
              this.selectedCategory = nombreTipo.charAt(0).toUpperCase() + nombreTipo.slice(1).toLowerCase();
            }

            if (!this.selectedCategory) {
              this.loading = false;
              this.error = 'CategorÃ­a no vÃ¡lida.';
              return;
            }

            this.continuarCargaProveedor(proveedorEnLista);
          },
          error: () => {
            this.loading = false;
            this.error = 'Error al cargar tipos de proveedor.';
          }
        });
      },
      error: (err) => {
        this.loading = false;
        this.error = 'Error al cargar el proveedor: ' + (err.error?.message || err.message);
      }
    });
  }

  private continuarCargaProveedor(proveedorEnLista: any): void {
    // Cargar planes
    this.apiService.getPlanes().subscribe((planes: any[]) => {
      this.planes = planes || [];
    });

    // Cargar caracterÃ­sticas del tipo
    this.apiService.getCaracteristicasByTipo(this.id_tipo).subscribe({
      next: (caracteristicasBase: any[]) => {
            console.log('CaracterÃ­sticas base del tipo', this.id_tipo, ':', caracteristicasBase);
            
            // Ahora cargar datos del proveedor
            this.apiService.getProveedorById(this.proveedorId).subscribe({
              next: (prov) => {
                let provObj: any = prov;
                if (prov && typeof prov === 'object' && prov.proveedor) {
                  provObj = prov.proveedor;
                }
                
                // Cargar imÃ¡genes del proveedor
                const imgs: Array<{ id?: any; url?: any }> = [];
                if (Array.isArray(prov.proveedor_imagen) && prov.proveedor_imagen.length) {
                  prov.proveedor_imagen.forEach((it: any) => {
                    const idImg = it?.id_proveedor_imagen ?? it?.id ?? `provimg-${Math.random().toString(36).slice(2,8)}`;
                    const u = it?.url_imagen || it?.ruta || it?.url || it?.path || '';
                    imgs.push({ id: idImg, url: u });
                  });
                } else if (Array.isArray(provObj.proveedor_imagen) && provObj.proveedor_imagen.length) {
                  provObj.proveedor_imagen.forEach((it: any) => {
                    const idImg = it?.id_proveedor_imagen ?? it?.id ?? `provimg-${Math.random().toString(36).slice(2,8)}`;
                    const u = it?.url_imagen || it?.ruta || it?.url || it?.path || '';
                    imgs.push({ id: idImg, url: u });
                  });
                }
                
                // Normalizar URLs
                const normalizeUrl = (u: string) => {
                  const s = (typeof u === 'string' ? u : String(u || '')).trim();
                  if (!s) return '';
                  if (/^https?:\/\//i.test(s)) return s;
                  if (s.startsWith('/')) return window.location.origin + s;
                  return window.location.origin + '/' + s;
                };
                
                this.imagenes = imgs.map(o => ({ id: o.id ?? o.url, url: normalizeUrl(o.url) })).filter(o => o.url);
                this.imagenesExistentes = [...this.imagenes]; // Copia para control
                
                console.log('ImÃ¡genes cargadas:', this.imagenes);
                
                // Cargar valores de caracterÃ­sticas del proveedor
                this.apiService.getProveedorCaracteristicasById(this.proveedorId).subscribe({
                  next: (valsRaw: any) => {
                    console.log('Valores de caracterÃ­sticas RAW:', valsRaw);
                    
                    // Normalizar respuesta
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

                    console.log('Valores de caracterÃ­sticas normalizados:', vals);

                    // Construir características con valores (excluyendo selección del menú y notas adicionales)
                    this.caracteristicas = (caracteristicasBase || [])
                      .filter(c => {
                        const nombreLower = (c.nombre || '').toLowerCase();
                        return !nombreLower.includes('selección del menú') && 
                               !nombreLower.includes('seleccion del menu') &&
                               !nombreLower.includes('notas adicionales');
                      })
                      .map(c => {
                      const valor = vals.find((v: any) => Number(v.id_caracteristica || v.id) === Number(c.id_caracteristica || c.id));
                      let valorActual = '';
                      
                      if (valor) {
                        if (c.tipo_valor === 'numero' || c.tipo === 'numero') {
                          valorActual = valor.valor_numero ?? valor.valor ?? '';
                        } else if (c.tipo_valor === 'booleano' || c.tipo === 'booleano') {
                          valorActual = valor.valor_booleano ?? valor.valor ?? false;
                        } else {
                          valorActual = valor.valor_texto ?? valor.valor ?? '';
                        }
                      }

                      return {
                        id_caracteristica: c.id_caracteristica || c.id,
                        nombre: c.nombre,
                        tipo: c.tipo_valor || c.tipo || 'texto',
                        obligatorio: !!c.obligatorio,
                        opciones: c.opciones || null,
                        valor: valorActual
                      };
                    });
                    this.syncMenuInputsFromCaracteristicas();

                    // Debug: mostrar características de menú
                    const menuCars = this.caracteristicas.filter(c => this.esMenuCaracteristicaNombre(c.nombre));
                    console.log('[editar-proveedor] Características de menú encontradas:', menuCars);
                    menuCars.forEach(c => {
                      console.log(`[editar-proveedor] Menu car "${c.nombre}": valor="${c.valor}", esFileUrl=${this.esCaracteristicaFileUrlValor(c.valor)}, resolved="${this.resolveAssetUrl(c.valor)}"`);
                    });

                    // Cargar datos generales
                    const estadoAprobacion = provObj.estado_aprobacion || proveedorEnLista.estado_aprobacion || 'aprobado';
                    this.estadoAprobacionOriginal = estadoAprobacion; // Guardar para usar en el update
                    
                    this.formProveedor.patchValue({
                      nom_empresa_proveedor: provObj.nombre || proveedorEnLista.nombre || '',
                      categoria_proveedor: this.selectedCategory,
                      estado: provObj.estado ?? proveedorEnLista.estado ?? true,
                      estado_aprobacion: estadoAprobacion
                    });

                    // Cargar datos especÃ­ficos por categorÃ­a
                    const categoriaLower = this.selectedCategory.toLowerCase();
                    
                    if (categoriaLower === 'musica' || categoriaLower === 'mÃºsica') {
                      this.formProveedor.get('musica')?.patchValue({
                        genero: provObj.genero || proveedorEnLista.genero || '',
                        precio: provObj.precio_base || provObj.precio || proveedorEnLista.precio_base || null,
                        porHora: (provObj.por_hora || proveedorEnLista.por_hora) ? 'si' : 'no',
                        horaInicio: provObj.hora_inicio || proveedorEnLista.hora_inicio || '',
                        horaFin: provObj.hora_fin || proveedorEnLista.hora_fin || '',
                        descripcion: provObj.descripcion || proveedorEnLista.descripcion || '',
                        plan: (provObj.id_plan || proveedorEnLista.id_plan) ? String(provObj.id_plan || proveedorEnLista.id_plan) : ''
                      });
                    } else if (categoriaLower === 'catering') {
                      this.formProveedor.get('catering')?.patchValue({
                        tipoComida: provObj.tipo_comida || proveedorEnLista.tipo_comida || '',
                        precioPersona: provObj.precio_base || provObj.precio || proveedorEnLista.precio_base || null,
                        menuFile: provObj.menu || proveedorEnLista.menu || '',
                        descripcion: provObj.descripcion || proveedorEnLista.descripcion || '',
                        plan: (provObj.id_plan || proveedorEnLista.id_plan) ? String(provObj.id_plan || proveedorEnLista.id_plan) : ''
                      });
                    } else if (categoriaLower === 'lugar') {
                      this.formProveedor.get('lugar')?.patchValue({
                        capacidad: provObj.capacidad || proveedorEnLista.capacidad || null,
                        precio: provObj.precio_base || provObj.precio || proveedorEnLista.precio_base || null,
                        direccion: provObj.direccion || proveedorEnLista.direccion || '',
                        descripcion: provObj.descripcion || proveedorEnLista.descripcion || '',
                        seguridad: (provObj.seguridad || proveedorEnLista.seguridad) ? 'si' : 'no',
                        plan: (provObj.id_plan || proveedorEnLista.id_plan) ? String(provObj.id_plan || proveedorEnLista.id_plan) : ''
                      });
                    } else if (categoriaLower === 'decoracion' || categoriaLower === 'decoraciÃ³n') {
                      this.formProveedor.get('decoracion')?.patchValue({
                        nivel: provObj.nivel || proveedorEnLista.nivel || '',
                        tipo: provObj.tipo_nombre || proveedorEnLista.tipo_nombre || '',
                        precio: provObj.precio_base || provObj.precio || proveedorEnLista.precio_base || null,
                        catalogoFile: provObj.pdf_catalogo || provObj.catalogo || proveedorEnLista.pdf_catalogo || '',
                        logoFile: ''
                      });
                    }
                    
                    this.loading = false;
                    console.log('========== DATOS FINALES ==========');
                    console.log('CaracterÃ­sticas cargadas:', this.caracteristicas.length);
                    console.log('CaracterÃ­sticas:', this.caracteristicas);
                    console.log('Planes:', this.planes);
                    console.log('ImÃ¡genes:', this.imagenes);
                    console.log('====================================');
                  },
                  error: (err) => {
                    console.error('Error al cargar caracterÃ­sticas del proveedor:', err);
                    // Si falla cargar características, mostrar las vacías (excluyendo selección del menú y notas adicionales)
                    this.caracteristicas = (caracteristicasBase || [])
                      .filter(c => {
                        const nombreLower = (c.nombre || '').toLowerCase();
                        return !nombreLower.includes('selección del menú') && 
                               !nombreLower.includes('seleccion del menu') &&
                               !nombreLower.includes('notas adicionales');
                      })
                      .map(c => ({
                      id_caracteristica: c.id_caracteristica || c.id,
                      nombre: c.nombre,
                      tipo: c.tipo_valor || c.tipo || 'texto',
                      obligatorio: !!c.obligatorio,
                      opciones: c.opciones || null,
                      valor: (c.tipo_valor === 'booleano' || c.tipo === 'booleano') ? false : ''
                    }));
                    this.syncMenuInputsFromCaracteristicas();
                    this.loading = false;
                  }
                });
              },
              error: (err) => {
                this.loading = false;
                this.error = 'Error al cargar los detalles: ' + (err.error?.message || err.message);
              }
            });
      },
      error: (err) => {
        this.loading = false;
        this.error = 'Error al cargar características base: ' + (err.error?.message || err.message);
      }
    });
  }

  // Helpers - Form getters
  get f() {
    return this.formProveedor.controls;
  }

  get gMusica() {
    return (this.formProveedor.get('musica') as FormGroup).controls;
  }

  get gCatering() {
    return (this.formProveedor.get('catering') as FormGroup).controls;
  }

  get gLugar() {
    return (this.formProveedor.get('lugar') as FormGroup).controls;
  }

  get gDecoracion() {
    return (this.formProveedor.get('decoracion') as FormGroup).controls;
  }

  // Category helpers
  onCategoryChange(event: any): void {
    this.selectedCategory = event.target.value;
  }

  isMusica(): boolean {
    return this.selectedCategory === 'Musica';
  }

  isCatering(): boolean {
    return this.selectedCategory === 'Catering';
  }

  isLugar(): boolean {
    return this.selectedCategory === 'Lugar';
  }

  isDecoracion(): boolean {
    return this.selectedCategory === 'Decoracion';
  }

  esMenuCaracteristicaNombre(nombre?: string): boolean {
    const n = (nombre || '').toString().toLowerCase();
    return n.includes('menu') || n.includes('menú');
  }

  getMenuInputMode(car: any): 'file' | 'url' {
    const id = this.getCaracteristicaId(car);
    if (!Number.isFinite(id)) return 'url';
    return this.menuInputModes[id] ?? 'url';
  }

  setMenuInputMode(car: any, mode: 'file' | 'url'): void {
    const id = this.getCaracteristicaId(car);
    if (!Number.isFinite(id)) return;
    this.menuInputModes[id] = mode;
    if (mode === 'file') {
      this.menuUrlInputs[id] = '';
    } else {
      delete this.menuFiles[id];
    }
  }

  onMenuCaracteristicaFileChange(event: Event, car: any): void {
    const input = event.target as HTMLInputElement;
    if (!input?.files || input.files.length === 0) return;
    const file = input.files[0];
    const id = this.getCaracteristicaId(car);
    if (Number.isFinite(id)) {
      this.menuFiles[id] = file;
      this.menuInputModes[id] = 'file';
      this.menuUrlInputs[id] = '';
    }
    const reader = new FileReader();
    reader.onload = () => {
      car.valor = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  onMenuCaracteristicaUrlChange(car: any, url: string): void {
    const trimmed = (url || '').trim();
    const id = this.getCaracteristicaId(car);
    if (Number.isFinite(id)) {
      this.menuUrlInputs[id] = trimmed;
      delete this.menuFiles[id];
      this.menuInputModes[id] = 'url';
    }
    car.valor = trimmed;
  }

  esCaracteristicaFileUrlValor(valor: any): boolean {
    if (!valor) return false;
    if (typeof valor === 'object') {
      const url = valor.url ?? valor.secure_url ?? '';
      if (url) return this.esCaracteristicaFileUrlValor(url);
    }
    let raw = typeof valor === 'string' ? valor.trim() : String(valor);
    if (!raw) return false;
    if (raw.startsWith('{') && raw.endsWith('}')) {
      try {
        const parsed = JSON.parse(raw);
        const url = parsed?.url ?? parsed?.secure_url ?? '';
        if (url) return this.esCaracteristicaFileUrlValor(url);
      } catch (e) {
        // ignore parse errors
      }
    }
    const lower = raw.toLowerCase();
    if (lower.startsWith('data:')) return true;
    if (lower.startsWith('http://') || lower.startsWith('https://')) return true;
    if (lower.endsWith('.pdf')) return true;
    return lower.includes('cloudinary') || lower.includes('upload/');
  }

  resolveAssetUrl(valor: any): string {
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
        // ignore parse errors
      }
    }
    if (raw.startsWith('data:')) return raw;
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
    if (raw.startsWith('/')) return `${window.location.origin}${raw}`;
    return `${window.location.origin}/${raw}`;
  }

  private syncMenuInputsFromCaracteristicas(): void {
    (this.caracteristicas || []).forEach((car: any) => {
      if (!this.esMenuCaracteristicaNombre(car?.nombre)) return;
      const id = this.getCaracteristicaId(car);
      if (!Number.isFinite(id)) return;
      if (car.valor != null) {
        const resolved = this.resolveAssetUrl(car.valor);
        if (resolved) {
          this.menuUrlInputs[id] = resolved;
        }
      }
      if (!this.menuInputModes[id]) {
        this.menuInputModes[id] = 'url';
      }
    });
  }

  private getCaracteristicaId(car: any): number {
    return Number(car?.id_caracteristica ?? car?.id);
  }

  validarHorario(group: AbstractControl): ValidationErrors | null {
    const inicio = group.get('horaInicio')?.value;
    const fin = group.get('horaFin')?.value;
    if (inicio && fin && fin <= inicio) return { horarioInvalido: true };
    return null;
  }

  private markGroupTouched(group: FormGroup) {
    Object.values(group.controls).forEach((control) => {
      control.markAsTouched();
      if (control instanceof FormGroup) this.markGroupTouched(control);
    });
  }

  isCategoryValid(): boolean {
    const categoria = this.selectedCategory?.toLowerCase();
    const group = this.formProveedor.get(categoria);
    if (!group) return false;
    const nombreValido = !!this.formProveedor.get('nom_empresa_proveedor')?.valid;
    return nombreValido && group.valid;
  }

  onSubmit(): void {
    this.markGroupTouched(this.formProveedor);

    if (!this.isCategoryValid()) {
      Swal.fire({ icon: 'warning', title: 'Campos pendientes', text: 'Revisa los campos en rojo antes de continuar.' });
      return;
    }

    const formValue = this.formProveedor.value;
    const categoria = this.selectedCategory.toLowerCase();
    const grupoCategoria = formValue[categoria];

    // Preparar datos para enviar
    // Asegurar que estado_aprobacion estÃ© en minÃºsculas
    const estadoAprobacion = (formValue.estado_aprobacion || this.estadoAprobacionOriginal || 'aprobado').toLowerCase();
    
    const datosActualizar: any = {
      nombre: formValue.nom_empresa_proveedor,
      estado: formValue.estado,
      estado_aprobacion: estadoAprobacion,
      descripcion: grupoCategoria.descripcion,
      id_plan: grupoCategoria.plan ? parseInt(grupoCategoria.plan) : null
    };

    console.log('Estado aprobaciÃ³n a enviar:', datosActualizar.estado_aprobacion);

    // Agregar campos especÃ­ficos segÃºn categorÃ­a
    if (this.selectedCategory === 'Musica') {
      datosActualizar.genero = grupoCategoria.genero;
      datosActualizar.precio_base = grupoCategoria.precio;
      datosActualizar.por_hora = grupoCategoria.porHora === 'si';
      datosActualizar.hora_inicio = grupoCategoria.horaInicio;
      datosActualizar.hora_fin = grupoCategoria.horaFin;
    } else if (this.selectedCategory === 'Catering') {
      datosActualizar.tipo_comida = grupoCategoria.tipoComida;
      datosActualizar.precio_base = grupoCategoria.precioPersona;
      datosActualizar.menu = grupoCategoria.menuFile;
    } else if (this.selectedCategory === 'Lugar') {
      datosActualizar.capacidad = grupoCategoria.capacidad;
      datosActualizar.precio_base = grupoCategoria.precio;
      datosActualizar.direccion = grupoCategoria.direccion;
      datosActualizar.seguridad = grupoCategoria.seguridad === 'si';
    } else if (this.selectedCategory === 'Decoracion') {
      datosActualizar.nivel = grupoCategoria.nivel;
      datosActualizar.precio_base = grupoCategoria.precio;
      datosActualizar.pdf_catalogo = grupoCategoria.catalogoFile;
    }

    // Preparar caracterÃ­sticas para actualizaciÃ³n separada
    this.loading = true;
    
    // ESTRATEGIA "TODO O NADA": 
    // Guardamos datos originales para poder revertir si algo falla
    const datosOriginales = {
      proveedor: { ...datosActualizar }
    };
    
    console.log('ðŸ”„ Iniciando actualizaciÃ³n con estrategia "todo o nada"...');
    
    // PASO 1: Actualizar datos del proveedor
    this.apiService.updateProveedor(this.proveedorId, datosActualizar).subscribe({
      next: () => {
        console.log('Paso 1/2: Proveedor actualizado');
        
        // PASO 2: Actualizar caracteristicas (incluye menu)
        this.actualizarCaracteristicas().subscribe({
          next: () => {
            // PASO 3: Actualizar imagenes (si hay cambios)
            const hayCambiosImagenes = this.imagenesAEliminar.length > 0 || 
                                       Object.keys(this.nuevasImagenes).length > 0 || 
                                       Object.keys(this.nuevasImagenesUrls).length > 0;
            
            if (hayCambiosImagenes) {
              console.log('Paso 3/3: Actualizando imagenes...');
              this.actualizarImagenes();
            } else {
              console.log('Paso 3/3: Sin cambios en imagenes, finalizando...');
              this.finalizarActualizacion();
            }
          },
          error: (err) => {
            console.error('Error en paso 2/3 (caracteristicas):', err);
            this.loading = false;
            const detalle = err.error?.detalle || err.error?.message || err.message;
            Swal.fire({
              icon: 'error',
              title: 'No se pudieron actualizar las caracteristicas',
              text: 'Fallo al actualizar caracteristicas del proveedor. Error: ' + detalle
            });
          }
        });
      },
      error: (err) => {
        console.error('Error en paso 1/2 (proveedor):', err);
        this.loading = false;
        
        const detalle = err.error?.detalle || err.error?.message || err.message;
        Swal.fire({
          icon: 'error',
          title: 'No se pudo guardar',
          text: 'Fallo al actualizar los datos del proveedor. Error: ' + detalle
        });
      }
    });
  }

  async onCancel(): Promise<void> {
    const confirmacion = await Swal.fire({
      icon: 'question',
      title: 'Descartar cambios',
      text: '¿Descartar los cambios y volver?',
      showCancelButton: true,
      confirmButtonText: 'SÃ­, descartar',
      cancelButtonText: 'Seguir editando'
    });

    if (confirmacion.isConfirmed) {
      this.router.navigate(['/adm-proveedor']);
    }
  }

  // Manejo de archivos
  onFileChange(event: Event, controlName: string, groupName: string): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const group = this.formProveedor.get(groupName) as FormGroup;
      if (group) {
        group.get(controlName)?.setValue(file);
        group.get(controlName)?.markAsTouched();
      }
    }
  }

  // ============ GESTIÃ“N DE IMÃGENES ============
  
  // Marcar imagen existente para eliminar
  async eliminarImagenExistente(imagenId: number): Promise<void> {
    const confirmacion = await Swal.fire({
      icon: 'question',
      title: 'Eliminar imagen',
      text: 'Â¿Eliminar esta imagen?',
      showCancelButton: true,
      confirmButtonText: 'SÃ­, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (confirmacion.isConfirmed) {
      this.imagenesAEliminar.push(imagenId);
      this.imagenes = this.imagenes.filter(img => img.id !== imagenId);
      console.log('ðŸ—‘ï¸ Imagen marcada para eliminar:', imagenId);
    }
  }
  
  // AÃ±adir slot para nueva imagen
  addNuevaImagenSlot(): void {
    const id = Date.now();
    this.nuevasImagenesSlots.push(id);
    this.nuevasImagenesModos[id] = 'file';
  }
  
  // Cambiar modo de entrada (archivo o URL)
  toggleModoNuevaImagen(slotId: number, modo: 'file' | 'url'): void {
    this.nuevasImagenesModos[slotId] = modo;
    if (modo === 'file') {
      delete this.nuevasImagenesUrls[slotId];
    } else {
      delete this.nuevasImagenes[slotId];
      delete this.nuevasImagenesPreviews[slotId];
    }
  }
  
  // Seleccionar archivo de imagen
  onNuevaImagenChange(event: Event, slotId: number): void {
    const input = event.target as HTMLInputElement;
    if (input?.files && input.files.length > 0) {
      const file = input.files[0];
      this.nuevasImagenes[slotId] = file;
      
      const reader = new FileReader();
      reader.onload = () => (this.nuevasImagenesPreviews[slotId] = reader.result);
      reader.readAsDataURL(file);
      
      console.log(`ðŸ–¼ï¸ Nueva imagen [${slotId}]: ${file.name}`);
    }
  }
  
  // Cambiar URL de imagen
  onNuevaImagenUrlChange(slotId: number, url: string): void {
    const urlTrimmed = url.trim();
    this.nuevasImagenesUrls[slotId] = urlTrimmed;
    if (urlTrimmed) {
      this.nuevasImagenesPreviews[slotId] = urlTrimmed;
      console.log(`ðŸ”— URL nueva imagen [${slotId}]: ${urlTrimmed}`);
    }
  }
  
  // Eliminar slot de nueva imagen
  eliminarNuevaImagenSlot(slotId: number): void {
    this.nuevasImagenesSlots = this.nuevasImagenesSlots.filter(id => id !== slotId);
    delete this.nuevasImagenes[slotId];
    delete this.nuevasImagenesUrls[slotId];
    delete this.nuevasImagenesPreviews[slotId];
    delete this.nuevasImagenesModos[slotId];
  }
  
  // Actualizar imÃ¡genes del proveedor
  private actualizarImagenes(): void {
    console.log('ðŸ–¼ï¸ Actualizando imÃ¡genes...');
    console.log('ImÃ¡genes a eliminar:', this.imagenesAEliminar);
    console.log('Nuevas imÃ¡genes (archivos):', Object.keys(this.nuevasImagenes).length);
    console.log('Nuevas imÃ¡genes (URLs):', Object.keys(this.nuevasImagenesUrls).length);
    
    // Paso 1: Eliminar imÃ¡genes marcadas
    if (this.imagenesAEliminar.length > 0) {
      this.eliminarImagenesMarcadas();
    } else {
      // Si no hay imÃ¡genes a eliminar, pasar directamente a subir nuevas
      this.subirNuevasImagenes();
    }
  }

  private actualizarCaracteristicas() {
    const payload = this.construirCaracteristicasPayload();
    const menuUrls = this.getMenuUrlsPayload();
    const hasFiles = Object.keys(this.menuFiles).length > 0;
    const hasUrls = Object.keys(menuUrls).length > 0;

    if (payload.length === 0 && !hasFiles && !hasUrls) {
      return of(null);
    }

    if (hasFiles || hasUrls) {
      const formData = new FormData();
      formData.append('id_proveedor', this.proveedorId.toString());
      if (payload.length > 0) {
        formData.append('caracteristicas', JSON.stringify(payload));
      }
      if (hasUrls) {
        formData.append('caracteristicas_urls', JSON.stringify(menuUrls));
      }
      Object.entries(this.menuFiles).forEach(([id, file]) => {
        if (!file) return;
        formData.append(`caracteristica_${id}`, file, file.name);
      });
      return this.apiService.updateProveedorCaracteristicasMultipart(formData);
    }

    return this.apiService.updateProveedorCaracteristicas(payload);
  }

  private construirCaracteristicasPayload(): any[] {
    const normalizarValor = (value: any) => {
      if (value === undefined || value === null) return '';
      if (typeof value === 'object') return value;
      return value;
    };

    return (this.caracteristicas || []).map((c) => {
      const idCar = c.id_caracteristica ?? c.id;
      const tipo = (c.tipo || c.tipo_valor || '').toString().toLowerCase();
      const isMenu = this.esMenuCaracteristicaNombre(c.nombre);
      const menuId = this.getCaracteristicaId(c);
      const menuUrl = isMenu && Number.isFinite(menuId) ? (this.menuUrlInputs[menuId] || '') : '';
      const valorBase = menuUrl || c.valor;
      const payload: any = { id_proveedor: this.proveedorId, id_caracteristica: idCar };

      if (!idCar) return null;

      switch (tipo) {
        case 'numero':
        case 'number':
          payload.valor_numero = valorBase !== '' && valorBase !== null ? Number(valorBase) : null;
          break;
        case 'booleano':
        case 'boolean':
          payload.valor_booleano = valorBase === true || valorBase === 'true' || valorBase === 1;
          break;
        case 'json':
          payload.valor_json = normalizarValor(valorBase);
          break;
        default:
          payload.valor = (valorBase ?? '').toString();
      }

      return payload;
    }).filter(Boolean);
  }

  private getMenuUrlsPayload(): Record<string, string> {
    const output: Record<string, string> = {};
    Object.entries(this.menuUrlInputs).forEach(([id, url]) => {
      const trimmed = (url || '').trim();
      if (trimmed) output[id] = trimmed;
    });
    return output;
  }
  
  private eliminarImagenesMarcadas(): void {
    const eliminaciones = this.imagenesAEliminar.map(id => 
      this.apiService.eliminarImagenProveedor(id)
    );
    
    if (eliminaciones.length === 0) {
      this.subirNuevasImagenes();
      return;
    }
    
    console.log(`ðŸ—‘ï¸ Eliminando ${eliminaciones.length} imagen(es)...`);
    
    // Eliminar todas las imÃ¡genes en paralelo
    Promise.all(eliminaciones.map(obs => obs.toPromise()))
      .then(() => {
        console.log('âœ… ImÃ¡genes eliminadas correctamente');
        this.subirNuevasImagenes();
      })
      .catch(err => {
        console.error('âŒ Error al eliminar imÃ¡genes:', err);
        this.loading = false;
        const detalle = err.error?.detalle || err.error?.message || err.message;
        Swal.fire({
          icon: 'error',
          title: 'No se pudieron eliminar imÃ¡genes',
          text: 'FallÃ³ al eliminar las imÃ¡genes. Los datos generales y caracterÃ­sticas ya se guardaron. Error: ' + detalle
        });
      });
  }
  
  private subirNuevasImagenes(): void {
    const hayNuevasImagenes = Object.keys(this.nuevasImagenes).length > 0 || 
                              Object.keys(this.nuevasImagenesUrls).length > 0;
    
    if (!hayNuevasImagenes) {
      // No hay nuevas imÃ¡genes, finalizar
      this.finalizarActualizacion();
      return;
    }
    
    // Crear FormData con nuevas imÃ¡genes
    const formData = new FormData();
    formData.append('id_proveedor', this.proveedorId.toString());
    
    // AÃ±adir archivos
    Object.entries(this.nuevasImagenes).forEach(([slotId, file]) => {
      formData.append('imagenes', file);
    });
    
    // AÃ±adir URLs
    Object.entries(this.nuevasImagenesUrls).forEach(([slotId, url]) => {
      if (url.trim()) {
        formData.append('urls', url.trim());
      }
    });
    
    // Subir imÃ¡genes
    this.apiService.subirImagenesProveedor(formData).subscribe({
      next: () => {
        console.log('âœ… Nuevas imÃ¡genes subidas correctamente');
        this.finalizarActualizacion();
      },
      error: (err) => {
        console.error('âŒ Error al subir imÃ¡genes:', err);
        this.loading = false;
        const detalle = err.error?.detalle || err.error?.message || err.message;
        const extra = err.error?.error || '';
        Swal.fire({
          icon: 'error',
          title: 'No se pudo completar la actualizaciÃ³n',
          text: 'FallÃ³ al subir las nuevas imÃ¡genes. Los datos generales, caracterÃ­sticas y eliminaciÃ³n de imÃ¡genes ya se guardaron. Error: ' + detalle + (extra ? ' | ' + extra : '')
        });
      }
    });
  }
  
  // Abrir modal de PDF
  abrirPdfModal(url: string, nombre: string = 'documento.pdf'): void {
    console.log('[editar-proveedor] abrirPdfModal llamado con:', { url, nombre });
    this.pdfUrl = url;
    this.pdfFileName = nombre;
    this.mostrarPdfModal = true;
  }
  
  // Cerrar modal de PDF
  cerrarPdfModal(): void {
    this.mostrarPdfModal = false;
    this.pdfUrl = '';
    this.pdfFileName = 'documento.pdf';
  }
  
  private finalizarActualizacion(): void {
    this.loading = false;
    Swal.fire({ icon: 'success', title: 'Proveedor actualizado', text: 'El proveedor se actualizÃ³ exitosamente.' });
    this.router.navigate(['/adm-proveedor']);
  }
}

