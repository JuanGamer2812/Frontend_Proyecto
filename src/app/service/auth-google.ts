import { HttpClient } from '@angular/common/http';
import { AuthJwtService } from './auth-jwt.service';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthConfig, OAuthService } from 'angular-oauth2-oidc';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthGoogle {
  private oAuthService = inject(OAuthService);
  private router = inject(Router);
  private http = inject(HttpClient);
  private authJwt = inject(AuthJwtService);
  profile = signal<any>(null);
  private readonly adminEmail = 'jhon.velez.1042@gmail.com';

  constructor() {
    this.initLogin();
  }

  private syncProfileFromToken(): void {
    const claims = this.oAuthService.getIdentityClaims();
    this.profile.set(claims ?? null);
  }

  initLogin() {
    const config: AuthConfig = {
      issuer: 'https://accounts.google.com',
      strictDiscoveryDocumentValidation: false,
      clientId: '239167116959-39u62c6tn6o08l7c4aeclhkq1se9g48l.apps.googleusercontent.com',
      redirectUri: window.location.origin + '/home',
      scope: 'openid profile email',
    };

    this.oAuthService.configure(config);
    this.oAuthService.setupAutomaticSilentRefresh();

    // Log events and always try to sync profile when events arrive.
    this.oAuthService.events.subscribe((event) => {
      // Debug helpful para desarrollo local
      // eslint-disable-next-line no-console
      console.debug('[AuthGoogle] OAuth event', event);

      // Intentamos sincronizar profile en la mayoría de eventos (token_received, token_refreshed, login)
      try {
        this.syncProfileFromToken();
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[AuthGoogle] syncProfileFromToken error', e);
      }

      if (event.type === 'logout') {
        this.profile.set(null);
      }
    });

    // Intentamos login automático y sincronizar profile al terminar
    this.oAuthService
      .loadDiscoveryDocumentAndTryLogin()
      .then(() => {
        this.syncProfileFromToken();
        // eslint-disable-next-line no-console
        console.debug('[AuthGoogle] loadDiscoveryDocumentAndTryLogin complete, profile=', this.profile());
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('[AuthGoogle] loadDiscoveryDocumentAndTryLogin error', err);
      });
  }

  log() {
    // eslint-disable-next-line no-console
    console.debug('[AuthGoogle] initLoginFlow redirectUri=', this.oAuthService.options?.redirectUri);
    this.oAuthService.initLoginFlow();
  }

  logout() {
    this.oAuthService.logOut();
    this.profile.set(null);
  }

  getProfile() {
    this.syncProfileFromToken();
    return this.profile();
  }

  // Indica si hay token de acceso válido
  isLoggedIn(): boolean {
    try {
      return !!this.oAuthService.getAccessToken() && this.oAuthService.hasValidAccessToken();
    } catch (e) {
      return false;
    }
  }

  // Metodo para obtener el correo del usuario autenticado
  getUserEmail(): string | null {
    const profile = this.getProfile();
    return profile ? profile['email'] : null;
  }

  isAdminEmail(email: string | null | undefined): boolean {
    return email === this.adminEmail;
  }

  isAdminProfile(profile: any): boolean {
    return this.isAdminEmail(profile?.email);
  }

  // Verifica si el correo es tuyo y asigna el rol de admin
  assignRoleBasedOnEmail(): string {
    const email = this.getUserEmail();
    if (this.isAdminEmail(email)) {
      return 'admin';
    }
    return 'user';
  }

  // Metodo para redirigir basado en el rol
  handleRedirect() {
    const role = this.assignRoleBasedOnEmail();
    if (role === 'admin') {
      this.router.navigate(['/admin']); // Redirige al panel de administracion
    } else {
      this.router.navigate(['/user']); // Redirige a la vista de usuario
    }
  }

  /**
   * Llama al backend para login/registro Google y guarda usuario/tokens
   */
  async loginWithBackendGoogle(): Promise<void> {
    let profile: any = this.getProfile();
    
    console.log('[GoogleLogin] Perfil inicial de getProfile():', JSON.stringify(profile, null, 2));

    // Si no tenemos email o nombre/apellido, intentamos cargar el userinfo completo desde Google
    if (!profile || !profile.email || !profile.given_name) {
      try {
        console.log('[GoogleLogin] Intentando cargar userinfo completo de Google...');
        const loaded: any = await this.oAuthService.loadUserProfile();
        console.log('[GoogleLogin] Userinfo cargado:', JSON.stringify(loaded, null, 2));
        
        // Algunos proveedores retornan en .info, otros plano
        const userInfo = (loaded as any)?.info || loaded;
        if (userInfo && userInfo.email) {
          profile = { ...profile, ...userInfo };
          console.log('[GoogleLogin] Perfil combinado tras loadUserProfile:', JSON.stringify(profile, null, 2));
        }
      } catch (e) {
        console.warn('[GoogleLogin] No se pudo cargar userinfo:', e);
      }
    }

    console.log('[GoogleLogin] Perfil FINAL antes de validar:', JSON.stringify(profile, null, 2));

    if (!profile || !profile.email) {
      throw new Error('No se encontró email en el perfil de Google.');
    }

    // Prepara payload para backend, nunca envía campos vacíos
    let nombre_usuario = profile.given_name || profile.name || (profile.email ? profile.email.split('@')[0] : 'Usuario Google');
    let apellido_usuario = profile.family_name || profile.familyName;
    
    // Si no hay apellido pero sí nombre completo, intentar dividir inteligentemente
    if (!apellido_usuario && profile.name) {
      const nameParts = profile.name.trim().split(/\s+/);
      if (nameParts.length > 1) {
        // Si el nombre tiene múltiples partes (ej: "Juan Pérez"), dividir
        nombre_usuario = nameParts.slice(0, -1).join(' '); // Todas excepto la última
        apellido_usuario = nameParts[nameParts.length - 1]; // La última parte
        console.log('[GoogleLogin] Nombre dividido: nombre=' + nombre_usuario + ', apellido=' + apellido_usuario);
      } else {
        // Si solo hay una palabra, usar el mismo valor para ambos
        apellido_usuario = nombre_usuario;
        console.log('[GoogleLogin] Usando nombre como apellido:', apellido_usuario);
      }
    } else if (!apellido_usuario) {
      // Si definitivamente no hay apellido, usar el mismo nombre
      apellido_usuario = nombre_usuario;
      console.log('[GoogleLogin] No hay apellido, duplicando nombre:', apellido_usuario);
    }
    
    console.log('[GoogleLogin] Extrayendo campos: nombre=' + nombre_usuario + ', apellido=' + apellido_usuario);
    const genero_usuario = profile.gender === 'male' ? 'Masculino' : (profile.gender === 'female' ? 'Femenino' : 'Otro');
    const fecha_nacimiento_usuario = profile.birthdate && /^\d{4}-\d{2}-\d{2}$/.test(profile.birthdate) ? profile.birthdate : '2000-01-01';
    const contrasena_usuario = 'google123'; // Al menos 6 caracteres
    const correo_usuario = profile.email;
    const telefono_usuario = profile.phone_number && /^[0-9]{1,12}$/.test(profile.phone_number) ? profile.phone_number : '0000000000';
    const foto_perfil_usuario = profile.picture || profile.pictureUrl || null;

    const payload: any = {
      nombre_usuario,
      apellido_usuario,
      genero_usuario,
      fecha_nacimiento_usuario,
      contrasena_usuario,
      correo_usuario,
      telefono_usuario,
      foto_perfil_usuario
    };
    
    console.log('[GoogleLogin] PAYLOAD a enviar al backend:', JSON.stringify(payload, null, 2));

    // Construir endpoint respetando apiUrl en producción (evita golpear Nginx estático)
    const googleLoginUrl = (environment.apiUrl || '').trim()
      ? `${environment.apiUrl}/api/auth/google-login`
      : '/api/auth/google-login';
    try {
      const resp: any = await this.http.post(googleLoginUrl, payload).toPromise();
      // Aceptar 'token' o 'accessToken' según la respuesta del backend
      const accessToken = resp.accessToken || resp.token;
      const refreshToken = resp.refreshToken || resp.refresh_token;
      if (!accessToken) {
        console.error('[GoogleLogin] No se recibió accessToken/token en la respuesta del backend:', resp);
        throw new Error('No se recibió accessToken/token en la respuesta del backend');
      }
      
      // Usar métodos públicos directamente (ya no son privados)
      const normalizedUser = this.authJwt.normalizeUser(resp.user);
      this.authJwt.saveTokens(accessToken, refreshToken, true);
      this.authJwt.saveUser(normalizedUser, true);
      
      // Actualizar el estado de autenticación
      this.authJwt['authStateSubject'].next(normalizedUser);
      
      // LOG: tokens guardados
      console.log('[GoogleLogin] accessToken guardado:', accessToken);
      console.log('[GoogleLogin] refreshToken guardado:', refreshToken);
      console.log('[GoogleLogin] user normalizado:', normalizedUser);
      
      // Verificar token en storage
      const tokenInStorage = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
      console.log('[GoogleLogin] accessToken en storage tras guardar:', tokenInStorage);
      
      // Verificar usuario en storage
      const userInStorage = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
      console.log('[GoogleLogin] currentUser en storage tras guardar:', userInStorage);
      
      // Esperar hasta que el token esté presente en storage (máx 2s)
      for (let i = 0; i < 20; i++) {
        const t = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
        const u = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
        if (t && u) {
          console.log('[GoogleLogin] ✅ Token y usuario listos en storage');
          return;
        }
        await new Promise(res => setTimeout(res, 100));
      }
      console.warn('[GoogleLogin] ⚠️ Token o usuario NO apareció en storage tras 2s');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[AuthGoogle] Error en loginWithBackendGoogle', err);
      throw err;
    }
  }
}
