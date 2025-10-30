/**
 * Modelo para Puntos de Interés (POI - Point of Interest)
 * Representa lugares como tiendas, restaurantes, bancos, etc.
 */

export interface POI {
  id: string;
  type: POIType;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  phone?: string;
  website?: string;
  openingHours?: string;
  rating?: number;
  tags?: Record<string, string>;
  distance?: number; // Distancia desde el usuario en metros
}

export enum POIType {
  // Comercios
  SHOP = 'shop',
  SUPERMARKET = 'supermarket',
  MALL = 'mall',
  PHARMACY = 'pharmacy',
  
  // Alimentación
  RESTAURANT = 'restaurant',
  CAFE = 'cafe',
  FAST_FOOD = 'fast_food',
  BAR = 'bar',
  
  // Servicios
  BANK = 'bank',
  ATM = 'atm',
  HOSPITAL = 'hospital',
  CLINIC = 'clinic',
  
  // Transporte
  BUS_STOP = 'bus_stop',
  PARKING = 'parking',
  FUEL = 'fuel',
  
  // Educación
  SCHOOL = 'school',
  UNIVERSITY = 'university',
  LIBRARY = 'library',
  
  // Entretenimiento
  CINEMA = 'cinema',
  THEATRE = 'theatre',
  PARK = 'park',
  
  // Gobierno
  POLICE = 'police',
  FIRE_STATION = 'fire_station',
  POST_OFFICE = 'post_office',
  
  // Otros
  HOTEL = 'hotel',
  CHURCH = 'place_of_worship',
  OTHER = 'other'
}

export interface POICategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  types: POIType[];
}

// Categorías predefinidas para filtros
export const POI_CATEGORIES: POICategory[] = [
  {
    id: 'food',
    name: 'Comida',
    icon: '🍽️',
    color: '#FF6B6B',
    types: [POIType.RESTAURANT, POIType.CAFE, POIType.FAST_FOOD, POIType.BAR]
  },
  {
    id: 'shopping',
    name: 'Compras',
    icon: '🛒',
    color: '#4ECDC4',
    types: [POIType.SHOP, POIType.SUPERMARKET, POIType.MALL, POIType.PHARMACY]
  },
  {
    id: 'services',
    name: 'Servicios',
    icon: '🏦',
    color: '#95E1D3',
    types: [POIType.BANK, POIType.ATM, POIType.HOSPITAL, POIType.CLINIC]
  },
  {
    id: 'transport',
    name: 'Transporte',
    icon: '🚌',
    color: '#F38181',
    types: [POIType.BUS_STOP, POIType.PARKING, POIType.FUEL]
  },
  {
    id: 'entertainment',
    name: 'Entretenimiento',
    icon: '🎬',
    color: '#AA96DA',
    types: [POIType.CINEMA, POIType.THEATRE, POIType.PARK]
  },
  {
    id: 'education',
    name: 'Educación',
    icon: '🎓',
    color: '#FCBAD3',
    types: [POIType.SCHOOL, POIType.UNIVERSITY, POIType.LIBRARY]
  }
];

// Mapeo de iconos SVG por tipo de POI
export const POI_ICONS: Record<POIType, string> = {
  [POIType.SHOP]: '🏪',
  [POIType.SUPERMARKET]: '🛒',
  [POIType.MALL]: '🏬',
  [POIType.PHARMACY]: '💊',
  [POIType.RESTAURANT]: '🍽️',
  [POIType.CAFE]: '☕',
  [POIType.FAST_FOOD]: '🍔',
  [POIType.BAR]: '🍺',
  [POIType.BANK]: '🏦',
  [POIType.ATM]: '🏧',
  [POIType.HOSPITAL]: '🏥',
  [POIType.CLINIC]: '⚕️',
  [POIType.BUS_STOP]: '🚏',
  [POIType.PARKING]: '🅿️',
  [POIType.FUEL]: '⛽',
  [POIType.SCHOOL]: '🏫',
  [POIType.UNIVERSITY]: '🎓',
  [POIType.LIBRARY]: '📚',
  [POIType.CINEMA]: '🎬',
  [POIType.THEATRE]: '🎭',
  [POIType.PARK]: '🌳',
  [POIType.POLICE]: '👮',
  [POIType.FIRE_STATION]: '🚒',
  [POIType.POST_OFFICE]: '📮',
  [POIType.HOTEL]: '🏨',
  [POIType.CHURCH]: '⛪',
  [POIType.OTHER]: '📍'
};

/**
 * Búsqueda de POIs con filtros
 */
export interface POISearchRequest {
  latitude: number;
  longitude: number;
  radius: number; // en metros
  types?: POIType[];
  limit?: number;
}

export interface POISearchResponse {
  pois: POI[];
  count: number;
  searchTime: number; // en milisegundos
}
