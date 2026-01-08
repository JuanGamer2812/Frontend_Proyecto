import { Component, signal, inject, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ReportesService, ReporteProveedor, ReporteTrabajador } from '../../service/reportes.service';
import { PdfViewerModal } from '../pdf-viewer-modal/pdf-viewer-modal';
import Swal from 'sweetalert2';
import { lastValueFrom } from 'rxjs';

type SignedAssetMeta = {
  url?: string;
  publicId?: string;
  resourceType?: 'raw' | 'image';
};

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
  private http = inject(HttpClient);

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

  // Backend base (imitando comportamiento de `colaboradores`)
  private readonly BACKEND_URL = (this.reportesService as any)?.apiConfig?.getBaseUrl?.() || 'http://127.0.0.1:5000';

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

  async abrirVerCV(cvUrl: string | null | undefined, nombreArchivo: string = 'CV.pdf'): Promise<void> {
    if (!cvUrl) {
      Swal.fire({ icon: 'info', title: 'Sin CV disponible', text: 'No hay CV para visualizar en este registro.' });
      return;
    }
    const resolved = this.resolveAsset(cvUrl);
    console.log('[reportes] abrirVerCV original:', cvUrl, 'resolvedUrl:', resolved.url, 'publicId:', resolved.publicId, 'resourceType:', resolved.resourceType);
    try {
      // No fallbackApi provided here; backend should expose one if asset is private
      const finalUrl = await this.ensurePdf(resolved.url, resolved);
      this.pdfModalUrl.set(finalUrl);
      this.pdfModalFileName.set(nombreArchivo);
      this.showPdfModal.set(true);
    } catch (err: any) {
      console.error('[reportes] abrirVerCV failed:', err);
      Swal.fire({ icon: 'error', title: 'No se puede abrir CV', text: String(err?.message || err || 'Recurso no accesible. Pide URL firmada al backend.') });
    }
  }

  async abrirVerPortafolio(portafolioUrl: string | null | undefined, nombreEmpresa: string = 'Portafolio.pdf'): Promise<void> {
    if (!portafolioUrl) {
      Swal.fire({ icon: 'info', title: 'Sin portafolio disponible', text: 'No hay portafolio para visualizar en este registro.' });
      return;
    }
    const resolved = this.resolveAsset(portafolioUrl);
    console.log('[reportes] abrirVerPortafolio original:', portafolioUrl, 'resolvedUrl:', resolved.url, 'publicId:', resolved.publicId, 'resourceType:', resolved.resourceType);
    try {
      const finalUrl = await this.ensurePdf(resolved.url, resolved);
      const urlConFragment = `${finalUrl}#toolbar=0`;
      this.pdfModalUrl.set(urlConFragment);
      this.pdfModalFileName.set(nombreEmpresa + ' - Portafolio.pdf');
      this.showPdfModal.set(true);
    } catch (err: any) {
      console.error('[reportes] abrirVerPortafolio failed:', err);
      Swal.fire({ icon: 'error', title: 'No se puede abrir Portafolio', text: String(err?.message || err || 'Recurso no accesible. Pide URL firmada al backend.') });
    }
  }

  private normalizeFileUrl(rawUrl: string): string {
    if (!rawUrl) return '';
    const s = rawUrl.toString().trim();
    if (!s) return '';
    // If the URL accidentally contains two 'http(s)://' occurrences (e.g. 'http://host/tmp_uploads/https://...'),
    // prefer the LAST absolute URL (the real file location) and return it.
    const firstHttp = s.indexOf('http');
    if (firstHttp !== -1) {
      const secondHttp = s.indexOf('http', firstHttp + 1);
      if (secondHttp !== -1) {
        return s.slice(secondHttp);
      }
    }

    // Otherwise, remove any stray '/tmp_uploads/' or '/uploads/' prefix that appears immediately before an absolute URL
    const removed = s.replace(/(?:\/?(?:tmp_uploads|uploads)\/)(https?:\/\/)/i, '$1');
    if (removed !== s) return removed;
    // If it's already absolute, return as-is
    if (/^https?:\/\//i.test(s)) return s;
    // If it's a relative path (starts with /tmp_uploads or /uploads), prefix with backend base url
    if (s.startsWith('/tmp_uploads/') || s.startsWith('/uploads/') || s.startsWith('/')) {
      const base = this.reportesService ? (this.reportesService as any).apiConfig?.getBaseUrl?.() : '';
      const baseUrl = base || window.location.origin;
      return baseUrl + (s.startsWith('/') ? s : '/' + s);
    }
    // otherwise return as-is
    return s;
  }

  // Normaliza la URL: si es remota la devuelve tal cual, si no la transforma a ruta backend/tmp_uploads
  private normalizeUrl(val: string | null | undefined): string {
    if (!val) return '';
    const s = String(val).trim();
    if (!s) return '';
    // First try to normalize cases like
    //  - "http://host/tmp_uploads/https://..."
    //  - "/tmp_uploads/https://..."
    // normalizeFileUrl already prefers the embedded absolute URL when present.
    const cleaned = this.normalizeFileUrl(s);
    if (cleaned && /^https?:\/\//i.test(cleaned)) return cleaned;

    const baseFromService = (this.reportesService as any)?.apiConfig?.getBaseUrl?.();
    const base = baseFromService || window.location.origin || this.BACKEND_URL;
    // If the filename looks like a PDF (or other non-image document), prefer the /uploads/ path
    if (/\.pdf(?:\?.*)?$/i.test(s) || /\.docx?$|\.pptx?$/i.test(s)) {
      return `${base.replace(/\/$/, '')}/uploads/${s.replace(/^\//, '')}`;
    }
    return `${base.replace(/\/$/, '')}/tmp_uploads/${s.replace(/^\//, '')}`;
  }

  private coerceAssetMeta(meta: any): SignedAssetMeta | null {
    if (!meta || typeof meta !== 'object') return null;
    const url = typeof meta.url === 'string' ? meta.url : undefined;
    const publicId = typeof meta.public_id === 'string'
      ? meta.public_id
      : (typeof meta.publicId === 'string' ? meta.publicId : undefined);
    const rawType = typeof meta.resource_type === 'string'
      ? meta.resource_type
      : (typeof meta.resourceType === 'string' ? meta.resourceType : undefined);
    const resourceType = rawType === 'raw' || rawType === 'image' ? rawType : undefined;
    if (!url && !publicId) return null;
    return { url, publicId, resourceType };
  }

  private parseAssetMeta(raw: any): SignedAssetMeta | null {
    if (!raw) return null;
    if (typeof raw === 'object') return this.coerceAssetMeta(raw);
    const s = String(raw).trim();
    if (!s) return null;
    if (!s.startsWith('{') || !s.endsWith('}')) return null;
    try {
      return this.coerceAssetMeta(JSON.parse(s));
    } catch {
      return null;
    }
  }

  private inferResourceType(value: string): 'raw' | 'image' {
    const s = (value || '').toLowerCase();
    if (/\.(pdf|docx?|pptx?|xlsx?)(\?.*)?$/.test(s)) return 'raw';
    return 'image';
  }

  private resolveAsset(raw: string | null | undefined): SignedAssetMeta & { url: string } {
    const meta = this.parseAssetMeta(raw);
    const urlFromMeta = meta?.url ? this.normalizeUrl(meta.url) : '';
    const url = urlFromMeta || this.normalizeUrl(raw);
    const resourceType = meta?.resourceType || (url ? this.inferResourceType(url) : undefined);
    return { url, publicId: meta?.publicId, resourceType };
  }

  private getSignedUrlInfo(url: string, assetMeta?: SignedAssetMeta): { publicId: string; resourceType: 'raw' | 'image' } | null {
    const extracted = this.extractCloudinaryInfo(url);
    const publicId = assetMeta?.publicId || extracted.publicId;
    if (!publicId) return null;
    const inferredFromId = this.inferResourceType(publicId);
    const inferredFromUrl = this.inferResourceType(url);
    const inferred = inferredFromId === 'raw' || inferredFromUrl === 'raw' ? 'raw' : 'image';
    let resourceType = assetMeta?.resourceType || extracted.resourceType || inferred;
    if (resourceType === 'image' && inferred === 'raw' && !assetMeta?.resourceType) {
      resourceType = 'raw';
    }
    return { publicId, resourceType };
  }

  private async requestSignedUrl(publicId: string, resourceType: 'raw' | 'image'): Promise<string | null> {
    const params = new HttpParams().set('publicId', publicId).set('resourceType', resourceType);
    const obs = this.http.get<{ signedUrl?: string; url?: string }>('/api/files/signed-url', { params });
    let resp;
    try {
      resp = await lastValueFrom(obs);
    } catch (err: any) {
      if (err?.status === 404 || err?.status === 0) {
        const baseFromService = (this.reportesService as any)?.apiConfig?.getBaseUrl?.() || 'http://127.0.0.1:5000';
        const base = baseFromService.replace(/\/$/, '');
        const candidates = [
          `${base}/api/files/signed-url`,
          `${base}/files/signed-url`,
          `${base}/signed-url`
        ];
        let lastErr: any = null;
        for (const candidate of candidates) {
          try {
            const obs2 = this.http.get<{ signedUrl?: string; url?: string }>(candidate, { params });
            resp = await lastValueFrom(obs2);
            if (resp) break;
          } catch (e) {
            lastErr = e;
          }
        }
        if (!resp) throw lastErr || err;
      } else {
        throw err;
      }
    }
    const signed = resp?.signedUrl || resp?.url;
    return signed || null;
  }

  // Comprueba accesibilidad del PDF mediante HEAD. Si da 200 devuelve la URL.
  // Si da 401 y se facilita fallbackApi, intenta obtener URL firmada desde el backend.
  private async ensurePdf(url: string, assetMeta?: SignedAssetMeta, fallbackApi?: string): Promise<string> {
    if (!url) throw new Error('URL vacía');
    try {
      const head = await fetch(url, { method: 'HEAD' });
      if (head.status === 200) return url;
      if (head.status === 401) {
        // Try fallbackApi if provided (generic endpoint path provided by caller)
        if (fallbackApi) {
          const r = await fetch(fallbackApi);
          if (!r.ok) throw new Error('No se pudo obtener URL firmada');
          const j = await r.json();
          return j.signedUrl || j.url || url;
        }

        // Otherwise, attempt to request a signed URL from our backend using publicId
        try {
          const info = this.getSignedUrlInfo(url, assetMeta);
          if (!info?.publicId) throw new Error('No se pudo extraer publicId de la URL');
          const signed = await this.requestSignedUrl(info.publicId, info.resourceType);
          if (signed) return signed;
        } catch (e) {
          console.warn('[reportes] signed-url fallback failed', e);
        }

        throw new Error('Recurso privado (401)');
      }
      if (head.status >= 400) throw new Error('Recurso no accesible: ' + head.status);
      return url;
    } catch (e: any) {
      // Si el fetch HEAD no es permitido por CORS, intentar GET con rango pequeño como fallback
      try {
        const r = await fetch(url, { method: 'GET', headers: { Range: 'bytes=0-0' } });
        if (r.ok || r.status === 206) return url;
        if (r.status === 401 && fallbackApi) {
          const rf = await fetch(fallbackApi);
          if (!rf.ok) throw new Error('No se pudo obtener URL firmada');
          const jf = await rf.json();
          return jf.signedUrl || jf.url || url;
        }
        // if 401, attempt backend signed URL as above
        if (r.status === 401) {
          try {
            const info = this.getSignedUrlInfo(url, assetMeta);
            if (info?.publicId) {
              const signed2 = await this.requestSignedUrl(info.publicId, info.resourceType);
              if (signed2) return signed2;
            }
          } catch (ee) {
            console.warn('[reportes] signed-url fallback failed (GET-range)', ee);
          }
        }
        throw new Error('No se pudo validar el recurso: ' + (r.status || r.statusText));
      } catch (e2: any) {
        throw new Error(e2?.message || 'Error comprobando accesibilidad');
      }
    }
  }

  // Extrae publicId y resourceType desde una URL de Cloudinary
  private extractCloudinaryInfo(url: string): { publicId: string | null; resourceType: 'raw' | 'image' | null } {
    try {
      const u = new URL(url);
      const path = u.pathname || '';
      // path examples:
      // /image/upload/v1767850401/eclat/postulaciones/trabajadores/ngcwy90ytk3v43a1emfc.pdf
      // /raw/upload/v1767850457/eclat/proveedores/caracteristicas/documentos/Plan%20intermedio
      const match = path.match(/\/(image|raw)\/upload\/(?:v\d+\/)?(.+)$/);
      if (match) {
        const resource = match[1] as 'image' | 'raw';
        const publicId = decodeURIComponent(match[2]);
        return { publicId, resourceType: resource === 'raw' ? 'raw' : 'image' };
      }
      // fallback: if path contains '/upload/' try to take the rest
      const m2 = path.match(/\/upload\/(?:v\d+\/)?(.+)$/);
      if (m2) return { publicId: decodeURIComponent(m2[1]), resourceType: 'image' };
      return { publicId: null, resourceType: null };
    } catch (e) {
      return { publicId: null, resourceType: null };
    }
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
