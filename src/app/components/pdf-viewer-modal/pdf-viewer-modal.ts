import { Component, Input, Output, EventEmitter, inject, OnInit, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-pdf-viewer-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pdf-viewer-modal.html',
  styleUrls: ['./pdf-viewer-modal.css']
})
export class PdfViewerModal implements OnInit, OnChanges {
  @Input() isVisible = false;
  @Input() pdfUrl: string = '';
  @Input() contentType?: string | null;
  @Input() fileName: string = 'documento.pdf';
  @Output() close = new EventEmitter<void>();

  private sanitizer = inject(DomSanitizer);
  safeUrl: SafeResourceUrl = '';
  loading = false;
  isImage = false;
  private currentObjectUrl: string | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pdfUrl'] || changes['isVisible'] || changes['contentType']) {
      // revoke any previous object URL when changing resource
      this.revokeObjectUrl();
      // attempt to (re)load resource when url or visibility changes
      this.loadResource();
    }
  }

  ngOnInit(): void {
    if (this.pdfUrl) {
      this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.pdfUrl);
    }
  }

  private loadResource(): void {
    this.loading = true;
    this.isImage = !!(this.contentType && this.contentType.startsWith('image/'));
    if (!this.pdfUrl) {
      this.safeUrl = '';
      this.loading = false;
      return;
    }
    const normalizedUrl = this.normalizeUrl(this.pdfUrl);
    const isPdfHint = this.isPdfResource(normalizedUrl);
    // If the resource is cross-origin (e.g. Cloudinary), fetching it as a blob
    // and using an object URL often avoids CORS/frame and content-type issues.
    const tryUseObjectUrl = true;

    if (tryUseObjectUrl) {
      // Try to fetch the resource and convert to object URL
      const proxyUrl = this.buildProxyUrl(normalizedUrl);
      const candidates = [proxyUrl, normalizedUrl].filter(Boolean) as string[];
      this.fetchAsObjectUrl(candidates, isPdfHint)
        .catch(err => {
          console.warn('[pdf-viewer] objectUrl fallback failed', err);
          if (!isPdfHint) {
            try {
              this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(normalizedUrl);
            } catch (e) {
              this.safeUrl = '';
            }
          } else {
            this.safeUrl = '';
          }
        })
        .finally(() => {
          this.loading = false;
        });
      return;
    }

    // Prefer to use the direct URL (sanitized) for same-origin resources.
    try {
      this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(normalizedUrl);
    } catch (e) {
      this.safeUrl = '';
    }
    console.log('[pdf-viewer] loadResource url:', normalizedUrl, 'isImageHint:', this.isImage);
    this.loading = false;
  }



  onClose(): void {
    this.revokeObjectUrl();
    this.close.emit();
  }

  private isPdfResource(urlOverride?: string): boolean {
    if (this.contentType && this.contentType.startsWith('application/pdf')) return true;
    const name = String(this.fileName || '').toLowerCase();
    if (name.endsWith('.pdf')) return true;
    const url = String(urlOverride ?? this.pdfUrl ?? '').toLowerCase();
    return url.includes('.pdf');
  }

  private buildProxyUrl(url: string): string | null {
    try {
      const u = new URL(url);
      if (u.hostname.endsWith('cloudinary.com')) {
        return `/api/files/proxy?url=${encodeURIComponent(url)}`;
      }
    } catch {
      // ignore
    }
    return null;
  }

  private normalizeUrl(rawUrl: string): string {
    const trimmed = String(rawUrl || '').trim();
    if (!trimmed) return '';
    try {
      return new URL(trimmed).toString();
    } catch (_) {
      // Try to encode spaces/accents that make the URL invalid.
      try {
        return new URL(encodeURI(trimmed)).toString();
      } catch (e) {
        return trimmed;
      }
    }
  }

  private async fetchAsObjectUrl(candidates: string[], isPdfHint: boolean): Promise<void> {
    let lastError: any = null;
    for (const candidate of candidates) {
      try {
        const response = await fetch(candidate);
        if (!response.ok) throw new Error('Response not OK ' + response.status);
        const buffer = await response.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const magicPdf = bytes.length >= 5 &&
          bytes[0] === 0x25 &&
          bytes[1] === 0x50 &&
          bytes[2] === 0x44 &&
          bytes[3] === 0x46 &&
          bytes[4] === 0x2d;
        const upstreamType = response.headers.get('content-type') || 'application/octet-stream';
        let normalizedType = upstreamType;
        if (!upstreamType || upstreamType === 'application/octet-stream') {
          if (magicPdf || isPdfHint) {
            normalizedType = 'application/pdf';
          }
        }
        const normalizedBlob = new Blob([buffer], { type: normalizedType });
        this.isImage = normalizedType.startsWith('image/');
        this.currentObjectUrl = window.URL.createObjectURL(normalizedBlob);
        this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.currentObjectUrl);
        return;
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new Error('Unable to fetch resource');
  }

  descargarPdf(): void {
    const normalizedUrl = this.normalizeUrl(this.pdfUrl);
    fetch(normalizedUrl)
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
        console.error('Error al descargar archivo:', error);
        Swal.fire({ icon: 'error', title: 'No se pudo descargar', text: 'Ocurrió un problema al descargar el archivo.' });
      });
  }

  private revokeObjectUrl(): void {
    if (this.currentObjectUrl) {
      try {
        window.URL.revokeObjectURL(this.currentObjectUrl);
      } catch (e) {
        // ignore
      }
      this.currentObjectUrl = null;
    }
  }

  ngOnDestroy(): void {
    this.revokeObjectUrl();
  }
}
