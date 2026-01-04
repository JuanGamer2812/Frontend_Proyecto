import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PasswordResetService } from '../../service/password-reset.service';

@Component({
  selector: 'app-recuperar-cuenta',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './recuperar-cuenta.html',
  styleUrl: './recuperar-cuenta.css'
})
export class RecuperarCuenta implements OnInit {
  // Estados de la UI
  emailSent = false;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  cooldownMessage = '';

  // Datos del formulario
  email = '';

  private passwordResetService = inject(PasswordResetService);

  ngOnInit(): void {
    // No se requiere validación de token - el flujo es solo solicitar email
  }

  /**
   * Solicita una contraseña temporal
   */
  onRequestTemporaryPassword(event: Event): void {
    event.preventDefault();
    
    if (!this.email) {
      this.errorMessage = 'Por favor ingresa tu email';
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      this.errorMessage = 'Por favor ingresa un email válido';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cooldownMessage = '';

    this.passwordResetService.requestTemporaryPassword(this.email).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.emailSent = true;
        this.successMessage = 'Te hemos enviado una contraseña temporal por email. Revisa tu bandeja de entrada y usa esa contraseña para iniciar sesión.';
      },
      error: (error) => {
        this.isLoading = false;
        // Manejar error de cooldown
        if (error.status === 429) {
          this.cooldownMessage = error.error?.message || 'Debes esperar antes de solicitar otra contraseña temporal';
          this.errorMessage = '';
        } else {
          this.errorMessage = error.error?.message || 'Error al procesar la solicitud. Por favor intenta nuevamente.';
        }
      }
    });
  }

  /**
   * Vuelve al formulario de solicitud
   */
  backToRequest(): void {
    this.emailSent = false;
    this.errorMessage = '';
    this.successMessage = '';
    this.cooldownMessage = '';
    this.email = '';
  }
}
