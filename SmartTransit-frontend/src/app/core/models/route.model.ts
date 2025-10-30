export interface Route {
  id: string;
  name: string;
  color: string;
  polyline: [number, number][];
  stops: Stop[];
}

export interface Stop {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}


export interface RouteState {
  route: Route;
  visible: boolean;
  selected: boolean;
}
