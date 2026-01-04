import { inject } from '@angular/core';
import { Router, CanActivateFn, UrlTree } from '@angular/router';
import { AuthJwtService } from '../service/auth-jwt.service';
import { map } from 'rxjs';

/**
 * Guard para proteger rutas que requieren autenticación
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthJwtService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  return authService.loadUserFromTokenIfNeeded().pipe(
    map((ok) => {
      if (ok && authService.isAuthenticated()) return true;
      return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
    })
  );
};

/**
 * Guard para rutas que solo pueden acceder usuarios administradores
 */
export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthJwtService);
  const router = inject(Router);

  const deny: UrlTree = router.createUrlTree(['/home']);
  const toLogin: UrlTree = router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });

  if (authService.isAuthenticated() && authService.isAdmin()) {
    return true;
  }

  return authService.loadUserFromTokenIfNeeded().pipe(
    map((ok) => {
      if (!ok) return toLogin;
      return authService.isAdmin() ? true : deny;
    })
  );
};

/**
 * Guard para rutas que solo pueden acceder usuarios NO autenticados (login, registro)
 */
export const guestGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthJwtService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return router.createUrlTree(['/home']);
  }

  return authService.loadUserFromTokenIfNeeded().pipe(
    map((ok) => (ok && authService.isAuthenticated() ? router.createUrlTree(['/home']) : true))
  );
};
