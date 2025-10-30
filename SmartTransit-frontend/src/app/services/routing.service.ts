import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {GeocodingResponse} from '../core/models/geocoding.model';


@Injectable({
  providedIn: 'root'
})
export class RoutingService {
  private readonly apiUrl = 'http://localhost:8080/api/routing';

  constructor(private http: HttpClient) { }

  /**
   * Llama al backend para ajustar una coordenada a la carretera más cercana.
   */
  public snapToRoad(lat: number, lon: number): Observable<GeocodingResponse> {
    const params = new HttpParams()
      .set('lat', lat.toString())
      .set('lon', lon.toString());

    return this.http.get<GeocodingResponse>(`${this.apiUrl}/snap`, { params });
  }
}
