import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GeocodingRequest, GeocodingResponse, ReverseGeocodingResponse } from '../models/geocoding.model';


@Injectable({
  providedIn: 'root'
})
export class GeocodingService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080/api/geocoding';

  /**
   * Busca coordenadas a partir de una dirección
   * @param address Dirección a buscar
   */
  searchAddress(address: string): Observable<GeocodingResponse> {
    const request: GeocodingRequest = { address };
    return this.http.post<GeocodingResponse>(`${this.baseUrl}/search`, request);
  }

  /**
   * Busca una dirección a partir de coordenadas (geocodificación inversa)
   * @param latitude Latitud
   * @param longitude Longitud
   */
  reverseGeocode(latitude: number, longitude: number): Observable<ReverseGeocodingResponse> {
    const params = new HttpParams()
      .set('latitude', latitude.toString())
      .set('longitude', longitude.toString());

    return this.http.get<ReverseGeocodingResponse>(`${this.baseUrl}/reverse`, { params });
  }
}
