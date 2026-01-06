import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { PostulacionService } from '../../service/postulacion.service';
import { ApiService } from '../../service/api.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-postulacion-proveedor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './postulacion-proveedor.html',
  styleUrls: ['./postulacion-proveedor.css']
})

export class PostulacionProveedor implements OnInit {
  formProveedor!: FormGroup;
  selectedFile: File | null = null;
  selectedCategory: string = '';
  categorias: string[] = [];
  cargandoCategorias = false;
  enviando = false;

  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024;
  private postulacionService = inject(PostulacionService);
  private apiService = inject(ApiService);

  constructor(
    private fb: FormBuilder
  ) {
    this.buildForm();
  }

  private requirePortfolioOrLink(): (control: any) => any {
    return (control: any) => {
      const form = control.root as FormGroup;
      if (!form) return null;

      const enableLink = form.get('enableLink')?.value;
      const enableFile = form.get('enableFile')?.value;
      const portafolioLink = form.get('portafolioLink')?.value;

      if (!enableLink && !enableFile) {
        return { noPortfolio: true };
      }

      return null;
    };
  }

  ngOnInit(): void {
    this.cargarCategorias();
  }

  // Getter para acceder fácilmente a los controles del formulario
  get f() {
    return this.formProveedor.controls;
  }

  private buildForm(): void {
    this.formProveedor = this.fb.group({
      categoria: ['', [Validators.required]],
      nombreEmpresa: ['', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(100),
        Validators.pattern(/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s&.,'()\/-]+$/)
      ]],
      correo: ['', [
        Validators.required,
        Validators.email,
        Validators.maxLength(50),
        Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
      ]],
      portafolio: ['', [
        Validators.required,
        Validators.minLength(20),
        Validators.maxLength(500)
      ]],
      enableLink: [false],
      portafolioLink: [''],
      enableFile: [false]
    }, { validators: this.requirePortfolioOrLink() });

    // Escuchar cambios en los switches
    this.f['enableLink'].valueChanges.subscribe(value => {
      if (value) {
        this.f['portafolioLink'].setValidators([
          Validators.required,
          Validators.pattern(/^https?:\/\/.+/)
        ]);
        this.f['enableFile'].setValue(false);
      } else {
        this.f['portafolioLink'].clearValidators();
      }
      this.f['portafolioLink'].updateValueAndValidity();
    });

    this.f['enableFile'].valueChanges.subscribe(value => {
      if (value) {
        this.f['enableLink'].setValue(false);
      }
      this.formProveedor.updateValueAndValidity();
    });

    this.f['enableLink'].valueChanges.subscribe(() => {
      this.formProveedor.updateValueAndValidity();
    });

    // Actualizar categoría cuando cambia
    this.f['categoria'].valueChanges.subscribe(value => {
      this.selectedCategory = value as string;
    });
  }

  private cargarCategorias(): void {
    this.cargandoCategorias = true;
    // Usar getTiposProveedor() para obtener Catering, Música, etc. (NO categorías de eventos)
    this.apiService.getTiposProveedor().subscribe({
      next: (tipos) => {
        this.categorias = (tipos || [])
          .map((t: any) => t?.nombre || t?.tipo || t?.nombre_tipo || t)
          .filter(Boolean);
        this.cargandoCategorias = false;
        console.log('✅ Tipos de proveedor cargados:', this.categorias);
      },
      error: () => {
        this.cargandoCategorias = false;
        Swal.fire({ icon: 'error', title: 'No se pudieron cargar categorías', text: 'Intenta nuevamente en unos segundos.' });
      }
    });
  }

  // ----------------------- UI helpers -----------------------
  isMusica() { return this.selectedCategory === 'Musica'; }
  isCatering() { return this.selectedCategory === 'Catering'; }
  isLugar() { return this.selectedCategory === 'Lugar'; }
  isDecoracion() { return this.selectedCategory === 'Decoracion'; }

  onCancel(): void {
    this.formProveedor.reset();
    this.selectedFile = null;
    this.selectedCategory = '';
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      // Validar tamaño
      if (file.size > this.MAX_FILE_SIZE) {
        Swal.fire({ icon: 'warning', title: 'Archivo demasiado grande', text: `Tamaño máximo: 5MB. Tu archivo: ${(file.size / 1024 / 1024).toFixed(2)}MB` });
        input.value = '';
        this.selectedFile = null;
        return;
      }
      
      // Validar tipo de archivo
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        Swal.fire({ icon: 'warning', title: 'Tipo de archivo no permitido', text: 'Solo se aceptan: JPG, PNG, WEBP o PDF.' });
        input.value = '';
        this.selectedFile = null;
        return;
      }
      
      this.selectedFile = file;
    }
  }

  // ----------------------- submit -----------------------
  onSubmit(): void {
    Object.keys(this.formProveedor.controls).forEach(key => {
      this.formProveedor.get(key)?.markAsTouched();
    });

    if (this.formProveedor.invalid) {
      Swal.fire({ icon: 'warning', title: 'Formulario incompleto', text: 'Por favor, completa todos los campos correctamente.' });
      return;
    }

    if (this.enviando) return;

    const formValue = this.formProveedor.value;
    
    const postulacion = {
      categoria: formValue.categoria,
      nombreEmpresa: formValue.nombreEmpresa,
      correo: formValue.correo,
      portafolio: formValue.portafolio,
      portafolioLink: formValue.enableLink ? formValue.portafolioLink : undefined,
      archivo: this.selectedFile || undefined
    };

    this.enviando = true;

    this.postulacionService.postularProveedor(postulacion).subscribe({
      next: (response) => {
        this.enviando = false;
        Swal.fire({ icon: 'success', title: 'Postulación registrada', text: 'Nos pondremos en contacto contigo pronto.' });
        this.formProveedor.reset();
        this.selectedFile = null;
        this.selectedCategory = '';
      },
      error: (err) => {
        this.enviando = false;
        const mensaje = err.error?.error || 'No se pudo registrar la postulación. Intenta nuevamente.';
        Swal.fire({ icon: 'error', title: 'No se pudo registrar', text: mensaje });
      }
    });
  }

  onFormReset(): void {
    this.formProveedor.reset();
    this.selectedFile = null;
    this.selectedCategory = '';
  }
}
