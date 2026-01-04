import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiConfigService } from './api-config.service';

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
  private apiConfig = inject(ApiConfigService);
  private readonly baseUrl = this.apiConfig.getUrl('/api/auth');

  sendVerificationEmail(): Observable<SendVerificationResponse> {
    return this.http.post<SendVerificationResponse>(`${this.baseUrl}/send-verification`, {});
  }

  verifyEmail(token: string): Observable<VerifyEmailResponse> {
    return this.http.post<VerifyEmailResponse>(`${this.baseUrl}/verify-email`, { token });
  }
}
