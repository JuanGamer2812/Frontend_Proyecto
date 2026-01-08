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
    console.log('[pdf-viewer] loadResource called, pdfUrl:', this.pdfUrl);
    if (!this.pdfUrl) {
      console.log('[pdf-viewer] pdfUrl is empty, aborting');
      this.safeUrl = '';
      this.loading = false;
      return;
    }
    const normalizedUrl = this.normalizeUrl(this.pdfUrl);
    console.log('[pdf-viewer] normalizedUrl:', normalizedUrl);
    const isPdfHint = this.isPdfResource(normalizedUrl);
    console.log('[pdf-viewer] isPdfHint:', isPdfHint);
    // If the resource is cross-origin (e.g. Cloudinary), fetching it as a blob
    // and using an object URL often avoids CORS/frame and content-type issues.
    const tryUseObjectUrl = true;

    if (tryUseObjectUrl) {
      // Try to fetch the resource and convert to object URL
      const proxyUrl = this.buildProxyUrl(normalizedUrl);
      const candidates = [proxyUrl, normalizedUrl].filter(Boolean) as string[];
      console.log('[pdf-viewer] Trying to fetch with candidates:', candidates);
      this.fetchAsObjectUrl(candidates, isPdfHint)
        .then(() => {
          console.log('[pdf-viewer] fetchAsObjectUrl succeeded, safeUrl set');
          console.log('[pdf-viewer] isImage:', this.isImage, 'loading:', this.loading, 'safeUrl truthy:', !!this.safeUrl);
          console.log('[pdf-viewer] currentObjectUrl:', this.currentObjectUrl);
        })
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
    // Verificar si el nombre termina en .pdf O contiene "pdf" (para casos como "Menu_pdf")
    if (name.endsWith('.pdf') || name.includes('pdf')) return true;
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
        console.log('[pdf-viewer] Fetching candidate:', candidate);
        const response = await fetch(candidate);
        console.log('[pdf-viewer] Response status:', response.status, response.ok);
        if (!response.ok) throw new Error('Response not OK ' + response.status);
        const buffer = await response.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const magicPdf = bytes.length >= 5 &&
          bytes[0] === 0x25 &&
          bytes[1] === 0x50 &&
          bytes[2] === 0x44 &&
          bytes[3] === 0x46 &&
          bytes[4] === 0x2d;
        console.log('[pdf-viewer] magicPdf check:', magicPdf, 'bytes length:', bytes.length, 'first 5 bytes:', bytes.slice(0, 5));
        const upstreamType = response.headers.get('content-type') || 'application/octet-stream';
        console.log('[pdf-viewer] upstreamType from response:', upstreamType);
        let normalizedType = upstreamType;
        if (!upstreamType || upstreamType === 'application/octet-stream') {
          if (magicPdf || isPdfHint) {
            normalizedType = 'application/pdf';
          }
        }
        console.log('[pdf-viewer] normalizedType for blob:', normalizedType);
        const normalizedBlob = new Blob([buffer], { type: normalizedType });
        this.isImage = normalizedType.startsWith('image/');
        console.log('[pdf-viewer] isImage after blob creation:', this.isImage);
        this.currentObjectUrl = window.URL.createObjectURL(normalizedBlob);
        console.log('[pdf-viewer] created objectUrl:', this.currentObjectUrl);
        this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.currentObjectUrl);
        console.log('[pdf-viewer] safeUrl set to sanitized objectUrl');
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
