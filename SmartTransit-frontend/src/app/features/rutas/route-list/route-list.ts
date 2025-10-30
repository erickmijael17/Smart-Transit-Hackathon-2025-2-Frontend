import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TransitService } from '../../../core/services/transit.service';
import { MapStateService } from '../../../core/services/map-state.service';
import { TrackingService } from '../../../core/services/tracking.service';
import { Route } from '../../../core/models/route.model';

/**
 * Componente de lista de rutas con diseño inspirado en WAZE
 * Muestra todas las rutas disponibles con interactividad
 */
@Component({
  selector: 'app-route-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './route-list.html',
  styleUrl: './route-list.scss'
})
export class RouteListComponent implements OnInit {
  private readonly transitService = inject(TransitService);
  private readonly mapStateService = inject(MapStateService);
  private readonly trackingService = inject(TrackingService);

  readonly routes = signal<Route[]>([]);
  readonly loading = this.transitService.loading$;
  readonly searchQuery = signal('');
  readonly activeBusCount = this.trackingService.activeBusCount;
  readonly isTrackingConnected = this.trackingService.isConnected;
  
  // Signal para forzar actualización de contadores
  private readonly busCountTrigger = signal(0);

  constructor() {
    // Actualizar contadores cuando cambie el número de buses activos
    effect(() => {
      const count = this.activeBusCount();
      this.busCountTrigger.set(count);
    });
  }


  readonly filteredRoutes = computed(() => {
    const query = this.searchQuery().toLowerCase();
    return this.routes().filter(route =>
      route.name.toLowerCase().includes(query) ||
      route.id.toLowerCase().includes(query)
    );
  });

  readonly selectedCount = this.mapStateService.selectedCount;

  ngOnInit(): void {
    this.loadRoutes();
  }

  /**
   * Carga las rutas desde el servicio
   */
  private loadRoutes(): void {
    this.transitService.routes$.subscribe(routes => {
      this.routes.set(routes);
    });

    // Trigger inicial de carga
    this.transitService.getAllRoutes().subscribe();
  }

  /**
   * Maneja el click en una ruta
   */
  onRouteClick(route: Route): void {
    this.mapStateService.toggleRouteSelection(route.id);
  }

  /**
   * Verifica si una ruta está seleccionada
   */
  isSelected(routeId: string): boolean {
    return this.mapStateService.isRouteSelected(routeId);
  }

  /**
   * Verifica si una ruta está enfocada
   */
  isFocused(routeId: string): boolean {
    return this.mapStateService.isRouteFocused(routeId);
  }

  /**
   * Verifica si una ruta está visible
   */
  isVisible(routeId: string): boolean {
    return this.mapStateService.isRouteVisible(routeId);
  }

  /**
   * Alterna la visibilidad de una ruta
   */
  toggleVisibility(event: Event, routeId: string): void {
    event.stopPropagation();
    this.mapStateService.toggleRouteVisibility(routeId);
  }

  /**
   * Actualiza el query de búsqueda
   */
  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  /**
   * Limpia la búsqueda
   */
  clearSearch(): void {
    this.searchQuery.set('');
  }

  /**
   * Limpia todas las selecciones
   */
  clearAllSelections(): void {
    this.mapStateService.clearSelection();
  }

  /**
   * Muestra todas las rutas
   */
  showAllRoutes(): void {
    const allIds = this.routes().map(r => r.id);
    this.mapStateService.showAllRoutes(allIds);
  }

  /**
   * Oculta todas las rutas
   */
  hideAllRoutes(): void {
    this.mapStateService.hideAllRoutes();
  }

  /**
   * Obtiene la cantidad de buses activos para una ruta específica
   */
  getActiveBusCountForRoute(routeId: string): number {
    // Trigger para reactividad
    this.busCountTrigger();
    return this.trackingService.getActiveBusCountByRoute(routeId);
  }

  /**
   * Verifica si una ruta tiene buses activos
   */
  hasActiveBuses(routeId: string): boolean {
    return this.getActiveBusCountForRoute(routeId) > 0;
  }
}
