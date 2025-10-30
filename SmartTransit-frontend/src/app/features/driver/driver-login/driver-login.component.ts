import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-driver-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './driver-login.component.html',
  styleUrl: './driver-login.component.scss'
})
export class DriverLoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly loginForm: FormGroup;
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    // Inicializar formulario
    // Nota: El backend puede no requerir password, así que lo hacemos opcional
    this.loginForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: [''] // Opcional - el backend puede no requerirlo
    });

    // Si ya está autenticado, redirigir a la vista del conductor
    if (this.authService.hasActiveSession()) {
      this.router.navigate(['/driver']);
      return;
    }
  }

  /**
   * Maneja el submit del formulario de login
   */
  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.markFormGroupTouched(this.loginForm);
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const credentials = this.loginForm.value;

    this.authService.login(credentials).subscribe({
      next: (session) => {
        if (session.authenticated) {
          // Redirigir a la vista del conductor
          this.router.navigate(['/driver']);
        } else {
          this.error.set('Credenciales inválidas. Intenta nuevamente.');
          this.loading.set(false);
        }
      },
      error: (err) => {
        console.error('[DriverLogin] Error:', err);
        this.error.set('Error al conectar con el servidor. Verifica tu conexión.');
        this.loading.set(false);
      }
    });
  }

  /**
   * Marca todos los campos del formulario como touched para mostrar errores
   */
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  /**
   * Verifica si un campo tiene error
   */
  hasFieldError(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  /**
   * Obtiene el mensaje de error de un campo
   */
  getFieldError(fieldName: string): string {
    const field = this.loginForm.get(fieldName);
    if (!field || !field.errors) {
      return '';
    }

    if (field.errors['required']) {
      return `${fieldName === 'username' ? 'Usuario' : 'Contraseña'} es requerido`;
    }

    if (field.errors['minlength'] && fieldName === 'username') {
      const requiredLength = field.errors['minlength'].requiredLength;
      return `Mínimo ${requiredLength} caracteres`;
    }

    return '';
  }
}

