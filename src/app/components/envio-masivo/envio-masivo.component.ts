/**
 * Componente de Envío Masivo de Invitaciones
 * Importa CSV y crea/envía invitaciones en batch
 */

import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InvitacionService, Invitacion } from '../../service/invitacion.service';
import Swal from 'sweetalert2';

interface Evento {
  id_evento: number;
  nombre_evento: string;
  fecha_evento: Date;
  ubicacion: string;
}

interface InvitadoCSV {
  nombre_invitado: string;
  email: string;
  telefono?: string;
  numero_acompanantes: number;
  categoria?: string;
  mensaje_personalizado?: string;
  valido: boolean;
  errores: string[];
}

@Component({
  selector: 'app-envio-masivo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './envio-masivo.component.html',
  styleUrls: ['./envio-masivo.component.css']
})
export class EnvioMasivoComponent implements OnInit {
  // Eventos disponibles
  eventos = signal<Evento[]>([]);
  eventoSeleccionado = signal<number | null>(null);
  
  // Estados del proceso
  paso = signal<number>(1); // 1: Upload, 2: Preview, 3: Procesando, 4: Resultados
  
  // Datos CSV
  archivoSeleccionado = signal<File | null>(null);
  invitadosCSV = signal<InvitadoCSV[]>([]);
  invitadosValidos = signal<InvitadoCSV[]>([]);
  invitadosInvalidos = signal<InvitadoCSV[]>([]);
  
  // Procesamiento
  isProcessing = signal(false);
  progreso = signal(0);
  
  // Resultados
  resultadoCreacion = signal({
    total: 0,
    exitosos: 0,
    fallidos: 0,
    errores: [] as string[]
  });
  
  resultadoEnvio = signal({
    total: 0,
    exitosos: 0,
    fallidos: 0
  });
  
  // Opciones
  enviarEmailsInmediatamente = signal(true);

  constructor(
    private invitacionService: InvitacionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarEventos();
  }

  /**
   * Cargar eventos disponibles
   */
  cargarEventos(): void {
    // TODO: Implementar EventoService
    // Mock data
    this.eventos.set([
      {
        id_evento: 1,
        nombre_evento: 'Boda María y Juan',
        fecha_evento: new Date('2024-06-15T18:00:00'),
        ubicacion: 'Jardín Las Rosas'
      },
      {
        id_evento: 2,
        nombre_evento: 'Aniversario Corporativo',
        fecha_evento: new Date('2024-07-20T19:00:00'),
        ubicacion: 'Hotel Intercontinental'
      }
    ]);
  }

  /**
   * Seleccionar evento
   */
  seleccionarEvento(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.eventoSeleccionado.set(Number(select.value));
  }

  /**
   * Manejar selección de archivo
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      // Validar extensión
      if (!file.name.endsWith('.csv')) {
        Swal.fire({ icon: 'warning', title: 'Archivo inválido', text: 'Por favor selecciona un archivo CSV.' });
        return;
      }
      
      this.archivoSeleccionado.set(file);
      this.leerArchivoCSV(file);
    }
  }

  /**
   * Leer archivo CSV
   */
  leerArchivoCSV(file: File): void {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const contenido = e.target?.result as string;
      this.procesarCSV(contenido);
    };
    
    reader.onerror = () => {
      Swal.fire({ icon: 'error', title: 'No se pudo leer el archivo', text: 'Ocurrió un error al leer el CSV.' });
    };
    
    reader.readAsText(file);
  }

  /**
   * Procesar contenido CSV
   */
  procesarCSV(contenido: string): void {
    const invitados = this.invitacionService.importarDesdeCSV(contenido);
    const invitadosValidados: InvitadoCSV[] = [];
    
    invitados.forEach(inv => {
      const errores: string[] = [];
      
      // Validaciones
      if (!inv.nombre_invitado || inv.nombre_invitado.trim() === '') {
        errores.push('Nombre es obligatorio');
      }
      
      if (!inv.email || inv.email.trim() === '') {
        errores.push('Email es obligatorio');
      } else if (!this.invitacionService.validarEmail(inv.email)) {
        errores.push('Email no válido');
      }
      
      if (inv.telefono && !this.invitacionService.validarTelefono(inv.telefono)) {
        errores.push('Teléfono no válido');
      }
      
      if (inv.numero_acompanantes && inv.numero_acompanantes < 0) {
        errores.push('Acompañantes no puede ser negativo');
      }
      
      invitadosValidados.push({
        nombre_invitado: inv.nombre_invitado || '',
        email: inv.email || '',
        telefono: inv.telefono,
        numero_acompanantes: inv.numero_acompanantes || 0,
        categoria: inv.categoria,
        valido: errores.length === 0,
        errores
      });
    });
    
    this.invitadosCSV.set(invitadosValidados);
    this.invitadosValidos.set(invitadosValidados.filter(inv => inv.valido));
    this.invitadosInvalidos.set(invitadosValidados.filter(inv => !inv.valido));
    
    // Avanzar a preview
    this.paso.set(2);
  }

  /**
   * Descargar plantilla CSV
   */
  descargarPlantilla(): void {
    const contenido = 'Nombre,Email,Telefono,Acompanantes,Categoria\nJuan Pérez,juan@example.com,+525512345678,2,vip\nMaría García,maria@example.com,,1,familia\n';
    const blob = new Blob([contenido], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_invitados.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Volver al paso anterior
   */
  volverPaso(): void {
    if (this.paso() > 1) {
      this.paso.set(this.paso() - 1);
    }
  }

  /**
   * Cancelar proceso
   */
  cancelar(): void {
    this.paso.set(1);
    this.archivoSeleccionado.set(null);
    this.invitadosCSV.set([]);
    this.invitadosValidos.set([]);
    this.invitadosInvalidos.set([]);
    this.progreso.set(0);
  }

  /**
   * Procesar invitaciones
   */
  async procesarInvitaciones(): Promise<void> {
    const eventoId = this.eventoSeleccionado();
    if (!eventoId) {
      await Swal.fire({ icon: 'warning', title: 'Selecciona un evento', text: 'Debes elegir un evento antes de continuar.' });
      return;
    }
    
    const invitados = this.invitadosValidos();
    if (invitados.length === 0) {
      await Swal.fire({ icon: 'warning', title: 'Sin invitados válidos', text: 'No hay invitados válidos para procesar.' });
      return;
    }
    
    this.isProcessing.set(true);
    this.paso.set(3);
    
    try {
      // Crear invitaciones masivas
      const invitadosData = invitados.map(inv => ({
        nombre_invitado: inv.nombre_invitado,
        email: inv.email,
        telefono: inv.telefono,
        numero_acompanantes: inv.numero_acompanantes || 0,
        categoria: inv.categoria || 'general',
        mensaje_personalizado: inv.mensaje_personalizado
      }));
      
      // Llamada al backend para crear masivamente
      const responseCreacion = await this.invitacionService
        .crearInvitacionesMasivas(eventoId, invitadosData)
        .toPromise();
      
      if (responseCreacion.success) {
        this.resultadoCreacion.set({
          total: responseCreacion.data.total,
          exitosos: responseCreacion.data.exitosos,
          fallidos: responseCreacion.data.fallidos,
          errores: responseCreacion.data.errores || []
        });
        
        this.progreso.set(50);
        
        // Si se debe enviar emails
        if (this.enviarEmailsInmediatamente() && responseCreacion.data.invitaciones_ids) {
          const responseEnvio = await this.invitacionService
            .enviarInvitacionesMasivas(responseCreacion.data.invitaciones_ids)
            .toPromise();
          
          if (responseEnvio.success) {
            this.resultadoEnvio.set({
              total: responseEnvio.data.total,
              exitosos: responseEnvio.data.exitosos,
              fallidos: responseEnvio.data.fallidos
            });
          }
        }
        
        this.progreso.set(100);
        this.paso.set(4);
      } else {
        Swal.fire({ icon: 'error', title: 'No se pudieron crear', text: 'Ocurrió un error al crear las invitaciones.' });
      }
    } catch (error) {
      console.error('Error al procesar invitaciones:', error);
      Swal.fire({ icon: 'error', title: 'No se pudo procesar', text: 'Ocurrió un error al procesar las invitaciones.' });
    } finally {
      this.isProcessing.set(false);
    }
  }

  /**
   * Finalizar y volver
   */
  finalizar(): void {
    this.router.navigate(['/invitaciones']);
  }

  /**
   * Reiniciar proceso
   */
  reiniciar(): void {
    this.cancelar();
  }

  /**
   * Formatear fecha
   */
  formatearFecha(fecha: Date): string {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}
