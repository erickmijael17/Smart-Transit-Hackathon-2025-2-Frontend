# 🚍 SmartTransit

**Sistema de Información de Transporte Público - Juliaca, Perú**

Aplicación web moderna para visualizar rutas de transporte público en tiempo real, desarrollada con Angular 20 y diseño inspirado en WAZE.

![Angular](https://img.shields.io/badge/Angular-20.3-red?logo=angular)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)
![Leaflet](https://img.shields.io/badge/Leaflet-1.9-green?logo=leaflet)

---

## 📋 Tabla de Contenidos

- [Características](#características)
- [Tecnologías](#tecnologías)
- [Requisitos Previos](#requisitos-previos)
- [Instalación](#instalación)
- [Configuración del Backend](#configuración-del-backend)
- [Ejecución](#ejecución)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Componentes Principales](#componentes-principales)
- [API del Backend](#api-del-backend)
- [Buenas Prácticas Implementadas](#buenas-prácticas-implementadas)

---

## ✨ Características

### 🗺️ Visualización de Mapas Premium
- **Mapa interactivo** con Leaflet y tiles CartoDB Voyager
- **Rutas con efectos 3D**: múltiples capas de sombra para profundidad
- **Labels flotantes inteligentes**: Al seleccionar una ruta, su nombre aparece como label permanente sobre el mapa
- **Tooltips con glassmorphism**: Diseño premium con gradientes, brillo interno y animaciones
- **Trazado animado** de rutas con efectos de dibujo progresivo
- **Gradientes y brillos** dinámicos en rutas activas
- **Puntos de inicio y fin** con efectos 3D y animaciones de rebote
- **Markers interactivos** con pulsos múltiples y efectos hover premium
- **Popups premium** con información detallada y acciones rápidas
- **Transiciones fluidas** al mostrar/ocultar elementos
- **Zoom inteligente** y navegación con easing suave
- **Geolocalización** del usuario con botón personalizado

### 📱 Lista de Rutas (Estilo WAZE)
- **Lista lateral** con todas las líneas de transporte
- **Búsqueda en tiempo real** de rutas
- **Selección múltiple** de rutas
- **Mostrar/Ocultar** rutas individualmente
- **Contador de buses activos** por ruta en tiempo real
- **Indicador EN VIVO** para rutas con buses en tránsito
- **Estado de conexión** del sistema de tracking
- **Diseño moderno** con gradientes y animaciones

### 🎨 UI/UX Premium (NIVEL SIGUIENTE)
- **Diseño inspirado en WAZE** con gradientes vibrantes y efectos glassmorphism
- **Animaciones con física**: rebotes, easing y efectos de profundidad 3D
- **Efectos de trail/estela** en buses en movimiento
- **Sombras dinámicas** y múltiples capas de profundidad
- **Transiciones cinematográficas** con cubic-bezier premium
- **Hover effects premium** con transformaciones 3D
- **Pulsos avanzados** con múltiples ondas concéntricas
- **Responsive design** optimizado para móviles y desktop
- **Sidebar colapsable** con animaciones fluidas
- **Header fijo** con información contextual en tiempo real

### 🚍 Tracking en Tiempo Real (PREMIUM)
- **WebSocket** para actualizaciones en tiempo real de buses
- **Desaparición automática** de buses al completar recorrido (100%)
- **Sincronización inteligente**: buses se ocultan/muestran con sus rutas
- **Animación suave** de movimiento y rotación de buses
- **Efectos trail/estela** detrás de buses en movimiento
- **Panel de información** flotante con buses activos
- **Estadísticas en vivo**: buses activos y completados
- **Progreso visual** de cada bus en su ruta
- **Información para pasajeros**: velocidad, ocupación, próxima parada
- **Tiempo estimado de llegada** al destino final
- **Iconos 3D animados** de buses con colores de ruta

### ⚡ Rendimiento
- **Signals API** de Angular 20 para reactividad óptima
- **Lazy loading** de componentes
- **Caché de datos** con BehaviorSubject
- **Optimización de renderizado** con OnPush
- **Gestión eficiente** de animaciones con requestAnimationFrame

---

## 🛠️ Tecnologías

### Frontend
- **Angular 20.3** - Framework principal
- **TypeScript 5.9** - Lenguaje de programación
- **RxJS 7.8** - Programación reactiva
- **Leaflet 1.9** - Biblioteca de mapas
- **SCSS** - Preprocesador CSS

### Backend (Integrado)
- **Spring Boot 3.5.7** - Framework backend
- **Java 25** - Lenguaje backend
- **PostgreSQL** - Base de datos (opcional)

---

## 📦 Requisitos Previos

- **Node.js** >= 18.x
- **npm** >= 9.x
- **Angular CLI** >= 20.x
- **Java** 25 (para backend)
- **Maven** (para backend)

---

## 🚀 Instalación

### 1. Clonar el repositorio

```bash
cd c:\Proyectos\Frontend\Angular\SmartTransit
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Verificar instalación

```bash
ng version
```

---

## 🔧 Configuración del Backend

### Prerequisito: Backend Spring Boot debe estar corriendo

El backend debe estar ejecutándose en `http://localhost:8080`

**Endpoints requeridos:**
- `GET /api/transit/routes` - Obtiene todas las rutas
- `GET /api/transit/stops` - Obtiene todas las paradas
- `POST /api/geocoding/search` - Busca direcciones (opcional)

### Verificar Backend

Abre en el navegador:
```
http://localhost:8080/api/transit/routes
```

Deberías ver un JSON con las rutas disponibles.

---

## ▶️ Ejecución

### Desarrollo

```bash
npm start
# o
ng serve
```

Abre el navegador en: `http://localhost:4200`

### Producción

```bash
ng build --configuration production
```

Los archivos se generarán en `dist/`

---

## 📁 Estructura del Proyecto

```
src/
├── app/
│   ├── core/                    # Módulo core
│   │   ├── models/              # Interfaces y modelos
│   │   │   ├── route.model.ts   # Modelo de rutas y paradas
│   │   │   └── geocoding.model.ts
│   │   └── services/            # Servicios globales
│   │       ├── transit.service.ts      # Servicio API de rutas
│   │       ├── geocoding.service.ts    # Servicio de geocodificación
│   │       ├── map-state.service.ts    # Estado del mapa (Signals)
│   │       └── layout.service.ts       # Estado del layout
│   │
│   ├── features/                # Módulos de funcionalidades
│   │   ├── mapa/                # Componente del mapa
│   │   │   ├── mapa.ts
│   │   │   ├── mapa.html
│   │   │   └── mapa.scss
│   │   └── rutas/               # Módulo de rutas
│   │       └── route-list/      # Lista de rutas
│   │           ├── route-list.ts
│   │           ├── route-list.html
│   │           └── route-list.scss
│   │
│   ├── layout/                  # Componentes de layout
│   │   ├── header/              # Header principal
│   │   │   ├── header.ts
│   │   │   ├── header.html
│   │   │   └── header.scss
│   │   └── sidebar/             # Sidebar lateral
│   │       ├── sidebar.ts
│   │       ├── sidebar.html
│   │       └── sidebar.scss
│   │
│   ├── app.ts                   # Componente raíz
│   ├── app.html                 # Template raíz
│   ├── app.scss                 # Estilos raíz
│   ├── app.config.ts            # Configuración de la app
│   └── app.routes.ts            # Rutas de la aplicación
│
├── styles.scss                  # Estilos globales
└── index.html                   # HTML principal
```

---

## 🧩 Componentes Principales

### MapaComponent
**Ubicación:** `features/mapa/mapa.ts`

**Responsabilidades:**
- Inicializa el mapa de Leaflet
- Carga rutas y paradas desde el backend
- Renderiza rutas con polylines
- Renderiza paradas con markers
- Maneja interacciones (hover, click)
- Reacciona a cambios de estado con Signals

**Características:**
- Usa tiles CartoDB Voyager (estilo moderno)
- Popups informativos en rutas y paradas
- Resaltado de rutas seleccionadas
- Animaciones suaves

### RouteListComponent
**Ubicación:** `features/rutas/route-list/route-list.ts`

**Responsabilidades:**
- Muestra lista de todas las rutas
- Búsqueda en tiempo real
- Selección de rutas
- Control de visibilidad
- Acciones rápidas (mostrar/ocultar todas)

**Características:**
- Diseño tipo WAZE con tarjetas
- Indicadores de color de ruta
- Estados visuales (seleccionado, enfocado, oculto)
- Contador de rutas y selecciones

### TransitService
**Ubicación:** `core/services/transit.service.ts`

**Responsabilidades:**
- Conexión HTTP con el backend
- Caché de rutas y paradas
- Estado de carga
- Observables para reactividad

### MapStateService
**Ubicación:** `core/services/map-state.service.ts`

**Responsabilidades:**
- Manejo de estado del mapa con Signals API
- Selección de rutas
- Visibilidad de rutas
- Foco en rutas
- Vista del mapa (centro y zoom)

---

## 🔌 API del Backend

### GET /api/transit/routes

**Respuesta:**
```json
[
  {
    "id": "R001",
    "name": "Línea 18",
    "color": "#007bff",
    "polyline": [
      [-15.49, -70.13],
      [-15.50, -70.14]
    ],
    "stops": []
  }
]
```

### GET /api/transit/stops

**Respuesta:**
```json
[
  {
    "id": "S001",
    "name": "Parada Central",
    "latitude": -15.49,
    "longitude": -70.13
  }
]
```

### WebSocket /ws-tracking

**Tópico:** `/topic/positions`

**Mensaje de Bus:**
```json
{
  "busId": "BUS-001",
  "routeId": "R001",
  "latitude": -15.49,
  "longitude": -70.13,
  "bearing": 45,
  "speed": 35.5,
  "status": "ACTIVE",
  "timestamp": "2025-01-28T21:30:00Z",
  "progress": 65,
  "estimatedArrivalTime": "22:15",
  "nextStopId": "S005",
  "nextStopName": "Plaza Principal",
  "occupancyLevel": "AVAILABLE",
  "passengerCount": 25,
  "delay": 2
}
```

**Niveles de Ocupación:**
- `EMPTY`: Vacío (0-20%)
- `AVAILABLE`: Asientos disponibles (21-60%)
- `CROWDED`: Lleno (61-85%)
- `FULL`: Completo (86-100%)

**Estados del Bus:**
- `ACTIVE`: En servicio normal
- `DELAYED`: Con retraso
- `STOPPED`: Detenido temporalmente
- `COMPLETED`: Recorrido completado (se oculta automáticamente)
- `OUT_OF_SERVICE`: Fuera de servicio

---

## 🎯 Buenas Prácticas Implementadas

### Angular 20 (2025)

✅ **Standalone Components** - Todos los componentes son standalone
✅ **Signals API** - Estado reactivo con signals en lugar de observables donde es apropiado
✅ **inject()** - Inyección de dependencias con función inject()
✅ **@if/@for** - Nueva sintaxis de control flow
✅ **provideHttpClient()** - Configuración moderna de HttpClient
✅ **Typed Forms** - Formularios fuertemente tipados

### Arquitectura

✅ **Separación de responsabilidades** - Core, Features, Layout
✅ **Services con estado** - Servicios singleton con providedIn: 'root'
✅ **Modelos tipados** - Interfaces TypeScript para todos los datos
✅ **Reactive patterns** - RxJS para operaciones asíncronas
✅ **Inmutabilidad** - Uso de update() en signals

### Performance

✅ **Lazy loading** - Componentes standalone cargados bajo demanda
✅ **OnPush** - Estrategia de detección de cambios optimizada
✅ **shareReplay()** - Caché de respuestas HTTP
✅ **takeUntil()** - Limpieza de suscripciones
✅ **Computed signals** - Valores derivados optimizados

### UX/UI

✅ **Loading states** - Spinners y estados de carga
✅ **Error handling** - Manejo de errores con mensajes claros
✅ **Responsive design** - Mobile-first con breakpoints
✅ **Accesibilidad** - ARIA labels y navegación por teclado
✅ **Animaciones** - Transiciones suaves y profesionales

---

## 🐛 Solución de Problemas

### El mapa no carga

**Problema:** Pantalla gris o mapa vacío

**Solución:**
1. Verifica que el backend esté corriendo en puerto 8080
2. Abre la consola del navegador (F12) y busca errores CORS
3. Verifica que `leaflet.css` esté importado en `angular.json`

### Las rutas no aparecen

**Problema:** El mapa carga pero no hay rutas

**Solución:**
1. Verifica la respuesta del endpoint: `http://localhost:8080/api/transit/routes`
2. Asegúrate que el formato JSON coincida con el modelo `Route`
3. Revisa la consola del navegador para errores HTTP

### Los buses no se muestran en el mapa

**Problema:** Las rutas se ven pero no aparecen buses

**Solución:**
1. Verifica que el WebSocket esté conectado (revisa el header de rutas)
2. Asegúrate que el backend tenga el endpoint `/ws-tracking` configurado
3. Verifica en la consola: deberías ver "✅ Conectado al WebSocket de tracking"
4. El panel de buses debe mostrar "🟢 Activos" si hay conexión

### Los buses no desaparecen al completar recorrido

**Problema:** Los buses con progreso 100% siguen en el mapa

**Solución:**
1. El backend debe enviar `progress: 100` o mayor cuando un bus complete su ruta
2. La desaparición es automática con una animación de 1.5 segundos
3. Verifica en la consola: "🎯 Removiendo bus [ID] - Recorrido completado"

### Error de CORS

**Problema:** `Access to fetch at 'http://localhost:8080' has been blocked by CORS policy`

**Solución:**
1. Asegúrate que el backend tenga `@CrossOrigin(origins = "*")` en los controllers
2. Para WebSocket, configura CORS en la configuración de STOMP
3. Reinicia el backend después de agregar la configuración

---

## 📝 Scripts Disponibles

```bash
# Desarrollo
npm start              # Inicia servidor de desarrollo
npm run watch          # Compilación en modo watch

# Producción
npm run build          # Build de producción
npm run build:dev      # Build de desarrollo

# Testing
npm test               # Ejecuta tests unitarios

# Linting
npm run lint           # Verifica código con ESLint (si está configurado)
```

---

## 👥 Autores

**SmartTransit Team**
- Proyecto de Sistema de Transporte Público
- Juliaca, Perú - 2025

---

## 📄 Licencia

Este proyecto es de código abierto para fines educativos.

---

## 🙏 Agradecimientos

- **Angular Team** - Por Angular 20 y las nuevas APIs
- **Leaflet** - Por la excelente biblioteca de mapas
- **OpenStreetMap** - Por los datos de mapas
- **CartoDB** - Por los tiles de mapas
- **WAZE** - Por la inspiración de diseño

---

## ✨ Funcionalidades Avanzadas del Módulo de Pasajeros

### Panel de Buses en Tiempo Real
- **Botón flotante** con badge animado mostrando cantidad de buses activos
- **Panel lateral deslizante** con diseño premium tipo WAZE
- **Tarjetas de buses** con información completa:
  - Identificación y ruta asignada
  - Barra de progreso visual con porcentaje
  - Velocidad en tiempo real
  - Nivel de ocupación con indicadores de color
  - Próxima parada
  - Tiempo estimado de llegada al destino
- **Estadísticas en tiempo real**: buses activos y completados

### 🌟 Mejoras UI/UX de Élite (PERFECCIONADO)

#### Efectos Visuales Premium en Rutas
- **Cuatro capas sincronizadas**: Sombra externa difusa, sombra principal, línea base oscura y línea principal
- **Ocultación completa**: Al ocultar una ruta, TODAS las capas desaparecen simultáneamente
- **Labels flotantes inteligentes**: 
  - Aparece automáticamente al seleccionar/enfocar una ruta
  - Diseño con gradiente turquesa brillante
  - Glassmorphism con blur(20px) y saturate(180%)
  - Brillo interno con pseudo-elemento ::before
  - Animación tooltipAppear con rebote suave
  - Text-transform uppercase para mejor legibilidad
  - Múltiples box-shadows para efecto de profundidad y resplandor
- **Trazado animado progresivo**: Las rutas se dibujan con animación stroke-dashoffset premium
- **Efectos de resplandor pulsante**: Animación routeGlow en hover con múltiples drop-shadows
- **Transiciones cinematográficas**: Fade-in/out con cubic-bezier(0.4, 0, 0.2, 1)
- **Hover con neón**: Triple drop-shadow que simula efecto de neón brillante
- **Paint-order optimizado**: Mejor renderizado de capas con stroke fill markers

#### Markers con Efectos 3D
- **Animación de rebote**: Aparición con efecto bounce y rotación
- **Pulsos múltiples**: Ondas concéntricas con diferentes velocidades
- **Efecto 3D en hover**: Transform con translateZ y rotateX
- **Sombras dinámicas**: Múltiples drop-shadows que cambian en hover

#### Buses con Trail/Estela
- **Efecto de estela**: Gradiente radial detrás del bus en movimiento
- **Pulsos premium**: Animación con múltiples capas y box-shadow
- **Aparición cinematográfica**: Rebote con rotación y scaling
- **Hover 3D**: Transform con translateZ y múltiples sombras
- **Sincronización perfecta**: Los buses se ocultan/muestran automáticamente con sus rutas

#### Popups con Glassmorphism
- **Backdrop-filter premium**: Blur(20px) + saturate(180%) para efecto de vidrio esmerilado
- **Animación de aparición**: Rebote suave con cubic-bezier(0.34, 1.56, 0.64, 1)
- **Header con gradiente sutil**: Línea de brillo en la parte superior
- **Info-cards interactivas**: Efecto de barrido luminoso al hacer hover
- **Botones con micro-animaciones**: Barrido de luz + scale + múltiples sombras
- **Bordes semi-transparentes**: rgba con inset highlights para profundidad

#### Controles del Mapa con Glassmorphism
- **Zoom con vidrio esmerilado**: backdrop-filter blur(20px) saturate(180%)
- **Anillo pulsante en geolocalización**: Animación geoPulse externa
- **Brillo interno radial**: Gradiente en ::after para simular luz
- **Hover con elevación**: Transform scale(1.15) + múltiples box-shadows
- **Gradientes dinámicos**: Inversión de gradiente en hover

### Gestión Inteligente de Buses
- **Aparición suave**: animación de entrada cuando un bus inicia recorrido
- **Movimiento fluido**: interpolación suave de posición con easing
- **Rotación dinámica**: el bus apunta en la dirección del movimiento
- **Desaparición automática**: cuando progress >= 100%, el bus se oculta con animación
- **Limpieza de memoria**: buses completados se eliminan automáticamente

### Información por Ruta
- **Contador de buses activos** en cada tarjeta de ruta
- **Indicador "EN VIVO"** pulsante para rutas con tráfico
- **Estado de tracking** con punto animado en el header
- **Badge de buses** mostrando cantidad en tránsito

### 🔧 Detalles Técnicos de Élite

#### Cubic-Bezier Premium
```css
/* Rebote suave (bounce) */
cubic-bezier(0.34, 1.56, 0.64, 1)

/* Transición cinematográfica (easeInOut) */
cubic-bezier(0.4, 0, 0.2, 1)
```

#### Sistema de 4 Capas Sincronizadas
- **Capa 1 (outerShadow)**: Sombra externa difusa (11px, opacity 0.08) - profundidad
- **Capa 2 (shadow)**: Sombra principal (8px, opacity 0.2) - contraste
- **Capa 3 (base)**: Línea base con color oscurecido 30% - volumen
- **Capa 4 (line)**: Línea principal con brillo dinámico - superficie
- **Ocultación total**: updateRouteVisibility() elimina las 4 capas simultáneamente

#### Efectos Glassmorphism
```css
backdrop-filter: blur(20px) saturate(180%);
-webkit-backdrop-filter: blur(20px) saturate(180%);
background: rgba(255, 255, 255, 0.98);
border: 2px solid rgba(255, 255, 255, 0.3);
box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
```

#### Sistema de Transiciones
- **Aparecer rutas**: 0.4s ease-in con opacity + todas las capas
- **Ocultar rutas**: 0.3s ease-out + remoción de 4 capas sincronizadas
- **Buses sincronizados**: 0.3s ease-out con transform scale(0.5)
- **Markers**: 0.8s con bounce, rotación y transform-style: preserve-3d
- **Popups**: 0.4s cubic-bezier bounce con translateY + scale
- **Botones**: 0.3s cubic-bezier + efecto de barrido luminoso 0.5s

#### Animaciones Avanzadas
- **routeGlow**: Resplandor pulsante con triple drop-shadow
- **geoPulse**: Anillo expansivo de geolocalización (scale 1.2)
- **geoGlow**: Brillo interno del icono (drop-shadow 8px)
- **popupAppearPremium**: Entrada con rebote (translateY + scale)
- **tooltipAppear**: Label de ruta con rebote y scale (0.7 → 1.08 → 1)
- **trailPulse**: Estela detrás de buses (radial-gradient animado)

## 🚀 Próximos Pasos

- [x] ~~Implementar tracking en tiempo real de vehículos~~ ✅ COMPLETADO
- [x] ~~Sistema de desaparición automática de buses~~ ✅ COMPLETADO
- [x] ~~Panel de información de pasajeros~~ ✅ COMPLETADO
- [x] ~~Sincronización de visibilidad buses-rutas~~ ✅ COMPLETADO
- [x] ~~Efectos visuales premium y animaciones 3D~~ ✅ COMPLETADO
- [x] ~~Trazado de rutas con múltiples capas~~ ✅ COMPLETADO
- [x] ~~Trail/estela en buses en movimiento~~ ✅ COMPLETADO
- [x] ~~Labels flotantes al seleccionar rutas~~ ✅ COMPLETADO
- [x] ~~Tooltips con glassmorphism premium~~ ✅ COMPLETADO
- [ ] Agregar cálculo de rutas optimizadas para pasajeros
- [ ] Implementar sistema de favoritos y notificaciones
- [ ] Agregar estimación de tiempo de espera en paradas
- [ ] Implementar modo offline con Service Workers
- [ ] Análisis predictivo de tiempos de llegada
- [ ] Integrar pagos digitales para pasajes
- [ ] Crear app móvil nativa con PWA

---

**¡Gracias por usar SmartTransit! 🚍**
