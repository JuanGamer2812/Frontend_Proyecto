import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../service/api.service';

@Component({
  selector: 'app-gestionar-postulantes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './gestionar-postulantes.html',
  styleUrls: ['./gestionar-postulantes.css']
})
export class GestionarPostulantesComponent implements OnInit {
  // Listas
  postulantes: any[] = [];
  planes: any[] = [];
  
  // Form
  formConvertir!: FormGroup;
  
  // Estados
  cargando = true;
  postulantesSeleccionado: any = null;
  procesando = false;
  mensajeExito = '';
  mensajeError = '';

  constructor(
    private apiService: ApiService,
    private fb: FormBuilder
  ) {
    this.crearFormulario();
  }

  ngOnInit(): void {
    this.cargarPostulantes();
    this.cargarPlanes();
  }

  crearFormulario(): void {
    this.formConvertir = this.fb.group({
      precio_base: [null, [Validators.required, Validators.min(1)]],
      id_plan: ['', Validators.required],
      descripcion: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  cargarPostulantes(): void {
    this.cargando = true;
    this.apiService.getPostulantesProveedores().subscribe({
      next: (data) => {
        this.postulantes = data;
        this.cargando = false;
        console.log(`✅ Postulantes cargados: ${data.length}`);
      },
      error: (error) => {
        console.error('❌ Error cargando postulantes:', error);
        this.mostrarError('Error al cargar postulantes');
        this.cargando = false;
      }
    });
  }

  cargarPlanes(): void {
    this.apiService.getPlanes().subscribe({
      next: (data) => {
        this.planes = data;
        console.log(`✅ Planes cargados: ${data.length}`);
      },
      error: (error) => {
        console.error('❌ Error cargando planes:', error);
      }
    });
  }

  seleccionarPostulante(postulante: any): void {
    this.postulantesSeleccionado = postulante;
    this.formConvertir.reset();
    console.log('📌 Postulante seleccionado:', postulante.nom_empresa);
  }

  limpiarSeleccion(): void {
    this.postulantesSeleccionado = null;
    this.formConvertir.reset();
    this.mensajeExito = '';
    this.mensajeError = '';
  }

  convertir(): void {
    if (!this.formConvertir.valid) {
      this.mostrarError('Por favor completa todos los campos');
      return;
    }

    this.procesando = true;
    this.mensajeError = '';
    this.mensajeExito = '';

    const datos = {
      id_postu_proveedor: this.postulantesSeleccionado.id_postu_proveedor,
      precio_base: this.formConvertir.get('precio_base')?.value,
      id_plan: this.formConvertir.get('id_plan')?.value,
      descripcion: this.formConvertir.get('descripcion')?.value
    };

    console.log('📤 Enviando conversión:', datos);

    this.apiService.convertirPostulanteAProveedor(datos).subscribe({
      next: (response) => {
        this.procesando = false;
        this.mostrarExito('✅ ' + response.message);
        console.log('✅ Proveedor creado:', response.data);
        
        // Recargar lista
        setTimeout(() => {
          this.cargarPostulantes();
          this.limpiarSeleccion();
        }, 2000);
      },
      error: (error) => {
        this.procesando = false;
        const msg = error?.error?.message || error?.message || 'Error al procesar';
        this.mostrarError(msg);
        console.error('❌ Error:', error);
      }
    });
  }

  mostrarExito(mensaje: string): void {
    this.mensajeExito = mensaje;
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

  getNombrePlan(id: number): string {
    const plan = this.planes.find(p => p.id_plan === id);
    return plan ? plan.nombre_plan : 'Sin plan';
  }

  getCategoriaColor(categoria: string): string {
    const colores: any = {
      'MUSICA': '#9370DB',
      'CATERING': '#FFB6C1',
      'DECORACION': '#FF69B4',
      'LUGAR': '#4169E1'
    };
    return colores[categoria] || '#808080';
  }
}
