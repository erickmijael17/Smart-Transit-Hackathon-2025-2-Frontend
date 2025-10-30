import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AdminAuthService } from './core/services/admin-auth.service';

export const routes: Routes = [
  {
    path: 'welcome',
    // Carga el nuevo componente de la pantalla de inicio
    loadComponent: () => import('./features/landing/landing').then(m => m.LandingComponent),
    title: 'Bienvenido a SmartTransit'
  },
  {
    path: 'map',
    // Carga directamente el componente App que ya contiene el layout del mapa
    loadComponent: () => import('./layout/main-layout/main-layout').then(m => m.MainLayoutComponent),
    title: 'Mapa de Rutas - SmartTransit'
  },
  {
    path: 'driver/login',
    loadComponent: () => import('./features/driver/driver-login/driver-login.component').then(m => m.DriverLoginComponent),
    title: 'Login Conductor - SmartTransit'
  },
  {
    path: 'driver',
    loadComponent: () => import('./features/driver/driver-view.component').then(m => m.DriverViewComponent),
    title: 'Vista Conductor - SmartTransit'
  },
  // Rutas del Panel Administrativo
  {
    path: 'admin/login',
    loadComponent: () => import('./features/admin/auth/admin-login.component').then(m => m.AdminLoginComponent),
    title: 'Login Administrativo - SmartTransit'
  },
  {
    path: 'admin',
    loadComponent: () => import('./features/admin/dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
    canActivate: [() => inject(AdminAuthService).hasActiveSession() || inject(Router).createUrlTree(['/admin/login'])],
    title: 'Panel Administrativo - SmartTransit'
  },
  {
    path: 'admin/routes/import',
    loadComponent: () => import('./features/admin/routes/import-routes.component').then(m => m.ImportRoutesComponent),
    canActivate: [() => inject(AdminAuthService).hasActiveSession() || inject(Router).createUrlTree(['/admin/login'])],
    title: 'Importar Rutas - SmartTransit'
  },
  {
    path: 'admin/buses',
    loadComponent: () => import('./features/admin/buses/buses-management.component').then(m => m.BusesManagementComponent),
    canActivate: [() => inject(AdminAuthService).hasActiveSession() || inject(Router).createUrlTree(['/admin/login'])],
    title: 'Gestión de Buses - SmartTransit'
  },
  {
    path: 'admin/drivers',
    loadComponent: () => import('./features/admin/drivers/drivers-management.component').then(m => m.DriversManagementComponent),
    canActivate: [() => inject(AdminAuthService).hasActiveSession() || inject(Router).createUrlTree(['/admin/login'])],
    title: 'Gestión de Conductores - SmartTransit'
  },
  {
    path: 'admin/routes',
    redirectTo: '/map',
    pathMatch: 'full'
  },
  {
    path: '',
    redirectTo: '/welcome',
    pathMatch: 'full'
  }
];
