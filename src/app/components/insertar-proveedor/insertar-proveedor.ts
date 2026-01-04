import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { ApiService } from '../../service/api.service';
import { AuthJwtService } from '../../service/auth-jwt.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-insertar-proveedor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './insertar-proveedor.html',
  styleUrls: ['./insertar-proveedor.css'],
})
export class InsertarProveedor implements OnInit {
  formProveedor!: FormGroup;
  selectedCategory = ''; // grupo de formulario (Musica/Catering/Lugar/Decoracion/Generico)
  selectedRawCategory = ''; // nombre crudo desde BD
  
  // Datos dinámicos
  categorias: { label: string; value: string; raw: string; id_tipo?: number | null }[] = [];
  planes: any[] = [];
  postulantes: any[] = []; // NUEVO: lista de postulantes
  postulanteSeleccionado: any = null; // NUEVO: postulante actual
  caracteristicasActuales: any[] = []; // NUEVO: características del tipo de proveedor
  // Imágenes
  imagenPrincipalFile: File | null = null;
  imagenPrincipalUrl: string = '';
  imagenPrincipalPreview: string | ArrayBuffer | null = null;
  modoImagenPrincipal: 'file' | 'url' = 'file'; // Modo de entrada: archivo o URL
  
  extraImageSlots: number[] = [];
  extraImages: Record<number, File> = {};
  extraImageUrls: Record<number, string> = {};
  extraImagePreviews: Record<number, string | ArrayBuffer | null> = {};
  extraImageModos: Record<number, 'file' | 'url'> = {};
  
  coverImageName: string | null = null;
  
  // Estados
  cargandoCategorias = true;
  cargandoPlanes = true;
  cargandoPostulantes = true; // NUEVO
  cargandoCaracteristicas = false; // NUEVO
  enviando = false;
  mensajeExito = '';
  mensajeError = '';

  // Archivos seleccionados
  archivosSeleccionados: File[] = [];

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private authService: AuthJwtService
  ) {
    this.crearFormulario();
  }

  ngOnInit(): void {
    this.cargarCategorias();
    this.cargarPlanes();
    this.cargarPostulantes(); // NUEVO
  }

  crearFormulario(): void {
    this.formProveedor = this.fb.group({
      // IMAGEN PRINCIPAL (se marca al seleccionar archivo)
      imagen_principal: ['', Validators.required],

      // DATOS GENERALES REQUERIDOS PARA INSERTAR PROVEEDOR
      categoria: ['', Validators.required],
      datosGenerales: this.fb.group({
        precio_base: ['', [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
        id_plan: [null, Validators.required],
        descripcion: ['', [Validators.required, Validators.maxLength(1000)]],
        estado: [true],
        verificado: [true],
      }),

      // CARACTERÍSTICAS DINÁMICAS (se inyectan al cargar categoría)
      caracteristicas: this.fb.group({}),
    });
  }

  // Helpers
  get f() {
    return this.formProveedor.controls;
  }

  isCategoryValid(): boolean {
    const imagenValida = !!this.imagenPrincipalFile || !!this.imagenPrincipalUrl || !!this.formProveedor.get('imagen_principal')?.value;
    const datosGeneralesValid = (this.formProveedor.get('datosGenerales') as FormGroup)?.valid ?? true;
    const caracteristicasValid = (this.formProveedor.get('caracteristicas') as FormGroup)?.valid ?? true;
    const categoriaValida = this.formProveedor.get('categoria')?.valid ?? true;

    return !!this.postulanteSeleccionado && !!this.selectedCategory && imagenValida && categoriaValida && datosGeneralesValid && caracteristicasValid;
  }

  // ============ CARGAR DATOS DINÁMICOS ============
  cargarCategorias(): void {
    this.cargandoCategorias = true;
    // Usar getTiposProveedor() en lugar de getCategorias() (que es para eventos)
    this.apiService.getTiposProveedor().subscribe({
      next: (data) => {
        this.categorias = (data || [])
          .filter((c: any) => {
            // Filtrar "Personalizado" - es de uso interno
            const nombre = (c?.nombre || c?.tipo || c?.categoria || c)?.toString().toUpperCase();
            return nombre !== 'PERSONALIZADO';
          })
          .map((c: any) => {
            const nombre = (c?.nombre || c?.tipo || c?.categoria || c)?.toString().toUpperCase();
            const label = this.getCategoriaLabel(nombre);
            return { label, value: nombre, raw: nombre, id_tipo: c.id_tipo ?? null };
          });
        this.cargandoCategorias = false;
        console.log('✅ Categorías de proveedores cargadas (sin Personalizado):', this.categorias.length);
      },
      error: (error) => {
        console.error('❌ Error cargando categorías:', error);
        this.cargandoCategorias = false;
        this.mostrarError('Error al cargar categorías');
      }
    });
  }

  cargarPlanes(): void {
    this.cargandoPlanes = true;
    this.apiService.getPlanes().subscribe({
      next: (data) => {
        // Filtrar "Personalizado" - es de uso interno
        this.planes = (data || []).filter((p: any) => {
          const nombre = (p?.nombre_plan || p?.nombre || '').toString().toUpperCase();
          return nombre !== 'PERSONALIZADO';
        });
        
        const planCtrl = this.formProveedor.get('datosGenerales.id_plan');
        if (planCtrl && (planCtrl.value === null || planCtrl.value === undefined) && this.planes?.length) {
          planCtrl.setValue(this.planes[0]?.id_plan ?? null);
        }
        this.cargandoPlanes = false;
        console.log('✅ Planes cargados (sin Personalizado):', this.planes.length);
      },
      error: (error) => {
        console.error('❌ Error cargando planes:', error);
        this.cargandoPlanes = false;
        this.mostrarError('Error al cargar planes');
      }
    });
  }

  // NUEVO: Cargar postulantes de trabaja_nosotros_proveedor
  cargarPostulantes(): void {
    this.cargandoPostulantes = true;
    this.apiService.getPostulantesProveedores().subscribe({
      next: (data) => {
        this.postulantes = data;
        this.cargandoPostulantes = false;
        console.log('✅ Postulantes cargados:', data.length);
      },
      error: (error) => {
        console.error('❌ Error cargando postulantes:', error);
        this.cargandoPostulantes = false;
      }
    });
  }

  // NUEVO: Seleccionar postulante y autocompletar campos
  seleccionarPostulante(event: any): void {
    const idPostulante = parseInt(event.target.value);
    if (!idPostulante) {
      this.postulanteSeleccionado = null;
      this.onReset();
      this.selectedCategory = '';
      this.selectedRawCategory = '';
      this.caracteristicasActuales = [];
      this.buildCaracteristicasForm([]);
      return;
    }

    this.postulanteSeleccionado = this.postulantes.find(p => p.id_postu_proveedor === idPostulante);
    
    if (this.postulanteSeleccionado) {
      console.log('📝 Postulante seleccionado:', this.postulanteSeleccionado);
      
      // Mapear categoría
      const categoriaRaw = this.postulanteSeleccionado.categoria_postu_proveedor;
      const categoriaGrupo = this.getCategoriaGrupo(categoriaRaw);
      
      // Autocompletar campos
      this.formProveedor.patchValue({
        categoria: categoriaRaw,
        imagen_principal: '',
        datosGenerales: {
          precio_base: '',
          id_plan: this.planes?.[0]?.id_plan ?? null,
          descripcion: this.postulanteSeleccionado.portafolio_postu_proveedor || '',
          estado: true,
          verificado: true,
        },
      });

      // Actualizar selectedCategory para desplegar la sección
      this.selectedCategory = categoriaGrupo;
      this.selectedRawCategory = categoriaRaw;
      
      console.log(`✅ Categoría mapeada: ${categoriaRaw} → ${categoriaGrupo}`);
      
      // Cargar características según la categoría seleccionada
      this.cargarCaracteristicas(categoriaGrupo);
    }
  }

  // NUEVO: Cargar características por tipo de proveedor
  cargarCaracteristicas(categoriaGrupo: string): void {
    const idTipo = this.obtenerIdTipo(this.selectedRawCategory, categoriaGrupo);
    if (!idTipo) {
      console.warn('⚠️ Tipo de proveedor no reconocido:', categoriaGrupo);
      this.caracteristicasActuales = [];
      this.buildCaracteristicasForm([]);
      return;
    }

    this.cargandoCaracteristicas = true;
    this.apiService.getCaracteristicasByTipo(idTipo).subscribe({
      next: (caracteristicas) => {
        this.caracteristicasActuales = caracteristicas || [];
        this.buildCaracteristicasForm(this.caracteristicasActuales);
        this.cargandoCaracteristicas = false;
        console.log(`✅ Características cargadas para ${categoriaGrupo} (id_tipo: ${idTipo}):`, this.caracteristicasActuales);
      },
      error: (err) => {
        console.error('❌ Error cargando características:', err);
        this.caracteristicasActuales = [];
        this.buildCaracteristicasForm([]);
        this.cargandoCaracteristicas = false;
      }
    });
  }

  private buildCaracteristicasForm(lista: any[]): void {
    const grupo = this.fb.group({});

    lista.forEach((car) => {
      const controlName = this.getCarControlName(car);
      const validators = [] as any[];
      const obligatorio = car?.obligatorio === true || car?.obligatorio === 'true' || car?.obligatorio === 1;
      if (obligatorio) validators.push(Validators.required);
      if ((car?.tipo_valor || '').toString().toLowerCase() === 'numero') {
        validators.push(Validators.pattern(/^-?\d+(\.\d+)?$/));
      }
      grupo.addControl(controlName, this.fb.control('', validators));
    });

    this.formProveedor.setControl('caracteristicas', grupo);
  }

  private normalizeText(valor: string): string {
    return (valor || '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private esCategoria(nombre: string): boolean {
    return this.normalizeText(this.selectedCategory) === this.normalizeText(nombre);
  }

  private parseBool(valor: any): boolean | null {
    const normalized = typeof valor === 'string' ? valor.toLowerCase().trim() : valor;
    if (normalized === true || normalized === 'true' || normalized === 1 || normalized === '1') return true;
    if (normalized === false || normalized === 'false' || normalized === 0 || normalized === '0') return false;
    return null;
  }

  private getValorCaracteristicaPorNombre(keywords: string[]): any {
    const grupo = this.formProveedor.get('caracteristicas') as FormGroup;
    if (!grupo) return undefined;

    const targets = keywords.map((k) => this.normalizeText(k));

    for (const car of this.caracteristicasActuales) {
      const nombre = this.normalizeText(car?.nombre_caracteristica || car?.nombre || car?.caracteristica || '');
      if (!nombre) continue;

      const coincide = targets.some((t) => nombre.includes(t));
      if (!coincide) continue;

      const control = grupo.get(this.getCarControlName(car));
      return control?.value;
    }

    return undefined;
  }

  private getCategoriaGrupo(categoria: string): 'Musica' | 'Catering' | 'Decoracion' | 'Lugar' | 'Generico' {
    const cat = this.normalizeText(categoria);
    if (cat.includes('musica')) return 'Musica';
    if (cat.includes('catering')) return 'Catering';
    if (cat.includes('decoracion')) return 'Decoracion';
    if (cat.includes('lugar')) return 'Lugar';
    return 'Generico';
  }

  private mapCategoriaBackend(grupo: string, raw: string): string {
    // Usa la categoría de BD si está permitida por el backend; si no, usa decoracion como fallback seguro
    const value = this.normalizeText(raw || grupo || '');
    const allowed = new Set(['musica', 'catering', 'lugar', 'decoracion']);
    if (allowed.has(value)) return value;
    return 'decoracion';
  }

  private getCategoriaLabel(categoria: string): string {
    const grupo = this.getCategoriaGrupo(categoria);
    if (grupo !== 'Generico') return grupo;
    // Capitalizar genérico con nombre original
    const raw = (categoria || '').toString().toLowerCase();
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }

  private obtenerIdTipo(rawCategoria: string, grupoCategoria: string): number {
    const rawLower = this.normalizeText(rawCategoria);
    const grupoLower = this.normalizeText(grupoCategoria);

    const encontrado = this.categorias.find((c: any) =>
      c?.raw?.toLowerCase() === rawLower ||
      c?.value?.toLowerCase() === rawLower ||
      c?.label?.toLowerCase() === grupoLower
    );

    if (encontrado?.id_tipo) return Number(encontrado.id_tipo);

    const fallback: Record<string, number> = {
      musica: 2,
      catering: 1,
      decoracion: 3,
      lugar: 4,
      fotografia: 5,
      foto: 5,
    };

    return fallback[rawLower] || fallback[grupoLower] || 1;
  }

  getCarControlName(car: any): string {
    const id = car?.id_caracteristica ?? car?.id ?? car?.codigo ?? car?.nombre;
    return `car_${id}`;
  }

  carControl(car: any) {
    return (this.formProveedor.get('caracteristicas') as FormGroup)?.get(this.getCarControlName(car));
  }

  // ============ MANEJO DE FORMULARIO ============
  onSubmit(): void {
    // Permitir guardar aunque el formulario esté vacío: solo exigimos postulante, categoría y al menos una imagen principal
    if (!this.postulanteSeleccionado) {
      this.mostrarError('Debes seleccionar un postulante primero');
      return;
    }

    if (!this.selectedCategory) {
      this.mostrarError('Debes seleccionar una categoría');
      return;
    }

    if (!this.imagenPrincipalFile && !this.imagenPrincipalUrl && !this.formProveedor.get('imagen_principal')?.value) {
      this.mostrarError('Debes seleccionar o ingresar la URL de la imagen principal');
      return;
    }

    this.enviarProveedor();
  }

  enviarProveedor(): void {
    this.enviando = true;
    this.mensajeError = '';
    this.mensajeExito = '';

    const currentUser = this.authService.getCurrentUser();
    const datosGenerales = this.formProveedor.get('datosGenerales') as FormGroup;
    const precioCaracteristica = this.getValorCaracteristicaPorNombre([
      'precio_base',
      'precio base',
      'precio',
      'precio persona',
      'precio_por_persona',
      'precio_por persona'
    ]) ?? datosGenerales?.get('precio_base')?.value;
    const planCaracteristica = datosGenerales?.get('id_plan')?.value ?? this.getValorCaracteristicaPorNombre(['id_plan', 'plan']);
    const descripcionCaracteristica = datosGenerales?.get('descripcion')?.value ?? this.getValorCaracteristicaPorNombre(['descripcion', 'descripción', 'detalle']);
    const generoCaracteristica = this.getValorCaracteristicaPorNombre(['genero', 'género']);
    const porHoraCaracteristica = this.getValorCaracteristicaPorNombre(['por hora', 'por_hora', 'porhora']);
    const horaInicioCaracteristica = this.getValorCaracteristicaPorNombre(['hora inicio', 'hora_inicio', 'horainicio']);
    const horaFinCaracteristica = this.getValorCaracteristicaPorNombre(['hora fin', 'hora_fin', 'horafin']);

    const precioBaseValue = Number(precioCaracteristica) || this.postulanteSeleccionado?.precio_postu_proveedor || 0;
    let planValue = parseInt(planCaracteristica, 10);
    if (!planValue || Number.isNaN(planValue)) {
      planValue = this.planes?.[0]?.id_plan || 1;
    }

    const descripcionFinal = descripcionCaracteristica || this.postulanteSeleccionado.portafolio_postu_proveedor || 'Sin descripción';
    const categoriaProveedor = this.selectedRawCategory || this.postulanteSeleccionado?.categoria_postu_proveedor || '';

    const caracteristicasPayload = this.construirCaracteristicasParaEnvio();

    const formData = new FormData();
    formData.append('nombre', this.postulanteSeleccionado.nom_empresa_postu_proveedor);
    formData.append('id_tipo', String(this.obtenerIdTipo(this.selectedRawCategory, this.selectedCategory)));
    formData.append('id_plan', String(planValue));
    formData.append('precio_base', String(precioBaseValue));
    formData.append('descripcion', descripcionFinal);
    formData.append('categoria_proveedor', categoriaProveedor);
    formData.append('verificado', 'true');
    formData.append('estado_aprobacion', 'aprobado');
    formData.append('estado', 'true');
    if (currentUser?.id) formData.append('aprobado_por', String(currentUser.id));
    
    // Fecha actual en UTC-5 (hora local de Ecuador/Colombia/Perú)
    const ahora = new Date();
    const utcMenos5 = new Date(ahora.getTime() - (5 * 60 * 60 * 1000));
    formData.append('fecha_aprobacion', utcMenos5.toISOString());

    // Datos específicos para música solo si el usuario los ingresó
    const porHoraValue = this.parseBool(porHoraCaracteristica);
    const isMusica = this.esCategoria('musica');
    const hayHoras = !!horaInicioCaracteristica || !!horaFinCaracteristica;

    if (isMusica && (generoCaracteristica || porHoraValue !== null || hayHoras)) {
      if (generoCaracteristica) formData.append('genero', generoCaracteristica);
      if (porHoraValue !== null) formData.append('por_hora', String(porHoraValue));
      if (hayHoras) {
        if (horaInicioCaracteristica) formData.append('hora_inicio', horaInicioCaracteristica);
        if (horaFinCaracteristica) formData.append('hora_fin', horaFinCaracteristica);
      }
    }

    if (caracteristicasPayload.length > 0) {
      formData.append('caracteristicas', JSON.stringify(caracteristicasPayload));
    }

    // Manejo de imágenes: archivos + URLs
    const archivos: File[] = [];
    const urls: string[] = [];
    
    // Imagen principal
    if (this.imagenPrincipalFile) {
      archivos.push(this.imagenPrincipalFile);
    } else if (this.imagenPrincipalUrl) {
      urls.push(this.imagenPrincipalUrl);
    }
    
    // Imágenes extras
    Object.entries(this.extraImages).forEach(([slotId, file]) => {
      if (file) archivos.push(file);
    });
    
    Object.entries(this.extraImageUrls).forEach(([slotId, url]) => {
      if (url && url.trim()) urls.push(url.trim());
    });

    // Agregar archivos al FormData
    if (archivos.length > 0) {
      archivos.forEach((file) => formData.append('imagenes[]', file, file.name));
    }
    
    // Agregar URLs al FormData
    if (urls.length > 0) {
      formData.append('imagenes_urls', JSON.stringify(urls));
    }

    console.log('📤 Enviando proveedor (FormData) con campos, archivos y URLs');

    this.apiService.insertarProveedorDesdePostulante(formData).subscribe({
      next: (response: any) => {
        const nuevoId = response?.id_proveedor ?? response?.id ?? response?.data?.id_proveedor ?? null;

        this.enviando = false;
        this.mostrarExito('✅ Proveedor registrado y aprobado.');
        console.log('✅ Respuesta servidor:', response);

        const idPost = this.postulanteSeleccionado?.id_postu_proveedor;
        if (idPost) {
          this.postulantes = this.postulantes.filter(p => p.id_postu_proveedor !== idPost);
          this.apiService.deleteTrabajaNosotrosProveedor(idPost).subscribe({
            error: (err) => console.warn('No se pudo eliminar postulante tras aprobar:', err)
          });
        }

        setTimeout(() => this.onReset(), 2000);
      },
      error: (error: any) => {
        this.enviando = false;
        const mensajeError = error?.error?.message || error?.message || 'Error al registrar proveedor';
        console.error('Detalle error backend:', error?.error);
        this.mostrarError(mensajeError);
        console.error('❌ Error:', error);
      }
    });
  }

  private construirCaracteristicasParaEnvio(): any[] {
    const grupo = this.formProveedor.get('caracteristicas') as FormGroup;
    if (!grupo) return [];

    return this.caracteristicasActuales
      .map((car) => {
        const control = grupo.get(this.getCarControlName(car));
        const valor = control?.value;
        const obligatorio = car?.obligatorio === true || car?.obligatorio === 'true' || car?.obligatorio === 1;

        if (!obligatorio && (valor === undefined || valor === null || valor === '')) return null;

        const idCar = car?.id_caracteristica ?? car?.id ?? car?.id_car ?? car?.codigo ?? car?.caracteristica_id;
        if (!idCar) return null;

        const payload: any = { id_caracteristica: idCar };
        const tipo = (car?.tipo_valor || car?.tipo_dato || '').toString().toLowerCase();

        switch (tipo) {
          case 'numero':
            payload.valor_numero = valor !== null && valor !== '' ? Number(valor) : null;
            break;
          case 'booleano':
            const boolVal = this.parseBool(valor);
            if (boolVal === null && !obligatorio) return null;
            payload.valor_booleano = boolVal;
            break;
          case 'json':
            payload.valor_json = valor;
            break;
          default:
            payload.valor = valor?.toString() ?? '';
        }

        return payload;
      })
      .filter(Boolean);
  }

  private obtenerEmail(): string {
    // Obtener email del localStorage o generar uno genérico
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        return user.email || 'contacto@empresa.com';
      }
    } catch (e) {
      console.warn('No se pudo obtener email del usuario');
    }
    return 'contacto@empresa.com';
  }

  onReset(): void {
    this.formProveedor.reset();
    this.formProveedor.patchValue({
      categoria: '',
      datosGenerales: {
        precio_base: '',
        id_plan: this.planes?.[0]?.id_plan ?? null,
        descripcion: '',
        estado: true,
        verificado: true,
      }
    });
    this.selectedCategory = '';
    this.selectedRawCategory = '';
    this.postulanteSeleccionado = null; // NUEVO
    this.archivosSeleccionados = [];
    this.imagenPrincipalFile = null;
    this.extraImageSlots = [];
    this.extraImages = {};
    this.coverImageName = null;
    this.mensajeExito = '';
    this.mensajeError = '';
    this.buildCaracteristicasForm([]);
  }

  // ============ MANEJO DE ARCHIVOS ============
  
  // Cambiar modo de entrada de imagen principal
  toggleModoImagenPrincipal(modo: 'file' | 'url'): void {
    this.modoImagenPrincipal = modo;
    // Limpiar al cambiar de modo
    if (modo === 'file') {
      this.imagenPrincipalUrl = '';
    } else {
      this.imagenPrincipalFile = null;
      this.imagenPrincipalPreview = null;
    }
  }

  onMainImageChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input?.files && input.files.length > 0) {
      const file = input.files[0];
      this.imagenPrincipalFile = file;
      this.formProveedor.get('imagen_principal')?.setValue(file.name);
      this.formProveedor.get('imagen_principal')?.markAsTouched();
      
      // Generar vista previa
      const reader = new FileReader();
      reader.onload = () => (this.imagenPrincipalPreview = reader.result);
      reader.readAsDataURL(file);
      
      if (!this.coverImageName) {
        this.coverImageName = file.name;
      }
      console.log(`📸 Imagen principal: ${file.name}`);
    }
  }

  onMainImageUrlChange(url: string): void {
    this.imagenPrincipalUrl = url.trim();
    if (this.imagenPrincipalUrl) {
      this.imagenPrincipalPreview = this.imagenPrincipalUrl;
      this.formProveedor.get('imagen_principal')?.setValue(this.imagenPrincipalUrl);
      this.formProveedor.get('imagen_principal')?.markAsTouched();
      if (!this.coverImageName) {
        this.coverImageName = 'url-principal';
      }
      console.log(`🔗 URL imagen principal: ${this.imagenPrincipalUrl}`);
    }
  }

  addExtraImageSlot(): void {
    const id = Date.now();
    this.extraImageSlots.push(id);
    this.extraImageModos[id] = 'file'; // Por defecto archivo
  }
  
  toggleModoExtraImage(slotId: number, modo: 'file' | 'url'): void {
    this.extraImageModos[slotId] = modo;
    // Limpiar al cambiar de modo
    if (modo === 'file') {
      delete this.extraImageUrls[slotId];
    } else {
      delete this.extraImages[slotId];
      delete this.extraImagePreviews[slotId];
    }
  }

  onExtraImageChange(event: Event, slotId: number): void {
    const input = event.target as HTMLInputElement;
    if (input?.files && input.files.length > 0) {
      const file = input.files[0];
      this.extraImages[slotId] = file;
      
      // Generar vista previa
      const reader = new FileReader();
      reader.onload = () => (this.extraImagePreviews[slotId] = reader.result);
      reader.readAsDataURL(file);
      
      if (!this.coverImageName) {
        this.coverImageName = file.name;
      }
      console.log(`🖼️ Imagen extra [${slotId}]: ${file.name}`);
    }
  }

  onExtraImageUrlChange(slotId: number, url: string): void {
    const urlTrimmed = url.trim();
    this.extraImageUrls[slotId] = urlTrimmed;
    if (urlTrimmed) {
      this.extraImagePreviews[slotId] = urlTrimmed;
      if (!this.coverImageName) {
        this.coverImageName = `url-extra-${slotId}`;
      }
      console.log(`🔗 URL imagen extra [${slotId}]: ${urlTrimmed}`);
    }
  }

  setPortada(nombre: string): void {
    this.coverImageName = nombre || null;
  }

  imagenesSeleccionadas(): { nombre: string; etiqueta: string; esPrincipal: boolean }[] {
    const lista: { nombre: string; etiqueta: string; esPrincipal: boolean }[] = [];
    
    // Imagen principal (archivo o URL)
    if (this.imagenPrincipalFile) {
      lista.push({ nombre: this.imagenPrincipalFile.name, etiqueta: `Principal: ${this.imagenPrincipalFile.name}`, esPrincipal: true });
    } else if (this.imagenPrincipalUrl) {
      const urlCorta = this.imagenPrincipalUrl.length > 40 ? this.imagenPrincipalUrl.substring(0, 40) + '...' : this.imagenPrincipalUrl;
      lista.push({ nombre: 'url-principal', etiqueta: `Principal: ${urlCorta}`, esPrincipal: true });
    }

    // Imágenes extras (archivos)
    Object.values(this.extraImages).forEach((file, idx) => {
      lista.push({ nombre: file.name, etiqueta: `Extra ${idx + 1}: ${file.name}`, esPrincipal: false });
    });
    
    // Imágenes extras (URLs)
    Object.entries(this.extraImageUrls).forEach(([slotId, url], idx) => {
      if (url && url.trim()) {
        const urlCorta = url.length > 40 ? url.substring(0, 40) + '...' : url;
        lista.push({ nombre: `url-extra-${slotId}`, etiqueta: `Extra URL ${idx + 1}: ${urlCorta}`, esPrincipal: false });
      }
    });

    return lista;
  }

  onFileChange(event: Event, controlName: string, groupName: string): void {
    const input = event.target as HTMLInputElement;
    if (input?.files && input.files.length > 0) {
      const file = input.files[0];

      // Guardar el archivo en la lista
      const indice = this.archivosSeleccionados.findIndex(
        f => f.name === file.name
      );
      if (indice === -1) {
        this.archivosSeleccionados.push(file);
      }

      // Actualizar el control del formulario
      const group = this.formProveedor.get(groupName) as FormGroup;
      if (group) {
        group.get(controlName)?.setValue(file.name);
        group.get(controlName)?.markAsTouched();
      }

      console.log(`📁 Archivo seleccionado: ${file.name} (${file.type})`);
    }
  }

  private construirPayloadCaracteristicas(idProveedor: number): any[] {
    const grupo = this.formProveedor.get('caracteristicas') as FormGroup;
    if (!grupo) return [];

    return this.caracteristicasActuales
      .map((car) => {
        const control = grupo.get(this.getCarControlName(car));
        const valor = control?.value;
        const obligatorio = car?.obligatorio === true || car?.obligatorio === 'true' || car?.obligatorio === 1;

        if (!obligatorio && (valor === undefined || valor === null || valor === '')) return null;

        const idCar = car?.id_caracteristica ?? car?.id ?? car?.id_car ?? car?.codigo ?? car?.caracteristica_id;
        if (!idCar) return null;

        const payload: any = {
          id_proveedor: idProveedor,
          id_caracteristica: idCar,
        };

        const tipo = (car?.tipo_valor || '').toString().toLowerCase();
        switch (tipo) {
          case 'numero':
            payload.valor_numero = valor !== null && valor !== '' ? Number(valor) : null;
            break;
          case 'booleano':
            const boolVal = this.parseBool(valor);
            payload.valor_booleano = boolVal === null ? null : boolVal;
            break;
          case 'json':
            payload.valor_json = valor;
            break;
          default:
            payload.valor_texto = valor?.toString() ?? '';
        }

        return payload;
      })
      .filter(Boolean);
  }

  private guardarImagenesProveedor(idProveedor: number) {
    const formData = new FormData();
    formData.append('id_proveedor', String(idProveedor));

    if (this.imagenPrincipalFile) {
      formData.append('imagen_principal', this.imagenPrincipalFile, this.imagenPrincipalFile.name);
      formData.append('imagenes', this.imagenPrincipalFile, this.imagenPrincipalFile.name);
    }

    const extras = Object.values(this.extraImages);
    extras.forEach((file, index) => {
      if (file) {
        formData.append(`imagen_extra_${index + 1}`, file, file.name);
        formData.append('imagenes', file, file.name);
      }
    });

    const portada = this.coverImageName || this.imagenPrincipalFile?.name || extras[0]?.name || '';
    if (portada) {
      formData.append('imagen_portada', portada);
      formData.append('es_portada_principal', String(portada === (this.imagenPrincipalFile?.name || '')));
    }

    formData.append('metadata', JSON.stringify({
      portada,
      principal: this.imagenPrincipalFile?.name || null,
      extras: extras.map((f) => f.name)
    }));

    const hayArchivos = this.imagenPrincipalFile || extras.length > 0;
    if (!hayArchivos) return null;

    return this.apiService.subirImagenesProveedor(formData);
  }

  // ============ MENSAJES DE USUARIO ============
  mostrarExito(mensaje: string): void {
    this.mensajeExito = mensaje;
    Swal.fire({
      title: 'Proveedor creado',
      text: mensaje,
      icon: 'success',
      confirmButtonText: 'OK'
    });
    setTimeout(() => {
      this.mensajeExito = '';
    }, 5000);
  }

  mostrarError(mensaje: string): void {
    this.mensajeError = mensaje;
    setTimeout(() => {
      this.mensajeError = '';
    }, 5000);
  }
}
