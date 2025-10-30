import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LayoutService } from '../../core/services/layout.service';
import { RouteListComponent } from '../../features/rutas/route-list/route-list';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouteListComponent],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  // Inyectamos el servicio y hacemos su estado visible para la plantilla
  public layoutService = inject(LayoutService);
}
