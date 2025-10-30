
export interface GeocodingRequest {
  address: string;
}


export interface GeocodingResponse {
  latitude: number;
  longitude: number;
  displayName: string;
}


export interface ReverseGeocodingResponse {
  address: string;
  latitude: number;
  longitude: number;
}
