import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';

export interface AdminSession {
  adminId: string;
  username: string;
  fullName: string;
  role: string;
  token: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminAuthService {
  private readonly STORAGE_KEY = 'admin_session';
  
  readonly currentAdmin = signal<AdminSession | null>(null);
  readonly isAuthenticated = signal<boolean>(false);

  constructor(private router: Router) {
    this.loadSession();
  }

  /**
   * Carga la sesión desde localStorage
   */
  private loadSession(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const session: AdminSession = JSON.parse(stored);
        this.currentAdmin.set(session);
        this.isAuthenticated.set(true);
        console.log('[AdminAuthService] Sesión cargada:', session.username);
      }
    } catch (error) {
      console.error('[AdminAuthService] Error al cargar sesión:', error);
      this.clearSession();
    }
  }

  /**
   * Guarda la sesión
   */
  saveSession(session: AdminSession): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
      this.currentAdmin.set(session);
      this.isAuthenticated.set(true);
      console.log('[AdminAuthService] ✅ Sesión guardada:', session.username);
    } catch (error) {
      console.error('[AdminAuthService] Error al guardar sesión:', error);
    }
  }

  /**
   * Limpia la sesión
   */
  clearSession(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.currentAdmin.set(null);
    this.isAuthenticated.set(false);
    console.log('[AdminAuthService] Sesión limpiada');
  }

  /**
   * Cierra sesión y redirige al login
   */
  logout(): void {
    this.clearSession();
    this.router.navigate(['/admin/login']);
  }

  /**
   * Verifica si hay una sesión activa
   */
  hasActiveSession(): boolean {
    return this.isAuthenticated() && this.currentAdmin() !== null;
  }

  /**
   * Obtiene el token de autorización
   */
  getAuthToken(): string | null {
    return this.currentAdmin()?.token || null;
  }
}


