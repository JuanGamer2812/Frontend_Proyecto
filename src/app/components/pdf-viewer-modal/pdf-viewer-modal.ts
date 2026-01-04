import { Component, Input, Output, EventEmitter, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-pdf-viewer-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pdf-viewer-modal.html',
  styleUrls: ['./pdf-viewer-modal.css']
})
export class PdfViewerModal implements OnInit {
  @Input() isVisible = false;
  @Input() pdfUrl: string = '';
  @Input() fileName: string = 'documento.pdf';
  @Output() close = new EventEmitter<void>();

  private sanitizer = inject(DomSanitizer);
  safeUrl: SafeResourceUrl = '';

  ngOnInit(): void {
    if (this.pdfUrl) {
      this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.pdfUrl);
    }
  }

  ngOnChanges(): void {
    if (this.pdfUrl) {
      this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.pdfUrl);
    }
  }

  onClose(): void {
    this.close.emit();
  }

  descargarPdf(): void {
    fetch(this.pdfUrl)
      .then(response => response.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      })
      .catch(error => {
        console.error('Error al descargar PDF:', error);
        alert('Error al descargar el PDF');
      });
  }
}
