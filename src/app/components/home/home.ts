import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, inject } from '@angular/core';
import { AuthGoogle } from '../../service/auth-google';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [],
  templateUrl: './home.html',
  styleUrl: './home.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class Home implements OnInit {
  private authGoogle = inject(AuthGoogle);
  private router = inject(Router);

  async ngOnInit() {
    // Verificar si venimos de un callback de Google OAuth
    // Solo ejecutar si hay perfil de Google pero NO hay token en storage
    const hasGoogleProfile = this.authGoogle.isLoggedIn();
    const hasBackendToken = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
    
    if (hasGoogleProfile && !hasBackendToken) {
      console.log('[HOME] Detectado callback de Google OAuth, completando login con backend...');
      try {
        await this.authGoogle.loginWithBackendGoogle();
        console.log('[HOME] Login con backend completado exitosamente');
        // Verificar token
        const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
        if (token) {
          console.log('[HOME] ✅ Token guardado correctamente:', token.substring(0, 20) + '...');
        } else {
          console.error('[HOME] ⚠️ Token NO se guardó en storage');
        }
      } catch (error) {
        console.error('[HOME] Error al completar login con backend:', error);
        this.router.navigate(['/login']);
      }
    }
  }
}
