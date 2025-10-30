import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AdminAuthService } from '../../../core/services/admin-auth.service';

interface StatCard {
  title: string;
  value: string | number;
  icon: string;
  color: string;
  trend?: { value: string; isPositive: boolean };
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss'
})
export class AdminDashboardComponent {
  private readonly adminAuthService = inject(AdminAuthService);
  
  readonly currentAdmin = this.adminAuthService.currentAdmin;
  readonly stats = signal<StatCard[]>([
    {
      title: 'Rutas Activas',
      value: 0,
      icon: 'route',
      color: '#3b82f6',
      trend: { value: '+2 esta semana', isPositive: true }
    },
    {
      title: 'Buses en Operación',
      value: 0,
      icon: 'bus',
      color: '#8b5cf6',
      trend: { value: '3 en mantenimiento', isPositive: false }
    },
    {
      title: 'Conductores',
      value: 0,
      icon: 'driver',
      color: '#10b981',
      trend: { value: '+5 este mes', isPositive: true }
    },
    {
      title: 'Pasajeros Hoy',
      value: '~0',
      icon: 'passenger',
      color: '#f59e0b'
    }
  ]);

  readonly quickActions = [
    {
      title: 'Importar Rutas GPX',
      description: 'Carga archivos GPX con trayectos de rutas',
      icon: 'upload',
      route: '/admin/routes/import',
      color: '#3b82f6'
    },
    {
      title: 'Gestionar Buses',
      description: 'Agregar, editar o eliminar buses de la flota',
      icon: 'bus-manage',
      route: '/admin/buses',
      color: '#8b5cf6'
    },
    {
      title: 'Gestionar Conductores',
      description: 'Administrar conductores y asignaciones',
      icon: 'users',
      route: '/admin/drivers',
      color: '#10b981'
    },
    {
      title: 'Ver Rutas',
      description: 'Visualizar todas las rutas del sistema',
      icon: 'map',
      route: '/admin/routes',
      color: '#f59e0b'
    }
  ];

  constructor(private router: Router) {
    this.loadStats();
  }

  private loadStats(): void {
    // Aquí se cargarían las estadísticas reales del backend
    // Por ahora usamos valores de ejemplo
    setTimeout(() => {
      this.stats.update(stats => {
        stats[0].value = 3;
        stats[1].value = 15;
        stats[2].value = 20;
        stats[3].value = '~450';
        return [...stats];
      });
    }, 500);
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  logout(): void {
    this.adminAuthService.logout();
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}

