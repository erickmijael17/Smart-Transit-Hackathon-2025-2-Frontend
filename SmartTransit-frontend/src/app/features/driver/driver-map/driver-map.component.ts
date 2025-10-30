import { Component, OnInit, OnDestroy, inject, effect, signal, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { TransitService } from '../../../core/services/transit.service';
import { UserLocationService, UserLocation } from '../../../core/services/user-location.service';
import { Route } from '../../../core/models/route.model';
import { Subject, takeUntil } from 'rxjs';
import { createDriverBusIcon, getDriverBusMarkerStyles } from '../../../core/utils/driver-bus-icon.util';
import 'leaflet-rotatedmarker';

@Component({
  selector: 'app-driver-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './driver-map.component.html',
  styleUrl: './driver-map.component.scss'
})
export class DriverMapComponent implements OnInit, OnDestroy {
  private readonly transitService = inject(TransitService);
  private readonly userLocationService = inject(UserLocationService);
  private readonly destroy$ = new Subject<void>();

  @Input() routeId: string | null | undefined = null;
  @Input() busId: string | null | undefined = null;

  private map!: L.Map;
  private routeLayer: L.Polyline | null = null;
  private routeShadow: L.Polyline | null = null;
  private driverBusMarker: L.Marker | null = null;
  private routeData: Route | null = null;
  private routeColor = '#667eea';

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly userLocation = this.userLocationService.currentLocation;

  constructor() {
    // Effect para actualizar la ubicación del conductor en tiempo real
    effect(() => {
      const location = this.userLocation();
      if (location && this.map) {
        this.updateDriverBusPosition(location);
      }
    });

    this.injectDriverBusMarkerStyles();
  }

  ngOnInit(): void {
    if (!this.routeId) {
      this.error.set('No se ha asignado una ruta');
      return;
    }

    this.initMap();
    this.loadDriverRoute();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.driverBusMarker) {
      const markerAny = this.driverBusMarker as any;
      if (markerAny._animationFrame) {
        cancelAnimationFrame(markerAny._animationFrame);
      }
    }

    if (this.map) {
      this.map.remove();
    }
  }

  /**
   * Inyecta los estilos CSS para los markers de bus del conductor
   */
  private injectDriverBusMarkerStyles(): void {
    const styleId = 'driver-bus-marker-styles';

    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = getDriverBusMarkerStyles();
      document.head.appendChild(style);
    }
  }

  /**
   * Inicializa el mapa
   */
  private initMap(): void {
    const mapContainer = document.getElementById('driver-map');
    if (!mapContainer) {
      console.error('[DriverMap] No se encontró el contenedor #driver-map');
      this.error.set('Error al inicializar el mapa');
      return;
    }

    try {
      // Coordenadas iniciales (se ajustarán cuando se cargue la ruta)
      const center: [number, number] = [-15.49, -70.13];

      this.map = L.map('driver-map', {
        center,
        zoom: 15,
        zoomControl: true,
        attributionControl: true,
        zoomAnimation: true,
        fadeAnimation: true
      });

      // Capa base
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(this.map);

      // Capa de labels
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 20,
        pane: 'shadowPane'
      }).addTo(this.map);

      // Control de escala
      L.control.scale({
        position: 'bottomleft',
        metric: true,
        imperial: false
      }).addTo(this.map);

      // Configurar ícono por defecto de Leaflet
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });
    } catch (err) {
      console.error('[DriverMap] ❌ Error creando mapa:', err);
      this.error.set('Error al inicializar el mapa');
    }
  }

  /**
   * Carga la ruta del conductor
   */
  private loadDriverRoute(): void {
    if (!this.routeId) return;

    this.loading.set(true);
    this.error.set(null);

    this.transitService.getAllRoutes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (routes) => {
          const route = routes.find(r => r.id === this.routeId);
          
          if (!route) {
            this.error.set(`No se encontró la ruta ${this.routeId}`);
            this.loading.set(false);
            return;
          }

          this.routeData = route;
          this.routeColor = route.color;
          this.renderDriverRoute(route);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('[DriverMap] Error al cargar ruta:', err);
          this.error.set('Error al cargar tu ruta');
          this.loading.set(false);
        }
      });
  }

  /**
   * Renderiza solo la ruta del conductor con efectos mejorados
   */
  private renderDriverRoute(route: Route): void {
    if (!route.polyline || route.polyline.length === 0) {
      this.error.set('La ruta no tiene datos de trayecto');
      return;
    }

    // Limpiar ruta anterior si existe
    if (this.routeLayer) {
      this.map.removeLayer(this.routeLayer);
    }
    if (this.routeShadow) {
      this.map.removeLayer(this.routeShadow);
    }

    // Capa 1: Sombra externa (más difusa)
    L.polyline(route.polyline, {
      color: '#000000',
      weight: 14,
      opacity: 0.15,
      smoothFactor: 1.5,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(this.map);

    // Capa 2: Sombra interna
    this.routeShadow = L.polyline(route.polyline, {
      color: '#000000',
      weight: 10,
      opacity: 0.25,
      smoothFactor: 1.2,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(this.map);

    // Capa 3: Borde exterior (efecto de profundidad)
    L.polyline(route.polyline, {
      color: this.darkenColor(route.color, 30),
      weight: 8,
      opacity: 0.8,
      smoothFactor: 1,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(this.map);

    // Capa 4: Línea principal de la ruta (más gruesa y vibrante)
    this.routeLayer = L.polyline(route.polyline, {
      color: route.color,
      weight: 6,
      opacity: 1,
      smoothFactor: 1,
      lineCap: 'round',
      lineJoin: 'round',
      className: `driver-route-line route-${route.id}`
    }).addTo(this.map);

    // Capa 5: Línea de brillo interior (efecto de luz)
    const glowLine = L.polyline(route.polyline, {
      color: this.lightenColor(route.color, 40),
      weight: 3,
      opacity: 0.6,
      smoothFactor: 1,
      lineCap: 'round',
      lineJoin: 'round',
      className: `driver-route-glow route-${route.id}`
    }).addTo(this.map);

    // Capa 6: Línea animada con puntos en movimiento (efecto dinámico)
    const animatedLine = L.polyline(route.polyline, {
      color: '#FFFFFF',
      weight: 2,
      opacity: 0.8,
      smoothFactor: 1,
      dashArray: '10, 20',
      lineCap: 'round',
      lineJoin: 'round',
      className: `driver-route-animated route-${route.id}`
    }).addTo(this.map);

    // Animar los dashes
    const animatedElement = animatedLine.getElement() as SVGPathElement | null;
    if (animatedElement) {
      animatedElement.style.animation = 'dashMove 20s linear infinite';
    }

    // Animación de trazado con efecto más suave
    const element = this.routeLayer.getElement() as SVGPathElement | null;
    if (element) {
      const length = element.getTotalLength();
      element.style.strokeDasharray = `${length}`;
      element.style.strokeDashoffset = `${length}`;
      element.style.animation = `drawRoute 2.5s cubic-bezier(0.4, 0, 0.2, 1) forwards`;
      
      // Añadir efecto de pulso después del trazado
      setTimeout(() => {
        element.style.filter = 'drop-shadow(0 0 8px ' + route.color + ')';
      }, 2500);
    }

    // Ajustar vista a la ruta completa
    const bounds = this.routeLayer.getBounds();
    this.map.fitBounds(bounds, {
      padding: [80, 80],
      duration: 1.8,
      easeLinearity: 0.3
    });

    // Renderizar paradas
    this.renderRouteStops(route);

    console.log('[DriverMap] ✅ Ruta del conductor renderizada:', route.name);
  }

  /**
   * Oscurece un color hexadecimal
   */
  private darkenColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (num >> 16) - Math.round((num >> 16) * percent / 100));
    const g = Math.max(0, ((num >> 8) & 0x00FF) - Math.round(((num >> 8) & 0x00FF) * percent / 100));
    const b = Math.max(0, (num & 0x0000FF) - Math.round((num & 0x0000FF) * percent / 100));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }

  /**
   * Aclara un color hexadecimal
   */
  private lightenColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, (num >> 16) + Math.round((255 - (num >> 16)) * percent / 100));
    const g = Math.min(255, ((num >> 8) & 0x00FF) + Math.round((255 - ((num >> 8) & 0x00FF)) * percent / 100));
    const b = Math.min(255, (num & 0x0000FF) + Math.round((255 - (num & 0x0000FF)) * percent / 100));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }

  /**
   * Renderiza solo las paradas de inicio y final de la ruta
   */
  private renderRouteStops(route: Route): void {
    if (route.stops.length === 0) return;

    // Parada de inicio
    const firstStop = route.stops[0];
    const startIcon = L.divIcon({
      className: 'driver-stop-marker start',
      html: `
        <div class="stop-marker-wrapper start">
          <div class="stop-icon-large">🏁</div>
          <div class="stop-label">Inicio</div>
        </div>
      `,
      iconSize: [48, 60],
      iconAnchor: [24, 60]
    });

    L.marker([firstStop.latitude, firstStop.longitude], {
      icon: startIcon,
      zIndexOffset: 1000
    })
      .bindPopup(`
        <div class="driver-stop-popup">
          <h3>🏁 Inicio de Ruta</h3>
          <p><strong>${firstStop.name}</strong></p>
          <p class="stop-type">Punto de partida</p>
        </div>
      `)
      .addTo(this.map);

    // Parada final (si existe)
    if (route.stops.length > 1) {
      const lastStop = route.stops[route.stops.length - 1];
      const endIcon = L.divIcon({
        className: 'driver-stop-marker end',
        html: `
          <div class="stop-marker-wrapper end">
            <div class="stop-icon-large">🎯</div>
            <div class="stop-label">Final</div>
          </div>
        `,
        iconSize: [48, 60],
        iconAnchor: [24, 60]
      });

      L.marker([lastStop.latitude, lastStop.longitude], {
        icon: endIcon,
        zIndexOffset: 1000
      })
        .bindPopup(`
          <div class="driver-stop-popup">
            <h3>🎯 Final de Ruta</h3>
            <p><strong>${lastStop.name}</strong></p>
            <p class="stop-type">Punto de llegada</p>
          </div>
        `)
        .addTo(this.map);
    }
  }

  /**
   * Actualiza la posición del bus del conductor en tiempo real
   */
  private updateDriverBusPosition(location: UserLocation): void {
    if (!this.map) return;

    const latLng: L.LatLng = L.latLng(location.latitude, location.longitude);

    if (!this.driverBusMarker) {
      // Crear marker del bus del conductor
      const icon = createDriverBusIcon(this.routeColor, 50);
      
      const markerOptions: L.MarkerOptions & { rotationAngle?: number } = {
        icon,
        title: `Tu ubicación - Bus ${this.busId || 'N/A'}`,
        zIndexOffset: 2000,
        rotationAngle: location.heading || 0
      };

      this.driverBusMarker = L.marker(latLng, markerOptions)
        .bindPopup(`
          <div class="driver-bus-popup">
            <h3>🚌 Tu Bus</h3>
            <p><strong>Bus:</strong> ${this.busId || 'N/A'}</p>
            <p><strong>Ruta:</strong> ${this.routeData?.name || 'N/A'}</p>
            <p><strong>Velocidad:</strong> ${location.speed ? (location.speed * 3.6).toFixed(1) : '0'} km/h</p>
            <p><strong>Precisión:</strong> ${location.accuracy.toFixed(0)} m</p>
          </div>
        `)
        .addTo(this.map);

      // Centrar mapa en el bus
      this.map.flyTo(latLng, 17, {
        duration: 1.5
      });
    } else {
      // Animar movimiento del marker
      this.animateBusMovement(this.driverBusMarker, latLng, location.heading || 0);
      
      // Mantener el mapa centrado en el bus (modo navegación)
      this.map.setView(latLng, this.map.getZoom(), {
        animate: true,
        duration: 1
      });
    }
  }

  /**
   * Anima el movimiento suave del bus
   */
  private animateBusMovement(marker: L.Marker, targetLatLng: L.LatLng, targetBearing: number): void {
    const currentLatLng = marker.getLatLng();
    const duration = 1500;
    const startTime = Date.now();

    const markerAny = marker as any;
    if (markerAny._animationFrame) {
      cancelAnimationFrame(markerAny._animationFrame);
    }

    const easeInOutCubic = (t: number): number => {
      return t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    const currentBearing = markerAny.getRotationAngle ? markerAny.getRotationAngle() : targetBearing;
    let bearingDiff = targetBearing - currentBearing;
    if (bearingDiff > 180) bearingDiff -= 360;
    if (bearingDiff < -180) bearingDiff += 360;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeInOutCubic(progress);

      const lat = currentLatLng.lat + (targetLatLng.lat - currentLatLng.lat) * eased;
      const lng = currentLatLng.lng + (targetLatLng.lng - currentLatLng.lng) * eased;

      marker.setLatLng([lat, lng]);

      const newBearing = currentBearing + (bearingDiff * eased);
      if (markerAny.setRotationAngle) {
        markerAny.setRotationAngle(newBearing);
      }

      if (progress < 1) {
        markerAny._animationFrame = requestAnimationFrame(animate);
      } else {
        delete markerAny._animationFrame;
      }
    };

    animate();
  }
}


