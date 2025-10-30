import { Injectable, signal, computed, effect } from '@angular/core';
import { Route } from '../models/route.model';

/**
 * Estado de visualización del mapa
 */
export interface MapViewState {
  center: [number, number];
  zoom: number;
}

/**
 * Servicio para manejar el estado del mapa usando Signals API (Angular 20)
 * Gestiona la selección de rutas, visibilidad y estado de vista del mapa
 */
@Injectable({
  providedIn: 'root'
})
export class MapStateService {
  // Estado de rutas seleccionadas
  private selectedRouteIdsSignal = signal<Set<string>>(new Set());

  // Ruta enfocada/destacada
  private focusedRouteIdSignal = signal<string | null>(null);

  // Rutas visibles (ocultar/mostrar sin deseleccionar)
  private visibleRouteIdsSignal = signal<Set<string>>(new Set());

  // Estado de vista del mapa
  private mapViewSignal = signal<MapViewState>({
    center: [-15.49, -70.13], // Juliaca, Perú por defecto
    zoom: 14
  });

  // Modo de visualización
  private mapModeSignal = signal<'all' | 'selected'>('all');

  // Signals computados para lectura reactiva
  readonly selectedRouteIds = this.selectedRouteIdsSignal.asReadonly();
  readonly focusedRouteId = this.focusedRouteIdSignal.asReadonly();
  readonly visibleRouteIds = this.visibleRouteIdsSignal.asReadonly();
  readonly mapView = this.mapViewSignal.asReadonly();
  readonly mapMode = this.mapModeSignal.asReadonly();

  // Computed signals
  readonly hasSelectedRoutes = computed(() => this.selectedRouteIdsSignal().size > 0);
  readonly selectedCount = computed(() => this.selectedRouteIdsSignal().size);

  constructor() {
    // Efecto para enfocar la última ruta seleccionada
    effect(() => {
      const selectedIds = this.selectedRouteIdsSignal();
      const firstId = selectedIds.values().next().value;

      if (selectedIds.size === 1 && firstId) {
        // Si solo hay una ruta seleccionada, la enfocamos
        this.setFocusedRoute(firstId);
      } else if (selectedIds.size !== 1) {
        this.setFocusedRoute(null);
      }
    });
  }

  /**
   * Selecciona una ruta
   */
  selectRoute(routeId: string): void {
    this.selectedRouteIdsSignal.update(ids => {
      const newIds = new Set(ids);
      newIds.add(routeId);
      return newIds;
    });
  }

  /**
   * Deselecciona una ruta
   */
  deselectRoute(routeId: string): void {
    this.selectedRouteIdsSignal.update(ids => {
      const newIds = new Set(ids);
      newIds.delete(routeId);
      return newIds;
    });
  }

  /**
   * Alterna la selección de una ruta
   */
  toggleRouteSelection(routeId: string): void {
    const currentIds = this.selectedRouteIdsSignal();
    if (currentIds.has(routeId)) {
      this.deselectRoute(routeId);
    } else {
      this.selectRoute(routeId);
    }
  }

  /**
   * Limpia todas las selecciones
   */
  clearSelection(): void {
    this.selectedRouteIdsSignal.set(new Set());
    this.focusedRouteIdSignal.set(null);
  }

  /**
   * Establece la ruta enfocada
   */
  setFocusedRoute(routeId: string | null): void {
    this.focusedRouteIdSignal.set(routeId);
  }

  /**
   * Muestra u oculta una ruta
   */
  toggleRouteVisibility(routeId: string): void {
    this.visibleRouteIdsSignal.update(ids => {
      const newIds = new Set(ids);
      if (newIds.has(routeId)) {
        newIds.delete(routeId);
      } else {
        newIds.add(routeId);
      }
      return newIds;
    });
  }

  /**
   * Muestra todas las rutas
   */
  showAllRoutes(routeIds: string[]): void {
    this.visibleRouteIdsSignal.set(new Set(routeIds));
  }

  /**
   * Oculta todas las rutas
   */
  hideAllRoutes(): void {
    this.visibleRouteIdsSignal.set(new Set());
  }

  /**
   * Verifica si una ruta está seleccionada
   */
  isRouteSelected(routeId: string): boolean {
    return this.selectedRouteIdsSignal().has(routeId);
  }

  /**
   * Verifica si una ruta está visible
   */
  isRouteVisible(routeId: string): boolean {
    return this.visibleRouteIdsSignal().has(routeId);
  }

  /**
   * Verifica si una ruta está enfocada
   */
  isRouteFocused(routeId: string): boolean {
    return this.focusedRouteIdSignal() === routeId;
  }

  /**
   * Actualiza la vista del mapa
   */
  updateMapView(center: [number, number], zoom: number): void {
    this.mapViewSignal.set({ center, zoom });
  }

  /**
   * Centra el mapa en una ruta
   */
  centerOnRoute(route: Route): void {
    if (route.polyline.length > 0) {
      // Calcula el centro de la ruta
      const latSum = route.polyline.reduce((sum, point) => sum + point[0], 0);
      const lngSum = route.polyline.reduce((sum, point) => sum + point[1], 0);
      const center: [number, number] = [
        latSum / route.polyline.length,
        lngSum / route.polyline.length
      ];

      this.updateMapView(center, 14);
      this.setFocusedRoute(route.id);
    }
  }

  /**
   * Alterna el modo del mapa
   */
  toggleMapMode(): void {
    this.mapModeSignal.update(mode => mode === 'all' ? 'selected' : 'all');
  }

  /**
   * Establece el modo del mapa
   */
  setMapMode(mode: 'all' | 'selected'): void {
    this.mapModeSignal.set(mode);
  }
}
