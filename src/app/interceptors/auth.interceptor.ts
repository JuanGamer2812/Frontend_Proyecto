
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthJwtService } from '../service/auth-jwt.service';
import { catchError, throwError, switchMap } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthJwtService);

  // Obtener token del localStorage
  const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
  // LOG: token actual antes de cada petición
  console.log('[authInterceptor] Token actual:', token);

  // Log para depuración: saber URL y si hay token
  try {
    console.debug('[authInterceptor] url=', req.url, 'tokenPresent=', !!token);
  } catch (e) {
    console.debug('[authInterceptor] debug error', e);
  }

  // Adjuntar Authorization excepto en endpoints públicos de auth (login/register/refresh)
  const isPublicAuthEndpoint = /\/api\/auth\/(login|register|refresh)(\/|$)/.test(req.url);
  // Consider local backend hosts AND Railway backend as internal so the interceptor attaches the token
  const isExternalUrl = !(
    req.url.startsWith('/api') ||
    req.url.startsWith('http://localhost') ||
    req.url.startsWith('https://localhost') ||
    req.url.startsWith('http://127.0.0.1') ||
    req.url.startsWith('https://127.0.0.1') ||
    req.url.includes('backendproyecto-production') ||
    req.url.includes('.up.railway.app')
  );

  // Clonar la petición y agregar el token si existe
  if (token && !isPublicAuthEndpoint && !isExternalUrl) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    // Mostrar el header Authorization agregado (completo para depuración)
    try {
      console.log('[authInterceptor] Authorization header enviado:', req.headers.get('Authorization'));
    } catch(e){}
  }

  // Manejar la respuesta con renovación de token y sin forzar redirect para invitados
  return next(req).pipe(
    catchError((error) => {
      // Log completo del error para depuración
      try { console.error('[authInterceptor] catchError status=', error.status, 'url=', error.url, 'body=', error.error); } catch (e) { console.error('[authInterceptor] catchError log failed', e); }

      if (error.status === 401) {
        const currentToken = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
        const hasRefresh = authService.getRefreshToken();

        // Si no hay token (usuario invitado), no forzar redirect: dejar que la UI maneje el error
        if (!currentToken) {
          return throwError(() => error);
        }

        // Intentar renovar si hay refresh token
        if (hasRefresh && !isPublicAuthEndpoint) {
          return authService.refreshToken().pipe(
            switchMap(({ accessToken }) => {
              const retryReq = req.clone({
                setHeaders: { Authorization: `Bearer ${accessToken}` }
              });
              return next(retryReq);
            }),
            catchError((e) => {
              // Falló la renovación: cerrar sesión y redirigir a login
              authService.logout();
              return throwError(() => error);
            })
          );
        }

        // Tenía token pero no refresh: cerrar sesión
        authService.logout();
      }

      if (error.status === 403) {
        console.error('Acceso denegado:', error.error?.message);
      }

      if (error.status >= 500) {
        console.error('Error del servidor:', {
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          body: error.error,
        });
      }

      return throwError(() => error);
    })
  );
};
