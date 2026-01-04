import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PasswordResetService {
  private baseUrl = '/api/auth';

  constructor(private http: HttpClient) {}

  /** Solicita una contraseña temporal por email */
  requestTemporaryPassword(email: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/forgot-password`, { email });
  }

  /** Cambia la contraseña de forma forzada (después de usar contraseña temporal) */
  changePasswordForced(newPassword: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/change-password-forced`, { newPassword });
  }

  /**
   * Cambia la contraseña (usuario autenticado con contraseña actual)
   * Igual que en ProyectoV3.0 V2: POST directo a /api/password/change
   */
  changePassword(currentPassword: string, newPassword: string): Observable<any> {
    return this.http.post(`/api/password/change`, { currentPassword, newPassword });
  }

  // Métodos deprecados (mantener por compatibilidad)
  requestReset(email: string): Observable<any> {
    return this.requestTemporaryPassword(email);
  }

  validateToken(token: string): Observable<any> {
    return this.http.post(`/api/password/validate-token`, { token });
  }

  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post(`/api/password/reset`, { token, newPassword });
  }
}
