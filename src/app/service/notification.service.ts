/**
 * Servicio de Notificaciones con Socket.IO
 * Gestiona notificaciones en tiempo real y persistentes
 */

import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { AuthJwtService } from './auth-jwt.service';

export interface Notificacion {
  id_notificacion: number;
  tipo: string;
  titulo: string;
  mensaje: string;
  datos: any;
  leida: boolean;
  fecha_creacion: Date;
  url?: string;
  icono?: string;
  prioridad: 'normal' | 'alta' | 'urgente';
}

export interface ContadorNotificaciones {
  total_no_leidas: number;
  urgentes: number;
  altas: number;
  ultima_notificacion: Date | null;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = '/api/notificaciones';
  private socket: Socket | null = null;
  private connected = signal(false);

  // Observables para el estado de notificaciones
  private notificationsSubject = new BehaviorSubject<Notificacion[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();

  private unreadCountSubject = new BehaviorSubject<ContadorNotificaciones>({
    total_no_leidas: 0,
    urgentes: 0,
    altas: 0,
    ultima_notificacion: null
  });
  public unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthJwtService
  ) {
    // Auto-conectar cuando el usuario está autenticado
    if (this.authService.isAuthenticated()) {
      this.connect();
      this.loadNotifications();
    }
  }

  /**
   * Conectar al servidor Socket.IO
   */
  connect(): void {
    if (this.socket?.connected) {
      console.log('✅ Ya conectado a Socket.IO');
      return;
    }

    const token = this.authService.getAccessToken();
    if (!token) {
      console.warn('⚠️ No hay token para conectar Socket.IO');
      return;
    }

    this.socket = io('/', {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling']
    });

    // Event listeners
    this.socket.on('connect', () => {
      console.log('✅ Conectado a Socket.IO:', this.socket?.id);
      this.connected.set(true);
      this.loadUnreadCount();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Desconectado de Socket.IO:', reason);
      this.connected.set(false);
    });

    this.socket.on('error', (error) => {
      console.error('❌ Error de Socket.IO:', error);
    });

    // Escuchar notificaciones en tiempo real
    this.setupNotificationListeners();
  }

  /**
   * Configurar listeners para cada tipo de notificación
   */
  private setupNotificationListeners(): void {
    if (!this.socket) return;

    // Nueva reserva
    this.socket.on('nueva_reserva', (data) => {
      this.handleNewNotification(data);
      this.showBrowserNotification(data);
    });

    // Pago recibido
    this.socket.on('pago_recibido', (data) => {
      this.handleNewNotification(data);
      this.showBrowserNotification(data);
    });

    // Invitado confirmó
    this.socket.on('invitado_confirmo', (data) => {
      this.handleNewNotification(data);
    });

    // Mensaje de proveedor
    this.socket.on('mensaje_proveedor', (data) => {
      this.handleNewNotification(data);
      this.showBrowserNotification(data);
    });

    // Evento próximo
    this.socket.on('evento_proximo', (data) => {
      this.handleNewNotification(data);
      this.showBrowserNotification(data);
    });

    // Estado de reserva
    this.socket.on('estado_reserva', (data) => {
      this.handleNewNotification(data);
    });

    // Contador actualizado
    this.socket.on('unread_count_updated', (contador) => {
      this.unreadCountSubject.next(contador);
    });

    // Contador de no leídas
    this.socket.on('unread_count', (contador) => {
      this.unreadCountSubject.next(contador);
    });
  }

  /**
   * Manejar nueva notificación recibida
   */
  private handleNewNotification(data: any): void {
    const current = this.notificationsSubject.value;
    this.notificationsSubject.next([data, ...current]);
    
    // Actualizar contador
    this.loadUnreadCount();
  }

  /**
   * Mostrar notificación del navegador
   */
  private showBrowserNotification(data: any): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(data.title, {
        body: data.message,
        icon: '/assets/logo.png',
        badge: '/assets/badge.png'
      });
    }
  }

  /**
   * Solicitar permiso para notificaciones del navegador
   */
  async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Este navegador no soporta notificaciones');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  /**
   * Desconectar del servidor Socket.IO
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected.set(false);
      console.log('🔌 Desconectado de Socket.IO');
    }
  }

  /**
   * Cargar notificaciones desde la API
   */
  loadNotifications(limite: number = 50, soloNoLeidas: boolean = false): void {
    this.http.get<any>(`${this.apiUrl}`, {
      params: { limite: limite.toString(), solo_no_leidas: soloNoLeidas.toString() }
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationsSubject.next(response.data);
        }
      },
      error: (error) => {
        console.error('Error al cargar notificaciones:', error);
      }
    });
  }

  /**
   * Cargar contador de notificaciones no leídas
   */
  loadUnreadCount(): void {
    this.http.get<any>(`${this.apiUrl}/contador`).subscribe({
      next: (response) => {
        if (response.success) {
          this.unreadCountSubject.next(response.data);
        }
      },
      error: (error) => {
        console.error('Error al cargar contador:', error);
      }
    });
  }

  /**
   * Marcar notificación como leída
   */
  markAsRead(notificationId: number): Observable<any> {
    // Emitir por WebSocket
    this.socket?.emit('mark_notification_read', { notificationId });

    // También actualizar por API HTTP
    return this.http.put(`${this.apiUrl}/${notificationId}/leer`, {});
  }

  /**
   * Marcar todas las notificaciones como leídas
   */
  markAllAsRead(): Observable<any> {
    // Emitir por WebSocket
    this.socket?.emit('mark_all_read');

    // También actualizar por API HTTP
    return this.http.put(`${this.apiUrl}/leer-todas`, {});
  }

  /**
   * Eliminar notificación
   */
  deleteNotification(notificationId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${notificationId}`);
  }

  /**
   * Obtener notificaciones (HTTP)
   */
  getNotifications(limite: number = 50, soloNoLeidas: boolean = false): Observable<any> {
    return this.http.get(`${this.apiUrl}`, {
      params: { limite: limite.toString(), solo_no_leidas: soloNoLeidas.toString() }
    });
  }

  /**
   * Obtener contador (HTTP)
   */
  getUnreadCount(): Observable<any> {
    return this.http.get(`${this.apiUrl}/contador`);
  }

  /**
   * Estado de conexión
   */
  isConnected(): boolean {
    return this.connected();
  }

  /**
   * Obtener socket
   */
  getSocket(): Socket | null {
    return this.socket;
  }
}
