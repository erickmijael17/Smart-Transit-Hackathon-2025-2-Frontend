import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UserLocationService, UserLocation } from '../../core/services/user-location.service';
import { TrackingService } from '../../core/services/tracking.service';
import { HttpClient } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';
import { OccupancyLevel } from '../../core/models/tracking.model';
import { DriverMapComponent } from './driver-map/driver-map.component';
import { TransitService } from '../../core/services/transit.service';
import { Route } from '../../core/models/route.model';

interface OccupancyLevelOption {
  value: OccupancyLevel;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-driver-view',
  standalone: true,
  imports: [CommonModule, DriverMapComponent],
  templateUrl: './driver-view.component.html',
  styleUrls: ['./driver-view.component.scss']
})
export class DriverViewComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly userLocationService = inject(UserLocationService);
  private readonly trackingService = inject(TrackingService);
  private readonly http = inject(HttpClient);
  private readonly transitService = inject(TransitService);
  private readonly destroy$ = new Subject<void>();

  // Exponer enum para uso en template
  readonly OccupancyLevel = OccupancyLevel;

  // Datos del conductor
  readonly currentDriver = this.authService.currentDriver;

  // Estados del GPS
  readonly isGpsEnabled = signal<boolean>(false);
  readonly isLoadingGps = signal<boolean>(false);
  readonly currentLocation = signal<UserLocation | null>(null);

  // Estados de ocupación
  readonly selectedOccupancy = signal<OccupancyLevel | null>(null);
  readonly occupancyLevels: OccupancyLevelOption[] = [
    { value: OccupancyLevel.EMPTY, label: 'Vacío', icon: '🟢' },
    { value: OccupancyLevel.AVAILABLE, label: 'Medio', icon: '🟡' },
    { value: OccupancyLevel.FULL, label: 'Lleno', icon: '🔴' }
  ];

  // Estados de tracking
  readonly isTrackingEnabled = signal<boolean>(false);
  readonly isLoadingTracking = signal<boolean>(false);

  // Información adicional
  readonly lastUpdateTime = signal<string>('');

  // Estado del mapa
  readonly showMap = signal<boolean>(true);
  readonly showControls = signal<boolean>(true);

  // Diálogo de selección de ruta/bus
  readonly showRouteBusDialog = signal<boolean>(false);
  readonly availableRoutes = signal<Route[]>([]);
  readonly selectedRouteId = signal<string | null>(null);
  readonly selectedBusId = signal<string>('');

  // Intervalo para actualizar tiempo
  private timeUpdateInterval?: any;

  ngOnInit(): void {
    // Verificar autenticación
    if (!this.authService.hasActiveSession()) {
      this.router.navigate(['/driver/login']);
      return;
    }

    // Verificar si necesita seleccionar ruta y bus
    // Nota: Si el backend ya devolvió busId y routeId en el login, no mostrar diálogo
    const driver = this.currentDriver();
    if (driver && (!driver.routeId || !driver.busId)) {
      console.log('[DriverView] ⚠️ Conductor sin ruta/bus asignados, cargando opciones...');
      this.loadAvailableRoutes();
      this.showRouteBusDialog.set(true);
    } else if (driver?.routeId && driver?.busId) {
      console.log('[DriverView] ✅ Ruta y bus ya asignados desde el backend:', {
        routeId: driver.routeId,
        busId: driver.busId
      });
    }

    // Sincronizar estado inicial del GPS
    this.isGpsEnabled.set(this.userLocationService.isTracking());

    // Suscribirse a cambios de ubicación
    this.userLocationService.location$
      .pipe(takeUntil(this.destroy$))
      .subscribe((location) => {
        if (location) {
          this.currentLocation.set(location);
          this.updateLastUpdateTime();

          // Si el tracking está activo, enviar ubicación al backend
          if (this.isTrackingEnabled() && this.isGpsEnabled()) {
            this.sendLocationToBackend(location);
          }
        }
      });

    // Iniciar actualización de tiempo
    this.startTimeUpdate();
  }

  /**
   * Carga las rutas disponibles
   */
  private loadAvailableRoutes(): void {
    this.transitService.getAllRoutes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (routes) => {
          this.availableRoutes.set(routes);
        },
        error: (err) => {
          console.error('[DriverView] Error cargando rutas:', err);
        }
      });
  }

  /**
   * Confirma la selección de ruta y bus
   */
  confirmRouteBusSelection(): void {
    if (!this.selectedRouteId() || !this.selectedBusId().trim()) {
      alert('Por favor selecciona una ruta e ingresa el ID del bus');
      return;
    }

    // Actualizar sesión del conductor
    const driver = this.currentDriver();
    if (driver) {
      const updatedSession = {
        ...driver,
        routeId: this.selectedRouteId()!,
        busId: this.selectedBusId().trim()
      };
      
      // Guardar en localStorage
      localStorage.setItem('driver_session', JSON.stringify(updatedSession));
      this.authService.currentDriver.set(updatedSession);
      
      // Cerrar diálogo
      this.showRouteBusDialog.set(false);
      
      console.log('[DriverView] ✅ Ruta y bus asignados:', {
        routeId: updatedSession.routeId,
        busId: updatedSession.busId
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
    }

    // Detener GPS si está activo
    if (this.isGpsEnabled()) {
      this.userLocationService.stopTracking();
    }
  }

  /**
   * Activa o desactiva el GPS
   */
  toggleGps(): void {
    this.isLoadingGps.set(true);

    if (this.isGpsEnabled()) {
      // Desactivar GPS
      this.userLocationService.stopTracking();
      this.isGpsEnabled.set(false);
      this.currentLocation.set(null);
      
      // Si el tracking estaba activo, desactivarlo también
      if (this.isTrackingEnabled()) {
        this.isTrackingEnabled.set(false);
        this.stopTrackingOnBackend();
      }

      this.isLoadingGps.set(false);
      console.log('[DriverView] 📍 GPS desactivado');
    } else {
      // Activar GPS
      this.userLocationService.startTracking();
      
      // Esperar un momento para ver si la ubicación se obtiene
      setTimeout(() => {
        const location = this.userLocationService.currentLocation();
        if (location) {
          this.isGpsEnabled.set(true);
          this.currentLocation.set(location);
          this.updateLastUpdateTime();
          console.log('[DriverView] 📍 GPS activado');
        } else {
          // Si no se obtiene ubicación, intentar después de unos segundos
          setTimeout(() => {
            const locationRetry = this.userLocationService.currentLocation();
            if (locationRetry) {
              this.isGpsEnabled.set(true);
              this.currentLocation.set(locationRetry);
              this.updateLastUpdateTime();
            } else {
              alert('No se pudo obtener la ubicación. Verifica los permisos de GPS.');
            }
            this.isLoadingGps.set(false);
          }, 3000);
        }
        this.isLoadingGps.set(false);
      }, 1000);
    }
  }

  /**
   * Selecciona el nivel de ocupación
   */
  selectOccupancy(level: OccupancyLevel): void {
    this.selectedOccupancy.set(level);
    console.log('[DriverView] 👥 Ocupación seleccionada:', level);
    
    // Enviar al backend si es necesario
    if (this.currentDriver()?.busId && this.isTrackingEnabled()) {
      this.sendOccupancyToBackend(level);
    }
  }

  /**
   * Activa o desactiva el tracking de ubicación
   */
  toggleTracking(): void {
    if (!this.isGpsEnabled()) {
      alert('Debes activar el GPS primero para usar el tracking');
      return;
    }

    this.isLoadingTracking.set(true);

    if (this.isTrackingEnabled()) {
      // Detener tracking
      this.stopTrackingOnBackend();
      this.isTrackingEnabled.set(false);
      this.isLoadingTracking.set(false);
      console.log('[DriverView] 🛑 Tracking desactivado');
    } else {
      // Iniciar tracking
      const location = this.currentLocation();
      if (location) {
        this.startTrackingOnBackend(location);
      } else {
        this.isLoadingTracking.set(false);
        alert('Error: No hay ubicación disponible');
      }
    }
  }

  /**
   * Inicia el tracking en el backend
   */
  private startTrackingOnBackend(location: UserLocation): void {
    const driver = this.currentDriver();
    if (!driver || !driver.busId || !driver.routeId) {
      console.error('[DriverView] ❌ Falta información del conductor/bus');
      this.isLoadingTracking.set(false);
      return;
    }

    // Enviar primera ubicación y activar tracking
    const payload = {
      busId: driver.busId,
      routeId: driver.routeId,
      latitude: location.latitude,
      longitude: location.longitude,
      bearing: location.heading || 0,
      speed: location.speed ? (location.speed * 3.6) : 0, // Convertir m/s a km/h
      occupancyLevel: this.selectedOccupancy() || OccupancyLevel.EMPTY
    };

    // Enviar primera posición al backend
    this.http.post('http://localhost:8080/api/tracking/position', payload, {
      headers: {
        'Authorization': driver.token ? `Bearer ${driver.token}` : '',
        'Content-Type': 'application/json'
      }
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        console.log('[DriverView] ✅ Tracking iniciado:', response);
        this.isTrackingEnabled.set(true);
        this.isLoadingTracking.set(false);
      },
      error: (error) => {
        console.error('[DriverView] ❌ Error iniciando tracking:', error);
        this.isLoadingTracking.set(false);
        // Activar tracking localmente aunque falle el backend
        this.isTrackingEnabled.set(true);
      }
    });
  }

  /**
   * Envía la ubicación al backend
   */
  private sendLocationToBackend(location: UserLocation): void {
    const driver = this.currentDriver();
    if (!driver || !driver.busId || !driver.routeId) {
      console.warn('[DriverView] ⚠️ No se puede enviar ubicación: falta busId o routeId');
      return;
    }

    const payload = {
      busId: driver.busId,
      routeId: driver.routeId,
      latitude: location.latitude,
      longitude: location.longitude,
      bearing: location.heading || 0,
      speed: location.speed ? (location.speed * 3.6) : 0, // Convertir m/s a km/h
      occupancyLevel: this.selectedOccupancy() || OccupancyLevel.EMPTY
    };

    // Enviar al endpoint de tracking del backend
    this.http.post('http://localhost:8080/api/tracking/position', payload, {
      headers: {
        'Authorization': driver.token ? `Bearer ${driver.token}` : '',
        'Content-Type': 'application/json'
      }
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        console.log('[DriverView] ✅ Ubicación enviada al backend:', response);
      },
      error: (error) => {
        console.error('[DriverView] ❌ Error enviando ubicación:', error);
      }
    });
  }

  /**
   * Envía el nivel de ocupación al backend
   */
  private sendOccupancyToBackend(level: OccupancyLevel): void {
    const driver = this.currentDriver();
    if (!driver || !driver.busId) {
      return;
    }

    const payload = {
      busId: driver.busId,
      occupancyLevel: level
    };

    console.log('[DriverView] 👥 Enviando ocupación:', payload);
  }

  /**
   * Detiene el tracking en el backend
   */
  private stopTrackingOnBackend(): void {
    const driver = this.currentDriver();
    if (!driver || !driver.busId) {
      return;
    }

    // Aquí harías una llamada al backend para detener el tracking
    console.log('[DriverView] 🛑 Deteniendo tracking en backend');
  }

  /**
   * Cierra sesión
   */
  logout(): void {
    // Detener todo antes de cerrar sesión
    if (this.isGpsEnabled()) {
      this.userLocationService.stopTracking();
    }
    if (this.isTrackingEnabled()) {
      this.stopTrackingOnBackend();
    }

    this.authService.logout();
    this.router.navigate(['/driver/login']);
  }

  /**
   * Actualiza el tiempo de última actualización
   */
  private updateLastUpdateTime(): void {
    const now = new Date();
    this.lastUpdateTime.set(now.toLocaleTimeString());
  }

  /**
   * Inicia la actualización periódica del tiempo
   */
  private startTimeUpdate(): void {
    this.timeUpdateInterval = setInterval(() => {
      if (this.currentLocation()) {
        this.updateLastUpdateTime();
      }
    }, 60000); // Cada minuto
  }
}
