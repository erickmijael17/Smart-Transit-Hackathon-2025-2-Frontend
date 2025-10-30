import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './landing.html',
  styleUrl: './landing.scss'
})
export class LandingComponent {
  private readonly router = inject(Router);

  /**
   * Maneja el click en el modo conductor.
   * Redirige al login de conductor.
   */
  onDriverModeClick(): void {
    // Redireccionar al login de conductor
    this.router.navigate(['/driver/login']);
  }

  onAdminModeClick(): void {
    // Redireccionar al login administrativo
    this.router.navigate(['/admin/login']);
  }
}
