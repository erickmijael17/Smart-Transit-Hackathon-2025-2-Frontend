import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { map, catchError, tap, shareReplay } from 'rxjs/operators';
import { POI, POIType, POISearchRequest, POISearchResponse } from '../models/poi.model';

/**
 * Servicio para buscar Puntos de Interés (POIs) usando Overpass API de OpenStreetMap
 * 
 * Overpass API es GRATUITA y permite consultar datos de OpenStreetMap
 * Documentación: https://wiki.openstreetmap.org/wiki/Overpass_API
 */
@Injectable({
  providedIn: 'root'
})
export class PoiService {
  private readonly http = inject(HttpClient);
  
  // Overpass API endpoint (servidor público gratuito)
  private readonly overpassUrl = 'https://overpass-api.de/api/interpreter';
  
  // Cache de POIs
  private poisCache = new Map<string, POI[]>();
  
  // Signals para estado reactivo
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly cachedPOIs = signal<POI[]>([]);

  /**
   * Busca POIs cerca de una ubicación usando Overpass API
   * 
   * @param request Parámetros de búsqueda (ubicación, radio, tipos)
   * @returns Observable con los POIs encontrados
   */
  searchPOIs(request: POISearchRequest): Observable<POISearchResponse> {
    const cacheKey = this.getCacheKey(request);
    
    // Verificar si está en cache
    if (this.poisCache.has(cacheKey)) {
      const cachedPOIs = this.poisCache.get(cacheKey)!;
      return of({
        pois: cachedPOIs,
        count: cachedPOIs.length,
        searchTime: 0
      });
    }

    this.isLoading.set(true);
    this.error.set(null);
    
    const startTime = Date.now();
    const query = this.buildOverpassQuery(request);

    console.log('[PoiService] 🔍 Buscando POIs...', {
      location: `${request.latitude}, ${request.longitude}`,
      radius: request.radius,
      types: request.types
    });

    return this.http.post(this.overpassUrl, query, {
      headers: { 'Content-Type': 'text/plain' },
      responseType: 'json'
    }).pipe(
      map((response: any) => {
        const pois = this.parseOverpassResponse(response);
        const searchTime = Date.now() - startTime;

        // Guardar en cache
        this.poisCache.set(cacheKey, pois);
        this.cachedPOIs.set(pois);

        console.log('[PoiService] ✅ POIs encontrados:', pois.length, `(${searchTime}ms)`);

        return {
          pois,
          count: pois.length,
          searchTime
        };
      }),
      tap(() => this.isLoading.set(false)),
      catchError((error) => {
        console.error('[PoiService] ❌ Error buscando POIs:', error);
        this.error.set('Error al buscar lugares cercanos');
        this.isLoading.set(false);
        return throwError(() => error);
      }),
      shareReplay(1)
    );
  }

  /**
   * Construye una query de Overpass QL para buscar POIs
   * Overpass QL es el lenguaje de consulta de Overpass API
   */
  private buildOverpassQuery(request: POISearchRequest): string {
    const { latitude, longitude, radius, types } = request;
    
    // Convertir tipos a tags de OSM (OpenStreetMap)
    const osmQueries: string[] = [];
    
    if (!types || types.length === 0) {
      // Si no hay tipos específicos, buscar todo tipo de amenities
      osmQueries.push(`node["amenity"](around:${radius},${latitude},${longitude});`);
      osmQueries.push(`node["shop"](around:${radius},${latitude},${longitude});`);
    } else {
      types.forEach(type => {
        const osmTag = this.poiTypeToOSMTag(type);
        if (osmTag) {
          osmQueries.push(`node["${osmTag.key}"="${osmTag.value}"](around:${radius},${latitude},${longitude});`);
        }
      });
    }

    // Construir query completa en Overpass QL
    const query = `
      [out:json][timeout:25];
      (
        ${osmQueries.join('\n        ')}
      );
      out body;
      >;
      out skel qt;
    `;

    return query;
  }

  /**
   * Parsea la respuesta de Overpass API y la convierte a nuestro modelo POI
   */
  private parseOverpassResponse(response: any): POI[] {
    if (!response || !response.elements) {
      return [];
    }

    const pois: POI[] = [];

    response.elements.forEach((element: any) => {
      if (element.type === 'node' && element.tags) {
        const poi = this.osmElementToPOI(element);
        if (poi) {
          pois.push(poi);
        }
      }
    });

    return pois;
  }

  /**
   * Convierte un elemento de OSM a nuestro modelo POI
   */
  private osmElementToPOI(element: any): POI | null {
    const tags = element.tags;
    
    // Determinar el tipo de POI
    const poiType = this.osmTagsToPOIType(tags);
    if (!poiType) return null;

    // Extraer nombre
    const name = tags.name || tags['name:es'] || tags.brand || 'Sin nombre';

    return {
      id: `poi-${element.id}`,
      type: poiType,
      name,
      latitude: element.lat,
      longitude: element.lon,
      address: tags['addr:street'] || tags.address || undefined,
      phone: tags.phone || tags['contact:phone'] || undefined,
      website: tags.website || tags['contact:website'] || undefined,
      openingHours: tags.opening_hours || undefined,
      tags: tags
    };
  }

  /**
   * Convierte nuestro POIType a un tag de OSM
   */
  private poiTypeToOSMTag(type: POIType): { key: string, value: string } | null {
    const mapping: Record<POIType, { key: string, value: string }> = {
      [POIType.SHOP]: { key: 'shop', value: 'yes' },
      [POIType.SUPERMARKET]: { key: 'shop', value: 'supermarket' },
      [POIType.MALL]: { key: 'shop', value: 'mall' },
      [POIType.PHARMACY]: { key: 'amenity', value: 'pharmacy' },
      [POIType.RESTAURANT]: { key: 'amenity', value: 'restaurant' },
      [POIType.CAFE]: { key: 'amenity', value: 'cafe' },
      [POIType.FAST_FOOD]: { key: 'amenity', value: 'fast_food' },
      [POIType.BAR]: { key: 'amenity', value: 'bar' },
      [POIType.BANK]: { key: 'amenity', value: 'bank' },
      [POIType.ATM]: { key: 'amenity', value: 'atm' },
      [POIType.HOSPITAL]: { key: 'amenity', value: 'hospital' },
      [POIType.CLINIC]: { key: 'amenity', value: 'clinic' },
      [POIType.BUS_STOP]: { key: 'highway', value: 'bus_stop' },
      [POIType.PARKING]: { key: 'amenity', value: 'parking' },
      [POIType.FUEL]: { key: 'amenity', value: 'fuel' },
      [POIType.SCHOOL]: { key: 'amenity', value: 'school' },
      [POIType.UNIVERSITY]: { key: 'amenity', value: 'university' },
      [POIType.LIBRARY]: { key: 'amenity', value: 'library' },
      [POIType.CINEMA]: { key: 'amenity', value: 'cinema' },
      [POIType.THEATRE]: { key: 'amenity', value: 'theatre' },
      [POIType.PARK]: { key: 'leisure', value: 'park' },
      [POIType.POLICE]: { key: 'amenity', value: 'police' },
      [POIType.FIRE_STATION]: { key: 'amenity', value: 'fire_station' },
      [POIType.POST_OFFICE]: { key: 'amenity', value: 'post_office' },
      [POIType.HOTEL]: { key: 'tourism', value: 'hotel' },
      [POIType.CHURCH]: { key: 'amenity', value: 'place_of_worship' },
      [POIType.OTHER]: { key: 'amenity', value: 'yes' }
    };

    return mapping[type] || null;
  }

  /**
   * Convierte tags de OSM a nuestro POIType
   */
  private osmTagsToPOIType(tags: any): POIType | null {
    // Priorizar amenity
    if (tags.amenity) {
      switch (tags.amenity) {
        case 'restaurant': return POIType.RESTAURANT;
        case 'cafe': return POIType.CAFE;
        case 'fast_food': return POIType.FAST_FOOD;
        case 'bar': case 'pub': return POIType.BAR;
        case 'bank': return POIType.BANK;
        case 'atm': return POIType.ATM;
        case 'hospital': return POIType.HOSPITAL;
        case 'clinic': case 'doctors': return POIType.CLINIC;
        case 'pharmacy': return POIType.PHARMACY;
        case 'parking': return POIType.PARKING;
        case 'fuel': return POIType.FUEL;
        case 'school': return POIType.SCHOOL;
        case 'university': case 'college': return POIType.UNIVERSITY;
        case 'library': return POIType.LIBRARY;
        case 'cinema': return POIType.CINEMA;
        case 'theatre': return POIType.THEATRE;
        case 'police': return POIType.POLICE;
        case 'fire_station': return POIType.FIRE_STATION;
        case 'post_office': return POIType.POST_OFFICE;
        case 'place_of_worship': return POIType.CHURCH;
      }
    }

    // Luego shop
    if (tags.shop) {
      switch (tags.shop) {
        case 'supermarket': return POIType.SUPERMARKET;
        case 'mall': return POIType.MALL;
        default: return POIType.SHOP;
      }
    }

    // Tourism
    if (tags.tourism) {
      if (tags.tourism === 'hotel') return POIType.HOTEL;
    }

    // Leisure
    if (tags.leisure) {
      if (tags.leisure === 'park') return POIType.PARK;
    }

    // Highway (para bus_stop)
    if (tags.highway === 'bus_stop') {
      return POIType.BUS_STOP;
    }

    return null;
  }

  /**
   * Genera una clave de cache única para la búsqueda
   */
  private getCacheKey(request: POISearchRequest): string {
    const typesKey = request.types?.sort().join(',') || 'all';
    return `${request.latitude.toFixed(4)},${request.longitude.toFixed(4)}_${request.radius}_${typesKey}`;
  }

  /**
   * Limpia la cache de POIs
   */
  clearCache(): void {
    this.poisCache.clear();
    this.cachedPOIs.set([]);
    console.log('[PoiService] 🗑️ Cache limpiada');
  }
}
