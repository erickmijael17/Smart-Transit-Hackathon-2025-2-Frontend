import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  RouteSuggestionRequest,
  RouteSuggestionsResponse,
  RouteSuggestion
} from '../models/route-suggestion.model';
import { GeocodingService } from './geocoding.service';
import { GeocodingResponse } from '../models/geocoding.model';

/**
 * Servicio para obtener sugerencias de rutas
 * Comunica el frontend con el backend para encontrar la mejor ruta
 */
@Injectable({
  providedIn: 'root'
})
export class RouteSuggestionService {
  private readonly http = inject(HttpClient);
  private readonly geocodingService = inject(GeocodingService);
  private readonly apiUrl = 'http://localhost:8080/api/suggestions';
  /**
   * Obtiene sugerencias de rutas desde el backend
   *
   * @param request Datos de origen y destino
   * @returns Observable con las sugerencias
   */
  getSuggestions(request: RouteSuggestionRequest): Observable<RouteSuggestionsResponse> {
    console.log('[RouteSuggestionService] 🔍 Solicitando sugerencias:', request);

    const params = new HttpParams()
      .set('originLat', request.originLatitude.toString())
      .set('originLon', request.originLongitude.toString())
      .set('destLat', request.destinationLatitude.toString())
      .set('destLon', request.destinationLongitude.toString())
      .set('maxWalkingDistance', (request.maxWalkingDistance || 500).toString())
      .set('maxResults', (request.maxResults || 5).toString());

    return this.http.get<RouteSuggestionsResponse>(`${this.apiUrl}/routes`, { params })
      .pipe(
        map(response => {
          console.log('[RouteSuggestionService] ✅ Sugerencias recibidas:', response);
          return response;
        }),
        catchError(error => {
          console.error('[RouteSuggestionService] ❌ Error obteniendo sugerencias:', error);

          // Retornar respuesta vacía en caso de error
          return of({
            suggestions: [],
            totalSuggestions: 0,
            message: 'No se pudieron obtener sugerencias. Verifica tu conexión.'
          } as RouteSuggestionsResponse);
        })
      );
  }

  /**
   * Busca lugares por nombre usando geocodificación
   * 
   * @param query Texto de búsqueda
   * @returns Observable con resultados de lugares
   */
  searchPlaces(query: string): Observable<GeocodingResponse[]> {
    if (!query || query.trim().length < 3) {
      return of([]);
    }

    console.log('[RouteSuggestionService] 🔍 Buscando lugares:', query);

    return this.geocodingService.searchAddress(query).pipe(
      map(result => [result]), // Convertir resultado único en array
      catchError(error => {
        console.error('[RouteSuggestionService] ❌ Error buscando lugares:', error);
        return of([]);
      })
    );
  }

  /**
   * Convierte una dirección a coordenadas
   * 
   * @param address Dirección o nombre del lugar
   * @returns Observable con las coordenadas
   */
  geocodeAddress(address: string): Observable<GeocodingResponse | null> {
    if (!address || address.trim().length < 3) {
      return of(null);
    }

    console.log('[RouteSuggestionService] 📍 Geocodificando dirección:', address);

    return this.geocodingService.searchAddress(address).pipe(
      catchError(error => {
        console.error('[RouteSuggestionService] ❌ Error geocodificando:', error);
        return of(null);
      })
    );
  }

  /**
   * Calcula la distancia entre dos puntos (en metros)
   * Usa la fórmula de Haversine
   *
   * @param lat1 Latitud punto 1
   * @param lon1 Longitud punto 1
   * @param lat2 Latitud punto 2
   * @param lon2 Longitud punto 2
   * @returns Distancia en metros
   */
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Radio de la Tierra en metros
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Formatea una distancia para mostrarla de forma amigable
   *
   * @param meters Distancia en metros
   * @returns String formateado (ej: "150 m", "1.2 km")
   */
  formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    } else {
      return `${(meters / 1000).toFixed(1)} km`;
    }
  }

  /**
   * Formatea un tiempo para mostrarlo de forma amigable
   *
   * @param minutes Tiempo en minutos
   * @returns String formateado (ej: "5 min", "1h 30min")
   */
  formatTime(minutes: number): string {
    if (minutes < 60) {
      return `${Math.round(minutes)} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = Math.round(minutes % 60);
      return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
    }
  }
}
