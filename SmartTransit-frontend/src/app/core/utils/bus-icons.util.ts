import * as L from 'leaflet';


/**
 * Genera un icono de bus SVG con el color especificado
 */
export function createBusIcon(color: string = '#00B2FF', size: number = 40): L.DivIcon {
  const svgIcon = `
    <svg width="${size}" height="${size}" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <!-- Sombra -->
      <ellipse cx="24" cy="44" rx="16" ry="3" fill="rgba(0,0,0,0.2)"/>

      <!-- Cuerpo del bus -->
      <g>
        <!-- Carrocería principal -->
        <rect x="8" y="14" width="32" height="24" rx="4" ry="4" fill="${color}" stroke="white" stroke-width="2"/>

        <!-- Ventanas -->
        <rect x="11" y="17" width="11" height="8" rx="2" fill="white" opacity="0.9"/>
        <rect x="26" y="17" width="11" height="8" rx="2" fill="white" opacity="0.9"/>

        <!-- Parabrisas delantero -->
        <path d="M 10 14 L 38 14 L 35 10 L 13 10 Z" fill="${color}" stroke="white" stroke-width="1.5"/>
        <rect x="14" y="10" width="20" height="4" rx="2" fill="rgba(255,255,255,0.6)"/>

        <!-- Ruedas -->
        <circle cx="16" cy="38" r="5" fill="#2C3E50" stroke="white" stroke-width="2"/>
        <circle cx="16" cy="38" r="2.5" fill="#95A5A6"/>
        <circle cx="32" cy="38" r="5" fill="#2C3E50" stroke="white" stroke-width="2"/>
        <circle cx="32" cy="38" r="2.5" fill="#95A5A6"/>

        <!-- Luces -->
        <circle cx="13" cy="30" r="2" fill="#FFD400" opacity="0.8"/>
        <circle cx="35" cy="30" r="2" fill="#FFD400" opacity="0.8"/>

        <!-- Detalles -->
        <line x1="23" y1="17" x2="23" y2="25" stroke="white" stroke-width="1.5" opacity="0.5"/>
        <rect x="22" y="34" width="4" height="2" rx="1" fill="white" opacity="0.7"/>
      </g>

      <!-- Indicador de movimiento (olas) -->
      <g opacity="0.4">
        <path d="M 2 22 Q 4 20, 6 22" stroke="${color}" stroke-width="1.5" fill="none" stroke-linecap="round"/>
        <path d="M 2 26 Q 4 24, 6 26" stroke="${color}" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      </g>
    </svg>
  `;

  const htmlIcon = `
    <div class="bus-marker-wrapper">
      <div class="bus-marker-pulse" style="background: ${color}20;"></div>
      ${svgIcon}
    </div>
  `;

  return L.divIcon({
    html: htmlIcon,
    className: 'custom-bus-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2]
  });
}

/**
 * Genera un icono de bus pequeño para vista lejana
 */
export function createSmallBusIcon(color: string = '#00B2FF'): L.DivIcon {
  const svgIcon = `
    <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" fill="${color}" opacity="0.9" stroke="white" stroke-width="2"/>
      <circle cx="12" cy="12" r="6" fill="white" opacity="0.8"/>
      <rect x="9" y="10" width="6" height="4" rx="1" fill="${color}"/>
    </svg>
  `;

  return L.divIcon({
    html: svgIcon,
    className: 'custom-bus-marker-small',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
}

/**
 * Genera el CSS necesario para los markers de bus con efectos premium
 */
export function getBusMarkerStyles(): string {
  return `
    .custom-bus-marker {
      background: none !important;
      border: none !important;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .custom-bus-marker-small {
      background: none !important;
      border: none !important;
    }

    .bus-marker-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: busAppearPremium 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
      transform-style: preserve-3d;
    }

    /* Efecto de trail/estela detrás del bus */
    .bus-marker-wrapper::before {
      content: '';
      position: absolute;
      width: 120%;
      height: 120%;
      background: radial-gradient(circle, currentColor 0%, transparent 70%);
      opacity: 0.15;
      border-radius: 50%;
      z-index: -1;
      animation: trailPulse 1.5s ease-out infinite;
    }

    /* Pulso principal mejorado */
    .bus-marker-pulse {
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      animation: busPulsePremium 2.5s ease-out infinite;
      z-index: 0;
      box-shadow: 0 0 20px currentColor;
    }

    /* SVG del bus con efectos mejorados */
    .bus-marker-wrapper svg {
      position: relative;
      z-index: 1;
      filter: drop-shadow(0 6px 12px rgba(0, 0, 0, 0.35)) 
              drop-shadow(0 2px 6px rgba(0, 178, 255, 0.4));
      transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      transform-style: preserve-3d;
    }

    /* Hover mejorado con efecto 3D */
    .custom-bus-marker:hover .bus-marker-wrapper svg {
      transform: scale(1.2) translateZ(10px);
      filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.4)) 
              drop-shadow(0 4px 12px rgba(0, 178, 255, 0.6))
              drop-shadow(0 0 20px currentColor);
    }

    .custom-bus-marker:hover .bus-marker-pulse {
      animation-duration: 1.2s;
    }

    /* Animación de aparición premium con rebote */
    @keyframes busAppearPremium {
      0% {
        transform: scale(0) translateY(-40px) rotate(-20deg);
        opacity: 0;
      }
      50% {
        transform: scale(1.15) translateY(5px) rotate(5deg);
        opacity: 0.9;
      }
      70% {
        transform: scale(0.95) translateY(-2px) rotate(-2deg);
      }
      100% {
        transform: scale(1) translateY(0) rotate(0deg);
        opacity: 1;
      }
    }

    /* Pulso premium con múltiples capas */
    @keyframes busPulsePremium {
      0% {
        transform: scale(0.9);
        opacity: 0.7;
      }
      50% {
        transform: scale(1.6);
        opacity: 0.3;
      }
      100% {
        transform: scale(2.2);
        opacity: 0;
      }
    }

    /* Efecto de estela/trail */
    @keyframes trailPulse {
      0%, 100% {
        transform: scale(1);
        opacity: 0.15;
      }
      50% {
        transform: scale(1.3);
        opacity: 0.05;
      }
    }

    /* Animación de movimiento suave */
    .bus-moving {
      animation: busFloat 3s ease-in-out infinite;
    }

    @keyframes busFloat {
      0%, 100% {
        transform: translateY(0px);
      }
      50% {
        transform: translateY(-3px);
      }
    }
  `;
}
