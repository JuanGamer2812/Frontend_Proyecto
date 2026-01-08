import { Component, EffectRef, OnDestroy, OnInit, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
} from '@angular/forms';
import { AuthGoogle } from '../../service/auth-google';
import { AuthJwtService } from '../../service/auth-jwt.service';
import { VerificationService } from '../../service/verification.service';
import { PasswordResetService } from '../../service/password-reset.service';
import { ApiService } from '../../service/api.service';
import Swal from 'sweetalert2';
// RouterLink no se usa en esta plantilla

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css',
})
export class Perfil implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private authGoogle = inject(AuthGoogle);
  private authService = inject(AuthJwtService);
  private verificationService = inject(VerificationService);
  private passwordResetService = inject(PasswordResetService);
  private apiService = inject(ApiService);

  formPerfil: FormGroup;
  formSeguridad: FormGroup;
  fotoPreview: string | ArrayBuffer | null = null;
  private stopProfileEffect?: EffectRef;

  currentUser: any = null;
  verificacionEnvio = false;
  mensajeVerificacion = '';
  cooldownSeconds = 0;
  private cooldownInterval?: any;

  // Estado de cambio de contraseña
  cambiandoPassword = false;
  cambioPasswordExito = '';
  cambioPasswordError = '';

  // Mis Eventos (para reseñas)
  misEventosPasados: any[] = [];
  misEventosFuturos: any[] = [];
  cargandoEventos = false;
  
  // Modal de reseña
  mostrandoModalResenia = false;
  eventoSeleccionado: any = null;
  formResenia: FormGroup;
  enviandoResenia = false;
  mensajeReseniaExito = '';
  mensajeReseniaError = '';

  constructor() {
    this.formPerfil = this.fb.group({
      nombre: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.pattern('^[A-Za-zÀ-ÿ\\s]+$'),
        ],
      ],
      apellido: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.pattern('^[A-Za-zÀ-ÿ\\s]+$'),
        ],
      ],
      correo: [
        '',
        [
          Validators.required,
          Validators.email,
          Validators.pattern(/^[\w.%+\-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/),
        ],
      ],
      telefono: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      fecha_nacimiento: ['', [Validators.required, this.fechaValidaActual.bind(this)]],
      genero: ['', Validators.required],
      foto: [null], // opcional
    });

    this.formSeguridad = this.fb.group(
      {
        actual: ['', [Validators.required]], // Solo requerido
        nueva: [
          '',
          [
            Validators.required,
            Validators.minLength(8),
            Validators.pattern(
              /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=\[{\]};:'",<.>/?\\|`~]).{8,}$/
            ),
          ],
        ],
        confirmar: ['', [Validators.required]],
      },
      { validators: this.contrasenasCoinciden }
    );

    // Form de reseña
    this.formResenia = this.fb.group({
      calificacion: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
      comentario: ['', [Validators.maxLength(500)]]
    });

    // Inicializar efecto para observar cambios del profile (injection context: constructor)
    this.initProfileEffect();
  }

  // Crear effect() en el constructor (contexto de inyección válido) para observar cambios en el profile
  // y actualizar el formulario y la vista previa.
  // Nota: el effect se creó después de la inicialización del form en el constructor anterior.
  ngOnInit(): void {
    // Siempre recargar el usuario desde el backend para reflejar el estado real
    this.authService.me().subscribe({
      next: (user) => {
        this.currentUser = user;
        this.prefillFromJwtUser(user);
        // Cargar eventos pasados
        this.cargarEventosPasados();
      },
      error: () => {
        // Si falla, fallback a localStorage
        const currentUser = this.authService.getCurrentUser();
        if (currentUser) {
          this.currentUser = currentUser;
          this.prefillFromJwtUser(currentUser);
          this.cargarEventosPasados();
        }
      }
    });
    // Intentar cargar desde Google si está disponible
    this.authGoogle.getProfile();
  }

  /**
   * Prefill form from JWT authenticated user
   */
  private prefillFromJwtUser(user: any): void {
    const patch: any = {};
    
    console.log('🔑 prefillFromJwtUser - usuario completo:', user);
    
    // Solo actualizar si el campo no ha sido editado Y si tiene un valor válido del backend
    if (user.nombre && !this.fPerfil['nombre'].dirty) {
      patch.nombre = user.nombre;
    }
    if (user.apellido && !this.fPerfil['apellido'].dirty) {
      patch.apellido = user.apellido;
    }
    if (user.email && !this.fPerfil['correo'].dirty) {
      patch.correo = user.email;
    }
    if (user.telefono && !this.fPerfil['telefono'].dirty) {
      patch.telefono = user.telefono;
    }
    // Foto desde "foto" o "foto_url" - solo actualizar si no hay preview cargado
    const foto = user.foto || user.foto_url;
    if (foto && !this.fotoPreview) {
      this.fotoPreview = this.resolveImageUrl(foto);
    }

    // Género - solo si existe en el backend
    if (user.genero && !this.fPerfil['genero'].dirty) {
      const g = String(user.genero).toUpperCase();
      patch.genero = g === 'MASCULINO' ? 'M' : g === 'FEMENINO' ? 'F' : (g === 'M' || g === 'F') ? g : 'Otros';
    }

    // Fecha de nacimiento (normalizar a YYYY-MM-DD) - solo si existe
    if (user.fecha_nacimiento && !this.fPerfil['fecha_nacimiento'].dirty) {
      console.log('📅 Fecha del backend:', user.fecha_nacimiento, 'tipo:', typeof user.fecha_nacimiento);
      const iso = this.normalizeToIsoDate(String(user.fecha_nacimiento));
      console.log('📅 Fecha normalizada:', iso);
      if (iso) patch.fecha_nacimiento = iso;
    }
    
    console.log('📝 Patch a aplicar:', patch);
    if (Object.keys(patch).length) {
      this.formPerfil.patchValue(patch, { emitEvent: false });
      // Forzar actualización del DOM para el input date
      setTimeout(() => {
        const fechaInput = document.querySelector('input[formControlName="fecha_nacimiento"]') as HTMLInputElement;
        if (fechaInput && patch.fecha_nacimiento) {
          fechaInput.value = patch.fecha_nacimiento;
          console.log('📅 Valor forzado en el DOM:', fechaInput.value);
        }
      }, 0);
    }
  }

  // Inicializar el efecto en un initializer fuera del ciclo de vida para mantener la inyección correcta.
  // (Colocamos el efecto en una función que se llama desde el constructor inmediatamente después de crear los forms.)
  private initProfileEffect(): void {
    this.stopProfileEffect = effect(() => {
      const profile = this.authGoogle.profile();
      if (profile) {
        this.prefillFromGoogleProfile(profile);
        if (profile.picture) {
          this.fotoPreview = this.resolveImageUrl(profile.picture);
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.stopProfileEffect?.destroy();
    if (this.cooldownInterval) {
      clearInterval(this.cooldownInterval);
    }
  }

  get fPerfil() {
    return this.formPerfil.controls;
  }

  onSendVerificationEmail(): void {
    if (this.verificacionEnvio || this.cooldownSeconds > 0) return;

    this.verificacionEnvio = true;
    this.mensajeVerificacion = '';

    this.verificationService.sendVerificationEmail().subscribe({
      next: (res) => {
        this.mensajeVerificacion = res?.message || 'Correo de verificación enviado.';
        const cooldown = res?.cooldown_seconds ?? 300; // 5 minutos por defecto
        this.startCooldown(cooldown);
        this.verificacionEnvio = false;
        // Forzar recarga del usuario desde el backend para obtener el estado real
        this.authService.me().subscribe({
          next: (user) => {
            this.currentUser = user;
          },
          error: () => {}
        });
      },
      error: (err) => {
        this.mensajeVerificacion = err?.error?.message || 'No se pudo enviar el correo. Intenta de nuevo.';
        this.verificacionEnvio = false;
      }
    });
  }

  onSubmitSeguridad() {
    if (this.formSeguridad.invalid) {
      this.formSeguridad.markAllAsTouched();
      return;
    }

    const { actual, nueva, confirmar } = this.formSeguridad.value;

    // Validación adicional de coincidencia
    if (nueva !== confirmar) {
      this.cambioPasswordError = 'Las contraseñas no coinciden';
      this.cambioPasswordExito = '';
      return;
    }

    this.cambioPasswordError = '';
    this.cambioPasswordExito = '';
    this.cambiandoPassword = true;

    this.passwordResetService.changePassword(actual, nueva).subscribe({
      next: () => {
        this.cambiandoPassword = false;
        this.cambioPasswordExito = 'Contraseña actualizada correctamente.';
        this.cambioPasswordError = '';
        this.formSeguridad.reset();
      },
      error: (err) => {
        this.cambiandoPassword = false;
        const msg = err?.error?.message || 'No se pudo actualizar la contraseña';
        this.cambioPasswordError = msg;
        this.cambioPasswordExito = '';
      }
    });
  }

  private startCooldown(seconds: number): void {
    this.cooldownSeconds = seconds;
    if (this.cooldownInterval) {
      clearInterval(this.cooldownInterval);
    }
    this.cooldownInterval = setInterval(() => {
      this.cooldownSeconds = Math.max(0, this.cooldownSeconds - 1);
      if (this.cooldownSeconds === 0 && this.cooldownInterval) {
        clearInterval(this.cooldownInterval);
      }
    }, 1000);
  }

  public formatCooldown(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  get fSeguridad() {
    return this.formSeguridad.controls;
  }

  private prefillFromGoogleProfile(profile: any): void {
    const patch: any = {};

    // Solo llenar campos que no han sido editados (dirty) y que estén vacíos
    if (!this.fPerfil['nombre'].dirty && !this.fPerfil['nombre'].value) {
      const givenName = profile.given_name ?? profile.name?.split(' ')[0];
      if (givenName) {
        patch.nombre = givenName;
      }
    }

    if (!this.fPerfil['apellido'].dirty && !this.fPerfil['apellido'].value) {
      const lastName =
        profile.family_name ??
        (profile.name ? (profile.name as string).split(' ').slice(1).join(' ').trim() : '');
      if (lastName) {
        patch.apellido = lastName;
      }
    }

    if (profile.email && !this.fPerfil['correo'].dirty && !this.fPerfil['correo'].value) {
      patch.correo = profile.email;
    }

    // Prefill telefono si viene en los claims (varias claves posibles)
    const phone = profile.phone_number ?? profile.phone ?? profile.phoneNumber ?? profile['phone'];
    if (phone && !this.fPerfil['telefono'].dirty && !this.fPerfil['telefono'].value) {
      // Normalizar dejando solo dígitos
      const digits = String(phone).replace(/\D+/g, '');
      if (digits.length >= 10) {
        patch.telefono = digits.slice(-10);
      } else {
        patch.telefono = digits;
      }
    }

    // Fecha de nacimiento: buscar claves comunes y normalizar a YYYY-MM-DD
    const birth = profile.birthdate ?? profile.birthday ?? profile['birth_date'] ?? profile['dob'];
    if (birth && !this.fPerfil['fecha_nacimiento'].dirty && !this.fPerfil['fecha_nacimiento'].value) {
      const parsed = this.normalizeToIsoDate(String(birth));
      if (parsed) patch.fecha_nacimiento = parsed;
    }

    // Género: mapear valores comunes a tus opciones (M/F/Otros)
    const gender = (profile.gender ?? profile['sex'] ?? '').toString().toLowerCase();
    if (gender && !this.fPerfil['genero'].dirty && !this.fPerfil['genero'].value) {
      if (gender.startsWith('m')) patch.genero = 'M';
      else if (gender.startsWith('f')) patch.genero = 'F';
      else patch.genero = 'Otros';
    }

    if (Object.keys(patch).length) {
      this.formPerfil.patchValue(patch, { emitEvent: false });
    }
  }

  // Convierte rutas relativas (/uploads/...) a absolutas del backend y adapta Google Drive links
  private resolveImageUrl(url: string): string {
    if (!url) return url;
    const u = String(url);
    // Rutas relativas a uploads -> apuntar al backend directo en dev
    if (u.startsWith('/uploads/')) {
      const base = `http://127.0.0.1:5000${u}`;
      const sep = base.includes('?') ? '&' : '?';
      return `${base}${sep}t=${Date.now()}`; // evitar caché tras actualización
    }
    // Google Drive share link -> vista embebible
    const driveIdMatch = u.match(/https?:\/\/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/);
    if (driveIdMatch) {
      return `https://drive.google.com/uc?export=view&id=${driveIdMatch[1]}`;
    }
    return u;
  }

  // Intenta normalizar varias representaciones de fecha a YYYY-MM-DD
  private normalizeToIsoDate(value: string): string | null {
    if (!value) return null;
    
    console.log('📅 normalizeToIsoDate input:', value);
    
    // Si ya tiene formato ISO completo (YYYY-MM-DD o YYYY-MM-DDTHH:mm:ss)
    const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const resultado = isoMatch[1] + '-' + isoMatch[2] + '-' + isoMatch[3];
      console.log('📅 Ya es ISO, retornando:', resultado);
      return resultado;
    }

    // Formato dd/mm/yyyy o mm/dd/yyyy
    const slashMatch = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (slashMatch) {
      let d = parseInt(slashMatch[1], 10);
      let m = parseInt(slashMatch[2], 10);
      let y = parseInt(slashMatch[3], 10);
      
      // Corregir años de 2 dígitos (asumimos 1900-2099)
      if (y < 100) {
        y += (y > 50) ? 1900 : 2000;
      }
      
      // Heurística: si el primer número > 12 lo tratamos como día (dd/mm/yyyy)
      if (d > 12) {
        // d is day, m is month
      } else if (m > 12) {
        // swap if needed
        const tmp = d;
        d = m;
        m = tmp;
      }
      
      // Crear fecha directamente como string para evitar conversiones de zona horaria
      const year = y;
      const month = String(m).padStart(2, '0');
      const day = String(d).padStart(2, '0');
      const resultado = `${year}-${month}-${day}`;
      console.log('📅 Convertido de slash format:', resultado);
      return resultado;
    }

    // Intenta parsear con Date (para timestamps, etc) usando UTC
    const dt = new Date(value);
    if (!isNaN(dt.getTime())) {
      // Usar UTC para evitar problemas de zona horaria
      const year = dt.getUTCFullYear();
      const month = String(dt.getUTCMonth() + 1).padStart(2, '0');
      const day = String(dt.getUTCDate()).padStart(2, '0');
      const resultado = `${year}-${month}-${day}`;
      console.log('📅 Parseado con Date() UTC:', resultado);
      return resultado;
    }
    
    console.warn('⚠️ No se pudo parsear la fecha:', value);
    return null;
  }

  fechaValidaActual(control: AbstractControl) {
    const fecha = new Date(control.value);
    const hoy = new Date();
    if (fecha > hoy) return { fechaInvalida: true };
    return null;
  }

  contrasenasCoinciden(group: AbstractControl) {
    const nueva = group.get('nueva')?.value;
    const confirmar = group.get('confirmar')?.value;
    return nueva === confirmar ? null : { noCoincide: true };
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.formPerfil.patchValue({ foto: file });
      this.formPerfil.get('foto')?.updateValueAndValidity();

      const reader = new FileReader();
      reader.onload = () => (this.fotoPreview = reader.result);
      reader.readAsDataURL(file);
    }
  }

  onImgError() {
    // Fallback avatar si la imagen no se puede cargar
    const nombre = this.fPerfil['nombre'].value || '';
    const apellido = this.fPerfil['apellido'].value || '';
    const seed = encodeURIComponent(`${nombre} ${apellido}`.trim() || 'Usuario');
    this.fotoPreview = `https://ui-avatars.com/api/?background=1e2a5a&color=fff&name=${seed}`;
  }

  onSubmitPerfil() {
    if (this.formPerfil.invalid) {
      this.formPerfil.markAllAsTouched();
      return;
    }
    const { nombre, apellido, correo, telefono, fecha_nacimiento, genero, foto } = this.formPerfil.value;

    // Construir payload: si hay foto, usar FormData
    let payload: any;
    if (foto) {
      const fd = new FormData();
      fd.append('nombre', nombre);
      fd.append('apellido', apellido);
      fd.append('email', correo);
      if (telefono) fd.append('telefono', String(telefono).substring(0, 10));
      if (genero) fd.append('genero', genero);
      if (fecha_nacimiento) fd.append('fecha_nacimiento', fecha_nacimiento);
      fd.append('foto', foto);
      payload = fd;
    } else {
      payload = {
        nombre,
        apellido,
        email: correo,
        telefono: telefono ? String(telefono).substring(0, 10) : undefined,
        genero,
        fecha_nacimiento
      };
    }

    this.authService.updateProfile(payload).subscribe({
      next: res => {
        // Actualizar vista previa si trae nueva foto
        const u: any = res.user as any;
        const foto = u.foto || u.foto_url;
        if (foto) {
          this.fotoPreview = this.resolveImageUrl(foto);
        }
        // Marcar formulario como pristine para que futuras recargas no sobrescriban
        this.formPerfil.markAsPristine();
        Swal.fire({ icon: 'success', title: 'Perfil actualizado', text: 'Tus datos se guardaron correctamente.' });
      },
      error: err => {
        console.error('[Perfil] Error al actualizar:', err);
        const msg = err?.error?.message || err?.message || 'No se pudo actualizar el perfil';
        Swal.fire({ icon: 'error', title: 'No se pudo actualizar', text: msg });
      }
    });
  }

  onCancel() {
    this.formPerfil.reset();
    this.fotoPreview = null;
  }

  // ========== MIS EVENTOS (para reseñas) ==========
  cargarEventosPasados(): void {
    // El JWT puede tener 'id' o 'id_usuario' dependiendo del endpoint
    const idUsuario = this.currentUser?.id_usuario || this.currentUser?.id;
    
    if (!idUsuario) {
      console.warn('[Perfil] No se puede cargar eventos: id de usuario no disponible', this.currentUser);
      return;
    }

    this.cargandoEventos = true;

    // Obtener todos los eventos y filtrar los del usuario (futuros y pasados)
    this.apiService.getEventos().subscribe({
      next: (eventos: any[]) => {
        console.log('[Perfil] Eventos obtenidos:', eventos.length);
        const ahora = new Date();
        
        // Filtrar eventos del usuario y separarlos en futuros/pasados
        const eventosDelUsuario = eventos.filter(e => Number(e.id_usuario_creador) === Number(idUsuario));
        
        this.misEventosPasados = eventosDelUsuario
          .filter(e => {
            const fechaFin = new Date(e.fecha_fin_evento);
            return fechaFin < ahora;
          })
          .sort((a, b) => new Date(b.fecha_fin_evento).getTime() - new Date(a.fecha_fin_evento).getTime());
        
        this.misEventosFuturos = eventosDelUsuario
          .filter(e => {
            const fechaFin = new Date(e.fecha_fin_evento);
            return fechaFin >= ahora;
          })
          .sort((a, b) => new Date(a.fecha_inicio_evento).getTime() - new Date(b.fecha_inicio_evento).getTime());
        
        console.log('[Perfil] Eventos futuros:', this.misEventosFuturos.length);
        console.log('[Perfil] Eventos pasados:', this.misEventosPasados.length);
        this.cargandoEventos = false;
      },
      error: (err) => {
        console.error('[Perfil] Error al cargar eventos:', err);
        this.cargandoEventos = false;
      }
    });
  }

  abrirModalResenia(evento: any): void {
    this.eventoSeleccionado = evento;
    this.mostrandoModalResenia = true;
    this.mensajeReseniaExito = '';
    this.mensajeReseniaError = '';
    this.formResenia.reset({ calificacion: 5, comentario: '' });
  }

  cerrarModalResenia(): void {
    this.mostrandoModalResenia = false;
    this.eventoSeleccionado = null;
    this.formResenia.reset();
  }

  enviarResenia(): void {
    if (this.formResenia.invalid || !this.eventoSeleccionado) return;

    const { calificacion, comentario } = this.formResenia.value;
    const idUsuario = this.currentUser?.id_usuario || this.currentUser?.id;
    
    const payload = {
      id_evento: this.eventoSeleccionado.id_evento,
      id_usuario: idUsuario,
      calificacion: Number(calificacion),
      comentario: comentario?.trim() || null
    };

    this.enviandoResenia = true;
    this.mensajeReseniaError = '';

    // Llamar al endpoint POST /api/resena-evento (debes crearlo en el backend)
    this.apiService.postData('resena-evento', payload).subscribe({
      next: (res: any) => {
        this.mensajeReseniaExito = 'Reseña enviada correctamente. ¡Gracias por compartir tu experiencia!';
        this.enviandoResenia = false;
        setTimeout(() => {
          this.cerrarModalResenia();
          this.cargarEventosPasados(); // Recargar para actualizar estado
        }, 2000);
      },
      error: (err) => {
        console.error('Error al enviar reseña:', err);
        this.mensajeReseniaError = err?.error?.message || 'No se pudo enviar la reseña';
        this.enviandoResenia = false;
      }
    });
  }

  getEstrellas(calificacion: number): number[] {
    return Array(calificacion).fill(0);
  }

  getEstrellasVacias(calificacion: number): number[] {
    return Array(5 - calificacion).fill(0);
  }

  yaResenado(evento: any): boolean {
    // Aquí podrías verificar si ya existe una reseña del usuario para este evento
    // Por ahora retornaremos false para permitir crear la reseña
    return false;
  }
}

