import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, shareReplay } from 'rxjs';
import { Route, Stop } from '../models/route.model';

@Injectable({
  providedIn: 'root'
})
export class TransitService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080/api/transit';

  // Cache de rutas y paradas usando BehaviorSubject para reactividad
  private routesSubject = new BehaviorSubject<Route[]>([]);
  private stopsSubject = new BehaviorSubject<Stop[]>([]);

  // Observables públicos
  public readonly routes$ = this.routesSubject.asObservable();
  public readonly stops$ = this.stopsSubject.asObservable();

  // Estado de carga
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public readonly loading$ = this.loadingSubject.asObservable();

  /**
   * Obtiene todas las rutas disponibles del backend
   */
  getAllRoutes(): Observable<Route[]> {
    this.loadingSubject.next(true);
    return this.http.get<Route[]>(`${this.baseUrl}/routes`).pipe(
      tap(routes => {
        this.routesSubject.next(routes);
        this.loadingSubject.next(false);
      }),
      shareReplay(1) // Cache de la respuesta
    );
  }

  /**
   * Obtiene todas las paradas disponibles del backend
   */
  getAllStops(): Observable<Stop[]> {
    return this.http.get<Stop[]>(`${this.baseUrl}/stops`).pipe(
      tap(stops => this.stopsSubject.next(stops)),
      shareReplay(1)
    );
  }

  /**
   * Obtiene una ruta específica por ID
   */
  getRouteById(id: string): Route | undefined {
    return this.routesSubject.value.find(route => route.id === id);
  }

  /**
   * Obtiene una parada específica por ID
   */
  getStopById(id: string): Stop | undefined {
    return this.stopsSubject.value.find(stop => stop.id === id);
  }

  /**
   * Recarga los datos desde el backend
   */
  refreshData(): void {
    this.getAllRoutes().subscribe();
    this.getAllStops().subscribe();
  }
}
