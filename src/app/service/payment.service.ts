import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { loadStripe, Stripe, StripeElements, StripeCardElement } from '@stripe/stripe-js';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private baseUrl = '/api/payments';
  private stripe: Stripe | null = null;
  private stripePublishableKey = 'pk_test_51xxxxx'; // ⚠️ CAMBIAR por tu clave pública

  constructor(private http: HttpClient) {
    this.initializeStripe();
  }

  /**
   * Inicializa Stripe
   */
  private async initializeStripe() {
    this.stripe = await loadStripe(this.stripePublishableKey);
  }

  /**
   * Obtiene la instancia de Stripe
   */
  async getStripe(): Promise<Stripe | null> {
    if (!this.stripe) {
      await this.initializeStripe();
    }
    return this.stripe;
  }

  /**
   * Crea un PaymentIntent
   */
  createPaymentIntent(amount: number, currency: string, reservaId: number, eventoNombre: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/create-intent`, {
      amount,
      currency,
      reservaId,
      eventoNombre
    });
  }

  /**
   * Confirma un pago
   */
  confirmPayment(paymentIntentId: string, reservaId: number, monto: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/confirm`, {
      paymentIntentId,
      reservaId,
      monto
    });
  }

  /**
   * Cancela un pago
   */
  cancelPayment(paymentIntentId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/cancel/${paymentIntentId}`, {});
  }

  /**
   * Solicita un reembolso (solo admin)
   */
  requestRefund(paymentIntentId: string, amount?: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/refund`, {
      paymentIntentId,
      amount
    });
  }

  /**
   * Obtiene historial de pagos
   */
  getPaymentHistory(): Observable<any> {
    return this.http.get(`${this.baseUrl}/history`);
  }

  /**
   * Obtiene detalles de un pago
   */
  getPaymentDetails(paymentIntentId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${paymentIntentId}`);
  }

  /**
   * Procesa un pago con Stripe Elements
   */
  async processPayment(
    clientSecret: string,
    cardElement: StripeCardElement,
    billingDetails: any
  ): Promise<any> {
    const stripe = await this.getStripe();
    
    if (!stripe) {
      throw new Error('Stripe no está inicializado');
    }

    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
        billing_details: billingDetails
      }
    });

    if (error) {
      throw error;
    }

    return paymentIntent;
  }
}
