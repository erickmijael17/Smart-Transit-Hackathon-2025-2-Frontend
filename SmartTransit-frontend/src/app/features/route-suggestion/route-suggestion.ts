import { Component, OnInit, OnDestroy, inject, signal, effect, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { RouteSuggestionService } from '../../core/services/route-suggestion.service';
import { UserLocationService } from '../../core/services/user-location.service';
import {
  RouteSuggestion,
  RouteSuggestionsResponse,
  SearchState,
  SearchLocation
} from '../../core/models/route-suggestion.model';

/**
 * Componente de sugerencia de rutas
 * Permite al usuario buscar un destino y obtener sugerencias de qué micro tomar
 * Mejores prácticas 2025: Standalone component, Signals, mejores prácticas de UX
 */
@Component({
  selector: 'app-route-suggestion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './route-suggestion.html',
  styleUrl: './route-suggestion.scss'
})
export class RouteSuggestionComponent implements OnInit, OnDestroy {
  private readonly routeSuggestionService = inject(RouteSuggestionService);
  private readonly userLocationService = inject(UserLocationService);
  private readonly destroy$ = new Subject<void>();

  // Signals para el estado reactivo
  readonly searchState = signal<SearchState>(SearchState.IDLE);
  readonly suggestions = signal<RouteSuggestion[]>([]);
  readonly selectedSuggestion = signal<RouteSuggestion | null>(null);
  readonly destinationQuery = signal<string>('');
  readonly userLocation = this.userLocationService.currentLocation;
  readonly errorMessage = signal<string | null>(null);
  
  // Para el input de búsqueda
  destinationInput = '';

  // Coordenadas del destino (para mostrar en el mapa)
  private destinationCoordinates: { latitude: number; longitude: number } | null = null;

  // Output para comunicarse con el componente padre (mapa)
  readonly showRouteOnMap = output<{ suggestion: RouteSuggestion; destination: { latitude: number; longitude: number } }>();

  // Enum para usar en el template
  readonly SearchState = SearchState;

  constructor() {
    // Effect para observar cambios en la ubicación del usuario
    effect(() => {
      const location = this.userLocation();
      if (location) {
        console.log('[RouteSuggestion] 📍 Ubicación del usuario actualizada:', location);
      }
    });
  }

  ngOnInit(): void {
    console.log('[RouteSuggestion] 🚀 Componente inicializado');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Maneja el envío del formulario de búsqueda
   */
  onSearchSubmit(): void {
    const query = this.destinationInput.trim();
    
    if (!query) {
      this.errorMessage.set('Por favor ingresa un destino');
      return;
    }

    const userLoc = this.userLocation();
    
    if (!userLoc) {
      this.errorMessage.set('Esperando tu ubicación GPS...');
      return;
    }

    this.searchRoutes(query);
  }

  /**
   * Busca rutas sugeridas
   */
  private searchRoutes(destination: string): void {
    const userLoc = this.userLocation();
    
    if (!userLoc) {
      console.warn('[RouteSuggestion] ⚠️ No hay ubicación del usuario');
      return;
    }

    console.log('[RouteSuggestion] 🔍 Geocodificando destino:', destination);
    this.searchState.set(SearchState.SEARCHING);
    this.errorMessage.set(null);

    // Agregar "juliaca" a la búsqueda para filtrar resultados solo de la ciudad de Juliaca
    const searchQuery = `${destination} juliaca`;

    // Primero geocodificar el destino (convertir texto a coordenadas)
    this.routeSuggestionService.geocodeAddress(searchQuery)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (geocodeResult) => {
        if (!geocodeResult) {
          console.warn('[RouteSuggestion] ⚠️ No se pudo geocodificar el destino');
          this.searchState.set(SearchState.ERROR);
          this.errorMessage.set('No se pudo encontrar ese lugar. Intenta con otro nombre.');
          return;
        }

        console.log('[RouteSuggestion] 📍 Destino geocodificado:', geocodeResult);

        // Guardar coordenadas del destino
        this.destinationCoordinates = {
          latitude: geocodeResult.latitude,
          longitude: geocodeResult.longitude
        };

        // Ahora buscar rutas con las coordenadas obtenidas
        this.routeSuggestionService.getSuggestions({
          originLatitude: userLoc.latitude,
          originLongitude: userLoc.longitude,
          destinationLatitude: geocodeResult.latitude,
          destinationLongitude: geocodeResult.longitude,
          maxWalkingDistance: 500,
          maxResults: 5
        })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: RouteSuggestionsResponse) => {
            console.log('[RouteSuggestion] ✅ Sugerencias recibidas:', response);
            
            if (response.suggestions.length === 0) {
              this.searchState.set(SearchState.NO_RESULTS);
              this.suggestions.set([]);
              this.errorMessage.set('No se encontraron rutas disponibles para ese destino');
            } else {
              this.searchState.set(SearchState.SUCCESS);
              this.suggestions.set(response.suggestions);
            }
          },
          error: (error) => {
            console.error('[RouteSuggestion] ❌ Error obteniendo sugerencias:', error);
            this.searchState.set(SearchState.ERROR);
            this.errorMessage.set('Error al buscar rutas. Verifica que el backend esté corriendo.');
          }
        });
      },
      error: (error) => {
        console.error('[RouteSuggestion] ❌ Error geocodificando:', error);
        this.searchState.set(SearchState.ERROR);
        this.errorMessage.set('Error al buscar el lugar. Verifica tu conexión.');
      }
    });
  }

  /**
   * Selecciona una sugerencia
   */
  selectSuggestion(suggestion: RouteSuggestion): void {
    console.log('[RouteSuggestion] 📌 Sugerencia seleccionada:', suggestion);
    this.selectedSuggestion.set(suggestion);
  }

  /**
   * Vuelve a la lista de sugerencias
   */
  backToList(): void {
    this.selectedSuggestion.set(null);
  }

  /**
   * Limpia la búsqueda
   */
  clearSearch(): void {
    this.destinationInput = '';
    this.destinationQuery.set('');
    this.suggestions.set([]);
    this.selectedSuggestion.set(null);
    this.searchState.set(SearchState.IDLE);
    this.errorMessage.set(null);
  }

  /**
   * Usa mi ubicación actual como origen
   */
  useMyLocation(): void {
    const location = this.userLocation();
    if (location) {
      console.log('[RouteSuggestion] 📍 Usando ubicación actual:', location);
    } else {
      this.errorMessage.set('Obteniendo tu ubicación...');
    }
  }

  /**
   * Formatea distancia
   */
  formatDistance(meters: number): string {
    return this.routeSuggestionService.formatDistance(meters);
  }

  /**
   * Formatea tiempo
   */
  formatTime(minutes: number): string {
    return this.routeSuggestionService.formatTime(minutes);
  }

  /**
   * Obtiene ícono de caminata según distancia
   */
  getWalkingIcon(distance: number): string {
    if (distance < 100) return '🚶'; // Muy cerca
    if (distance < 300) return '🚶‍♂️'; // Cerca
    return '🚶‍♂️💨'; // Lejos
  }

  /**
   * Obtiene clase CSS según puntuación
   */
  getScoreClass(score: number): string {
    if (score >= 80) return 'score-excellent';
    if (score >= 60) return 'score-good';
    if (score >= 40) return 'score-fair';
    return 'score-poor';
  }

  /**
   * Muestra la ruta seleccionada en el mapa
   */
  viewOnMap(): void {
    const suggestion = this.selectedSuggestion();
    
    if (!suggestion || !this.destinationCoordinates) {
      console.warn('[RouteSuggestion] ⚠️ No hay sugerencia seleccionada o coordenadas de destino');
      return;
    }

    console.log('[RouteSuggestion] 🗺️ Mostrando ruta en el mapa:', suggestion);
    
    // Emitir evento para que el componente padre (mapa) maneje la visualización
    this.showRouteOnMap.emit({
      suggestion: suggestion,
      destination: this.destinationCoordinates
    });
  }
}
