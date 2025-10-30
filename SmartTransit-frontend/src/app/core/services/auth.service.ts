import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';

export interface DriverCredentials {
  username: string;
  password: string;
}

export interface DriverSession {
  driverId: string;
  driverName: string;
  busId?: string;
  routeId?: string;
  authenticated: boolean;
  token?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080/api/driver';
  private readonly sessionKey = 'driver_session';

  // Signal para estado de autenticación
  readonly isAuthenticated = signal<boolean>(false);
  readonly currentDriver = signal<DriverSession | null>(null);

  constructor() {
    // Intentar restaurar sesión desde localStorage
    this.restoreSession();
  }

  /**
   * Autentica un conductor
   */
  login(credentials: DriverCredentials): Observable<DriverSession> {
    return this.http.post<DriverSession>(`${this.baseUrl}/login`, credentials).pipe(
      tap((session) => {
        if (session && session.authenticated) {
          this.saveSession(session);
          this.isAuthenticated.set(true);
          this.currentDriver.set(session);
          console.log('[AuthService] ✅ Login exitoso:', {
            driverName: session.driverName,
            busId: session.busId,
            routeId: session.routeId,
            hasToken: !!session.token
          });
        }
      }),
      catchError((error) => {
        console.error('[AuthService] ❌ Error en login:', error);
        // Retornar sesión no autenticada
        return of({
          driverId: '',
          driverName: '',
          authenticated: false
        } as DriverSession);
      })
    );
  }

  /**
   * Cierra sesión
   */
  logout(): void {
    localStorage.removeItem(this.sessionKey);
    this.isAuthenticated.set(false);
    this.currentDriver.set(null);
    console.log('[AuthService] 🔓 Sesión cerrada');
  }

  /**
   * Guarda la sesión en localStorage
   */
  private saveSession(session: DriverSession): void {
    localStorage.setItem(this.sessionKey, JSON.stringify(session));
  }

  /**
   * Restaura la sesión desde localStorage
   */
  private restoreSession(): void {
    try {
      const savedSession = localStorage.getItem(this.sessionKey);
      if (savedSession) {
        const session: DriverSession = JSON.parse(savedSession);
        if (session.authenticated) {
          this.isAuthenticated.set(true);
          this.currentDriver.set(session);
          console.log('[AuthService] 🔄 Sesión restaurada:', session.driverName);
        }
      }
    } catch (error) {
      console.error('[AuthService] Error restaurando sesión:', error);
      localStorage.removeItem(this.sessionKey);
    }
  }

  /**
   * Verifica si hay una sesión activa
   */
  hasActiveSession(): boolean {
    return this.isAuthenticated();
  }
}

