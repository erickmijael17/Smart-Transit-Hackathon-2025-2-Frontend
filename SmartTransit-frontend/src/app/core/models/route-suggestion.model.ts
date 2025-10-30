/**
 * Modelos para el sistema de sugerencia de rutas
 * Basado en mejores prácticas 2025
 */

/**
 * Solicitud de sugerencia de ruta
 */
export interface RouteSuggestionRequest {
  // Ubicación actual del usuario
  originLatitude: number;
  originLongitude: number;
  
  // Ubicación de destino
  destinationLatitude: number;
  destinationLongitude: number;
  
  // Opciones adicionales
  maxWalkingDistance?: number;  // Distancia máxima a caminar (metros)
  maxResults?: number;          // Número máximo de resultados
}

/**
 * Tipo de trazado de caminata
 */
export enum WalkingPathType {
  USER_TO_STOP = 'USER_TO_STOP',
  STOP_TO_DESTINATION = 'STOP_TO_DESTINATION'
}

/**
 * Trazado de caminata (recibido del backend)
 */
export interface WalkingPath {
  type: WalkingPathType;
  coordinates: [number, number][];  // Array de [lat, lon]
  distance: number;                  // Metros
  estimatedWalkingTime: number;      // Minutos
  description: string;               // Texto descriptivo
  color: string;                     // Color hexadecimal para el mapa
}

/**
 * Sugerencia de ruta del backend
 */
export interface RouteSuggestion {
  // Información de la ruta
  routeId: string;
  routeName: string;
  routeColor: string;
  
  // Paradas
  boardingStop: StopInfo;      // Parada donde subir
  alightingStop: StopInfo;     // Parada donde bajar
  
  // Distancias y tiempos
  walkingDistanceToStop: number;     // Metros hasta la parada
  walkingTimeToStop: number;         // Minutos caminando hasta la parada
  estimatedTravelTime: number;       // Minutos en el bus
  totalTripTime: number;             // Tiempo total del viaje
  
  // Información adicional
  numberOfStops: number;             // Número de paradas en la ruta
  score: number;                     // Puntuación de relevancia (0-100)
  directions?: string;               // Instrucciones textuales
  
  // Trazados de caminata (NUEVO - del backend inteligente)
  walkingPaths?: WalkingPath[];      // Trazados visuales de caminata
}

/**
 * Información de una parada
 */
export interface StopInfo {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distanceFromOrigin?: number;      // Metros desde el origen
  distanceFromDestination?: number; // Metros desde el destino
}

/**
 * Respuesta del backend con múltiples sugerencias
 */
export interface RouteSuggestionsResponse {
  suggestions: RouteSuggestion[];
  originAddress?: string;           // Dirección de origen
  destinationAddress?: string;      // Dirección de destino
  totalSuggestions: number;
  message?: string;
}

/**
 * Estado de la búsqueda
 */
export enum SearchState {
  IDLE = 'idle',
  SEARCHING = 'searching',
  SUCCESS = 'success',
  ERROR = 'error',
  NO_RESULTS = 'no_results'
}

/**
 * Ubicación para el buscador (puede ser coordenadas o dirección)
 */
export interface SearchLocation {
  // Si es por coordenadas
  latitude?: number;
  longitude?: number;
  
  // Si es por dirección/nombre
  address?: string;
  placeName?: string;
  
  // Metadata
  displayName: string;  // Texto para mostrar
  source: 'gps' | 'search' | 'manual';
}
