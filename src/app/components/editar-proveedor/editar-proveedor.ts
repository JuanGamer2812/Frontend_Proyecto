import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../service/api.service';

@Component({
  selector: 'app-editar-proveedor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
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
  loading = false;
  error: string | null = null;

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

    this.apiService.getProveedorById(this.proveedorId).subscribe({
      next: (proveedor) => {
        this.loading = false;
        
        // Determinar categoría
        const tipoNombre = proveedor.tipo_nombre?.toLowerCase() || '';
        if (tipoNombre.includes('música') || tipoNombre.includes('musica')) {
          this.selectedCategory = 'Musica';
        } else if (tipoNombre.includes('catering')) {
          this.selectedCategory = 'Catering';
        } else if (tipoNombre.includes('lugar')) {
          this.selectedCategory = 'Lugar';
        } else if (tipoNombre.includes('decoración') || tipoNombre.includes('decoracion')) {
          this.selectedCategory = 'Decoracion';
        }

        // Cargar datos generales
        this.formProveedor.patchValue({
          nom_empresa_proveedor: proveedor.nombre || '',
          categoria_proveedor: this.selectedCategory,
          estado: proveedor.estado ?? true,
          estado_aprobacion: proveedor.estado_aprobacion || 'pendiente'
        });

        // Cargar datos específicos según categoría
        if (this.selectedCategory === 'Musica') {
          this.formProveedor.get('musica')?.patchValue({
            genero: proveedor.genero || '',
            precio: proveedor.precio_base || null,
            porHora: proveedor.por_hora ? 'si' : 'no',
            horaInicio: proveedor.hora_inicio || '',
            horaFin: proveedor.hora_fin || '',
            descripcion: proveedor.descripcion || '',
            plan: proveedor.id_plan || ''
          });
        } else if (this.selectedCategory === 'Catering') {
          this.formProveedor.get('catering')?.patchValue({
            tipoComida: proveedor.tipo_comida || '',
            precioPersona: proveedor.precio_base || null,
            menuFile: proveedor.menu || '',
            descripcion: proveedor.descripcion || '',
            plan: proveedor.id_plan || ''
          });
        } else if (this.selectedCategory === 'Lugar') {
          this.formProveedor.get('lugar')?.patchValue({
            capacidad: proveedor.capacidad || null,
            precio: proveedor.precio_base || null,
            direccion: proveedor.direccion || '',
            descripcion: proveedor.descripcion || proveedor.lugar_descripcion || '',
            seguridad: proveedor.seguridad ? 'si' : 'no',
            plan: proveedor.id_plan || ''
          });
        } else if (this.selectedCategory === 'Decoracion') {
          this.formProveedor.get('decoracion')?.patchValue({
            nivel: proveedor.nivel || '',
            tipo: proveedor.tipo_nombre || '',
            precio: proveedor.precio_base || null,
            catalogoFile: proveedor.pdf_catalogo || '',
            logoFile: ''
          });
        }
      },
      error: (err) => {
        this.loading = false;
        this.error = 'Error al cargar el proveedor: ' + (err.error?.message || err.message);
        console.error('Error:', err);
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
      alert('⚠️ Revisa los campos en rojo antes de continuar.');
      return;
    }

    const formValue = this.formProveedor.value;
    const categoria = this.selectedCategory.toLowerCase();
    const grupoCategoria = formValue[categoria];

    // Preparar datos para enviar
    const datosActualizar: any = {
      nombre: formValue.nom_empresa_proveedor,
      estado: formValue.estado,
      estado_aprobacion: formValue.estado_aprobacion,
      descripcion: grupoCategoria.descripcion,
      id_plan: grupoCategoria.plan ? parseInt(grupoCategoria.plan) : null
    };

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

    this.loading = true;
    this.apiService.updateProveedor(this.proveedorId, datosActualizar).subscribe({
      next: () => {
        this.loading = false;
        alert('✅ Proveedor actualizado exitosamente');
        this.router.navigate(['/adm-proveedor']);
      },
      error: (err) => {
        this.loading = false;
        alert('❌ Error al actualizar: ' + (err.error?.message || err.message));
        console.error('Error:', err);
      }
    });
  }

  onCancel(): void {
    if (confirm('¿Descartar los cambios y volver?')) {
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
}
