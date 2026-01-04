import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SendVerificationResponse {
  message: string;
  cooldown_seconds?: number;
}

export interface VerifyEmailResponse {
  message: string;
  alreadyVerified?: boolean;
}

@Injectable({ providedIn: 'root' })
export class VerificationService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/auth`;

  sendVerificationEmail(): Observable<SendVerificationResponse> {
    return this.http.post<SendVerificationResponse>(`${this.baseUrl}/send-verification`, {});
  }

  verifyEmail(token: string): Observable<VerifyEmailResponse> {
    return this.http.post<VerifyEmailResponse>(`${this.baseUrl}/verify-email`, { token });
  }
}
