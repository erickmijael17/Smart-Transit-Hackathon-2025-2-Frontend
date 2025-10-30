import * as L from 'leaflet';

/**
 * Crea un icono especial de bus para el conductor con etiqueta "Esta es tu ubicación"
 */
export function createDriverBusIcon(color: string = '#667eea', size: number = 50): L.DivIcon {
  const svgIcon = `
    <svg width="${size}" height="${size}" viewBox="0 0 60 70" xmlns="http://www.w3.org/2000/svg">
      <!-- Sombra -->
      <ellipse cx="30" cy="58" rx="20" ry="4" fill="rgba(0,0,0,0.25)"/>

      <!-- Cuerpo del bus (más grande y destacado) -->
      <g>
        <!-- Carrocería principal con glow -->
        <defs>
          <filter id="glow-driver">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        <rect x="10" y="18" width="40" height="32" rx="5" ry="5" fill="${color}" stroke="white" stroke-width="3" filter="url(#glow-driver)"/>

        <!-- Ventanas más grandes -->
        <rect x="14" y="22" width="14" height="10" rx="2" fill="white" opacity="0.95"/>
        <rect x="32" y="22" width="14" height="10" rx="2" fill="white" opacity="0.95"/>

        <!-- Parabrisas delantero -->
        <path d="M 12 18 L 48 18 L 44 12 L 16 12 Z" fill="${color}" stroke="white" stroke-width="2"/>
        <rect x="18" y="12" width="24" height="6" rx="2" fill="rgba(255,255,255,0.7)"/>

        <!-- Ruedas más grandes -->
        <circle cx="20" cy="50" r="7" fill="#2C3E50" stroke="white" stroke-width="2.5"/>
        <circle cx="20" cy="50" r="3.5" fill="#95A5A6"/>
        <circle cx="40" cy="50" r="7" fill="#2C3E50" stroke="white" stroke-width="2.5"/>
        <circle cx="40" cy="50" r="3.5" fill="#95A5A6"/>

        <!-- Luces brillantes -->
        <circle cx="16" cy="36" r="3" fill="#FFD400" opacity="0.9"/>
        <circle cx="44" cy="36" r="3" fill="#FFD400" opacity="0.9"/>

        <!-- Detalles -->
        <line x1="30" y1="22" x2="30" y2="32" stroke="white" stroke-width="2" opacity="0.6"/>
        <rect x="28" y="42" width="4" height="3" rx="1" fill="white" opacity="0.8"/>
      </g>

      <!-- Efecto de movimiento mejorado -->
      <g opacity="0.5">
        <path d="M 0 28 Q 5 26, 10 28" stroke="${color}" stroke-width="2" fill="none" stroke-linecap="round"/>
        <path d="M 0 32 Q 5 30, 10 32" stroke="${color}" stroke-width="2" fill="none" stroke-linecap="round"/>
      </g>
    </svg>
  `;

  const htmlIcon = `
    <div class="driver-bus-marker-wrapper">
      <div class="driver-bus-label">
        <div class="label-text">Esta es tu ubicación</div>
        <div class="label-arrow"></div>
      </div>
      <div class="driver-bus-pulse"></div>
      ${svgIcon}
    </div>
  `;

  return L.divIcon({
    html: htmlIcon,
    className: 'custom-driver-bus-marker',
    iconSize: [size, size + 30], // Extra espacio para la etiqueta
    iconAnchor: [size / 2, size + 30],
    popupAnchor: [0, -(size + 40)]
  });
}

/**
 * Genera el CSS necesario para los markers de bus del conductor
 */
export function getDriverBusMarkerStyles(): string {
  return `
    .custom-driver-bus-marker {
      background: none !important;
      border: none !important;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .driver-bus-marker-wrapper {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      animation: driverBusAppear 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    /* Etiqueta "Esta es tu ubicación" */
    .driver-bus-label {
      position: absolute;
      bottom: 100%;
      margin-bottom: 8px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      white-space: nowrap;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      animation: labelPulse 2s ease-in-out infinite;
      z-index: 1000;
    }

    .driver-bus-label .label-text {
      position: relative;
      z-index: 1;
    }

    .driver-bus-label .label-arrow {
      position: absolute;
      bottom: -6px;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-top: 6px solid #667eea;
    }

    /* Pulso del marker */
    .driver-bus-pulse {
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(102, 126, 234, 0.4) 0%, transparent 70%);
      animation: driverBusPulse 2s ease-out infinite;
      z-index: 0;
      box-shadow: 0 0 30px rgba(102, 126, 234, 0.6);
    }

    /* SVG del bus del conductor */
    .driver-bus-marker-wrapper svg {
      position: relative;
      z-index: 1;
      filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.4)) 
              drop-shadow(0 4px 12px rgba(102, 126, 234, 0.6));
      transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    /* Animación de aparición */
    @keyframes driverBusAppear {
      0% {
        transform: scale(0) translateY(-50px);
        opacity: 0;
      }
      50% {
        transform: scale(1.2) translateY(5px);
        opacity: 0.9;
      }
      100% {
        transform: scale(1) translateY(0);
        opacity: 1;
      }
    }

    /* Pulso del bus */
    @keyframes driverBusPulse {
      0% {
        transform: scale(0.9);
        opacity: 0.6;
      }
      50% {
        transform: scale(1.8);
        opacity: 0.2;
      }
      100% {
        transform: scale(2.5);
        opacity: 0;
      }
    }

    /* Pulso de la etiqueta */
    @keyframes labelPulse {
      0%, 100% {
        transform: translateY(0) scale(1);
      }
      50% {
        transform: translateY(-3px) scale(1.05);
      }
    }

    /* Efecto hover */
    .custom-driver-bus-marker:hover .driver-bus-marker-wrapper svg {
      transform: scale(1.15);
    }

    .custom-driver-bus-marker:hover .driver-bus-label {
      animation: labelPulse 1s ease-in-out infinite;
    }
  `;
}



