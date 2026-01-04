import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';

export type UserRole = 'admin' | 'user';

interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  role?: UserRole;
  createdAt: string;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role?: UserRole;
}

export interface AuthResponse {
  message: string;
  user: AuthUser;
  token: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly STORAGE_KEY = 'users';
  private readonly CURRENT_USER_KEY = 'currentUser';

  private authStateSubject = new BehaviorSubject<AuthUser | null>(this.readCurrentUserFromStorage());
  authState$ = this.authStateSubject.asObservable();

  constructor() {
  if (!localStorage.getItem(this.STORAGE_KEY)) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify([]));
  }
  this.ensureDefaultAdmin();
  this.ensureDefaultUser(); // ← agrega esta línea
}


  // ---------- storage helpers ----------
  private getUsers(): User[] {
    const usersJson = localStorage.getItem(this.STORAGE_KEY);
    return usersJson ? JSON.parse(usersJson) : [];
  }
  private saveUsers(users: User[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(users));
  }
  private readCurrentUserFromStorage(): AuthUser | null {
    const raw = localStorage.getItem(this.CURRENT_USER_KEY) || sessionStorage.getItem(this.CURRENT_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }
  private writeCurrentUserToStorage(user: AuthUser, remember: boolean): void {
    const payload = JSON.stringify(user);
    if (remember) {
      localStorage.setItem(this.CURRENT_USER_KEY, payload);
      sessionStorage.removeItem(this.CURRENT_USER_KEY);
    } else {
      sessionStorage.setItem(this.CURRENT_USER_KEY, payload);
      localStorage.removeItem(this.CURRENT_USER_KEY);
    }
  }
  private clearCurrentUserFromStorage(): void {
    localStorage.removeItem(this.CURRENT_USER_KEY);
    sessionStorage.removeItem(this.CURRENT_USER_KEY);
  }
  private generateToken(userId: number, email: string): string {
    return btoa(JSON.stringify({ id: userId, email, timestamp: Date.now() }));
  }

  /** Crear usuario normal por defecto */
private ensureDefaultUser(): void {
  const users = this.getUsers();
  const normalUser = users.find(u => u.email === 'user@gmail.com');
  if (!normalUser) {
    users.push({
      id: users.length + 1,
      name: 'Usuario Ejemplo',
      email: 'user@gmail.com',
      password: 'user123',
      role: 'user',
      createdAt: new Date().toISOString()
    });
    this.saveUsers(users);
    console.log('Usuario normal creado: user@gmail.com / user123');
  }
}

  // ---------- seed admin (FIX) ----------
  private ensureDefaultAdmin(): void {
    const users = this.getUsers();
    const admin = users.find(u => u.email === 'admin@gmail.com'); // <- FIX
    if (!admin) {
      users.push({
        id: users.length + 1,
        name: 'Administrador',
        email: 'admin@gmail.com',
        password: 'admin123',
        role: 'admin',
        createdAt: new Date().toISOString()
      });
      this.saveUsers(users);
      console.log('Admin creado: admin@gmail.com / admin123');
    }

    
  }

  // ---------- auth API ----------
  login(payload: { email: string; password: string; remember: boolean }): Observable<AuthResponse> {
    return new Observable<AuthResponse>(observer => {
      setTimeout(() => {
        const users = this.getUsers();
        const user = users.find(u => u.email === payload.email);
        if (!user || user.password !== payload.password) {
          observer.error({ error: 'Credenciales inválidas' });
          return;
        }

        const authUser: AuthUser = {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role ?? 'user'
        };

        const response: AuthResponse = {
          message: 'Login exitoso',
          user: authUser,
          token: this.generateToken(user.id, user.email)
        };

        this.writeCurrentUserToStorage(authUser, payload.remember);
        this.authStateSubject.next(authUser);

        observer.next(response);
        observer.complete();
      }, 400);
    });
  }

  register(payload: { name: string; email: string; password: string; terms: boolean }): Observable<AuthResponse> {
    return new Observable<AuthResponse>(observer => {
      setTimeout(() => {
        const users = this.getUsers();
        if (users.some(u => u.email === payload.email)) {
          observer.error({ error: 'El email ya está registrado' });
          return;
        }
        if (!payload.terms) {
          observer.error({ error: 'Debes aceptar los términos y condiciones' });
          return;
        }
        if ((payload.name || '').length < 3) {
          observer.error({ error: 'El nombre debe tener al menos 3 caracteres' });
          return;
        }
        if ((payload.password || '').length < 6) {
          observer.error({ error: 'La contraseña debe tener al menos 6 caracteres' });
          return;
        }

        const newUser: User = {
          id: users.length + 1,
          name: payload.name,
          email: payload.email,
          password: payload.password,
          role: 'user',
          createdAt: new Date().toISOString()
        };
        users.push(newUser);
        this.saveUsers(users);

        const response: AuthResponse = {
          message: 'Usuario registrado exitosamente',
          user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role },
          token: this.generateToken(newUser.id, newUser.email)
        };

        observer.next(response);
        observer.complete();
      }, 400);
    });
  }

  getCurrentUser(): AuthUser | null {
    return this.readCurrentUserFromStorage();
  }

  logout(): void {
    this.clearCurrentUserFromStorage();
    this.authStateSubject.next(null);
  }

  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  }

  isAdmin(): boolean {
    const u = this.getCurrentUser();
    return !!u && (u.role === 'admin' || u.email === 'admin@gmail.com'); // coherente con seed
  }

  // utilidades
  getAllUsers(): Omit<User, 'password'>[] {
    return this.getUsers().map(u => ({
      id: u.id, name: u.name, email: u.email, role: u.role ?? 'user', createdAt: u.createdAt
    }));
  }
}
