
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { VerificationService } from '../../service/verification.service';
import { AuthJwtService } from '../../service/auth-jwt.service';

@Component({
  selector: 'app-verificar-cuenta',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './verificar-cuenta.html',
  styleUrl: './verificar-cuenta.css'
})
export class VerificarCuenta implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private verificationService = inject(VerificationService);
  private authService = inject(AuthJwtService);

    state: 'loading' | 'success' | 'already-verified' | 'error' = 'loading';
    message = 'Verificando tu email...';
    errorMessage = '';
    userEmail = '';
    emailVerificationSentAt: string = '';
    emailVerifiedAt: string = '';

  ngOnInit(): void {
    const tokenFromRoute = this.route.snapshot.queryParamMap.get('token');
    const tokenFromUrl = new URL(window.location.href).searchParams.get('token');
    const token = tokenFromRoute || tokenFromUrl;

    if (!token) {
      this.state = 'error';
      this.message = 'Token no proporcionado o inválido.';
      this.errorMessage = 'No se encontró un token de verificación en el enlace.';
      return;
    }

      this.verificationService.verifyEmail(token).subscribe(
        (response: any) => {
          if (response.alreadyVerified) {
            this.state = 'already-verified';
            this.message = '¡Email ya verificado!';
          } else {
            this.state = 'success';
            this.message = response?.message || '¡Email verificado correctamente!';
          }
          // Extraer datos del usuario si existen
          if (response.userEmail) this.userEmail = response.userEmail;
          if (response.user && response.user.email) this.userEmail = response.user.email;
          if (response.user && response.user.email_verification_sent_at) this.emailVerificationSentAt = response.user.email_verification_sent_at;
          if (response.user && response.user.email_verified_at) this.emailVerifiedAt = response.user.email_verified_at;
        },
        (error) => {
          this.state = 'error';
          this.message = 'Verificación fallida';
          this.errorMessage = error.error?.message || 'No se pudo verificar tu email. El token puede haber expirado.';
          if (error.error?.user?.email) this.userEmail = error.error.user.email;
          if (error.error?.user?.email_verification_sent_at) this.emailVerificationSentAt = error.error.user.email_verification_sent_at;
          if (error.error?.user?.email_verified_at) this.emailVerifiedAt = error.error.user.email_verified_at;
        }
      );
  }

  redirectToHome() {
    this.router.navigate(['/home']);
  }

  redirectToPerfil() {
    this.router.navigate(['/perfil']);
  }
}
