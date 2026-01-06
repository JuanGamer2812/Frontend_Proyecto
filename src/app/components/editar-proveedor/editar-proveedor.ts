import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../service/api.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-editar-proveedor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './editar-proveedor.html',
  styleUrl: './editar-proveedor.css'
})
export class EditarProveedor implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private apiService = inject(ApiService);

  formProveedor!: FormGroup;
  selectedCategory = '';
  proveedorId: number = 0;
  id_tipo: number = 0;
  loading = false;
  error: string | null = null;
  estadoAprobacionOriginal: string = 'aprobado'; // Valor por defecto
  
  // Características dinámicas
  caracteristicas: any[] = [];
  planes: any[] = [];
  imagenes: any[] = [];
  
  // Control de imágenes existentes y nuevas
  imagenesExistentes: any[] = []; // Imágenes que ya están en BD
  imagenesAEliminar: number[] = []; // IDs de imágenes a eliminar
  
  // Nuevas imágenes
  nuevasImagenesSlots: number[] = [];
  nuevasImagenes: Record<number, File> = {};
  nuevasImagenesUrls: Record<number, string> = {};
  nuevasImagenesPreviews: Record<number, string | ArrayBuffer | null> = {};
  nuevasImagenesModos: Record<number, 'file' | 'url'> = {};

  ngOnInit(): void {
    this.crearFormulario();
    
    // Obtener ID del proveedor desde la ruta
    this.route.params.subscribe(params => {
      this.proveedorId = +params['id'];
      if (this.proveedorId) {
        this.cargarProveedor();
      } else {
        this.error = 'ID de proveedor no válido';
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
          Validators.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s&.\-0-9]+$/),
        ],
      ],
      categoria_proveedor: ['', Validators.required],
      estado: [true],
      estado_aprobacion: ['pendiente'],

      // MÚSICA
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

      // DECORACIÓN
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
          this.error = 'No se pudo obtener la información del proveedor.';
          return;
        }

        this.id_tipo = Number(proveedorEnLista.id_tipo);

        // Mapear id_tipo a nombre de categoría
        const mapeoTipos: Record<number, string> = {
          1: 'Catering',
          2: 'Musica',
          3: 'Decoracion',
          4: 'Lugar',
          5: 'Fotografia'
        };

        this.selectedCategory = mapeoTipos[this.id_tipo] || '';

        if (!this.selectedCategory) {
          this.loading = false;
          this.error = 'Categoría no válida.';
          return;
        }

        // Cargar planes
        this.apiService.getPlanes().subscribe((planes: any[]) => {
          this.planes = planes || [];
        });

        // Cargar características del tipo
        this.apiService.getCaracteristicasByTipo(this.id_tipo).subscribe({
          next: (caracteristicasBase: any[]) => {
            console.log('Características base del tipo', this.id_tipo, ':', caracteristicasBase);
            
            // Ahora cargar datos del proveedor
            this.apiService.getProveedorById(this.proveedorId).subscribe({
              next: (prov) => {
                let provObj: any = prov;
                if (prov && typeof prov === 'object' && prov.proveedor) {
                  provObj = prov.proveedor;
                }
                
                // Cargar imágenes del proveedor
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
                
                console.log('Imágenes cargadas:', this.imagenes);
                
                // Cargar valores de características del proveedor
                this.apiService.getProveedorCaracteristicasById(this.proveedorId).subscribe({
                  next: (valsRaw: any) => {
                    console.log('Valores de características RAW:', valsRaw);
                    
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

                    console.log('Valores de características normalizados:', vals);

                    // Construir características con valores
                    this.caracteristicas = (caracteristicasBase || []).map(c => {
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

                    // Cargar datos generales
                    const estadoAprobacion = provObj.estado_aprobacion || proveedorEnLista.estado_aprobacion || 'aprobado';
                    this.estadoAprobacionOriginal = estadoAprobacion; // Guardar para usar en el update
                    
                    this.formProveedor.patchValue({
                      nom_empresa_proveedor: provObj.nombre || proveedorEnLista.nombre || '',
                      categoria_proveedor: this.selectedCategory,
                      estado: provObj.estado ?? proveedorEnLista.estado ?? true,
                      estado_aprobacion: estadoAprobacion
                    });

                    // Cargar datos específicos por categoría
                    const categoriaLower = this.selectedCategory.toLowerCase();
                    
                    if (categoriaLower === 'musica' || categoriaLower === 'música') {
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
                    } else if (categoriaLower === 'decoracion' || categoriaLower === 'decoración') {
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
                    console.log('Características cargadas:', this.caracteristicas.length);
                    console.log('Características:', this.caracteristicas);
                    console.log('Planes:', this.planes);
                    console.log('Imágenes:', this.imagenes);
                    console.log('====================================');
                  },
                  error: (err) => {
                    console.error('Error al cargar características del proveedor:', err);
                    // Si falla cargar características, mostrar las vacías
                    this.caracteristicas = (caracteristicasBase || []).map(c => ({
                      id_caracteristica: c.id_caracteristica || c.id,
                      nombre: c.nombre,
                      tipo: c.tipo_valor || c.tipo || 'texto',
                      obligatorio: !!c.obligatorio,
                      opciones: c.opciones || null,
                      valor: (c.tipo_valor === 'booleano' || c.tipo === 'booleano') ? false : ''
                    }));
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
            this.error = 'Error al cargar características: ' + (err.error?.message || err.message);
          }
        });
      },
      error: (err) => {
        this.loading = false;
        this.error = 'Error al cargar el proveedor: ' + (err.error?.message || err.message);
      }
    });
  }

  // Helpers
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

  onCategoryChange(event: any): void {
    this.selectedCategory = event.target.value;
  }

  isMusica() {
    return this.selectedCategory === 'Musica';
  }
  isCatering() {
    return this.selectedCategory === 'Catering';
  }
  isLugar() {
    return this.selectedCategory === 'Lugar';
  }
  isDecoracion() {
    return this.selectedCategory === 'Decoracion';
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
    // Asegurar que estado_aprobacion esté en minúsculas
    const estadoAprobacion = (formValue.estado_aprobacion || this.estadoAprobacionOriginal || 'aprobado').toLowerCase();
    
    const datosActualizar: any = {
      nombre: formValue.nom_empresa_proveedor,
      estado: formValue.estado,
      estado_aprobacion: estadoAprobacion,
      descripcion: grupoCategoria.descripcion,
      id_plan: grupoCategoria.plan ? parseInt(grupoCategoria.plan) : null
    };

    console.log('Estado aprobación a enviar:', datosActualizar.estado_aprobacion);

    // Agregar campos específicos según categoría
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

    // Preparar características para actualización separada
    const caracteristicasPayload = this.caracteristicas.map(c => ({
      id_caracteristica: c.id_caracteristica,
      valor: c.valor
    }));

    this.loading = true;
    
    // ESTRATEGIA "TODO O NADA": 
    // Guardamos datos originales para poder revertir si algo falla
    const datosOriginales = {
      proveedor: { ...datosActualizar },
      caracteristicas: [...caracteristicasPayload]
    };
    
    console.log('🔄 Iniciando actualización con estrategia "todo o nada"...');
    
    // PASO 1: Actualizar datos del proveedor
    this.apiService.updateProveedor(this.proveedorId, datosActualizar).subscribe({
      next: () => {
        console.log('✅ Paso 1/3: Proveedor actualizado');
        
        // PASO 2: Actualizar características
        this.apiService.updateProveedorCaracteristicas(this.proveedorId, caracteristicasPayload).subscribe({
          next: () => {
            console.log('✅ Paso 2/3: Características actualizadas');
            
            // PASO 3: Actualizar imágenes (si hay cambios)
            const hayCambiosImagenes = this.imagenesAEliminar.length > 0 || 
                                       Object.keys(this.nuevasImagenes).length > 0 || 
                                       Object.keys(this.nuevasImagenesUrls).length > 0;
            
            if (hayCambiosImagenes) {
              console.log('🖼️ Paso 3/3: Actualizando imágenes...');
              this.actualizarImagenes();
            } else {
              console.log('⏭️ Paso 3/3: Sin cambios en imágenes, finalizando...');
              this.finalizarActualizacion();
            }
          },
          error: (err) => {
            console.error('❌ Error en paso 2/3 (características):', err);
            this.loading = false;
            
            const detalle = err.error?.detalle || err.error?.message || err.message;
            Swal.fire({
              icon: 'error',
              title: 'No se pudo completar la actualización',
              text: 'Falló al actualizar las características. Es posible que los datos generales se hayan guardado. Error: ' + detalle
            });
          }
        });
      },
      error: (err) => {
        console.error('❌ Error en paso 1/3 (proveedor):', err);
        this.loading = false;
        
        const detalle = err.error?.detalle || err.error?.message || err.message;
        Swal.fire({
          icon: 'error',
          title: 'No se pudo guardar',
          text: 'Falló al actualizar los datos del proveedor. Error: ' + detalle
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
      confirmButtonText: 'Sí, descartar',
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
        group.get(controlName)?.setValue(file.name);
        group.get(controlName)?.markAsTouched();
      }
    }
  }

  // ============ GESTIÓN DE IMÁGENES ============
  
  // Marcar imagen existente para eliminar
  async eliminarImagenExistente(imagenId: number): Promise<void> {
    const confirmacion = await Swal.fire({
      icon: 'question',
      title: 'Eliminar imagen',
      text: '¿Eliminar esta imagen?',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (confirmacion.isConfirmed) {
      this.imagenesAEliminar.push(imagenId);
      this.imagenes = this.imagenes.filter(img => img.id !== imagenId);
      console.log('🗑️ Imagen marcada para eliminar:', imagenId);
    }
  }
  
  // Añadir slot para nueva imagen
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
      
      console.log(`🖼️ Nueva imagen [${slotId}]: ${file.name}`);
    }
  }
  
  // Cambiar URL de imagen
  onNuevaImagenUrlChange(slotId: number, url: string): void {
    const urlTrimmed = url.trim();
    this.nuevasImagenesUrls[slotId] = urlTrimmed;
    if (urlTrimmed) {
      this.nuevasImagenesPreviews[slotId] = urlTrimmed;
      console.log(`🔗 URL nueva imagen [${slotId}]: ${urlTrimmed}`);
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
  
  // Actualizar imágenes del proveedor
  private actualizarImagenes(): void {
    console.log('🖼️ Actualizando imágenes...');
    console.log('Imágenes a eliminar:', this.imagenesAEliminar);
    console.log('Nuevas imágenes (archivos):', Object.keys(this.nuevasImagenes).length);
    console.log('Nuevas imágenes (URLs):', Object.keys(this.nuevasImagenesUrls).length);
    
    // Paso 1: Eliminar imágenes marcadas
    if (this.imagenesAEliminar.length > 0) {
      this.eliminarImagenesMarcadas();
    } else {
      // Si no hay imágenes a eliminar, pasar directamente a subir nuevas
      this.subirNuevasImagenes();
    }
  }
  
  private eliminarImagenesMarcadas(): void {
    const eliminaciones = this.imagenesAEliminar.map(id => 
      this.apiService.eliminarImagenProveedor(id)
    );
    
    if (eliminaciones.length === 0) {
      this.subirNuevasImagenes();
      return;
    }
    
    console.log(`🗑️ Eliminando ${eliminaciones.length} imagen(es)...`);
    
    // Eliminar todas las imágenes en paralelo
    Promise.all(eliminaciones.map(obs => obs.toPromise()))
      .then(() => {
        console.log('✅ Imágenes eliminadas correctamente');
        this.subirNuevasImagenes();
      })
      .catch(err => {
        console.error('❌ Error al eliminar imágenes:', err);
        this.loading = false;
        const detalle = err.error?.detalle || err.error?.message || err.message;
        Swal.fire({
          icon: 'error',
          title: 'No se pudieron eliminar imágenes',
          text: 'Falló al eliminar las imágenes. Los datos generales y características ya se guardaron. Error: ' + detalle
        });
      });
  }
  
  private subirNuevasImagenes(): void {
    const hayNuevasImagenes = Object.keys(this.nuevasImagenes).length > 0 || 
                              Object.keys(this.nuevasImagenesUrls).length > 0;
    
    if (!hayNuevasImagenes) {
      // No hay nuevas imágenes, finalizar
      this.finalizarActualizacion();
      return;
    }
    
    // Crear FormData con nuevas imágenes
    const formData = new FormData();
    formData.append('id_proveedor', this.proveedorId.toString());
    
    // Añadir archivos
    Object.entries(this.nuevasImagenes).forEach(([slotId, file]) => {
      formData.append('imagenes', file);
    });
    
    // Añadir URLs
    Object.entries(this.nuevasImagenesUrls).forEach(([slotId, url]) => {
      if (url.trim()) {
        formData.append('urls', url.trim());
      }
    });
    
    // Subir imágenes
    this.apiService.subirImagenesProveedor(formData).subscribe({
      next: () => {
        console.log('✅ Nuevas imágenes subidas correctamente');
        this.finalizarActualizacion();
      },
      error: (err) => {
        console.error('❌ Error al subir imágenes:', err);
        this.loading = false;
        const detalle = err.error?.detalle || err.error?.message || err.message;
        const extra = err.error?.error || '';
        Swal.fire({
          icon: 'error',
          title: 'No se pudo completar la actualización',
          text: 'Falló al subir las nuevas imágenes. Los datos generales, características y eliminación de imágenes ya se guardaron. Error: ' + detalle + (extra ? ' | ' + extra : '')
        });
      }
    });
  }
  
  private finalizarActualizacion(): void {
    this.loading = false;
    Swal.fire({ icon: 'success', title: 'Proveedor actualizado', text: 'El proveedor se actualizó exitosamente.' });
    this.router.navigate(['/adm-proveedor']);
  }
}
