import { Component, signal, inject, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ReportesService, ReporteProveedor, ReporteTrabajador } from '../../service/reportes.service';
import { PdfViewerModal } from '../pdf-viewer-modal/pdf-viewer-modal';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PdfViewerModal],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './reportes.html',
  styleUrls: ['./reportes.css'],
})
export class ReportesComponent {
  private fb = inject(FormBuilder);
  private reportesService = inject(ReportesService);

  filtrosForm = this.fb.group({
    tipo: ['proveedores', Validators.required],
    from: [''],
    to: [''],
    categoria: [''],
    tieneCv: [''],
  });

  loading = signal(false);
  error = signal<string | null>(null);
  proveedores = signal<ReporteProveedor[]>([]);
  trabajadores = signal<ReporteTrabajador[]>([]);

  // Modal PDF
  showPdfModal = signal(false);
  pdfModalUrl = signal('');
  pdfModalFileName = signal('');

  private get tipoActual(): string {
    return this.filtrosForm.get('tipo')?.value || 'proveedores';
  }

  get mostrandoProveedores() {
    return this.tipoActual === 'proveedores';
  }

  get mostrandoTrabajadores() {
    return this.tipoActual === 'trabajadores';
  }

  onTipoChange(): void {
    if (this.mostrandoProveedores) {
      this.filtrosForm.get('tieneCv')?.setValue('');
    } else {
      this.filtrosForm.get('categoria')?.setValue('');
    }
    this.proveedores.set([]);
    this.trabajadores.set([]);
    this.error.set(null);
  }

  generar(): void {
    this.error.set(null);
    this.loading.set(true);

    if (this.mostrandoProveedores) {
      const filters = {
        from: this.filtrosForm.value.from || undefined,
        to: this.filtrosForm.value.to || undefined,
        categoria: this.filtrosForm.value.categoria || undefined,
      };
      this.reportesService.getProveedores(filters).subscribe({
        next: (data) => {
          this.proveedores.set(data || []);
          this.trabajadores.set([]);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('No se pudo obtener el reporte de proveedores');
          this.loading.set(false);
        },
      });
    } else {
      const tieneCvRaw = this.filtrosForm.value.tieneCv;
      const filters = {
        from: this.filtrosForm.value.from || undefined,
        to: this.filtrosForm.value.to || undefined,
        tieneCv: tieneCvRaw === '' ? undefined : tieneCvRaw === 'true',
      };
      this.reportesService.getTrabajadores(filters).subscribe({
        next: (data) => {
          this.trabajadores.set(data || []);
          this.proveedores.set([]);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('No se pudo obtener el reporte de trabajadores');
          this.loading.set(false);
        },
      });
    }
  }

  exportarPdf(): void {
    this.error.set(null);
    this.loading.set(true);

    if (this.mostrandoProveedores) {
      const filters = {
        from: this.filtrosForm.value.from || undefined,
        to: this.filtrosForm.value.to || undefined,
        categoria: this.filtrosForm.value.categoria || undefined,
      };
      this.reportesService.descargarProveedoresPdf(filters).subscribe({
        next: (blob) => {
          this.descargarArchivo(blob, 'reporte-proveedores.pdf');
          this.loading.set(false);
        },
        error: () => {
          this.error.set('No se pudo exportar el PDF de proveedores');
          this.loading.set(false);
        },
      });
    } else {
      const tieneCvRaw = this.filtrosForm.value.tieneCv;
      const filters = {
        from: this.filtrosForm.value.from || undefined,
        to: this.filtrosForm.value.to || undefined,
        tieneCv: tieneCvRaw === '' ? undefined : tieneCvRaw === 'true',
      };
      this.reportesService.descargarTrabajadoresPdf(filters).subscribe({
        next: (blob) => {
          this.descargarArchivo(blob, 'reporte-trabajadores.pdf');
          this.loading.set(false);
        },
        error: () => {
          this.error.set('No se pudo exportar el PDF de trabajadores');
          this.loading.set(false);
        },
      });
    }
  }

  abrirVerCV(cvUrl: string | null | undefined, nombreArchivo: string = 'CV.pdf'): void {
    if (!cvUrl) {
      alert('No hay CV disponible para visualizar');
      return;
    }
    this.pdfModalUrl.set(cvUrl);
    this.pdfModalFileName.set(nombreArchivo);
    this.showPdfModal.set(true);
  }

  abrirVerPortafolio(portafolioUrl: string | null | undefined, nombreEmpresa: string = 'Portafolio.pdf'): void {
    if (!portafolioUrl) {
      alert('No hay portafolio disponible para visualizar');
      return;
    }
    // Agregar fragmento para forzar visualización en línea
    const urlConFragment = `${portafolioUrl}#toolbar=0`;
    this.pdfModalUrl.set(urlConFragment);
    this.pdfModalFileName.set(nombreEmpresa + ' - Portafolio.pdf');
    this.showPdfModal.set(true);
  }

  cerrarPdfModal(): void {
    this.showPdfModal.set(false);
    this.pdfModalUrl.set('');
    this.pdfModalFileName.set('');
  }

  private descargarArchivo(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }
}
