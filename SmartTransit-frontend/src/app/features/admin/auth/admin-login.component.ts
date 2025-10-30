import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface AdminSession {
  adminId: string;
  username: string;
  fullName: string;
  role: string;
  token: string;
}

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-login-container">
      <div class="login-card">
        <div class="login-header">
          <div class="admin-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2l9 4.5v5C21 17 16.5 21 12 22c-4.5-1-9-5-9-10.5v-5z"/>
              <path d="M12 8v4"/>
              <path d="M12 16h.01"/>
            </svg>
          </div>
          <h1>Panel Administrativo</h1>
          <p>Ingresa tus credenciales de administrador</p>
        </div>

        @if (errorMessage()) {
          <div class="error-alert">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {{ errorMessage() }}
          </div>
        }

        <form class="login-form" (ngSubmit)="login()">
          <div class="form-group">
            <label for="username">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              Usuario
            </label>
            <input 
              type="text" 
              id="username"
              [(ngModel)]="username"
              name="username"
              placeholder="admin"
              [disabled]="isLoading()"
              required
              autocomplete="username">
          </div>

          <div class="form-group">
            <label for="password">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              Contraseña
            </label>
            <div class="password-input">
              <input 
                [type]="showPassword() ? 'text' : 'password'"
                id="password"
                [(ngModel)]="password"
                name="password"
                placeholder="••••••••"
                [disabled]="isLoading()"
                required
                autocomplete="current-password">
              <button type="button" class="toggle-password" (click)="showPassword.set(!showPassword())">
                @if (showPassword()) {
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                } @else {
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                }
              </button>
            </div>
          </div>

          <button type="submit" class="login-btn" [disabled]="isLoading()">
            @if (isLoading()) {
              <div class="spinner"></div>
              <span>Iniciando sesión...</span>
            } @else {
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                <polyline points="10 17 15 12 10 7"/>
                <line x1="15" y1="12" x2="3" y2="12"/>
              </svg>
              <span>Iniciar Sesión</span>
            }
          </button>
        </form>

        <div class="login-footer">
          <button class="back-link" (click)="goBack()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
            Volver al inicio
          </button>
        </div>

        <!-- Demo credentials -->
        <div class="demo-info">
          <h4>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4"/>
              <path d="M12 8h.01"/>
            </svg>
            Credenciales de prueba
          </h4>
          <p><strong>Usuario:</strong> admin</p>
          <p><strong>Contraseña:</strong> admin123</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-login-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #fef3c7 0%, #fcd34d 100%);
      padding: 2rem;
    }

    .login-card {
      background: white;
      border-radius: 20px;
      padding: 2.5rem;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
      width: 100%;
      max-width: 440px;
      animation: slideUp 0.4s ease;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .login-header {
      text-align: center;
      margin-bottom: 2rem;

      .admin-icon {
        width: 80px;
        height: 80px;
        margin: 0 auto 1.5rem;
        border-radius: 20px;
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        box-shadow: 0 8px 24px rgba(245, 158, 11, 0.3);
      }

      h1 {
        font-size: 1.75rem;
        font-weight: 700;
        color: #111827;
        margin: 0 0 0.5rem 0;
      }

      p {
        color: #6b7280;
        margin: 0;
      }
    }

    .error-alert {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem;
      background: #fee2e2;
      border: 1px solid #fecaca;
      border-radius: 12px;
      color: #991b1b;
      margin-bottom: 1.5rem;
      font-size: 0.875rem;
      font-weight: 500;

      svg {
        flex-shrink: 0;
      }
    }

    .login-form {
      .form-group {
        margin-bottom: 1.5rem;

        label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.5rem;
          font-size: 0.9375rem;

          svg {
            color: #f59e0b;
          }
        }

        input {
          width: 100%;
          padding: 0.875rem 1rem;
          border: 2px solid #e5e7eb;
          border-radius: 10px;
          font-size: 1rem;
          transition: all 0.2s ease;

          &:focus {
            outline: none;
            border-color: #f59e0b;
            box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
          }

          &:disabled {
            background: #f3f4f6;
            cursor: not-allowed;
          }
        }

        .password-input {
          position: relative;

          input {
            padding-right: 3rem;
          }

          .toggle-password {
            position: absolute;
            right: 0.75rem;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            color: #9ca3af;
            cursor: pointer;
            padding: 0.25rem;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: color 0.2s ease;

            &:hover {
              color: #f59e0b;
            }
          }
        }
      }

      .login-btn {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.625rem;
        padding: 1rem;
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        color: white;
        border: none;
        border-radius: 10px;
        font-weight: 600;
        font-size: 1rem;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);

        &:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(245, 158, 11, 0.4);
        }

        &:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid white;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }
      }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .login-footer {
      margin-top: 1.5rem;
      text-align: center;

      .back-link {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.625rem 1rem;
        background: #f3f4f6;
        border: none;
        border-radius: 8px;
        color: #6b7280;
        font-weight: 500;
        font-size: 0.875rem;
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
          background: #e5e7eb;
          color: #374151;
        }
      }
    }

    .demo-info {
      margin-top: 2rem;
      padding: 1rem;
      background: #fef3c7;
      border: 1px solid #fde68a;
      border-radius: 12px;

      h4 {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
        font-weight: 600;
        color: #92400e;
        margin: 0 0 0.75rem 0;

        svg {
          color: #f59e0b;
        }
      }

      p {
        font-size: 0.8125rem;
        color: #78350f;
        margin: 0.25rem 0;

        strong {
          font-weight: 600;
        }
      }
    }

    @media (max-width: 480px) {
      .admin-login-container {
        padding: 1rem;
      }

      .login-card {
        padding: 1.5rem;
      }

      .login-header .admin-icon {
        width: 64px;
        height: 64px;

        svg {
          width: 36px;
          height: 36px;
        }
      }

      .login-header h1 {
        font-size: 1.5rem;
      }
    }
  `]
})
export class AdminLoginComponent {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  username = '';
  password = '';
  readonly showPassword = signal(false);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string>('');

  ngOnInit(): void {
    // Verificar si ya hay sesión activa
    const session = this.getStoredSession();
    if (session) {
      this.router.navigate(['/admin']);
    }
  }

  async login(): Promise<void> {
    this.errorMessage.set('');

    if (!this.username || !this.password) {
      this.errorMessage.set('Por favor complete todos los campos');
      return;
    }

    this.isLoading.set(true);

    try {
      const response = await this.http.post<AdminSession>(
        'http://localhost:8080/api/admin/auth/login',
        {
          username: this.username,
          password: this.password
        }
      ).toPromise();

      if (response && response.token) {
        // Guardar sesión
        this.saveSession(response);
        
        console.log('[AdminLogin] ✅ Login exitoso:', response.username);
        
        // Redirigir al dashboard
        this.router.navigate(['/admin']);
      } else {
        this.errorMessage.set('Respuesta inválida del servidor');
      }

    } catch (error: any) {
      console.error('[AdminLogin] ❌ Error en login:', error);
      
      if (error.status === 401) {
        this.errorMessage.set('Usuario o contraseña incorrectos');
      } else if (error.status === 0) {
        this.errorMessage.set('No se puede conectar con el servidor');
      } else {
        this.errorMessage.set('Error al iniciar sesión. Intente nuevamente.');
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  private saveSession(session: AdminSession): void {
    localStorage.setItem('admin_session', JSON.stringify(session));
  }

  private getStoredSession(): AdminSession | null {
    const stored = localStorage.getItem('admin_session');
    return stored ? JSON.parse(stored) : null;
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}


