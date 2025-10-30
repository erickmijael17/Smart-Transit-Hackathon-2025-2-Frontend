import { Injectable, inject, signal, computed, DestroyRef } from '@angular/core';
import { Client, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { BusPosition, ConnectionStatus } from '../models/tracking.model';
import { Subject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TrackingService {
  private readonly destroyRef = inject(DestroyRef);

  // Cliente STOMP para WebSocket
  private stompClient!: Client;
  private subscription?: StompSubscription;

  // Subject para emitir posiciones de buses
  private busPositionSubject = new Subject<BusPosition>();
  
  // Subject para buses que completan su recorrido (progreso >= 100%)
  private busCompletedSubject = new Subject<BusPosition>();
  
  // Mapa de buses activos en el sistema
  private activeBuses = new Map<string, BusPosition>();

  // Signals para estado reactivo (Angular 20)
  private readonly connectionStatusSignal = signal<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  private readonly reconnectAttemptsSignal = signal(0);
  private readonly lastErrorSignal = signal<string | null>(null);
  private readonly activeBusCountSignal = signal(0);
  private readonly completedBusCountSignal = signal(0);

  // Computed signals
  readonly connectionStatus = this.connectionStatusSignal.asReadonly();
  readonly reconnectAttempts = this.reconnectAttemptsSignal.asReadonly();
  readonly lastError = this.lastErrorSignal.asReadonly();
  readonly activeBusCount = this.activeBusCountSignal.asReadonly();
  readonly completedBusCount = this.completedBusCountSignal.asReadonly();
  readonly isConnected = computed(() => this.connectionStatusSignal() === ConnectionStatus.CONNECTED);
  readonly isConnecting = computed(() => this.connectionStatusSignal() === ConnectionStatus.CONNECTING);
  readonly hasError = computed(() => this.connectionStatusSignal() === ConnectionStatus.ERROR);

  // Observable público para suscribirse a posiciones
  readonly busPositions$: Observable<BusPosition> = this.busPositionSubject.asObservable();
  
  // Observable para buses que completan su recorrido
  readonly busCompleted$: Observable<BusPosition> = this.busCompletedSubject.asObservable();

  // Configuración
  private readonly WS_ENDPOINT = 'http://localhost:8080/ws-tracking';
  private readonly TOPIC_POSITIONS = '/topic/positions';
  private readonly RECONNECT_DELAY = 5000;
  private readonly MAX_RECONNECT_ATTEMPTS = 10;

  constructor() {
    // Cleanup automático cuando el servicio se destruya
    this.destroyRef.onDestroy(() => {
      this.disconnect();
    });
  }

  /**
   * Conecta al WebSocket del backend
   */
  connect(): void {
    if (this.stompClient?.active) {
      console.warn('[TrackingService] Ya existe una conexión activa');
      return;
    }

    this.connectionStatusSignal.set(ConnectionStatus.CONNECTING);
    this.lastErrorSignal.set(null);

    // Configurar cliente STOMP
    this.stompClient = new Client({
      webSocketFactory: () => new SockJS(this.WS_ENDPOINT),

      debug: (str) => {
        if (str.includes('ERROR') || str.includes('CLOSE')) {
          console.error('[TrackingService]', str);
        }
      },

      reconnectDelay: this.RECONNECT_DELAY,

      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,

      onConnect: () => {
        this.onConnected();
      },

      onStompError: (frame) => {
        this.onError(`STOMP error: ${frame.headers['message']}`);
      },

      onWebSocketError: (event) => {
        this.onError('WebSocket connection error');
      },

      onWebSocketClose: (event) => {
        this.onDisconnected();
      }
    });

    // Activar conexión
    this.stompClient.activate();
  }

  /**
   * Desconecta del WebSocket
   */
  disconnect(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = undefined;
    }

    if (this.stompClient?.active) {
      this.stompClient.deactivate();
    }

    this.connectionStatusSignal.set(ConnectionStatus.DISCONNECTED);
    this.reconnectAttemptsSignal.set(0);
  }

  /**
   * Reconecta al WebSocket
   */
  reconnect(): void {
    const attempts = this.reconnectAttemptsSignal();

    if (attempts >= this.MAX_RECONNECT_ATTEMPTS) {
      this.onError(`Max reconnect attempts (${this.MAX_RECONNECT_ATTEMPTS}) reached`);
      return;
    }

    this.reconnectAttemptsSignal.update(v => v + 1);
    console.log(`[TrackingService] Intento de reconexión ${attempts + 1}/${this.MAX_RECONNECT_ATTEMPTS}`);

    this.disconnect();

    setTimeout(() => {
      this.connect();
    }, this.RECONNECT_DELAY);
  }

  /**
   * Callback cuando se establece la conexión
   */
  private onConnected(): void {
    console.log('[TrackingService] ✅ Conectado al WebSocket de tracking');

    this.connectionStatusSignal.set(ConnectionStatus.CONNECTED);
    this.reconnectAttemptsSignal.set(0);
    this.lastErrorSignal.set(null);

    // Suscribirse al tópico de posiciones
    this.subscription = this.stompClient.subscribe(this.TOPIC_POSITIONS, (message) => {
      try {
        const busPosition: BusPosition = JSON.parse(message.body);
        
        // Actualizar buses activos
        this.activeBuses.set(busPosition.busId, busPosition);
        this.activeBusCountSignal.set(this.activeBuses.size);
        
        // Verificar si el bus completó su recorrido
        if (busPosition.progress >= 100) {
          console.log(`[TrackingService] 🎯 Bus ${busPosition.busId} completó su recorrido (${busPosition.progress}%)`);
          this.busCompletedSubject.next(busPosition);
          this.completedBusCountSignal.update(v => v + 1);
          
          // Remover del tracking activo después de un breve delay
          setTimeout(() => {
            this.activeBuses.delete(busPosition.busId);
            this.activeBusCountSignal.set(this.activeBuses.size);
          }, 3000); // 3 segundos para animación de salida
        }
        
        // Emitir la posición
        this.busPositionSubject.next(busPosition);
      } catch (error) {
        console.error('[TrackingService] Error parsing message:', error);
      }
    });

    console.log(`[TrackingService] 📡 Suscrito a ${this.TOPIC_POSITIONS}`);
  }

  /**
   * Callback cuando se pierde la conexión
   */
  private onDisconnected(): void {
    console.warn('[TrackingService] ⚠️ Desconectado del WebSocket');

    const currentStatus = this.connectionStatusSignal();

    // Solo cambiar estado si no es un error
    if (currentStatus !== ConnectionStatus.ERROR) {
      this.connectionStatusSignal.set(ConnectionStatus.DISCONNECTED);
    }
  }

  /**
   * Callback cuando ocurre un error
   */
  private onError(errorMessage: string): void {
    console.error('[TrackingService] ❌', errorMessage);

    this.connectionStatusSignal.set(ConnectionStatus.ERROR);
    this.lastErrorSignal.set(errorMessage);
  }

  /**
   * Obtiene estadísticas de la conexión
   */
  getConnectionStats(): {
    status: ConnectionStatus;
    reconnectAttempts: number;
    lastError: string | null;
    isActive: boolean;
  } {
    return {
      status: this.connectionStatusSignal(),
      reconnectAttempts: this.reconnectAttemptsSignal(),
      lastError: this.lastErrorSignal(),
      isActive: this.stompClient?.active ?? false
    };
  }

  /**
   * Obtiene todos los buses activos en el sistema
   */
  getActiveBuses(): BusPosition[] {
    return Array.from(this.activeBuses.values());
  }

  /**
   * Obtiene buses activos para una ruta específica
   */
  getActiveBusesByRoute(routeId: string): BusPosition[] {
    return this.getActiveBuses().filter(bus => bus.routeId === routeId);
  }

  /**
   * Obtiene la cantidad de buses activos para una ruta
   */
  getActiveBusCountByRoute(routeId: string): number {
    return this.getActiveBusesByRoute(routeId).length;
  }

  /**
   * Verifica si un bus específico está activo
   */
  isBusActive(busId: string): boolean {
    return this.activeBuses.has(busId);
  }

  /**
   * Limpia todos los buses activos (útil para reiniciar)
   */
  clearActiveBuses(): void {
    this.activeBuses.clear();
    this.activeBusCountSignal.set(0);
  }
}
