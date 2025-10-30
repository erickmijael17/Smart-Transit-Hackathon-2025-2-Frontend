import { Component, OnInit, OnDestroy, inject, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { TransitService } from '../../core/services/transit.service';
import { MapStateService } from '../../core/services/map-state.service';
import { TrackingService } from '../../core/services/tracking.service';
import { UserLocationService } from '../../core/services/user-location.service';
import { GeocodingService } from '../../core/services/geocoding.service';
import { RoutingService } from '../../core/services/routing.service';
import { Route } from '../../core/models/route.model';
import 'leaflet-rotatedmarker';
import { BusPosition, ConnectionStatus, BusTrackingInfo, OccupancyLevel } from '../../core/models/tracking.model';
import { createBusIcon, getBusMarkerStyles } from '../../core/utils/bus-icons.util';
import { Subject, takeUntil } from 'rxjs';
import { RouteSuggestionComponent } from '../route-suggestion/route-suggestion';


@Component({
  selector: 'app-mapa',
  standalone: true,
  imports: [CommonModule, RouteSuggestionComponent],
  templateUrl: './mapa.html',
  styleUrl: './mapa.scss'
})
export class MapaComponent implements OnInit, OnDestroy {
  private readonly transitService = inject(TransitService);
  private readonly mapStateService = inject(MapStateService);
  private readonly trackingService = inject(TrackingService);
  private readonly userLocationService = inject(UserLocationService);
  private readonly geocodingService = inject(GeocodingService);
  private readonly routingService = inject(RoutingService);

  private map!: L.Map;
  private routeLayers = new Map<string, L.Polyline>();
  private routeShadows = new Map<string, L.Polyline>();
  private stopMarkers = new Map<string, L.CircleMarker>();
  private routeEndpointMarkers = new Map<string, L.Marker[]>();
  private busMarkers = new Map<string, L.Marker>();
  private routeColors = new Map<string, string>();
  private destroy$ = new Subject<void>();

  // Markers de ubicación del usuario (persistentes)
  private userLocationMarker: L.CircleMarker | null = null;
  private userLocationAccuracyCircle: L.Circle | null = null;
  private userLocationPulse: L.Circle | null = null;

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly trackingStatus = this.trackingService.connectionStatus;
  readonly isTrackingConnected = this.trackingService.isConnected;
  readonly activeBusCount = this.trackingService.activeBusCount;
  readonly completedBusCount = this.trackingService.completedBusCount;

  // Panel de sugerencia de rutas
  readonly showRouteSuggestionPanel = signal(false);
  
  // Panel de información de buses (legacy - puede removerse en el futuro)
  readonly showBusPanel = signal(false);
  readonly busTrackingInfo = signal<BusTrackingInfo[]>([]);

  // Ubicación del usuario
  readonly userLocation = this.userLocationService.currentLocation;
  readonly isTrackingUserLocation = this.userLocationService.isTracking;
  readonly locationError = this.userLocationService.locationError;
  readonly currentAddress = signal<string>('Obteniendo dirección...');

  // Configuración de Snap to Road
  readonly enableSnapToRoad = signal<boolean>(true); // Activar/desactivar snap to road
  readonly isSnapping = signal<boolean>(false); // Estado de ajuste

  // Capas de ruta sugerida (navegación)
  private suggestedRouteGroup: L.LayerGroup | null = null;
  private destinationMarker: L.Marker | null = null;
  private previousVisibleRoutes: string[] = [];  // Guardar rutas visibles antes de la sugerencia

  constructor() {
    effect(() => {
      const focusedRouteId = this.mapStateService.focusedRouteId();
      if (focusedRouteId) {
        this.highlightRoute(focusedRouteId);
      }
    });

    effect(() => {
      const visibleIds = this.mapStateService.visibleRouteIds();
      this.updateRouteVisibility(visibleIds);
    });

    effect(() => {
      try {
        const status = this.trackingStatus();

        if (status === ConnectionStatus.CONNECTED) {
          console.log('[MapaComponent] Tracking conectado');
        } else if (status === ConnectionStatus.ERROR) {
          console.warn('[MapaComponent]  Error en tracking (no crítico)');
        }
      } catch (err) {
      }
    }, { allowSignalWrites: true });

    // Effect para actualizar la ubicación del usuario en tiempo real con Snap to Road
    effect(() => {
      const location = this.userLocation();
      if (location && this.map) {
        // Si Snap to Road está activado, ajustar a la calle más cercana
        if (this.enableSnapToRoad()) {
          this.snapAndUpdateLocation(location.latitude, location.longitude, location.accuracy);
        } else {
          // Modo normal: mostrar ubicación GPS directa
          this.updateUserLocationMarker(location.latitude, location.longitude, location.accuracy);
          this.getCurrentAddress(location.latitude, location.longitude);
        }
      }
    });

    this.injectBusMarkerStyles();
  }

  ngOnInit(): void {
    this.initMap();
    this.loadTransitData();

    // Inicializar tracking después de cargar rutas
    setTimeout(() => this.initTracking(), 2000);

    // Iniciar seguimiento de ubicación del usuario (UNA SOLA VEZ)
    // El effect() se encargará de actualizar el mapa automáticamente
    setTimeout(() => {
      if (!this.userLocationService.isTracking()) {
        console.log('[MapaComponent] 🎯 Iniciando seguimiento de ubicación del usuario...');
        this.userLocationService.startTracking();
      }
    }, 1000);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    this.busMarkers.forEach(marker => {
      const markerAny = marker as any;
      if (markerAny._animationFrame) {
        cancelAnimationFrame(markerAny._animationFrame);
      }
    });

    this.trackingService.disconnect();
    this.userLocationService.stopTracking();

    if (this.map) {
      this.map.remove();
    }
  }

  /**
   * Inicializa el mapa de Leaflet con controles personalizados
   */
  private initMap(): void {
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
      console.error('[MapaComponent] No se encontró el contenedor #map');
      this.error.set('Error al inicializar el mapa');
      return;
    }

    try {
      // Coordenadas iniciales (Juliaca, Perú)
      const center: [number, number] = [-15.49, -70.13];

      this.map = L.map('map', {
        center,
        zoom: 14,
        zoomControl: false,
        attributionControl: true,
        zoomAnimation: true,
        fadeAnimation: true,
        markerZoomAnimation: true
      });
    } catch (err) {
      console.error('[MapaComponent] ❌ Error creando mapa:', err);
      this.error.set('Error al inicializar el mapa');
      return;
    }

    // Capa base: CartoDB Positron (más limpio, mejor para labels)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(this.map);

    // Capa de labels con nombres de calles, plazas, comercios (NUEVA)
    // Esta capa muestra SOLO los nombres sobre el mapa base
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 20,
      pane: 'shadowPane' // Pone los labels encima de todo
    }).addTo(this.map);

    // Agregar controles de zoom personalizados
    L.control.zoom({
      position: 'bottomright',
      zoomInTitle: 'Acercar',
      zoomOutTitle: 'Alejar'
    }).addTo(this.map);

    // Agregar botón de geolocalización personalizado
    this.addGeolocationControl();

    // Agregar control de escala
    L.control.scale({
      position: 'bottomleft',
      metric: true,
      imperial: false,
      maxWidth: 150
    }).addTo(this.map);

    // Configurar el ícono por defecto de Leaflet (fix para bundlers)
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    });

    // Agregar efecto de fade-in al mapa
    setTimeout(() => {
      const mapContainer = document.getElementById('map');
      if (mapContainer) {
        mapContainer.classList.add('map-loaded');
      }
    }, 300);
  }

  /**
   * Agrega control de geolocalización personalizado
   */
  private addGeolocationControl(): void {
    const GeolocationControl = L.Control.extend({
      options: {
        position: 'topright'
      },

      onAdd: () => {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control custom-geolocation-control');
        container.innerHTML = `
          <a href="#" title="Mi ubicación" role="button" aria-label="Centrar en mi ubicación">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </a>
        `;

        container.onclick = (e: Event) => {
          e.preventDefault();
          e.stopPropagation();
          this.centerOnUserLocation();
        };

        return container;
      }
    });

    new GeolocationControl().addTo(this.map);
  }

  /**
   * Centra el mapa en la ubicación del usuario
   * Mejores prácticas 2025: Evita múltiples llamadas a startTracking()
   */
  private centerOnUserLocation(): void {
    const location = this.userLocation();
    
    if (location) {
      // Si ya tenemos ubicación, centrar inmediatamente
      console.log('[MapaComponent] 📍 Centrando en ubicación actual');
      this.map.flyTo([location.latitude, location.longitude], 16, {
        duration: 1.5,
        easeLinearity: 0.5
      });
    } else if (!this.isTrackingUserLocation()) {
      // Solo iniciar tracking si no está activo
      console.log('[MapaComponent] 🎯 Iniciando tracking desde botón de geolocalización');
      this.userLocationService.startTracking();
      
      // Mostrar mensaje temporal
      this.error.set('Obteniendo tu ubicación...');
      setTimeout(() => {
        if (this.error() === 'Obteniendo tu ubicación...') {
          this.error.set(null);
        }
      }, 5000);
    } else {
      // Ya está tracking pero no tenemos ubicación aún
      console.log('[MapaComponent] ⏳ Esperando primera ubicación del GPS...');
      this.error.set('Esperando señal GPS...');
      setTimeout(() => {
        if (this.error() === 'Esperando señal GPS...') {
          this.error.set(null);
        }
      }, 5000);
    }
  }

  /**
   * Actualiza el marker de ubicación del usuario en tiempo real (PERSISTENTE)
   */
  private updateUserLocationMarker(latitude: number, longitude: number, accuracy: number): void {
    const latLng: L.LatLng = L.latLng(latitude, longitude);

    // Si no existe el marker principal, crearlo
    if (!this.userLocationMarker) {
      console.log('[MapaComponent] 📍 Creando marker de ubicación del usuario (persistente)');

      // Marker principal mejorado (punto azul más grande y visible)
      this.userLocationMarker = L.circleMarker(latLng, {
        radius: 12, // Más grande
        fillColor: '#4285f4',
        color: '#ffffff',
        weight: 4, // Borde más grueso
        opacity: 1,
        fillOpacity: 1, // Más opaco
        className: 'user-location-marker persistent'
      }).addTo(this.map);

      // Agregar sombra interior para efecto 3D
      const innerCircle = L.circleMarker(latLng, {
        radius: 6,
        fillColor: '#1a73e8', // Azul más oscuro
        color: 'transparent',
        weight: 0,
        opacity: 1,
        fillOpacity: 0.8,
        className: 'user-location-inner'
      }).addTo(this.map);

      // Guardar referencia al círculo interno
      (this.userLocationMarker as any)._innerCircle = innerCircle;

      this.userLocationMarker.bindPopup(`
        <div class="premium-popup user-location-popup">
          <div class="popup-header">
            <div class="popup-icon" style="background: #4285f4;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
                <circle cx="12" cy="12" r="10"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </div>
            <div class="popup-title">
              <h3>Tu Ubicación</h3>
              <span class="popup-badge" style="background: #4285f420; color: #4285f4;">En Vivo</span>
            </div>
          </div>
          <div class="popup-content">
            <div class="info-row">
              <span class="info-label">Coordenadas:</span>
              <span class="info-value">${latitude.toFixed(6)}, ${longitude.toFixed(6)}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Precisión:</span>
              <span class="info-value">${accuracy.toFixed(0)} metros</span>
            </div>
          </div>
        </div>
      `, {
        maxWidth: 300,
        className: 'premium-popup-wrapper'
      });

      // Círculo de precisión
      this.userLocationAccuracyCircle = L.circle(latLng, {
        radius: accuracy,
        color: '#4285f4',
        fillColor: '#4285f4',
        fillOpacity: 0.1,
        weight: 1,
        className: 'user-location-accuracy'
      }).addTo(this.map);

      // Pulso animado
      this.userLocationPulse = L.circle(latLng, {
        radius: 15,
        color: '#4285f4',
        fillColor: '#4285f4',
        fillOpacity: 0.3,
        weight: 2,
        className: 'user-location-pulse persistent'
      }).addTo(this.map);

    } else {
      // Actualizar posición de los markers existentes
      this.userLocationMarker.setLatLng(latLng);

      // Actualizar círculo interno
      const innerCircle = (this.userLocationMarker as any)._innerCircle;
      if (innerCircle) {
        innerCircle.setLatLng(latLng);
      }

      if (this.userLocationAccuracyCircle) {
        this.userLocationAccuracyCircle.setLatLng(latLng);
        this.userLocationAccuracyCircle.setRadius(accuracy);
      }

      if (this.userLocationPulse) {
        this.userLocationPulse.setLatLng(latLng);
      }

      // Actualizar popup
      this.userLocationMarker.setPopupContent(`
        <div class="premium-popup user-location-popup">
          <div class="popup-header">
            <div class="popup-icon" style="background: #4285f4;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
                <circle cx="12" cy="12" r="10"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </div>
            <div class="popup-title">
              <h3>Tu Ubicación</h3>
              <span class="popup-badge" style="background: #4285f420; color: #4285f4;">En Vivo</span>
            </div>
          </div>
          <div class="popup-content">
            <div class="info-row">
              <span class="info-label">Coordenadas:</span>
              <span class="info-value">${latitude.toFixed(6)}, ${longitude.toFixed(6)}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Precisión:</span>
              <span class="info-value">${accuracy.toFixed(0)} metros</span>
            </div>
          </div>
        </div>
      `);
    }
  }

  /**
   * Obtiene la dirección actual usando reverse geocoding
   */
  private getCurrentAddress(latitude: number, longitude: number): void {
    // Evitar hacer demasiadas peticiones (solo cada 100 metros aprox)
    this.geocodingService.reverseGeocode(latitude, longitude)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Extraer la dirección del response
          const address = this.formatAddress(response);
          this.currentAddress.set(address);

          // Actualizar el popup del marker con la dirección
          if (this.userLocationMarker) {
            this.updateUserLocationPopup(latitude, longitude, this.userLocationService.currentLocation()?.accuracy || 0);
          }
        },
        error: (err) => {
          console.warn('[MapaComponent] Error obteniendo dirección:', err);
          this.currentAddress.set('Dirección no disponible');
        }
      });
  }

  /**
   * Formatea la respuesta de geocoding a una dirección legible
   */
  private formatAddress(response: any): string {
    if (!response || !response.address) {
      return 'Dirección no disponible';
    }

    const parts: string[] = [];

    // Calle y número
    if (response.address.road) {
      parts.push(response.address.road);
      if (response.address.house_number) {
        parts[parts.length - 1] += ' ' + response.address.house_number;
      }
    }

    // Barrio/Colonia
    if (response.address.suburb || response.address.neighbourhood) {
      parts.push(response.address.suburb || response.address.neighbourhood);
    }

    // Ciudad
    if (response.address.city || response.address.town || response.address.village) {
      parts.push(response.address.city || response.address.town || response.address.village);
    }

    return parts.length > 0 ? parts.join(', ') : response.displayName || 'Dirección no disponible';
  }

  /**
   * Actualiza el popup del marker de ubicación con la dirección
   */
  private updateUserLocationPopup(latitude: number, longitude: number, accuracy: number): void {
    if (!this.userLocationMarker) return;

    const address = this.currentAddress();

    this.userLocationMarker.setPopupContent(`
      <div class="premium-popup user-location-popup">
        <div class="popup-header">
          <div class="popup-icon" style="background: #4285f4;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
              <circle cx="12" cy="12" r="10"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </div>
          <div class="popup-title">
            <h3>Tu Ubicación</h3>
            <span class="popup-badge" style="background: #4285f420; color: #4285f4;">En Vivo</span>
          </div>
        </div>
        <div class="popup-content">
          <div class="info-row">
            <span class="info-label">📍 Dirección:</span>
            <span class="info-value" style="font-weight: 600; color: #1a73e8;">${address}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Coordenadas:</span>
            <span class="info-value">${latitude.toFixed(6)}, ${longitude.toFixed(6)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Precisión:</span>
            <span class="info-value">${accuracy.toFixed(0)} metros</span>
          </div>
        </div>
      </div>
    `);
  }

  /**
   * Ajusta la ubicación a la calle más cercana usando Snap to Road
   * y luego actualiza el marker en el mapa
   */
  private snapAndUpdateLocation(latitude: number, longitude: number, accuracy: number): void {
    console.log('[MapaComponent] 🛣️ Aplicando Snap to Road...', { latitude, longitude });

    this.isSnapping.set(true);

    // Llamar al backend para ajustar las coordenadas
    this.routingService.snapToRoad(latitude, longitude)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (snappedLocation) => {
          console.log('[MapaComponent] ✅ Ubicación ajustada:', {
            original: { latitude, longitude },
            snapped: {
              latitude: snappedLocation.latitude,
              longitude: snappedLocation.longitude
            }
          });

          // Actualizar marker con la ubicación AJUSTADA
          this.updateUserLocationMarker(
            snappedLocation.latitude,
            snappedLocation.longitude,
            accuracy
          );

          // Obtener dirección de la ubicación ajustada
          this.getCurrentAddress(snappedLocation.latitude, snappedLocation.longitude);

          this.isSnapping.set(false);
        },
        error: (err) => {
          // Si falla el snap-to-road, usar ubicación original
          console.warn('[MapaComponent] ⚠️ Snap to Road falló, usando ubicación GPS directa:', err);

          // Mostrar ubicación cruda si el backend no responde
          this.updateUserLocationMarker(latitude, longitude, accuracy);
          this.getCurrentAddress(latitude, longitude);

          this.isSnapping.set(false);
        }
      });
  }

  /**
   * Alterna el modo Snap to Road
   */
  toggleSnapToRoad(): void {
    const newValue = !this.enableSnapToRoad();
    this.enableSnapToRoad.set(newValue);

    console.log('[MapaComponent] 🔀 Snap to Road:', newValue ? 'ACTIVADO' : 'DESACTIVADO');

    // Forzar actualización inmediata con el nuevo modo
    const location = this.userLocation();
    if (location) {
      if (newValue) {
        this.snapAndUpdateLocation(location.latitude, location.longitude, location.accuracy);
      } else {
        this.updateUserLocationMarker(location.latitude, location.longitude, location.accuracy);
        this.getCurrentAddress(location.latitude, location.longitude);
      }
    }
  }

  /**
   * Carga las rutas y paradas desde el backend
   */
  private loadTransitData(): void {
    this.loading.set(true);
    this.error.set(null);

    // Cargar rutas
    this.transitService.getAllRoutes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (routes) => {
          this.renderRoutes(routes);
          // Inicializar todas las rutas como visibles
          this.mapStateService.showAllRoutes(routes.map(r => r.id));
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error al cargar rutas:', err);
          this.error.set('No se pudieron cargar las rutas. Verifica que el backend esté corriendo.');
          this.loading.set(false);
        }
      });
  }

  /**
   * Renderiza todas las rutas en el mapa con efectos premium de siguiente nivel
   */
  private renderRoutes(routes: Route[]): void {
    routes.forEach((route, routeIndex) => {
      if (route.polyline && route.polyline.length > 0) {
        // Crear sombra externa más difusa (efecto de profundidad)
        const outerShadowPolyline = L.polyline(route.polyline, {
          color: '#000000',
          weight: 11,
          opacity: 0.08,
          smoothFactor: 1,
          className: 'route-outer-shadow'
        });

        // Crear sombra principal
        const shadowPolyline = L.polyline(route.polyline, {
          color: '#000000',
          weight: 8,
          opacity: 0.2,
          smoothFactor: 1,
          className: 'route-shadow'
        });

        // Crear línea de fondo (base) con color más oscuro
        const basePolyline = L.polyline(route.polyline, {
          color: this.darkenColor(route.color, 0.3),
          weight: 6,
          opacity: 0.9,
          smoothFactor: 1,
          lineCap: 'round',
          lineJoin: 'round',
          className: `route-base route-${route.id}-base`
        });

        // Crear polyline principal con efecto de brillo
        const polyline = L.polyline(route.polyline, {
          color: route.color,
          weight: 5,
          opacity: 0.95,
          smoothFactor: 1,
          lineCap: 'round',
          lineJoin: 'round',
          className: `route-line route-${route.id}`
        });

        // Popup premium mejorado
        polyline.bindPopup(`
          <div class="premium-popup route-popup">
            <div class="popup-header">
              <div class="popup-icon" style="background: ${route.color};">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                  <path d="M3 6h18M3 12h18M3 18h18"/>
                </svg>
              </div>
              <div class="popup-title">
                <h3>${route.name}</h3>
                <span class="popup-badge" style="background: ${route.color}20; color: ${route.color};">Línea Activa</span>
              </div>
            </div>
            <div class="popup-content">
              <div class="info-grid">
                <div class="info-card">
                  <div class="info-icon">🆔</div>
                  <div class="info-details">
                    <span class="info-label">Identificador</span>
                    <span class="info-value">${route.id}</span>
                  </div>
                </div>
                <div class="info-card">
                  <div class="info-icon">📍</div>
                  <div class="info-details">
                    <span class="info-label">Puntos de Ruta</span>
                    <span class="info-value">${route.polyline.length}</span>
                  </div>
                </div>
                <div class="info-card">
                  <div class="info-icon">🚏</div>
                  <div class="info-details">
                    <span class="info-label">Paradas</span>
                    <span class="info-value">${route.stops.length}</span>
                  </div>
                </div>
              </div>
              <div class="route-color-preview">
                <span>Color de línea:</span>
                <div class="color-swatch" style="background: ${route.color};"></div>
              </div>
            </div>
            <div class="popup-actions">
              <button class="popup-btn primary" style="background: ${route.color};">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                Ver recorrido completo
              </button>
              <button class="popup-btn secondary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                Horarios
              </button>
            </div>
          </div>
        `, {
          maxWidth: 350,
          className: 'premium-popup-wrapper'
        });

        // Vincular un tooltip (texto flotante) a la ruta, inicialmente oculto
        polyline.bindTooltip(route.name, {
          permanent: false, // Lo haremos permanente solo cuando esté enfocado
          direction: 'center',
          className: 'route-label-tooltip', // Clase CSS para estilos personalizados
          offset: [0, -15]
        });

        // Eventos de interacción mejorados
        polyline.on('click', (e) => {
          this.mapStateService.setFocusedRoute(route.id);
          this.mapStateService.selectRoute(route.id);

          // Animación de selección
          const layer = e.target as L.Polyline;
          layer.setStyle({ weight: 8, opacity: 1 });
          setTimeout(() => {
            if (!this.mapStateService.isRouteFocused(route.id)) {
              layer.setStyle({ weight: 5, opacity: 0.85 });
            }
          }, 200);
        });

        polyline.on('mouseover', (e) => {
          const layer = e.target as L.Polyline;
          layer.setStyle({
            weight: 7,
            opacity: 1
          });
        });

        polyline.on('mouseout', (e) => {
          const layer = e.target as L.Polyline;
          if (!this.mapStateService.isRouteFocused(route.id)) {
            layer.setStyle({
              weight: 5,
              opacity: 0.85
            });
          }
        });

        // Animación de aparición progresiva con todas las capas
        setTimeout(() => {
          // Agregar capas en orden: sombra externa -> sombra -> base -> línea principal
          outerShadowPolyline.addTo(this.map);
          shadowPolyline.addTo(this.map);
          basePolyline.addTo(this.map);
          polyline.addTo(this.map);

          // Efecto de trazado animado mejorado
          const element = polyline.getElement() as SVGPathElement | null;
          const baseElement = basePolyline.getElement() as SVGPathElement | null;

          if (element) {
            const length = element.getTotalLength();
            element.style.strokeDasharray = `${length}`;
            element.style.strokeDashoffset = `${length}`;
            element.style.animation = `drawRoute 2.5s cubic-bezier(0.4, 0, 0.2, 1) forwards`;
            element.style.animationDelay = `${routeIndex * 150}ms`;

            // Agregar efecto de brillo
            element.style.filter = 'drop-shadow(0 0 3px ' + route.color + '40)';
          }

          if (baseElement) {
            const baseLength = baseElement.getTotalLength();
            baseElement.style.strokeDasharray = `${baseLength}`;
            baseElement.style.strokeDashoffset = `${baseLength}`;
            baseElement.style.animation = `drawRoute 2.5s cubic-bezier(0.4, 0, 0.2, 1) forwards`;
            baseElement.style.animationDelay = `${routeIndex * 150}ms`;
          }
        }, 100);

        // Guardar todas las capas de la ruta
        this.routeLayers.set(route.id, polyline);
        this.routeShadows.set(route.id, shadowPolyline);
        this.routeColors.set(route.id, route.color);

        // Guardar referencias a capas adicionales para poder manipularlas
        (polyline as any)._outerShadow = outerShadowPolyline;
        (polyline as any)._base = basePolyline;

        // Renderizar solo puntos de INICIO y FIN de esta ruta
        this.renderRouteEndpoints(route, routeIndex);
      }
    });

    // Ajustar vista para mostrar todas las rutas con animación
    if (routes.length > 0) {
      setTimeout(() => {
        const group = L.featureGroup(Array.from(this.routeLayers.values()));
        this.map.flyToBounds(group.getBounds(), {
          padding: [60, 60],
          duration: 1.5
        });
      }, 500);
    }
  }

  /**
   * Renderiza SOLO los puntos de INICIO y FIN de una ruta
   */
  private renderRouteEndpoints(route: Route, routeIndex: number): void {
    if (!route.polyline || route.polyline.length < 2) return;

    const startPoint = route.polyline[0];
    const endPoint = route.polyline[route.polyline.length - 1];
    const markers: L.Marker[] = [];

    // Crear marker de INICIO
    const startIcon = L.divIcon({
      className: 'custom-endpoint-marker start-marker',
      html: `
        <div class="marker-wrapper" style="animation-delay: ${routeIndex * 100}ms">
          <div class="marker-pin">
            <svg width="32" height="40" viewBox="0 0 32 40" fill="none">
              <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24c0-8.837-7.163-16-16-16z"
                    fill="${route.color}" filter="url(#shadow-start)"/>
              <circle cx="16" cy="16" r="8" fill="white"/>
              <text x="16" y="20" text-anchor="middle" font-size="12" font-weight="bold" fill="${route.color}">I</text>
              <defs>
                <filter id="shadow-start" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="3" stdDeviation="4" flood-opacity="0.4"/>
                </filter>
              </defs>
            </svg>
          </div>
          <div class="marker-pulse" style="background: radial-gradient(circle, ${route.color}80 0%, transparent 70%);"></div>
        </div>
      `,
      iconSize: [32, 40],
      iconAnchor: [16, 40],
      popupAnchor: [0, -40]
    });

    const startMarker = L.marker(startPoint, {
      icon: startIcon,
      riseOnHover: true,
      title: `Inicio - ${route.name}`
    });

    startMarker.bindPopup(`
      <div class="premium-popup endpoint-popup">
        <div class="popup-header">
          <div class="popup-icon" style="background: ${route.color};">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
          </div>
          <div class="popup-title">
            <h3>Punto de Inicio</h3>
            <span class="popup-badge" style="background: ${route.color}20; color: ${route.color};">${route.name}</span>
          </div>
        </div>
        <div class="popup-content">
          <div class="info-row">
            <span class="info-label">Línea:</span>
            <span class="info-value">${route.name}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Coordenadas:</span>
            <span class="info-value">${startPoint[0].toFixed(6)}, ${startPoint[1].toFixed(6)}</span>
          </div>
        </div>
        <div class="popup-actions">
          <button class="popup-btn primary" style="background: ${route.color};">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/>
            </svg>
            Ver recorrido
          </button>
        </div>
      </div>
    `, {
      maxWidth: 300,
      className: 'premium-popup-wrapper'
    });

    this.addMarkerEffects(startMarker);
    startMarker.addTo(this.map);
    markers.push(startMarker);

    // Crear marker de FIN
    const endIcon = L.divIcon({
      className: 'custom-endpoint-marker end-marker',
      html: `
        <div class="marker-wrapper" style="animation-delay: ${routeIndex * 100 + 50}ms">
          <div class="marker-pin">
            <svg width="32" height="40" viewBox="0 0 32 40" fill="none">
              <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24c0-8.837-7.163-16-16-16z"
                    fill="${route.color}" filter="url(#shadow-end)"/>
              <circle cx="16" cy="16" r="8" fill="white"/>
              <text x="16" y="20" text-anchor="middle" font-size="12" font-weight="bold" fill="${route.color}">F</text>
              <defs>
                <filter id="shadow-end" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="3" stdDeviation="4" flood-opacity="0.4"/>
                </filter>
              </defs>
            </svg>
          </div>
          <div class="marker-pulse" style="background: radial-gradient(circle, ${route.color}80 0%, transparent 70%);"></div>
        </div>
      `,
      iconSize: [32, 40],
      iconAnchor: [16, 40],
      popupAnchor: [0, -40]
    });

    const endMarker = L.marker(endPoint, {
      icon: endIcon,
      riseOnHover: true,
      title: `Fin - ${route.name}`
    });

    endMarker.bindPopup(`
      <div class="premium-popup endpoint-popup">
        <div class="popup-header">
          <div class="popup-icon" style="background: ${route.color};">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
              <circle cx="12" cy="12" r="10"/>
              <path d="M9 12l2 2 4-4"/>
            </svg>
          </div>
          <div class="popup-title">
            <h3>Punto Final</h3>
            <span class="popup-badge" style="background: ${route.color}20; color: ${route.color};">${route.name}</span>
          </div>
        </div>
        <div class="popup-content">
          <div class="info-row">
            <span class="info-label">Línea:</span>
            <span class="info-value">${route.name}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Coordenadas:</span>
            <span class="info-value">${endPoint[0].toFixed(6)}, ${endPoint[1].toFixed(6)}</span>
          </div>
        </div>
        <div class="popup-actions">
          <button class="popup-btn primary" style="background: ${route.color};">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/>
            </svg>
            Ver recorrido
          </button>
        </div>
      </div>
    `, {
      maxWidth: 300,
      className: 'premium-popup-wrapper'
    });

    this.addMarkerEffects(endMarker);
    endMarker.addTo(this.map);
    markers.push(endMarker);

    this.routeEndpointMarkers.set(route.id, markers);
  }

  /**
   * Agrega efectos de hover a un marker
   */
  private addMarkerEffects(marker: L.Marker): void {
    marker.on('mouseover', () => {
      const element = marker.getElement();
      if (element) {
        element.classList.add('marker-hover');
      }
    });

    marker.on('mouseout', () => {
      const element = marker.getElement();
      if (element) {
        element.classList.remove('marker-hover');
      }
    });
  }

  /**
   * Resalta una ruta específica y muestra su label permanentemente
   */
  private highlightRoute(routeId: string): void {
    // Resalta la ruta enfocada y atenúa las demás
    this.routeLayers.forEach((layer, id) => {
      const shadow = this.routeShadows.get(id);
      if (id === routeId) {
        // Estilo para la ruta enfocada: más gruesa y opaca
        layer.setStyle({ weight: 8, opacity: 1 });

        // MOSTRAR el tooltip permanentemente
        const tooltip = layer.getTooltip();
        if (tooltip) {
          tooltip.options.permanent = true;
          layer.openTooltip();
        }

        layer.bringToFront(); // Traer al frente
        if (shadow) shadow.bringToFront();
      } else {
        // Estilo para las rutas no enfocadas: más delgadas y semitransparentes
        layer.setStyle({ weight: 5, opacity: 0.35 });

        // OCULTAR el tooltip
        const tooltip = layer.getTooltip();
        if (tooltip) {
          tooltip.options.permanent = false;
          layer.closeTooltip();
        }
      }
    });

    // Centrar en la ruta seleccionada con animación suave
    const layer = this.routeLayers.get(routeId);
    if (layer) {
      this.map.flyToBounds(layer.getBounds(), {
        padding: [80, 80],
        duration: 1.2,
        easeLinearity: 0.5
      });
    }
  }

  /**
   * Actualiza la visibilidad de las rutas, TODAS sus capas (sombras, base, línea), puntos de inicio/fin Y BUSES asociados
   */
  private updateRouteVisibility(visibleIds: Set<string>): void {
    this.routeLayers.forEach((layer, id) => {
      const isVisible = visibleIds.has(id);
      const wasVisible = this.map.hasLayer(layer);

      // Obtener TODAS las capas de la ruta
      const shadow = this.routeShadows.get(id);
      const outerShadow = (layer as any)._outerShadow;
      const baseLayer = (layer as any)._base;

      // Mostrar/ocultar SOMBRA EXTERNA
      if (outerShadow) {
        if (isVisible) {
          if (!this.map.hasLayer(outerShadow)) {
            outerShadow.addTo(this.map);
          }
        } else {
          if (this.map.hasLayer(outerShadow)) {
            this.map.removeLayer(outerShadow);
          }
        }
      }

      // Mostrar/ocultar SOMBRA PRINCIPAL
      if (shadow) {
        if (isVisible) {
          if (!this.map.hasLayer(shadow)) {
            shadow.addTo(this.map);
          }
        } else {
          if (this.map.hasLayer(shadow)) {
            this.map.removeLayer(shadow);
          }
        }
      }

      // Mostrar/ocultar LÍNEA BASE
      if (baseLayer) {
        if (isVisible) {
          if (!this.map.hasLayer(baseLayer)) {
            baseLayer.addTo(this.map);
          }
        } else {
          if (this.map.hasLayer(baseLayer)) {
            this.map.removeLayer(baseLayer);
          }
        }
      }

      // Mostrar/ocultar la ruta PRINCIPAL con animación
      if (isVisible) {
        if (!this.map.hasLayer(layer)) {
          layer.addTo(this.map);
          // Animación de aparición
          const element = layer.getElement() as SVGPathElement | null;
          if (element) {
            element.style.opacity = '0';
            setTimeout(() => {
              element.style.transition = 'opacity 0.4s ease-in';
              element.style.opacity = '0.85';
            }, 10);
          }
        }
      } else {
        if (this.map.hasLayer(layer)) {
          // Animación de desaparición
          const element = layer.getElement() as SVGPathElement | null;
          if (element) {
            element.style.transition = 'opacity 0.3s ease-out';
            element.style.opacity = '0';
            setTimeout(() => {
              if (this.map.hasLayer(layer)) {
                this.map.removeLayer(layer);
              }
            }, 300);
          } else {
            this.map.removeLayer(layer);
          }
        }
      }

      // Mostrar/ocultar los markers de inicio/fin de esta ruta
      const endpoints = this.routeEndpointMarkers.get(id);
      if (endpoints) {
        endpoints.forEach(marker => {
          if (isVisible) {
            if (!this.map.hasLayer(marker)) {
              marker.addTo(this.map);
            }
          } else {
            if (this.map.hasLayer(marker)) {
              this.map.removeLayer(marker);
            }
          }
        });
      }

      // NUEVO: Mostrar/ocultar BUSES asociados a esta ruta
      this.busMarkers.forEach((busMarker, busId) => {
        // Obtener la ruta del bus desde el trackingService
        const activeBuses = this.trackingService.getActiveBuses();
        const busPosition = activeBuses.find(b => b.busId === busId);

        if (busPosition && busPosition.routeId === id) {
          const element = busMarker.getElement();

          if (isVisible) {
            // Mostrar el bus si la ruta se hace visible
            if (!this.map.hasLayer(busMarker)) {
              busMarker.addTo(this.map);
            }
            // Animación de aparición
            if (element) {
              element.style.transition = 'opacity 0.4s ease-in, transform 0.4s ease-out';
              element.style.opacity = '1';
              element.style.transform = 'scale(1)';
            }
          } else {
            // Ocultar el bus si la ruta se oculta
            if (element) {
              element.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
              element.style.opacity = '0';
              element.style.transform = 'scale(0.5)';

              setTimeout(() => {
                if (this.map.hasLayer(busMarker)) {
                  this.map.removeLayer(busMarker);
                }
              }, 300);
            } else {
              if (this.map.hasLayer(busMarker)) {
                this.map.removeLayer(busMarker);
              }
            }
          }
        }
      });
    });
  }

  /**
   * Inicializa el sistema de tracking en tiempo real
   * Este método es seguro y no bloqueará la aplicación si el backend no está disponible
   */
  private initTracking(): void {
    try {
      console.log('[MapaComponent] 🚀 Iniciando sistema de tracking...');

      // Conectar al WebSocket
      this.trackingService.connect();

      // Suscribirse a las posiciones de los buses
      this.trackingService.busPositions$
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (position: BusPosition) => {
            try {
              this.updateBusPosition(position);
              this.updateBusTrackingInfo();
            } catch (err) {
              console.warn('[MapaComponent] Error actualizando bus:', err);
            }
          },
          error: (err) => {
            console.warn('[MapaComponent] ⚠️ Error en stream de tracking:', err);
          }
        });

      // Suscribirse a buses que completan su recorrido
      this.trackingService.busCompleted$
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (position: BusPosition) => {
            console.log(`[MapaComponent] 🎯 Removiendo bus ${position.busId} - Recorrido completado`);
            this.removeBusWithAnimation(position.busId);
          }
        });
    } catch (err) {
      console.warn('[MapaComponent] ⚠️ No se pudo iniciar tracking:', err);

    }
  }

  /**
   * Actualiza la posición de un bus con animación suave
   */
  private updateBusPosition(position: BusPosition): void {
    const { busId, routeId, latitude, longitude, bearing, speed, progress } = position;
    const targetLatLng: L.LatLng = L.latLng(latitude, longitude);

    // Verificar si el bus ya existe
    let busMarker = this.busMarkers.get(busId);

    if (!busMarker) {

      if (!this.routeColors.has(routeId)) {
        return;
      }

      // Crear nuevo marker de bus
      const color = this.routeColors.get(routeId) || '#00B2FF';
      const icon = createBusIcon(color, 40);

      // 'as any' para pasar la opción de rotación que añade el plugin
      const markerOptions: L.MarkerOptions & { rotationAngle?: number } = {
        icon,
        title: `Bus ${busId} - Línea ${routeId}`,
        zIndexOffset: 1000, // Siempre por encima de otros markers
        rotationAngle: bearing
      };

      busMarker = L.marker(targetLatLng, markerOptions);

      // Popup para el bus
      busMarker.bindPopup(`
        <div class="premium-popup bus-popup">
          <div class="popup-header">
            <div class="popup-icon" style="background: ${color};">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
                <rect x="5" y="11" width="14" height="12" rx="2" ry="2"/>
                <path d="M5 11V6a2 2 0 012-2h10a2 2 0 012 2v5"/>
                <circle cx="9" cy="19" r="1"/>
                <circle cx="15" cy="19" r="1"/>
              </svg>
            </div>
            <div class="popup-title">
              <h3>Bus en Tránsito</h3>
              <span class="popup-badge" style="background: ${color}20; color: ${color};">Línea ${routeId}</span>
            </div>
          </div>
          <div class="popup-content">
            <div class="info-row">
              <span class="info-label">Velocidad:</span>
              <span class="info-value" style="color: #00D964;">${speed.toFixed(1)} km/h</span>
            </div>
            <div class="info-row">
              <span class="info-label">Progreso:</span>
              <div class="progress-bar-container">
                <div class="progress-bar" style="width: ${progress}%; background: ${color};"></div>
              </div>
              <span class="progress-value">${progress}%</span>
            </div>
            <div class="info-row">
              <span class="info-label">Última act:</span>
              <span class="info-value">${new Date(position.timestamp).toLocaleTimeString()}</span>
            </div>
          </div>
          <div class="popup-actions">
            <button class="popup-btn primary" style="background: ${color};">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              Seguir bus
            </button>
          </div>
        </div>
      `, {
        maxWidth: 300,
        className: 'premium-popup-wrapper'
      });

      busMarker.addTo(this.map);
      this.busMarkers.set(busId, busMarker);

      console.log(`[MapaComponent] ✅ Nuevo bus ${busId} creado para ruta ${routeId}`);
    } else {
      // Animar movimiento suave del marker existente
      this.animateBusMovement(busMarker, targetLatLng, bearing);
    }
  }

  /**
   * Anima el movimiento suave del bus, interpolando posición y rotación.
   */
  private animateBusMovement(marker: L.Marker, targetLatLng: L.LatLng, targetBearing: number): void {
    const currentLatLng = marker.getLatLng();
    const duration = 1800; // ms
    const startTime = Date.now();

    // Cancelar animación previa si existe
    const markerAny = marker as any;
    if (markerAny._animationFrame) {
      cancelAnimationFrame(markerAny._animationFrame);
    }

    // Función de easing suave
    const easeInOutCubic = (t: number): number => {
      return t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    // --- CÁLCULO DE ROTACIÓN INTELIGENTE ---
    const currentBearing = (marker as any).getRotationAngle ? (marker as any).getRotationAngle() : targetBearing;
    let bearingDiff = targetBearing - currentBearing;
    if (bearingDiff > 180) bearingDiff -= 360;
    if (bearingDiff < -180) bearingDiff += 360;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeInOutCubic(progress);

      // Interpolar posición
      const lat = currentLatLng.lat + (targetLatLng.lat - currentLatLng.lat) * eased;
      const lng = currentLatLng.lng + (targetLatLng.lng - currentLatLng.lng) * eased;

      marker.setLatLng([lat, lng]);

      // Interpolar la rotación suavemente
      const newBearing = currentBearing + (bearingDiff * eased);
      (marker as any).setRotationAngle(newBearing);

      if (progress < 1) {
        markerAny._animationFrame = requestAnimationFrame(animate);
      } else {
        delete markerAny._animationFrame;
      }
    };

    animate();
  }

  /**
   * Inyecta los estilos CSS para los markers de bus
   */
  private injectBusMarkerStyles(): void {
    const styleId = 'bus-marker-styles';

    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = getBusMarkerStyles();
      document.head.appendChild(style);
    }
  }

  /**
   * Remueve un bus con animación de desaparición
   */
  private removeBusWithAnimation(busId: string): void {
    const marker = this.busMarkers.get(busId);

    if (!marker) {
      console.warn(`[MapaComponent] No se encontró marker para bus ${busId}`);
      return;
    }

    // Cancelar cualquier animación en progreso
    const markerAny = marker as any;
    if (markerAny._animationFrame) {
      cancelAnimationFrame(markerAny._animationFrame);
    }

    // Obtener el elemento del marker
    const element = marker.getElement();
    if (element) {
      // Agregar clase de animación de desaparición
      element.style.transition = 'all 1.5s cubic-bezier(0.4, 0, 0.2, 1)';
      element.style.transform = 'scale(0) translateY(-50px)';
      element.style.opacity = '0';

      console.log(`[MapaComponent] ✨ Animando desaparición del bus ${busId}`);
    }

    // Remover el marker del mapa después de la animación
    setTimeout(() => {
      if (this.map.hasLayer(marker)) {
        this.map.removeLayer(marker);
      }
      this.busMarkers.delete(busId);
      console.log(`[MapaComponent] ✅ Bus ${busId} removido del mapa`);

      // Actualizar información de tracking
      this.updateBusTrackingInfo();
    }, 1600);
  }

  /**
   * Actualiza la información de tracking de buses para el panel
   */
  private updateBusTrackingInfo(): void {
    const activeBuses = this.trackingService.getActiveBuses();

    const trackingInfo: BusTrackingInfo[] = activeBuses.map(busPos => {
      const routeColor = this.routeColors.get(busPos.routeId) || '#00B2FF';
      const routeName = `Línea ${busPos.routeId}`; // TODO: Obtener nombre real de la ruta

      return {
        busPosition: busPos,
        routeName,
        routeColor,
        isActive: busPos.progress < 100,
        isNearby: false // TODO: Calcular distancia al usuario
      };
    });

    this.busTrackingInfo.set(trackingInfo);
  }

  /**
   * Alterna la visibilidad del panel de sugerencia de rutas
   */
  toggleRouteSuggestionPanel(): void {
    this.showRouteSuggestionPanel.update(v => !v);
    console.log('[MapaComponent] 📍 Panel de sugerencia de rutas:', this.showRouteSuggestionPanel() ? 'ABIERTO' : 'CERRADO');
  }

  /**
   * Alterna la visibilidad del panel de buses (legacy)
   */
  toggleBusPanel(): void {
    this.showBusPanel.update(v => !v);
  }

  /**
   * Obtiene el icono según el nivel de ocupación
   */
  getOccupancyIcon(level?: OccupancyLevel): string {
    switch (level) {
      case OccupancyLevel.EMPTY: return '🟢'; // Verde
      case OccupancyLevel.AVAILABLE: return '🟡'; // Amarillo
      case OccupancyLevel.CROWDED: return '🟠'; // Naranja
      case OccupancyLevel.FULL: return '🔴'; // Rojo
      default: return '⚪'; // Blanco (desconocido)
    }
  }

  /**
   * Obtiene la etiqueta de ocupación
   */
  getOccupancyLabel(level?: OccupancyLevel): string {
    switch (level) {
      case OccupancyLevel.EMPTY: return 'Vacío';
      case OccupancyLevel.AVAILABLE: return 'Disponible';
      case OccupancyLevel.CROWDED: return 'Lleno';
      case OccupancyLevel.FULL: return 'Completo';
      default: return 'Desconocido';
    }
  }

  /**
   * Oscurece un color hexadecimal
   */
  private darkenColor(color: string, amount: number): string {
    // Eliminar # si existe
    color = color.replace('#', '');

    // Convertir a RGB
    const num = parseInt(color, 16);
    let r = (num >> 16) - Math.round(255 * amount);
    let g = ((num >> 8) & 0x00FF) - Math.round(255 * amount);
    let b = (num & 0x0000FF) - Math.round(255 * amount);

    // Asegurar que los valores estén en el rango 0-255
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));

    // Convertir de vuelta a hexadecimal
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  }

  /**
   * Muestra la ruta sugerida en el mapa con toda la navegación
   * - Usa walkingPaths del backend para trazados inteligentes
   * - Oculta todas las rutas excepto la seleccionada
   * - Marca claramente el destino final
   */
  showSuggestedRoute(suggestion: any, destinationLat: number, destinationLon: number): void {
    console.log('[MapaComponent] 🗺️ Mostrando ruta sugerida:', suggestion);

    // Limpiar ruta anterior
    this.clearSuggestedRoute();

    // NUEVO: Guardar rutas visibles actuales para restaurarlas después
    this.previousVisibleRoutes = Array.from(this.mapStateService.visibleRouteIds());
    
    // Ocultar todas las rutas EXCEPTO la ruta seleccionada
    console.log('[MapaComponent] 👁️ Ocultando todas las rutas excepto:', suggestion.routeId);
    // Mostrar solo la ruta seleccionada usando showAllRoutes con un array de un solo elemento
    this.mapStateService.showAllRoutes([suggestion.routeId]);
    this.mapStateService.setFocusedRoute(suggestion.routeId);

    // Obtener ubicación actual del usuario
    const userLoc = this.userLocation();
    if (!userLoc) {
      console.warn('[MapaComponent] ⚠️ No hay ubicación del usuario');
      return;
    }

    // Crear grupo de capas para la ruta sugerida
    this.suggestedRouteGroup = L.layerGroup().addTo(this.map);

    const userLatLng: L.LatLng = L.latLng(userLoc.latitude, userLoc.longitude);
    const destinationLatLng: L.LatLng = L.latLng(destinationLat, destinationLon);

    // 1. MARCADOR DEL DESTINO (más grande y llamativo)
    const destinationIcon = L.divIcon({
      html: `
        <div class="destination-marker-wrapper" style="animation: bounceIn 0.6s ease-out;">
          <div class="destination-marker-pin" style="background: #e74c3c; box-shadow: 0 8px 24px rgba(231, 76, 60, 0.5);">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white" stroke="none">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>
          <div class="destination-marker-pulse" style="background: radial-gradient(circle, rgba(231, 76, 60, 0.6) 0%, transparent 70%);"></div>
        </div>
      `,
      className: 'destination-marker',
      iconSize: [50, 60],
      iconAnchor: [25, 60],
      popupAnchor: [0, -60]
    });

    this.destinationMarker = L.marker(destinationLatLng, { 
      icon: destinationIcon,
      riseOnHover: true,
      zIndexOffset: 2000
    })
      .bindPopup(`
        <div class="premium-popup destination-popup">
          <div class="popup-header">
            <div class="popup-icon" style="background: #e74c3c;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="none">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
            <div class="popup-title">
              <h3>🎯 Tu Destino</h3>
              <span class="popup-badge" style="background: #e74c3c20; color: #e74c3c;">Destino Final</span>
            </div>
          </div>
          <div class="popup-content">
            <div class="info-row">
              <span class="info-label">Coordenadas:</span>
              <span class="info-value">${destinationLat.toFixed(6)}, ${destinationLon.toFixed(6)}</span>
            </div>
          </div>
        </div>
      `, {
        maxWidth: 300,
        className: 'premium-popup-wrapper'
      })
      .addTo(this.suggestedRouteGroup);

    // Array para calcular los límites del mapa
    const bounds: L.LatLng[] = [userLatLng, destinationLatLng];

    // NUEVO: Si el backend envió walkingPaths, usarlos (más inteligente)
    if (suggestion.walkingPaths && suggestion.walkingPaths.length > 0 && this.suggestedRouteGroup) {
      console.log('[MapaComponent] 🧠 Usando trazados inteligentes del backend');
      
      suggestion.walkingPaths.forEach((path: any) => {
        // Convertir coordenadas del formato backend [[lat, lon], ...] a formato Leaflet
        const leafletCoords: L.LatLng[] = path.coordinates.map((coord: [number, number]) => 
          L.latLng(coord[0], coord[1])
        );
        
        // Agregar todas las coordenadas a los límites
        leafletCoords.forEach(coord => bounds.push(coord));
        
        // Dibujar el trazado con el color y estilo del backend
        const walkingLine = L.polyline(leafletCoords, {
          color: path.color,
          weight: 5,
          opacity: 0.85,
          dashArray: path.type === 'USER_TO_STOP' || path.type === 'STOP_TO_DESTINATION' ? '10, 10' : undefined,
          lineCap: 'round',
          lineJoin: 'round'
        });
        
        if (this.suggestedRouteGroup) {
          walkingLine.addTo(this.suggestedRouteGroup);
        }
        
        // Agregar tooltip con información del trazado
        walkingLine.bindTooltip(`
          <div style="text-align: center;">
            <strong>${path.description}</strong><br>
            <small>📏 ${path.distance.toFixed(0)}m • ⏱️ ${path.estimatedWalkingTime} min</small>
          </div>
        `, {
          sticky: true,
          direction: 'top',
          className: 'walking-path-tooltip'
        });
        
        // Agregar sombra para mejor visibilidad
        const shadowLine = L.polyline(leafletCoords, {
          color: '#000000',
          weight: 7,
          opacity: 0.2,
          dashArray: path.type === 'USER_TO_STOP' || path.type === 'STOP_TO_DESTINATION' ? '10, 10' : undefined,
          lineCap: 'round'
        });
        
        if (this.suggestedRouteGroup) {
          shadowLine.addTo(this.suggestedRouteGroup);
        }
      });
    } else if (suggestion.boardingStop && this.suggestedRouteGroup) {
      // FALLBACK: Si no hay walkingPaths, usar OSRM para calcular rutas por las calles
      console.log('[MapaComponent] 🗺️ Backend no envió walkingPaths, calculando con OSRM...');
      
      const boardingLatLng = L.latLng(suggestion.boardingStop.latitude, suggestion.boardingStop.longitude);
      bounds.push(boardingLatLng);
      
      // Ruta 1: Usuario → Parada de subida (usando OSRM)
      this.routingService.calculateWalkingRoute(
        userLoc.latitude,
        userLoc.longitude,
        suggestion.boardingStop.latitude,
        suggestion.boardingStop.longitude
      ).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (osrmResponse) => {
          if (osrmResponse.code === 'Ok' && osrmResponse.routes.length > 0) {
            const route = osrmResponse.routes[0];
            // Convertir coordenadas OSRM [lon, lat] a Leaflet [lat, lon]
            const coords = this.routingService.convertOSRMCoordinatesToLatLng(route.geometry.coordinates);
            
            coords.forEach(coord => bounds.push(L.latLng(coord[0], coord[1])));
            
            const walkingLine = L.polyline(coords, {
              color: '#4A90E2',  // Azul para caminata
              weight: 5,
              opacity: 0.85,
              dashArray: '10, 10',
              lineCap: 'round',
              lineJoin: 'round'
            });
            
            if (this.suggestedRouteGroup) {
              walkingLine.addTo(this.suggestedRouteGroup);
              
              walkingLine.bindTooltip(`
                <div style="text-align: center;">
                  <strong>Camina hasta la parada</strong><br>
                  <small>📏 ${route.distance.toFixed(0)}m • ⏱️ ${Math.ceil(route.duration / 60)} min</small>
                </div>
              `, {
                sticky: true,
                direction: 'top',
                className: 'walking-path-tooltip'
              });
              
              // Sombra
              L.polyline(coords, {
                color: '#000000',
                weight: 7,
                opacity: 0.2,
                dashArray: '10, 10',
                lineCap: 'round'
              }).addTo(this.suggestedRouteGroup);
            }
          }
        },
        error: (err) => console.warn('[MapaComponent] ⚠️ Error calculando ruta con OSRM:', err)
      });
      
      // Ruta 2: Parada de bajada → Destino (si existe parada de bajada)
      if (suggestion.alightingStop) {
        const alightingLatLng = L.latLng(suggestion.alightingStop.latitude, suggestion.alightingStop.longitude);
        bounds.push(alightingLatLng);
        
        this.routingService.calculateWalkingRoute(
          suggestion.alightingStop.latitude,
          suggestion.alightingStop.longitude,
          destinationLat,
          destinationLon
        ).pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (osrmResponse) => {
            if (osrmResponse.code === 'Ok' && osrmResponse.routes.length > 0) {
              const route = osrmResponse.routes[0];
              const coords = this.routingService.convertOSRMCoordinatesToLatLng(route.geometry.coordinates);
              
              coords.forEach(coord => bounds.push(L.latLng(coord[0], coord[1])));
              
              const walkingLine = L.polyline(coords, {
                color: '#50C878',  // Verde para caminata final
                weight: 5,
                opacity: 0.85,
                dashArray: '10, 10',
                lineCap: 'round',
                lineJoin: 'round'
              });
              
              if (this.suggestedRouteGroup) {
                walkingLine.addTo(this.suggestedRouteGroup);
                
                walkingLine.bindTooltip(`
                  <div style="text-align: center;">
                    <strong>Camina hasta tu destino</strong><br>
                    <small>📏 ${route.distance.toFixed(0)}m • ⏱️ ${Math.ceil(route.duration / 60)} min</small>
                  </div>
                `, {
                  sticky: true,
                  direction: 'top',
                  className: 'walking-path-tooltip'
                });
                
                // Sombra
                L.polyline(coords, {
                  color: '#000000',
                  weight: 7,
                  opacity: 0.2,
                  dashArray: '10, 10',
                  lineCap: 'round'
                }).addTo(this.suggestedRouteGroup);
              }
              
              // Ajustar el mapa después de ambas rutas
              if (bounds.length > 0) {
                const boundsLatLngBounds = L.latLngBounds(bounds);
                this.map.fitBounds(boundsLatLngBounds, {
                  padding: [60, 60],
                  maxZoom: 15,
                  animate: true,
                  duration: 1
                });
              }
            }
          },
          error: (err) => console.warn('[MapaComponent] ⚠️ Error calculando ruta con OSRM:', err)
        });
      }
    }

    // 2. MARCADORES DE PARADAS
    if (suggestion.boardingStop) {
      const boardingStopLatLng: L.LatLng = L.latLng(
        suggestion.boardingStop.latitude,
        suggestion.boardingStop.longitude
      );
      bounds.push(boardingStopLatLng);

      // Marcador de parada de subida (más grande y visible)
      const boardingStopIcon = L.divIcon({
        html: `
          <div class="boarding-stop-marker" style="background: ${suggestion.routeColor}; box-shadow: 0 6px 20px rgba(0,0,0,0.3); animation: scaleIn 0.5s ease-out;">
            <span style="color: white; font-size: 22px;">🚏</span>
          </div>
        `,
        className: 'custom-stop-marker',
        iconSize: [44, 44],
        iconAnchor: [22, 22],
        popupAnchor: [0, -22]
      });

      L.marker(boardingStopLatLng, { 
        icon: boardingStopIcon,
        riseOnHover: true,
        zIndexOffset: 1500
      })
        .bindPopup(`
          <div class="premium-popup stop-popup">
            <div class="popup-header">
              <div class="popup-icon" style="background: ${suggestion.routeColor};">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="none">
                  <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
                </svg>
              </div>
              <div class="popup-title">
                <h3>🚏 Parada de Subida</h3>
                <span class="popup-badge" style="background: ${suggestion.routeColor}20; color: ${suggestion.routeColor};">Línea ${suggestion.routeId}</span>
              </div>
            </div>
            <div class="popup-content">
              <div class="info-row">
                <span class="info-label">Parada:</span>
                <span class="info-value">${suggestion.boardingStop.name}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Distancia:</span>
                <span class="info-value">${suggestion.walkingDistanceToStop.toFixed(0)}m (${suggestion.walkingTimeToStop} min a pie)</span>
              </div>
            </div>
          </div>
        `, {
          maxWidth: 320,
          className: 'premium-popup-wrapper'
        })
        .addTo(this.suggestedRouteGroup);

      // 3. PARADA DE BAJADA
      if (suggestion.alightingStop) {
        const alightingStopLatLng: L.LatLng = L.latLng(
          suggestion.alightingStop.latitude,
          suggestion.alightingStop.longitude
        );
        bounds.push(alightingStopLatLng);

        // Marcador de parada de bajada (más grande y visible)
        const alightingStopIcon = L.divIcon({
          html: `
            <div class="alighting-stop-marker" style="background: ${suggestion.routeColor}; box-shadow: 0 6px 20px rgba(0,0,0,0.3); animation: scaleIn 0.6s ease-out;">
              <span style="color: white; font-size: 22px;">🏁</span>
            </div>
          `,
          className: 'custom-stop-marker',
          iconSize: [44, 44],
          iconAnchor: [22, 22],
          popupAnchor: [0, -22]
        });

        L.marker(alightingStopLatLng, { 
          icon: alightingStopIcon,
          riseOnHover: true,
          zIndexOffset: 1500
        })
          .bindPopup(`
            <div class="premium-popup stop-popup">
              <div class="popup-header">
                <div class="popup-icon" style="background: ${suggestion.routeColor};">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="none">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                </div>
                <div class="popup-title">
                  <h3>🏁 Parada de Bajada</h3>
                  <span class="popup-badge" style="background: ${suggestion.routeColor}20; color: ${suggestion.routeColor};">Línea ${suggestion.routeId}</span>
                </div>
              </div>
              <div class="popup-content">
                <div class="info-row">
                  <span class="info-label">Parada:</span>
                  <span class="info-value">${suggestion.alightingStop.name}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Tiempo en bus:</span>
                  <span class="info-value">${suggestion.estimatedTravelTime} min (${suggestion.numberOfStops} paradas)</span>
                </div>
              </div>
            </div>
          `, {
            maxWidth: 320,
            className: 'premium-popup-wrapper'
          })
          .addTo(this.suggestedRouteGroup);
      }
    }

    // Ajustar el mapa para mostrar toda la ruta
    if (bounds.length > 0) {
      const boundsLatLngBounds = L.latLngBounds(bounds);
      this.map.fitBounds(boundsLatLngBounds, {
        padding: [60, 60],
        maxZoom: 15,
        animate: true,
        duration: 1
      });
    }

    console.log('[MapaComponent] ✅ Ruta sugerida mostrada en el mapa');
  }

  /**
   * Limpia la ruta sugerida del mapa y restaura las rutas visibles
   */
  clearSuggestedRoute(): void {
    if (this.suggestedRouteGroup) {
      this.map.removeLayer(this.suggestedRouteGroup);
      this.suggestedRouteGroup = null;
    }

    if (this.destinationMarker) {
      this.destinationMarker = null;
    }

    // Restaurar las rutas que estaban visibles antes de la sugerencia
    if (this.previousVisibleRoutes.length > 0) {
      console.log('[MapaComponent] 🔄 Restaurando rutas visibles:', this.previousVisibleRoutes);
      this.mapStateService.showAllRoutes(this.previousVisibleRoutes);
      this.previousVisibleRoutes = [];
    }

    // Limpiar el enfoque
    this.mapStateService.setFocusedRoute(null);

    console.log('[MapaComponent] 🧹 Ruta sugerida limpiada del mapa');
  }

  /**
   * Maneja el evento cuando el usuario presiona "Ver en el mapa"
   */
  onShowRouteOnMap(event: { suggestion: any; destination: { latitude: number; longitude: number } }): void {
    console.log('[MapaComponent] 📍 Recibiendo solicitud para mostrar ruta:', event);
    
    // Mostrar la ruta en el mapa
    this.showSuggestedRoute(event.suggestion, event.destination.latitude, event.destination.longitude);
    
    // Cerrar el panel de sugerencias para que se vea mejor el mapa
    this.showRouteSuggestionPanel.set(false);
  }
}
