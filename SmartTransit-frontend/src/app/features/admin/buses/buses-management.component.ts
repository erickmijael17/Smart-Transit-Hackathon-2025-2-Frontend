import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface Bus {
  id: string;
  plate: string;
  routeId: string;
  capacity?: number;
  status: 'active' | 'maintenance' | 'inactive';
  assignedDriver?: string;
}

@Component({
  selector: 'app-buses-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="buses-management">
      <header class="page-header">
        <button class="back-btn" (click)="goBack()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="19" y1="12" x2="5" y2="12"/>
            <polyline points="12 19 5 12 12 5"/>
          </svg>
          Volver al Dashboard
        </button>
        <div class="header-info">
          <h1>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M8 6v6"/><path d="M16 6v6"/><path d="M2 12h19.6"/>
            </svg>
            Gestión de Buses
          </h1>
          <p>Administra la flota de buses de tu empresa</p>
        </div>
      </header>

      <div class="content">
        <div class="actions-bar">
          <button class="btn-primary" (click)="showAddForm = true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Agregar Bus
          </button>
        </div>

        @if (showAddForm) {
          <div class="add-form-card">
            <h3>Nuevo Bus</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>ID del Bus *</label>
                <input type="text" [(ngModel)]="newBus.id" placeholder="BUS_001">
              </div>
              <div class="form-group">
                <label>Placa *</label>
                <input type="text" [(ngModel)]="newBus.plate" placeholder="ABC-123">
              </div>
              <div class="form-group">
                <label>Ruta Asignada</label>
                <input type="text" [(ngModel)]="newBus.routeId" placeholder="01">
              </div>
              <div class="form-group">
                <label>Capacidad</label>
                <input type="number" [(ngModel)]="newBus.capacity" placeholder="50">
              </div>
            </div>
            <div class="form-actions">
              <button class="btn-secondary" (click)="cancelAdd()">Cancelar</button>
              <button class="btn-primary" (click)="addBus()">Guardar</button>
            </div>
          </div>
        }

        <div class="buses-grid">
          @for (bus of buses(); track bus.id) {
            <div class="bus-card" [class]="bus.status">
              <div class="bus-header">
                <div class="bus-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M8 6v6"/><path d="M16 6v6"/><path d="M2 12h19.6"/>
                  </svg>
                </div>
                <div class="bus-info">
                  <h3>{{ bus.id }}</h3>
                  <p>Placa: {{ bus.plate }}</p>
                </div>
                <div class="status-badge" [class]="bus.status">
                  {{ bus.status === 'active' ? 'Activo' : bus.status === 'maintenance' ? 'Mantenimiento' : 'Inactivo' }}
                </div>
              </div>
              <div class="bus-details">
                <div class="detail-item">
                  <span class="label">Ruta:</span>
                  <span class="value">{{ bus.routeId || 'Sin asignar' }}</span>
                </div>
                @if (bus.capacity) {
                  <div class="detail-item">
                    <span class="label">Capacidad:</span>
                    <span class="value">{{ bus.capacity }} pasajeros</span>
                  </div>
                }
                @if (bus.assignedDriver) {
                  <div class="detail-item">
                    <span class="label">Conductor:</span>
                    <span class="value">{{ bus.assignedDriver }}</span>
                  </div>
                }
              </div>
              <div class="bus-actions">
                <button class="btn-edit" (click)="editBus(bus)">Editar</button>
                <button class="btn-delete" (click)="deleteBus(bus.id)">Eliminar</button>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .buses-management { min-height: 100vh; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); }
    .page-header { background: white; border-bottom: 1px solid #e5e7eb; padding: 1.5rem 2rem; }
    .back-btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background: #f3f4f6; border: none; border-radius: 8px; color: #6b7280; font-weight: 500; cursor: pointer; margin-bottom: 1rem; }
    .back-btn:hover { background: #e5e7eb; }
    .header-info h1 { display: flex; align-items: center; gap: 0.75rem; font-size: 2rem; font-weight: 700; color: #111827; margin: 0 0 0.5rem 0; }
    .header-info h1 svg { color: #8b5cf6; }
    .header-info p { color: #6b7280; margin: 0; }
    .content { max-width: 1400px; margin: 0 auto; padding: 2rem; }
    .actions-bar { margin-bottom: 2rem; }
    .btn-primary { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.5rem; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(139, 92, 246, 0.4); }
    .add-form-card { background: white; border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem; border: 1px solid #e5e7eb; }
    .add-form-card h3 { margin: 0 0 1rem 0; color: #111827; }
    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-bottom: 1rem; }
    .form-group label { display: block; margin-bottom: 0.5rem; font-weight: 500; color: #374151; }
    .form-group input { width: 100%; padding: 0.625rem 1rem; border: 1px solid #d1d5db; border-radius: 8px; }
    .form-actions { display: flex; gap: 1rem; justify-content: flex-end; }
    .btn-secondary { padding: 0.75rem 1.5rem; background: #f3f4f6; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; }
    .buses-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem; }
    .bus-card { background: white; border-radius: 12px; padding: 1.5rem; border: 1px solid #e5e7eb; }
    .bus-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; }
    .bus-icon { width: 48px; height: 48px; border-radius: 10px; background: #f3e8ff; color: #8b5cf6; display: flex; align-items: center; justify-content: center; }
    .bus-info h3 { margin: 0; font-size: 1.125rem; color: #111827; }
    .bus-info p { margin: 0.25rem 0 0; font-size: 0.875rem; color: #6b7280; }
    .status-badge { margin-left: auto; padding: 0.375rem 0.75rem; border-radius: 8px; font-size: 0.8125rem; font-weight: 600; }
    .status-badge.active { background: #d1fae5; color: #065f46; }
    .status-badge.maintenance { background: #fef3c7; color: #92400e; }
    .status-badge.inactive { background: #fee2e2; color: #991b1b; }
    .bus-details { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem; }
    .detail-item { display: flex; justify-content: space-between; font-size: 0.875rem; }
    .detail-item .label { color: #6b7280; }
    .detail-item .value { font-weight: 500; color: #111827; }
    .bus-actions { display: flex; gap: 0.5rem; }
    .btn-edit, .btn-delete { flex: 1; padding: 0.5rem; border: none; border-radius: 8px; font-weight: 500; cursor: pointer; }
    .btn-edit { background: #dbeafe; color: #1e40af; }
    .btn-delete { background: #fee2e2; color: #991b1b; }
  `]
})
export class BusesManagementComponent {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  readonly buses = signal<Bus[]>([
    { id: 'BUS_123', plate: 'ABC-123', routeId: '01', status: 'active', capacity: 50, assignedDriver: 'Juan Pérez' },
    { id: 'BUS_456', plate: 'DEF-456', routeId: '18', status: 'active', capacity: 45, assignedDriver: 'María López' },
    { id: 'BUS_789', plate: 'GHI-789', routeId: '10', status: 'maintenance', capacity: 50 }
  ]);

  showAddForm = false;
  newBus: Partial<Bus> = { status: 'active' };

  addBus(): void {
    if (!this.newBus.id || !this.newBus.plate) {
      alert('Por favor complete los campos obligatorios');
      return;
    }
    this.buses.update(buses => [...buses, this.newBus as Bus]);
    this.cancelAdd();
  }

  cancelAdd(): void {
    this.showAddForm = false;
    this.newBus = { status: 'active' };
  }

  editBus(bus: Bus): void {
    // TODO: Implementar edición
    alert(`Editar bus: ${bus.id}`);
  }

  deleteBus(id: string): void {
    if (confirm(`¿Seguro que deseas eliminar el bus ${id}?`)) {
      this.buses.update(buses => buses.filter(b => b.id !== id));
    }
  }

  goBack(): void {
    this.router.navigate(['/admin']);
  }
}


