import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, of, map, catchError } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

export type UserRole = 'admin' | 'user' | 'proveedor' | 'trabajador';

export interface AuthUser {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  genero?: string;
  fecha_nacimiento?: string;
  foto?: string;
  email_verified?: boolean;
  email_verification_sent_at?: string;
  must_change_password?: boolean;
  id_rol?: number;
  role: UserRole;
  rol_nombre?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  remember?: boolean;
}

export interface RegisterRequest {
  nombre: string;
  apellido?: string;
  email: string;
  password: string;
  telefono?: string;
  genero?: string;
  fecha_nacimiento?: string;
  foto_url?: string;
  id_rol?: number;
  role?: UserRole;
}

export interface AuthResponse {
  message: string;
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  temporary_password_used?: boolean;
}

export interface UpdateProfileResponse {
  message?: string;
  user: AuthUser;
}

@Injectable({ providedIn: 'root' })
export class AuthJwtService {
  private http = inject(HttpClient);
  private router = inject(Router);
  
  private baseUrl = `${environment.apiUrl}/auth`;
  
  private authStateSubject = new BehaviorSubject<AuthUser | null>(this.getCurrentUser());
  authState$ = this.authStateSubject.asObservable();

  private tokenCheckInterval: any = null;
  
  constructor() {
    // Iniciar verificación automática de expiración del token
    this.startTokenExpirationCheck();
  }

  /**
   * Iniciar sesión con JWT
   */
  login(payload: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, payload).pipe(
      tap(response => {
        // Guardar tokens
        this.saveTokens(response.accessToken, response.refreshToken, payload.remember);
        
        // Normalizar y guardar usuario
        const normalized = this.normalizeUser(response.user);
        this.saveUser(normalized, payload.remember);
        
        // Actualizar estado
        this.authStateSubject.next(normalized);
        
        // Reiniciar verificación de expiración
        this.startTokenExpirationCheck();
      })
    );
  }

  /**
   * Registrar nuevo usuario
   */
register(payload: RegisterRequest | FormData): Observable<AuthResponse> {
  // Si el payload es un objeto (no FormData), fuerza el rol de usuario
  if (!(payload instanceof FormData)) {
    if (!payload['id_rol']) payload['id_rol'] = 2;
    if (!payload['role']) payload['role'] = 'user';
  } else {
    // Si es FormData, fuerza los campos también
    if (!payload.has('id_rol')) payload.append('id_rol', '2');
    if (!payload.has('role')) payload.append('role', 'user');
  }

  return this.http.post<AuthResponse>(`${this.baseUrl}/register`, payload).pipe(
    tap(response => {
      this.saveTokens(response.accessToken, response.refreshToken, true);
      const normalized = this.normalizeUser(response.user);
      this.saveUser(normalized, true);
      this.authStateSubject.next(normalized);
    })
  );
}

  /**
   * Renovar token de acceso
   */
  refreshToken(): Observable<{ accessToken: string }> {
    const refreshToken = this.getRefreshToken();
    
    if (!refreshToken) {
      throw new Error('No hay refresh token disponible');
    }

    return this.http.post<{ accessToken: string }>(`${this.baseUrl}/refresh`, { refreshToken }).pipe(
      tap(response => {
        // Actualizar solo el access token
        const storage = localStorage.getItem('accessToken') ? localStorage : sessionStorage;
        storage.setItem('accessToken', response.accessToken);
      })
    );
  }

  /**
   * Obtener información del usuario actual desde el servidor
   */
  me(): Observable<AuthUser> {
    return this.http.get<AuthUser>(`${this.baseUrl}/me`).pipe(
      tap(user => {
        const normalized = this.normalizeUser(user);
        this.saveUser(normalized, true);
        this.authStateSubject.next(normalized);
      })
    );
  }

  /**
   * Actualizar perfil del usuario autenticado
   * Acepta JSON o FormData (para subir foto)
   */
  updateProfile(payload: Record<string, any> | FormData): Observable<UpdateProfileResponse> {
    return this.http.put<UpdateProfileResponse>(`${this.baseUrl}/profile`, payload).pipe(
      tap(res => {
        const normalized = this.normalizeUser(res.user);
        this.saveUser(normalized, true);
        this.authStateSubject.next(normalized);
      })
    );
  }

  /**
   * Cerrar sesión
   */
  logout(): void {
    // Para evitar 401 por token expirado o falta de sesión, limpiamos localmente
    this.stopTokenExpirationCheck();
    this.clearSession();
  }

  /**
   * Limpiar sesión local
   */
  private clearSession(): void {
    // Limpiar tokens
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('currentUser');
    
    // Actualizar estado
    this.authStateSubject.next(null);
    
    // Redirigir a login
    this.router.navigate(['/login']);
  }

  /**
   * Decodificar JWT sin verificar firma (solo para leer claims)
   */
  private decodeToken(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      
      const payload = parts[1];
      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decoded);
    } catch (e) {
      console.error('[AuthJwtService] Error al decodificar token:', e);
      return null;
    }
  }

  /**
   * Verificar si el token ha expirado
   */
  isTokenExpired(token?: string): boolean {
    const accessToken = token || this.getAccessToken();
    if (!accessToken) return true;

    const decoded = this.decodeToken(accessToken);
    if (!decoded || !decoded.exp) {
      console.warn('[AuthJwtService] Token sin campo exp, asumiendo expirado');
      return true;
    }

    const expirationTime = decoded.exp * 1000; // exp viene en segundos, convertir a ms
    const now = Date.now();
    const isExpired = now >= expirationTime;

    if (isExpired) {
      const expiredSince = Math.floor((now - expirationTime) / 1000 / 60); // minutos
      console.warn(`[AuthJwtService] ⏰ Token expirado hace ${expiredSince} minuto(s)`);
    }

    return isExpired;
  }

  /**
   * Obtener tiempo restante del token en segundos
   */
  getTokenRemainingTime(): number {
    const token = this.getAccessToken();
    if (!token) return 0;

    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) return 0;

    const expirationTime = decoded.exp * 1000;
    const now = Date.now();
    const remaining = Math.max(0, Math.floor((expirationTime - now) / 1000));
    
    return remaining;
  }

  /**
   * Iniciar verificación periódica de expiración del token
   * Revisa cada 60 segundos si el token sigue válido
   */
  private startTokenExpirationCheck(): void {
    // Limpiar intervalo previo si existe
    this.stopTokenExpirationCheck();

    // Verificar cada 60 segundos
    this.tokenCheckInterval = setInterval(() => {
      const token = this.getAccessToken();
      
      if (!token) {
        console.log('[AuthJwtService] No hay token, deteniendo verificación');
        this.stopTokenExpirationCheck();
        return;
      }

      if (this.isTokenExpired(token)) {
        console.warn('[AuthJwtService] 🚨 Token expirado detectado, cerrando sesión automáticamente');
        
        // Intentar renovar si hay refresh token
        const refreshToken = this.getRefreshToken();
        if (refreshToken) {
          console.log('[AuthJwtService] Intentando renovar token automáticamente...');
          this.refreshToken().subscribe({
            next: () => {
              console.log('[AuthJwtService] ✅ Token renovado exitosamente');
            },
            error: () => {
              console.error('[AuthJwtService] ❌ Renovación falló, cerrando sesión');
              this.logout();
            }
          });
        } else {
          // No hay refresh token, cerrar sesión directamente
          this.logout();
        }
      } else {
        const remaining = this.getTokenRemainingTime();
        const minutes = Math.floor(remaining / 60);
        console.log(`[AuthJwtService] ✓ Token válido (expira en ${minutes}m ${remaining % 60}s)`);
      }
    }, 60000); // 60 segundos

    console.log('[AuthJwtService] ⏰ Verificación automática de token iniciada (cada 60s)');
  }

  /**
   * Detener verificación periódica
   */
  private stopTokenExpirationCheck(): void {
    if (this.tokenCheckInterval) {
      clearInterval(this.tokenCheckInterval);
      this.tokenCheckInterval = null;
      console.log('[AuthJwtService] ⏰ Verificación automática de token detenida');
    }
  }

  /**
   * Guardar tokens en storage
   */
  /**
   * Guardar tokens en storage (público para uso de auth-google)
   */
  saveTokens(accessToken: string, refreshToken: string, remember: boolean = true): void {
    if (remember) {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      sessionStorage.removeItem('accessToken');
      sessionStorage.removeItem('refreshToken');
      console.log('[AuthJwtService] Guardando accessToken en localStorage:', accessToken);
      console.log('[AuthJwtService] Guardando refreshToken en localStorage:', refreshToken);
    } else {
      sessionStorage.setItem('accessToken', accessToken);
      sessionStorage.setItem('refreshToken', refreshToken);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      console.log('[AuthJwtService] Guardando accessToken en sessionStorage:', accessToken);
      console.log('[AuthJwtService] Guardando refreshToken en sessionStorage:', refreshToken);
    }
    // Verificar inmediatamente después de guardar
    const tokenLocal = localStorage.getItem('accessToken');
    const tokenSession = sessionStorage.getItem('accessToken');
    console.log('[AuthJwtService] accessToken en localStorage tras guardar:', tokenLocal);
    console.log('[AuthJwtService] accessToken en sessionStorage tras guardar:', tokenSession);
  }

  /**
   * Guardar usuario en storage (público para uso de auth-google)
   */
  saveUser(user: AuthUser, remember: boolean = true): void {
    const userData = JSON.stringify(user);
    
    if (remember) {
      localStorage.setItem('currentUser', userData);
      sessionStorage.removeItem('currentUser');
    } else {
      sessionStorage.setItem('currentUser', userData);
      localStorage.removeItem('currentUser');
    }
  }

  /**
   * Obtener usuario actual del storage
   */
  getCurrentUser(): AuthUser | null {
    const userData = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
    return userData ? JSON.parse(userData) : null;
  }

  /**
   * Obtener access token
   */
  getAccessToken(): string | null {
    return localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
  }

  /**
   * Obtener refresh token
   */
  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
  }

  /**
   * Verificar si el usuario está autenticado
   */
  isAuthenticated(): boolean {
    const token = this.getAccessToken();
    const user = this.getCurrentUser();
    
    // Si no hay token o usuario, no está autenticado
    if (!token || !user) return false;
    
    // Verificar si el token ha expirado
    if (this.isTokenExpired(token)) {
      console.warn('[AuthJwtService] Token expirado en isAuthenticated()');
      return false;
    }
    
    return true;
  }

  /**
   * Si hay token pero no hay usuario en memoria/storage, intenta cargarlo del backend
   */
  loadUserFromTokenIfNeeded(): Observable<boolean> {
    const token = this.getAccessToken();
    if (!token) {
      return of(false);
    }

    const user = this.getCurrentUser();
    if (user) {
      return of(true);
    }

    return this.me().pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }

  /**
   * Verificar si el usuario es administrador
   * Ahora usa la tabla roles (id_rol = 1 para admin por convención)
   * O si el backend devuelve un atributo is_admin en el usuario
   */
  isAdmin(): boolean {
  const user = this.getCurrentUser();
  if (!user) return false;
  // Permitir acceso si el usuario tiene id_rol 1 o el nombre del rol es 'Administrador'
  return (
    user.id_rol === 1 ||
    (!!user.rol_nombre && user.rol_nombre.trim().toUpperCase() === 'ADMINISTRADOR')
  );
}
// ...existing code...



  /**
   * Verificar si tiene un rol específico
   * Primero intenta por id_rol, luego por role string
   */
  hasRole(role: UserRole): boolean {
  const user = this.getCurrentUser();
  if (!user) return false;

  // Mapeo de roles a IDs según tu base de datos
  const roleIds: { [key in UserRole]: number } = {
    'admin': 1,        // Administrador
    'user': 2,         // Usuario
    'proveedor': 3,    // Proveedor
    'trabajador': 4    // Trabajador
  };

  // Si el user tiene id_rol, comparar con ese
  if (user.id_rol && roleIds[role] === user.id_rol) return true;

  // Si no, comparar strings (compatibilidad)
  return user.role === role;
}

  /**
   * Verificar si tiene alguno de los roles especificados
   */
  hasAnyRole(roles: UserRole[]): boolean {
    return roles.some(role => this.hasRole(role));
  }

  /**
   * Normaliza el usuario para que siempre tenga id_rol y rol_nombre coherentes
   * y ajusta el campo role (string) para compatibilidad con código previo.
   */
  /**
   * Normalizar usuario (público para uso de auth-google)
   */
  normalizeUser(user: AuthUser): AuthUser {
  if (!user) return user;

  // Si falta id_rol pero hay rol_nombre, mapear
  if (!user.id_rol && user.rol_nombre) {
    const name = user.rol_nombre.trim().toUpperCase();
    if (name === 'ADMINISTRADOR') user.id_rol = 1;
    else if (name === 'USUARIO' || name === 'CLIENTE') user.id_rol = 2;
    else if (name === 'PROVEEDOR') user.id_rol = 3;
    else if (name === 'TRABAJADOR') user.id_rol = 4;
  }

  // Si falta rol_nombre pero hay id_rol, mapear
  if (!user.rol_nombre && user.id_rol) {
    const map: Record<number, string> = {
      1: 'Administrador',
      2: 'Usuario',
      3: 'Proveedor',
      4: 'Trabajador'
    };
    user.rol_nombre = map[user.id_rol] || user.rol_nombre;
  }

  // Mapear foto_url -> foto si el backend devuelve esa clave
  const anyUser: any = user as any;
  if (!anyUser.foto && anyUser.foto_url) {
    anyUser.foto = anyUser.foto_url;
  }

  // Normalizar genero si viene en otras claves
  if (!anyUser.genero && anyUser.gender) {
    const g = String(anyUser.gender).toLowerCase();
    anyUser.genero = g.startsWith('m') ? 'M' : g.startsWith('f') ? 'F' : 'Otros';
  }

  // Normalizar fecha_nacimiento si viene como birthdate/birthday
  if (!anyUser.fecha_nacimiento && (anyUser.birthdate || anyUser.birthday)) {
    const raw = String(anyUser.birthdate || anyUser.birthday);
    const iso = (raw.match(/^(\d{4}-\d{2}-\d{2})/)?.[1]) ||
                (() => { const d = new Date(raw); return isNaN(d.getTime()) ? null : d.toISOString().slice(0,10); })();
    if (iso) anyUser.fecha_nacimiento = iso;
  }

  // Normalizar bandera de email verificado desde otras claves
  if (user.email_verified === undefined && anyUser.email_verificado !== undefined) {
    user.email_verified = anyUser.email_verificado === true || anyUser.email_verificado === 1 || anyUser.email_verificado === 'true';
  }

  // Normalizar fecha de envío de verificación con nombres alternativos/errores tipográficos
  if (!user.email_verification_sent_at && anyUser.email_verification_sent_at) {
    user.email_verification_sent_at = anyUser.email_verification_sent_at;
  }
  if (!user.email_verification_sent_at && anyUser.email_veriricaction_sent_at) {
    user.email_verification_sent_at = anyUser.email_veriricaction_sent_at;
  }

  // Ajustar role (string) para compatibilidad
  if (user.id_rol === 1) user.role = 'admin';
  else if (user.id_rol === 2) user.role = 'user';
  else if (user.id_rol === 3) user.role = 'proveedor';
  else if (user.id_rol === 4) user.role = 'trabajador';
  else user.role = 'user';

  return user;
}
}
