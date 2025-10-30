import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
// Reutilizamos el modelo GeocodingResponse que ya existe
import { GeocodingResponse } from '../models/geocoding.model';

/**
 * Respuesta de OSRM para routing
 */
export interface OSRMRoute {
  geometry: {
    coordinates: [number, number][];  // [lon, lat] formato OSRM
  };
  distance: number;  // metros
  duration: number;  // segundos
}

export interface OSRMResponse {
  code: string;
  routes: OSRMRoute[];
}

/**
 * Servicio de Routing - Maneja funciones avanzadas de rutas
 * 
 * Características:
 * - Snap to Road: Ajusta coordenadas GPS a la calle más cercana
 * - Routing por calles: Usa OSRM para calcular rutas reales
 * - Navegación paso a paso
 */
@Injectable({
  providedIn: 'root'
})
export class RoutingService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:8080/api/routing';
  
  // OSRM público (OpenStreetMap Routing Machine)
  private readonly osrmUrl = 'https://router.project-osrm.org/route/v1/walking';

  /**
   * Snap to Road: Ajusta las coordenadas GPS a la carretera más cercana
   * 
   * ¿Por qué es útil?
   * - El GPS a veces te ubica "dentro de edificios" o fuera de la calle
   * - Esto ajusta tu posición a la calle más cercana
   * - Útil para navegación y tracking preciso
   * 
   * @param lat Latitud del GPS
   * @param lon Longitud del GPS
   * @returns Coordenadas ajustadas a la calle más cercana
   */
  snapToRoad(lat: number, lon: number): Observable<GeocodingResponse> {
    console.log('[RoutingService] 🛣️ Snap to Road:', { lat, lon });
    
    const params = new HttpParams()
      .set('lat', lat.toString())
      .set('lon', lon.toString());

    return this.http.get<GeocodingResponse>(`${this.apiUrl}/snap`, { params });
  }

  /**
   * Calcula una ruta caminando entre dos puntos siguiendo las calles
   * Usa OSRM (OpenStreetMap Routing Machine) - Servicio público y gratuito
   * 
   * @param startLat Latitud de inicio
   * @param startLon Longitud de inicio
   * @param endLat Latitud de destino
   * @param endLon Longitud de destino
   * @returns Observable con las coordenadas de la ruta y distancia/duración
   */
  calculateWalkingRoute(
    startLat: number, 
    startLon: number, 
    endLat: number, 
    endLon: number
  ): Observable<OSRMResponse> {
    console.log('[RoutingService] 🚶 Calculando ruta caminando:', {
      from: [startLat, startLon],
      to: [endLat, endLon]
    });

    // OSRM usa formato: lon,lat;lon,lat (¡OJO! Invertido respecto a lat,lon)
    const coordinates = `${startLon},${startLat};${endLon},${endLat}`;
    const url = `${this.osrmUrl}/${coordinates}?overview=full&geometries=geojson`;

    return this.http.get<OSRMResponse>(url);
  }

  /**
   * Convierte coordenadas OSRM ([lon, lat]) a formato Leaflet ([lat, lon])
   */
  convertOSRMCoordinatesToLatLng(coords: [number, number][]): [number, number][] {
    return coords.map(coord => [coord[1], coord[0]]);
  }

  /**
   * Obtiene direcciones paso a paso para caminata
   * Usa OSRM con steps=true para obtener instrucciones detalladas
   */
  getWalkingDirections(
    startLat: number,
    startLon: number,
    endLat: number,
    endLon: number
  ): Observable<any> {
    console.log('[RoutingService] 📋 Obteniendo direcciones paso a paso');
    
    const coordinates = `${startLon},${startLat};${endLon},${endLat}`;
    const url = `${this.osrmUrl}/${coordinates}?overview=full&geometries=geojson&steps=true`;

    return this.http.get(url);
  }
}
