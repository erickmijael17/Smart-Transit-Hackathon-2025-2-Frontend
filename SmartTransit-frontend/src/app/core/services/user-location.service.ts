import { Injectable, signal } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class UserLocationService {
  // Signal para la ubicación actual
  readonly currentLocation = signal<UserLocation | null>(null);
  readonly isTracking = signal<boolean>(false);
  readonly locationError = signal<string | null>(null);

  // Observable para compatibilidad
  private locationSubject = new BehaviorSubject<UserLocation | null>(null);
  public location$ = this.locationSubject.asObservable();

  private watchId: number | null = null;
  private retryCount = 0;
  private readonly MAX_RETRIES = 3;
  private retryTimeout: any = null;

  /**
   * Inicia el seguimiento continuo de la ubicación del usuario
   * Implementa estrategia de reintentos y timeout progresivo
   */
  startTracking(): void {
    if (!('geolocation' in navigator)) {
      this.locationError.set('Tu navegador no soporta geolocalización');
      console.error('[UserLocationService] ❌ Geolocalización no disponible');
      return;
    }

    if (this.watchId !== null) {
      console.log('[UserLocationService] ✅ Ya está rastreando la ubicación');
      return;
    }

    console.log('[UserLocationService] 🎯 Iniciando seguimiento de ubicación...');
    this.retryCount = 0;
    this.startWatchPosition();
  }

  /**
   * Inicia watchPosition con opciones optimizadas
   * Timeout progresivo: primera vez más largo, luego más corto
   */
  private startWatchPosition(): void {
    // Timeout progresivo: 30s primera vez, luego 15s
    const timeout = this.retryCount === 0 ? 30000 : 15000;
    
    const options: PositionOptions = {
      enableHighAccuracy: true, // Usar GPS si está disponible
      timeout: timeout,         // Timeout progresivo
      maximumAge: 5000         // Aceptar posiciones de hasta 5s de antigüedad
    };

    console.log(`[UserLocationService] Configuración: timeout=${timeout}ms, highAccuracy=true`);

    // watchPosition hace seguimiento continuo (a diferencia de getCurrentPosition)
    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        // ✅ ÉXITO: Reset del contador de reintentos
        this.retryCount = 0;
        
        const userLocation: UserLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
          timestamp: position.timestamp
        };

        this.currentLocation.set(userLocation);
        this.locationSubject.next(userLocation);
        this.isTracking.set(true);
        this.locationError.set(null);

        console.log('[UserLocationService] 📍 Ubicación actualizada:', {
          lat: userLocation.latitude.toFixed(6),
          lng: userLocation.longitude.toFixed(6),
          accuracy: userLocation.accuracy.toFixed(0) + 'm',
          
          // DEBUG: Coordenadas raw del navegador
          rawPosition: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          },
          timestamp: new Date(position.timestamp).toLocaleTimeString(),
          
          // ALERTA: Si accuracy es 0, probablemente es ubicación simulada
          ...(position.coords.accuracy === 0 && {
            WARNING: '⚠️ Accuracy = 0 puede indicar ubicación simulada en DevTools'
          })
        });
      },
      (error) => {
        this.handleGeolocationError(error, timeout);
      },
      options
    );
  }

  /**
   * Maneja errores de geolocalización con estrategia de reintentos
   */
  private handleGeolocationError(error: GeolocationPositionError, currentTimeout: number): void {
    let errorMessage = 'Error al obtener ubicación';
    let shouldRetry = false;
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Permiso de ubicación denegado. Permite el acceso en tu navegador.';
        console.error('[UserLocationService] ❌ PERMISSION_DENIED - Verifica permisos del navegador');
        break;
        
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Información de ubicación no disponible. Verifica tu conexión.';
        console.error('[UserLocationService] ❌ POSITION_UNAVAILABLE');
        shouldRetry = this.retryCount < this.MAX_RETRIES;
        break;
        
      case error.TIMEOUT:
        errorMessage = `Timeout (${currentTimeout}ms). Reintentando con configuración menos restrictiva...`;
        console.warn('[UserLocationService] ⏱️ TIMEOUT - El GPS está tardando mucho');
        shouldRetry = this.retryCount < this.MAX_RETRIES;
        break;
    }

    console.error('[UserLocationService] ❌ Error:', errorMessage, error);
    this.locationError.set(errorMessage);
    
    // Estrategia de reintentos
    if (shouldRetry) {
      this.retryCount++;
      console.log(`[UserLocationService] 🔄 Reintento ${this.retryCount}/${this.MAX_RETRIES}`);
      
      // Detener tracking actual
      if (this.watchId !== null) {
        navigator.geolocation.clearWatch(this.watchId);
        this.watchId = null;
      }
      
      // Reintentar después de un delay progresivo
      const retryDelay = 2000 * this.retryCount; // 2s, 4s, 6s
      console.log(`[UserLocationService] ⏳ Reintentando en ${retryDelay}ms...`);
      
      this.retryTimeout = setTimeout(() => {
        this.startWatchPosition();
      }, retryDelay);
    } else {
      this.isTracking.set(false);
      
      // Si agotamos reintentos, intentar con baja precisión como último recurso
      if (this.retryCount >= this.MAX_RETRIES) {
        console.warn('[UserLocationService] ⚠️ Intentando con baja precisión como último recurso...');
        this.tryLowAccuracyFallback();
      }
    }
  }

  /**
   * Fallback: Intenta obtener ubicación con baja precisión (WiFi/IP)
   */
  private tryLowAccuracyFallback(): void {
    console.log('[UserLocationService] 🌐 Fallback: Intentando geolocalización por red (WiFi/IP)...');
    
    const lowAccuracyOptions: PositionOptions = {
      enableHighAccuracy: false, // Usar red en lugar de GPS
      timeout: 30000,            // Timeout más largo
      maximumAge: 60000          // Aceptar posiciones antiguas
    };
    
    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        console.log('[UserLocationService] ✅ Ubicación obtenida (baja precisión)');
        
        const userLocation: UserLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
          timestamp: position.timestamp
        };

        this.currentLocation.set(userLocation);
        this.locationSubject.next(userLocation);
        this.isTracking.set(true);
        this.locationError.set('Ubicación aproximada (red WiFi/IP)');
        
        console.log('[UserLocationService] 📍 Ubicación (baja precisión):', {
          lat: userLocation.latitude.toFixed(6),
          lng: userLocation.longitude.toFixed(6),
          accuracy: userLocation.accuracy.toFixed(0) + 'm (BAJA PRECISIÓN)'
        });
      },
      (error) => {
        console.error('[UserLocationService] ❌ Fallback también falló:', error);
        this.locationError.set('No se pudo obtener tu ubicación. Verifica los permisos y conexión.');
        this.isTracking.set(false);
      },
      lowAccuracyOptions
    );
  }

  /**
   * Detiene el seguimiento de ubicación
   */
  stopTracking(): void {
    // Cancelar reintentos pendientes
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
    
    // Detener watchPosition
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
      this.isTracking.set(false);
      this.retryCount = 0;
      console.log('[UserLocationService] ⏹️ Seguimiento detenido');
    }
  }

  /**
   * Obtiene la ubicación actual una sola vez
   */
  getCurrentLocation(): Promise<UserLocation> {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('Geolocalización no soportada'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation: UserLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: position.timestamp
          };
          resolve(userLocation);
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  }

  /**
   * Calcula la distancia en metros entre dos puntos usando la fórmula de Haversine
   */
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Radio de la Tierra en metros
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distancia en metros
  }
}
