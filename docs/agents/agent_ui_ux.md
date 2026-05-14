# agent_ui_ux — Reglas

**Aplican a:** el agent que trabaja en interfaces de usuario.
**Hereda de:** [`docs/RULES.md`](../RULES.md). En conflicto, gana la regla global.

---

## 1. Misión

Construir y mantener las dos interfaces de usuario de Scan&Go:

1. **Dashboard del negocio** (`apps/web`, ruta `/business/[slug]/admin`) — UI para María (Persona A del PRD). Lista de clientes, asignación de paquetes, asistencias del día, panel de API keys, suscripciones a webhooks.
2. **PWA del cliente** (`apps/pwa`, ruta `/scan`) — UI para Juan (Persona B del PRD). Login con magic link, scanner de QR, confirmación de asistencia, saldo restante, historial.

Adicionalmente, las páginas públicas de signup/login del negocio en `apps/web`.

---

## 2. Stack obligatorio

- **Next.js 15** App Router con server components por defecto. `'use client'` solo cuando el componente necesita estado o eventos del browser.
- **Tailwind CSS** para todo el styling. Sin Material UI, sin Chakra, sin Bootstrap, sin CSS Modules.
- **Componentes propios** o primitivos de **Radix UI** (headless) cuando se necesite accesibilidad gratis (dialogs, dropdowns, popovers). No instalar un kit completo (shadcn full, etc.) sin consultar.
- **Iconos:** `lucide-react`.
- **`@yudiel/react-qr-scanner`** para el scanner. No usar otras librerías de QR scan sin consultar.
- **`next-pwa`** para el manifest y service worker de `apps/pwa`.
- **Supabase client browser** (`@supabase/supabase-js`) **solo** para suscribirse a Realtime con `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Para datos NO se usa — todo va por la API REST.

---

## 3. Reglas específicas

### 3.1 Mobile-first siempre
La PWA del cliente se usa en celular. El dashboard del negocio típicamente en tablet o laptop. Diseña primero para pantalla pequeña; agrega `sm:`/`md:`/`lg:` para escalar.

### 3.2 Estados de UI siempre presentes
Cada vista que carga datos debe manejar **los cuatro estados**:
- Cargando (skeleton o spinner)
- Vacío (mensaje y CTA si aplica)
- Error (mensaje y forma de reintentar)
- Éxito (los datos)

Vistas que muestran solo "los datos" sin contemplar los otros tres están incompletas.

### 3.3 Accesibilidad mínima
- Contraste WCAG AA (Tailwind hace fácil cumplirlo).
- Todo botón interactivo es `<button>`, no `<div onClick>`.
- Inputs con `<label>` asociado.
- Focus visible (no eliminar el outline default sin reemplazo).
- `aria-label` en iconos sin texto.

### 3.4 Comunicación con el backend
- **Dashboard del negocio:** usa Next.js server actions / server components que invocan use cases del core directamente (ver `ARCHITECTURE §1`). NO hagas `fetch('/v1/...')` desde el dashboard.
- **PWA del cliente:** consume `/v1/scan` y demás endpoints con `fetch` y sesión por cookie (Supabase Auth maneja la cookie).
- **NO** hagas queries directas a la DB desde componentes. Si una vista necesita datos nuevos, pide al orquestador que el agent_data exponga un use case + endpoint.

### 3.5 Realtime
Solo en el dashboard del negocio. Suscribirse a la tabla `attendances` filtrada por `business_id` para actualizar la lista de asistencias del día. Usar el cliente `@supabase/supabase-js` con `NEXT_PUBLIC_SUPABASE_ANON_KEY`. RLS de Postgres se encarga del aislamiento (ver `ARCHITECTURE §7.2`).

### 3.6 PWA del cliente — específicos
- Manifest con icono propio, `display: standalone`, color de tema.
- Service worker (vía `next-pwa`) cacheando el shell. Los datos no se cachean — siempre fresh.
- "Add to Home Screen" debe funcionar en iOS 16.4+ y Android Chrome 100+.
- El scanner pide permiso de cámara con texto claro de para qué.
- Si el escaneo es exitoso → animación de check + saldo restante en grande.
- Si falla → mensaje específico según el error de dominio retornado (ver `ARCHITECTURE §9.3`). No "Algo salió mal" genérico.

### 3.7 Diseño consistente
- Sistema de colores: definido en `tailwind.config.ts`. No hardcodear hex en componentes.
- Tipografía: una sola fuente sans-serif (system stack o Inter). Sin mezclas.
- Espaciado: múltiplos de 4 (Tailwind default). Sin números arbitrarios tipo `mt-[13px]`.

### 3.8 Hooks de React: primero arquitectura, luego optimización

Cuando aparezca la tentación de usar `useMemo`, `useCallback`, `useRef`, `useReducer`, custom hooks complejos, o cualquier hook más allá de `useState` y `useEffect` básicos, **detenerse** y atacar el problema desde arriba antes de alcanzar el hook.

**Orden obligatorio:**

1. **¿Hay un problema de arquitectura o diseño que el hook estaría tapando?**
   - ¿El componente es muy grande y mezcla responsabilidades? Dividir en sub-componentes (SRP).
   - ¿Está acoplando presentación con orquestación con acceso a datos? Separar.
   - ¿La cadena de re-renders cae en cascada? Probablemente el estado está mal ubicado — moverlo arriba (lift state) o abajo (colocar más cerca de donde se usa).
   - ¿Pasa props por 4+ niveles? Considerar reorganizar el árbol o usar contexto local.
   - ¿La lógica que estoy intentando memoizar debería estar fuera del componente? (Servicio, helper puro, server component.)

2. **¿Es un problema real, medido — o uno imaginado?**
   - Si la justificación es "para optimizar", **medir primero** con React DevTools Profiler. Sin métrica que muestre un cuello de botella real, agregar `useMemo`/`useCallback` es cargo cult, no optimización.
   - Una memoización por intuición que no se midió **está prohibida** en este proyecto.

3. **Solo si el problema persiste tras (1) y (2):** usar el hook. Y al entregar, documentar:
   - **Por qué se usó.** El problema concreto (con la medición que lo respalda).
   - **Qué ganamos.** La mejora medida, no asumida.
   - **Qué perdemos.** Complejidad de lectura, dependencias del array, riesgo de stale closures, mayor superficie para bugs sutiles.
   - **Qué alternativas se descartaron y por qué** (alineado con regla global §2.8 de `docs/RULES.md`).

**Cuándo NO está justificado `useMemo`/`useCallback` (lo más común):**
- Memoizar valores primitivos (strings, numbers, booleans) — JS los compara por valor, es barato.
- Memoizar funciones que se pasan a componentes que **no** están envueltos en `React.memo` — el hijo se va a re-renderizar igual.
- "Por si acaso", "por costumbre", "porque lo vi en un ejemplo".
- "Por si la lista crece" — si crece y duele, ahí se agrega; no antes.

**Cuándo SÍ está justificado:**
- `useMemo` para un cómputo genuinamente caro: filtrar/ordenar listas de cientos o miles de items que se renderizan cada keystroke.
- `useCallback` para funciones que se pasan a hijos memoizados con `React.memo`, o que son dependencia de otro hook (`useEffect`, `useMemo`).
- `useRef` para valores que **no** deben disparar render (timers, ids de animación, refs DOM).
- `useReducer` cuando el estado tiene transiciones complejas y `useState` se convierte en un nido de `setState` que se llaman entre sí.

**Custom hooks:** extraer en custom hook solo cuando hay **reuso real** entre 2+ componentes, o cuando la lógica encapsulada es genuinamente compleja (suscripciones, timers, etc.). Un custom hook usado en un solo lugar para "limpiar" un componente suele ser ruido — si el componente está sucio, dividir el componente.

**Resumen:** un hook de optimización (`useMemo`, `useCallback`) sin medición previa es trabajo agregado sin valor agregado, con riesgo de bugs. El default es **no usarlos**. La carga de la prueba recae en quien quiera incluirlos.

---

## 4. Lo que NO hace este agent

- Tocar use cases, repositorios o schema de DB → es del `agent_data`.
- Escribir tests E2E con Playwright → es del `agent_testing` (UI escribe los componentes, testing los prueba).
- Cambiar contratos de API (request/response shapes) → coordinar con `agent_data` antes.
- Agregar librerías de UI nuevas sin consultar al orquestador.
- Implementar features no listadas en el PRD §5.1 (alcance v1).

---

## 5. Entregables esperados

Para cada tarea, este agent entrega:

1. Los componentes/páginas pedidos en `apps/web/src/...` o `apps/pwa/src/...`.
2. Cualquier hook o helper de cliente en `apps/<app>/src/lib/` si es UI-specific.
3. Cobertura visual de los 4 estados (cargando, vacío, error, éxito) cuando aplique.
4. `bun run typecheck` y `bun run lint` verdes.
5. La feature probada manualmente en navegador (Chrome y Safari mínimo) **antes** de declarar terminada. Para la PWA: probada en iPhone real o emulador de iOS, y Android real o emulador.

---

## 6. Anti-patrones específicos prohibidos

| Anti-patrón | Por qué |
|---|---|
| `useEffect` para fetch en mount | Usar server components o `use` con suspense. Si es PWA cliente, usar SWR/TanStack Query — coordinar elección con el orquestador antes. |
| `useMemo`/`useCallback` sin medición previa que justifique la necesidad | Ver §3.8. Default = no usarlos. La memoización sin métrica es cargo cult, agrega complejidad sin valor probado. |
| Custom hook usado en un solo componente "para limpiar" | Si el componente está sucio, dividir el componente, no esconder lógica detrás de un hook que nadie más reutiliza. |
| `console.log` dejado en componentes | Limpiar antes de entregar. |
| Estilos inline (`style={{...}}`) | Solo cuando es genuinamente dinámico (ej. ancho de progress bar). Resto va a Tailwind. |
| Componentes de 300+ líneas | Dividir en sub-componentes. |
| Lógica de negocio en JSX | Si hay `if/else` de reglas, va a un helper o al backend. |
| Iconos de imagen pesados | Usar `lucide-react`. |
| `any` en props de componente | Tipar todo. |
| Animaciones que bloquean la interacción | Las animaciones son decorativas, no bloqueantes. |

---

## 7. Cuándo escalar al orquestador

- Necesitas un endpoint o use case que no existe.
- El contrato de la API es ambiguo para tu vista.
- Una librería externa (no listada en §2) parece necesaria.
- La especificación de UX del orquestador es ambigua respecto a un estado o flujo.
- Hay conflicto entre lo que pide la tarea y el PRD.

---

## 8. Referencias

- Reglas globales: [`docs/RULES.md`](../RULES.md)
- PRD: [`docs/PRD.md`](../PRD.md) — sobre todo §4 (personas), §5 (alcance), §6 (casos de uso).
- Arquitectura: [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) — §1 (superficies), §8 (auth), §9.3 (errores y su mapeo a HTTP).
