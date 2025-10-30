import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface Driver {
  id: string;
  username: string;
  displayName: string;
  busId?: string;
  routeId?: string;
  status: 'active' | 'inactive';
  phone?: string;
  email?: string;
}

@Component({
  selector: 'app-drivers-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="drivers-management">
      <header class="page-header">
        <button class="back-btn" (click)="goBack()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
          Volver al Dashboard
        </button>
        <div class="header-info">
          <h1>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            Gestión de Conductores
          </h1>
          <p>Administra los conductores y sus asignaciones</p>
        </div>
      </header>

      <div class="content">
        <div class="actions-bar">
          <button class="btn-primary" (click)="showAddForm = true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Agregar Conductor
          </button>
        </div>

        @if (showAddForm) {
          <div class="add-form-card">
            <h3>Nuevo Conductor</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>Username *</label>
                <input type="text" [(ngModel)]="newDriver.username" placeholder="jperez">
              </div>
              <div class="form-group">
                <label>Nombre Completo *</label>
                <input type="text" [(ngModel)]="newDriver.displayName" placeholder="Juan Pérez">
              </div>
              <div class="form-group">
                <label>Email</label>
                <input type="email" [(ngModel)]="newDriver.email" placeholder="jperez@example.com">
              </div>
              <div class="form-group">
                <label>Teléfono</label>
                <input type="tel" [(ngModel)]="newDriver.phone" placeholder="+51 999 999 999">
              </div>
              <div class="form-group">
                <label>Bus Asignado</label>
                <input type="text" [(ngModel)]="newDriver.busId" placeholder="BUS_001">
              </div>
              <div class="form-group">
                <label>Ruta Asignada</label>
                <input type="text" [(ngModel)]="newDriver.routeId" placeholder="01">
              </div>
            </div>
            <div class="form-actions">
              <button class="btn-secondary" (click)="cancelAdd()">Cancelar</button>
              <button class="btn-primary" (click)="addDriver()">Guardar</button>
            </div>
          </div>
        }

        <div class="drivers-grid">
          @for (driver of drivers(); track driver.id) {
            <div class="driver-card" [class]="driver.status">
              <div class="driver-header">
                <div class="driver-avatar">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                <div class="driver-info">
                  <h3>{{ driver.displayName }}</h3>
                  <p>\@{{ driver.username }}</p>
                </div>
                <div class="status-badge" [class]="driver.status">
                  {{ driver.status === 'active' ? 'Activo' : 'Inactivo' }}
                </div>
              </div>
              <div class="driver-details">
                @if (driver.email) {
                  <div class="detail-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                    <span>{{ driver.email }}</span>
                  </div>
                }
                @if (driver.phone) {
                  <div class="detail-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                    <span>{{ driver.phone }}</span>
                  </div>
                }
                <div class="detail-item">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M8 6v6"/><path d="M16 6v6"/><path d="M2 12h19.6"/>
                  </svg>
                  <span>Bus: {{ driver.busId || 'Sin asignar' }}</span>
                </div>
                <div class="detail-item">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="6" cy="19" r="3"/>
                    <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/>
                  </svg>
                  <span>Ruta: {{ driver.routeId || 'Sin asignar' }}</span>
                </div>
              </div>
              <div class="driver-actions">
                <button class="btn-edit" (click)="editDriver(driver)">Editar</button>
                <button class="btn-delete" (click)="deleteDriver(driver.id)">Eliminar</button>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .drivers-management { min-height: 100vh; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); }
    .page-header { background: white; border-bottom: 1px solid #e5e7eb; padding: 1.5rem 2rem; }
    .back-btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background: #f3f4f6; border: none; border-radius: 8px; color: #6b7280; font-weight: 500; cursor: pointer; margin-bottom: 1rem; }
    .back-btn:hover { background: #e5e7eb; }
    .header-info h1 { display: flex; align-items: center; gap: 0.75rem; font-size: 2rem; font-weight: 700; color: #111827; margin: 0 0 0.5rem 0; }
    .header-info h1 svg { color: #10b981; }
    .header-info p { color: #6b7280; margin: 0; }
    .content { max-width: 1400px; margin: 0 auto; padding: 2rem; }
    .actions-bar { margin-bottom: 2rem; }
    .btn-primary { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.5rem; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4); }
    .add-form-card { background: white; border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem; border: 1px solid #e5e7eb; }
    .add-form-card h3 { margin: 0 0 1rem 0; color: #111827; }
    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-bottom: 1rem; }
    .form-group label { display: block; margin-bottom: 0.5rem; font-weight: 500; color: #374151; }
    .form-group input { width: 100%; padding: 0.625rem 1rem; border: 1px solid #d1d5db; border-radius: 8px; }
    .form-actions { display: flex; gap: 1rem; justify-content: flex-end; }
    .btn-secondary { padding: 0.75rem 1.5rem; background: #f3f4f6; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; }
    .drivers-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 1.5rem; }
    .driver-card { background: white; border-radius: 12px; padding: 1.5rem; border: 1px solid #e5e7eb; }
    .driver-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; }
    .driver-avatar { width: 56px; height: 56px; border-radius: 50%; background: #d1fae5; color: #10b981; display: flex; align-items: center; justify-content: center; }
    .driver-info h3 { margin: 0; font-size: 1.125rem; color: #111827; }
    .driver-info p { margin: 0.25rem 0 0; font-size: 0.875rem; color: #6b7280; }
    .status-badge { margin-left: auto; padding: 0.375rem 0.75rem; border-radius: 8px; font-size: 0.8125rem; font-weight: 600; }
    .status-badge.active { background: #d1fae5; color: #065f46; }
    .status-badge.inactive { background: #fee2e2; color: #991b1b; }
    .driver-details { display: flex; flex-direction: column; gap: 0.625rem; margin-bottom: 1rem; }
    .detail-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; color: #4b5563; }
    .detail-item svg { flex-shrink: 0; color: #9ca3af; }
    .driver-actions { display: flex; gap: 0.5rem; }
    .btn-edit, .btn-delete { flex: 1; padding: 0.5rem; border: none; border-radius: 8px; font-weight: 500; cursor: pointer; }
    .btn-edit { background: #dbeafe; color: #1e40af; }
    .btn-delete { background: #fee2e2; color: #991b1b; }
  `]
})
export class DriversManagementComponent {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  readonly drivers = signal<Driver[]>([
    { id: '1', username: 'juan', displayName: 'Juan Pérez', busId: 'BUS_123', routeId: '01', status: 'active', email: 'juan@example.com', phone: '+51 999 111 222' },
    { id: '2', username: 'maria', displayName: 'María López', busId: 'BUS_456', routeId: '18', status: 'active', email: 'maria@example.com', phone: '+51 999 333 444' },
    { id: '3', username: 'carlos', displayName: 'Carlos Ruiz', busId: 'BUS_789', routeId: '10', status: 'active', email: 'carlos@example.com' }
  ]);

  showAddForm = false;
  newDriver: Partial<Driver> = { status: 'active' };

  addDriver(): void {
    if (!this.newDriver.username || !this.newDriver.displayName) {
      alert('Por favor complete los campos obligatorios');
      return;
    }
    this.newDriver.id = Date.now().toString();
    this.drivers.update(drivers => [...drivers, this.newDriver as Driver]);
    this.cancelAdd();
  }

  cancelAdd(): void {
    this.showAddForm = false;
    this.newDriver = { status: 'active' };
  }

  editDriver(driver: Driver): void {
    alert(`Editar conductor: ${driver.displayName}`);
  }

  deleteDriver(id: string): void {
    const driver = this.drivers().find(d => d.id === id);
    if (confirm(`¿Seguro que deseas eliminar a ${driver?.displayName}?`)) {
      this.drivers.update(drivers => drivers.filter(d => d.id !== id));
    }
  }

  goBack(): void {
    this.router.navigate(['/admin']);
  }
}


