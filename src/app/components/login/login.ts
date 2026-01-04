import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { AuthGoogle } from '../../service/auth-google';
import { AuthJwtService } from '../../service/auth-jwt.service';
import { PasswordResetService } from '../../service/password-reset.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  // AuthGoogle provided in root; avoid component-level provider to keep singleton
})
export class Login implements OnInit {
  form!: FormGroup;
  changePasswordForm!: FormGroup;
  showPass = signal(false);
  submitting = signal(false);
  shake = signal(false);
  
  // Modal de cambio de contraseña
  showChangePasswordModal = signal(false);
  changingPassword = signal(false);
  changePasswordError = signal('');
  changePasswordSuccess = signal('');

  constructor(
    private fb: FormBuilder, 
    private auth: AuthJwtService, 
    private router: Router, 
    private authGoogle: AuthGoogle,
    private passwordResetService: PasswordResetService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      remember: [true]
    });

    this.changePasswordForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    });
  }

  // Iniciar login con Google OAuth
  log() {
    // Inicia el flujo de Google OAuth
    // Google redirigirá a /home donde se completará el proceso
    this.authGoogle.log();
  }

  get f() { return this.form.controls; }
  get cpf() { return this.changePasswordForm.controls; }

  toggleShow(): void {
    this.showPass.set(!this.showPass());
  }

  // Método para manejar el submit
  debugMessage: string = '';

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.shake.set(true);
      setTimeout(() => this.shake.set(false), 600);
      return;
    }
    this.submitting.set(true);

    try {
      const response = await firstValueFrom(this.auth.login(this.form.value));
      this.submitting.set(false);

      // LOGS DETALLADOS
      console.log('[LOGIN][DEBUG] Respuesta backend:', response);
      this.debugMessage =
        'Respuesta backend: ' + JSON.stringify(response, null, 2);
      // Mostrar flags explícitamente
      this.debugMessage += '\nuser.must_change_password: ' + response.user.must_change_password;
      this.debugMessage += '\ntemporary_password_used: ' + response.temporary_password_used;
      // Log de consola
      console.log('[LOGIN][DEBUG] user.must_change_password:', response.user.must_change_password);
      console.log('[LOGIN][DEBUG] temporary_password_used:', response.temporary_password_used);

      // FORZAR MODAL Y BLOQUEAR NAVEGACIÓN
      if (response.user.must_change_password === true || response.temporary_password_used === true) {
        console.log('[LOGIN][DEBUG] Activando modal de cambio de contraseña (flags detectados)');
        this.debugMessage += '\n[FRONT] Activando modal de cambio de contraseña';
        // Guardar tokens temporales para el cambio forzado
        (window as any)._tempAccessToken = response.accessToken;
        (window as any)._tempRefreshToken = response.refreshToken;
        (window as any)._tempUser = response.user;
        // No guardar usuario ni tokens en localStorage/sessionStorage
        this.showChangePasswordModal.set(true);
        // Bloquear navegación: no redirigir, no guardar sesión
        return;
      }

      // Login normal
      this.auth['saveTokens'](response.accessToken, response.refreshToken, this.form.value.remember);
      this.auth['saveUser'](this.auth['normalizeUser'](response.user), this.form.value.remember);
      this.auth['authStateSubject'].next(this.auth['normalizeUser'](response.user));
      this.router.navigate(['/home']);
    } catch (err: any) {
      this.submitting.set(false);
      this.shake.set(true);
      this.debugMessage = 'Error en login: ' + (err?.error ? JSON.stringify(err.error) : err?.message || err);
      console.error('[LOGIN][DEBUG] Error en login:', err);
      setTimeout(() => this.shake.set(false), 600);
    }
  }

  /**
   * Cambiar contraseña después de login con contraseña temporal
   */
  async onChangePassword(): Promise<void> {
    if (this.changePasswordForm.invalid) {
      this.changePasswordError.set('Por favor completa todos los campos');
      return;
    }

    const newPassword = this.changePasswordForm.value.newPassword;
    const confirmPassword = this.changePasswordForm.value.confirmPassword;

    if (newPassword !== confirmPassword) {
      this.changePasswordError.set('Las contraseñas no coinciden');
      return;
    }

    if (newPassword.length < 6) {
      this.changePasswordError.set('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    this.changingPassword.set(true);
    this.changePasswordError.set('');
    this.changePasswordSuccess.set('');

    try {
      // Usar el accessToken temporal si existe
      const tempToken = (window as any)._tempAccessToken;
      if (tempToken) {
        // Si tu backend requiere el token en el header, puedes setearlo aquí temporalmente
        // O modificar el servicio para aceptar el token temporal
      }
      await firstValueFrom(this.passwordResetService.changePasswordForced(newPassword));
      this.changingPassword.set(false);
      this.changePasswordSuccess.set('¡Contraseña actualizada exitosamente! Redirigiendo...');

      // Limpiar tokens temporales
      delete (window as any)._tempAccessToken;
      delete (window as any)._tempRefreshToken;
      delete (window as any)._tempUser;

      // Forzar login real para guardar usuario/tokens y redirigir
      setTimeout(async () => {
        const loginResp = await firstValueFrom(this.auth.login({
          email: this.form.value.email,
          password: newPassword,
          remember: this.form.value.remember
        }));
        // Validar que must_change_password ya no venga en true
        if (loginResp.user.must_change_password === true) {
          this.changePasswordError.set('El backend sigue devolviendo must_change_password: true. Contacta soporte.');
          this.showChangePasswordModal.set(true);
          return;
        }
        this.auth['saveTokens'](loginResp.accessToken, loginResp.refreshToken, this.form.value.remember);
        this.auth['saveUser'](this.auth['normalizeUser'](loginResp.user), this.form.value.remember);
        this.auth['authStateSubject'].next(this.auth['normalizeUser'](loginResp.user));
        this.showChangePasswordModal.set(false);
        this.router.navigate(['/home']);
      }, 2000);
    } catch (error: any) {
      this.changingPassword.set(false);
      this.changePasswordError.set(error.error?.message || 'Error al cambiar la contraseña');
    }
  }

  /**
   * Cerrar modal de cambio de contraseña
   */
  closeChangePasswordModal(): void {
    // Forzar logout y redirigir siempre si cancela
    this.showChangePasswordModal.set(false);
    this.changePasswordForm.reset();
    this.changePasswordError.set('');
    this.changePasswordSuccess.set('');
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
