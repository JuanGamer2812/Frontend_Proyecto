import { Component, OnInit, OnDestroy, effect, EffectRef } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthGoogle } from '../../service/auth-google';
import { AuthJwtService } from '../../service/auth-jwt.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css'],
})
export class Navbar implements OnInit, OnDestroy {
  isAdmin = false;
  isLoggedIn = false;
  userName: string | null = null;
  userImage: string | null = null;
  userEmail: string | null = null;
  userFirstName: string | null = null;
  userLastName: string | null = null;

  // EffectRef returned by effect()
  private stopProfileEffect?: EffectRef;
  private authSubscription?: Subscription;

  constructor(
    private authGoogle: AuthGoogle, 
    private authService: AuthJwtService,
    private router: Router
  ) {
    // Crear el efecto en el constructor para AuthGoogle
    this.stopProfileEffect = effect(() => {
      const profile = this.authGoogle.profile();
      if (profile) {
        this.isLoggedIn = true;
        // Nombre completo y piezas
        this.userName = profile.name ?? null;
        this.userFirstName = profile.given_name ?? (profile.name ? (profile.name as string).split(' ')[0] : null);
        this.userLastName = profile.family_name ?? (profile.name ? (profile.name as string).split(' ').slice(1).join(' ').trim() : null);
        this.userEmail = profile.email ?? null;
        this.userImage = this.resolveImageUrl(profile.picture ?? '') || this.buildAvatarFromName(this.userFirstName, this.userLastName, this.userName) || 'usrIco.png';
        this.isAdmin = this.authService.isAdmin();
      } else {
        // Si no hay perfil de Google, verificar autenticación local
        this.checkLocalAuth();
      }
    });
  }

  ngOnInit(): void {
    // Sincroniza el perfil de Google
    this.authGoogle.getProfile();
    
    // Verificar autenticación local al inicio
    this.checkLocalAuth();
    
    // Suscribirse a cambios de autenticación local
    this.authSubscription = this.authService.authState$.subscribe(user => {
      if (user) {
        this.isLoggedIn = true;
        this.userName = user.nombre;
        this.userEmail = user.email;
        // Usar apellido si existe
        this.userFirstName = user.nombre;
        this.userLastName = user.apellido && user.apellido.trim() !== '' ? user.apellido : null;
        // Imagen del usuario desde JWT (foto o foto_url), con fallback
        this.userImage = this.resolveImageUrl((user as any).foto || (user as any).foto_url || '') || this.buildAvatarFromName(this.userFirstName, this.userLastName, this.userName) || 'usrIco.png';
        this.isAdmin = this.authService.isAdmin();
      } else if (!this.authGoogle.profile()) {
        // Solo resetear si tampoco hay sesión de Google
        this.resetAuthState();
      }
    });
  }

  private checkLocalAuth(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.isLoggedIn = true;
      this.userName = user.nombre;
      this.userEmail = user.email;
      // Usar apellido si existe
      this.userFirstName = user.nombre;
      this.userLastName = user.apellido && user.apellido.trim() !== '' ? user.apellido : null;
      // Imagen del usuario desde JWT (foto o foto_url), con fallback
      this.userImage = this.resolveImageUrl((user as any).foto || (user as any).foto_url || '') || this.buildAvatarFromName(this.userFirstName, this.userLastName, this.userName) || 'usrIco.png';
      this.isAdmin = this.authService.isAdmin();
    }
  }

  private resetAuthState(): void {
    this.isLoggedIn = false;
    this.userName = null;
    this.userImage = null;
    this.userEmail = null;
    this.userFirstName = null;
    this.userLastName = null;
    this.isAdmin = false;
  }

  ngOnDestroy(): void {
    // Stop the effect to cleanup
    this.stopProfileEffect?.destroy();
    this.authSubscription?.unsubscribe();
  }

  logout(): void {
    // Cerrar sesión en ambos servicios
    this.authGoogle.logout();
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  private resolveImageUrl(url: string): string | null {
    if (!url) return null;
    const u = String(url);
    if (u.startsWith('/uploads/')) {
      const base = `http://127.0.0.1:5000${u}`;
      const sep = base.includes('?') ? '&' : '?';
      return `${base}${sep}t=${Date.now()}`; // evitar caché tras actualización
    }
    const driveIdMatch = u.match(/https?:\/\/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/);
    if (driveIdMatch) {
      return `https://drive.google.com/uc?export=view&id=${driveIdMatch[1]}`;
    }
    return u;
  }

  onImgError(): void {
    this.userImage = this.buildAvatarFromName(this.userFirstName, this.userLastName, this.userName) || 'usrIco.png';
  }

  private buildAvatarFromName(first?: string | null, last?: string | null, full?: string | null): string | null {
    const seed = (full || `${first || ''} ${last || ''}`).trim();
    if (!seed) return null;
    return `https://ui-avatars.com/api/?background=1e2a5a&color=fff&name=${encodeURIComponent(seed)}`;
  }
}
