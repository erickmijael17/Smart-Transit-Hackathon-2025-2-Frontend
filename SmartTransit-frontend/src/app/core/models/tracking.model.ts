export interface BusPosition {
  busId: string;
  routeId: string;
  latitude: number;
  longitude: number;
  bearing: number;
  speed: number;
  status: string;
  timestamp: string;
  progress: number;
  
  // Información extendida para pasajeros
  estimatedArrivalTime?: string; // Tiempo estimado de llegada al destino final
  nextStopId?: string; // ID de la próxima parada
  nextStopName?: string; // Nombre de la próxima parada
  distanceToDestination?: number; // Distancia en metros al destino final
  occupancyLevel?: OccupancyLevel; // Nivel de ocupación del bus
  passengerCount?: number; // Número de pasajeros
  delay?: number; // Retraso en minutos (positivo = tarde, negativo = adelantado)
}

/**
 * Estado de conexión del WebSocket
 */
export enum ConnectionStatus {
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  ERROR = 'ERROR'
}

/**
 * Nivel de ocupación del bus
 */
export enum OccupancyLevel {
  EMPTY = 'EMPTY',           // Vacío (0-20%)
  AVAILABLE = 'AVAILABLE',   // Asientos disponibles (21-60%)
  CROWDED = 'CROWDED',       // Lleno (61-85%)
  FULL = 'FULL'              // Completo (86-100%)
}

/**
 * Estado operativo del bus
 */
export enum BusStatus {
  ACTIVE = 'ACTIVE',         // En servicio normal
  DELAYED = 'DELAYED',       // Con retraso
  STOPPED = 'STOPPED',       // Detenido temporalmente
  COMPLETED = 'COMPLETED',   // Recorrido completado
  OUT_OF_SERVICE = 'OUT_OF_SERVICE' // Fuera de servicio
}


export interface BusMarkerInfo {
  routeId: string;
  marker: L.Marker;
  lastPosition: [number, number];
  targetPosition: [number, number];
  animationFrame?: number;
  completionProgress?: number; // Progreso de animación de desaparición (0-1)
  isRemoving?: boolean; // Flag para indicar que el bus está siendo removido
}

/**
 * Información de seguimiento de bus para pasajeros
 */
export interface BusTrackingInfo {
  busPosition: BusPosition;
  routeName: string;
  routeColor: string;
  isActive: boolean;
  isNearby: boolean; // Si está cerca de la ubicación del usuario
  distanceToUser?: number; // Distancia en metros al usuario
}
