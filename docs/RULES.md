# RULES — Globales para todos los agents

**Aplican a:** todos los agents (UI/UX, Data, Testing) que trabajen en Scan&Go.
**Versión:** 1.0
**Fecha:** 2026-05-14
**Orquestador:** Claude (sesión principal). Cada agent es una sesión individual que recibe una tarea acotada.

---

## 1. Lectura obligatoria antes de cualquier tarea

**Siempre, sin excepción, en este orden:**
1. `docs/PRD.md` — qué construimos y por qué (estable).
2. `docs/ARCHITECTURE.md` — cómo está diseñado (estable salvo decisiones grandes).
3. `docs/RULES.md` (este archivo) — cómo trabajar.
4. `docs/agents/<tu_agent>.md` — reglas específicas de tu área.
5. `docs/ENGRAM.md` — **memoria viva del proyecto**: decisiones ya tomadas con sus alternativas, blockers vigentes, hallazgos no obvios. Lo más reciente. Léelo entero, no asumas que recuerdas su contenido entre sesiones.

Si tu tarea requiere tocar un área que **no es la tuya**, no la tomes — devuelve al orquestador para que decida si reasigna o coordina.

**Importante sobre el ENGRAM:**
- Es el único de los 5 que cambia constantemente. Si llevas días sin tocar el proyecto, asume que cambió.
- Antes de tomar una decisión técnica, revisa el §3 (Log de decisiones) por si ya se decidió algo equivalente y no quieres re-litigar.
- Antes de empezar, revisa el §4 (Blockers) por si tu tarea está afectada.
- Cuando termines y reportes al orquestador, indica si tu trabajo genera entradas nuevas para el ENGRAM (decisiones, hallazgos, blockers). El orquestador es quien escribe el archivo, no tú directamente — pero tu reporte alimenta su escritura.

---

## 2. Principios universales

### 2.1 Anti-sobreingeniería
- **NO agregar features no pedidas.** Si una mejora "obvia" se te ocurre, propónsela al orquestador en lugar de implementarla.
- **NO crear abstracciones para futuros hipotéticos.** Implementa lo que se pide hoy.
- **NO añadir comentarios explicando lo que el código hace** — el código bien nombrado se explica solo. Comentarios solo cuando hay un *por qué* no obvio.
- **NO escribir docstrings multi-párrafo.** Una línea como máximo, y solo si el nombre no basta.
- **Consulta `PRD §10`** antes de implementar cualquier cosa de la lista "Diferido a v2 — agregar si duele". Si crees que tu tarea lo requiere, escala primero.

### 2.2 Respeto a la arquitectura
- Clean Architecture en 4 capas (Domain → Application → Infrastructure ← Presentation). **La regla de dependencias es estricta:** las flechas apuntan hacia adentro.
- **No** importar nada de `infrastructure/` desde `domain/` ni desde `application/`. Si lo necesitas, define una interfaz en `domain/services/` y agrega un adaptador.
- **No** poner lógica de negocio en route handlers (Presentation). Si un handler supera ~30 líneas o tiene `if/else` de reglas, esa lógica va a un use case.

### 2.3 Stack obligatorio (no negociable sin escalación)
- TypeScript 5.x estricto (`strict: true`).
- **Bun** 1.3+ como runtime + package manager + test runner. NO `npm install`, NO `pnpm install`, NO `vitest` — todo es `bun install` y `bun test`.
- Next.js 15 (App Router) corriendo sobre Bun.
- Drizzle ORM (`drizzle-orm/postgres-js`) — **NO** Prisma, **NO** Supabase client para datos.
- Zod para toda validación en bordes (HTTP, env vars).
- `bun test` + `@testcontainers/postgresql` para tests.
- Playwright (vía `bunx playwright`) para E2E.
- Tailwind para styling (sin Material UI, sin Chakra, sin Bootstrap).

### 2.4 Convenciones de código
- Archivos en `kebab-case.ts` salvo clases en `PascalCase.ts` (entidades, use cases, repositorios).
- Imports absolutos desde `@/...` (configurado en `tsconfig.json`).
- Sin `any` salvo en interop con librerías que lo requieren — y comentado por qué.
- Sin `as` casts salvo cuando TypeScript no puede inferir y el cast es seguro.
- Funciones pequeñas. Si supera ~40 líneas, considera dividir.

### 2.5 Multi-tenant siempre
- **Cada query a la DB lleva `business_id` como filtro obligatorio.** Sin excepción.
- Si escribes un repositorio y no pasas `business_id`, está mal. Re-piensa.
- La defensa de profundidad incluye RLS de Postgres (obligatoria desde día 1, ver `ARCHITECTURE §7.2`). El backend usa rol `postgres` que bypassea RLS, pero el filtrado de aplicación es la primera línea.

### 2.6 Errores
- Los errores de dominio son tipos concretos (`PackageDepletedError`, etc.), no `Error` genérico ni strings.
- Mapeo a HTTP en un único lugar (`presentation/middleware/errorHandler.ts`). No mapees manualmente en cada handler.
- Formato de error estable para el SDK: `{ error: { code, message, details? } }` — ver `ARCHITECTURE §9.3`.

### 2.7 Migraciones
- **Solo** `drizzle-kit generate`. **Nunca** SQL manual en producción ni en staging.
- Cada migración se commitea con el cambio que la motivó, no en commits separados.
- Cambios destructivos (DROP COLUMN, DROP TABLE) requieren coordinación con el orquestador.

### 2.8 Toda implementación se decide entre alternativas

Antes de implementar cualquier cosa no-trivial (un componente con lógica, una función de negocio, una elección de librería, un patrón de datos, un endpoint, un esquema de tabla), **considerar al menos 2 alternativas viables** y dejar registrado:

1. **Cuáles fueron las alternativas evaluadas.** Las **más relevantes**, no todas las imaginables. Suficientes para mostrar que se pensó.
2. **Cuál se eligió.**
3. **Por qué esa específicamente.** El argumento concreto, no "porque es mejor".
4. **Qué hubiera pasado con las otras.** Qué se ganaba y qué se perdía con cada alternativa descartada.
5. **Si hay un trade-off importante** (lo más simple vs lo más robusto, lo más rápido de implementar vs lo más extensible), declararlo abiertamente.

Regla de elección por defecto: **la alternativa más simple que resuelva el problema real**. Si se elige una más compleja, el "por qué" tiene que sostenerse.

**Dónde queda el registro:**
- En el resumen al orquestador al entregar la tarea (ver §4).
- En la sección "Decisiones revisables" de `ARCHITECTURE.md` cuando la decisión afecta al sistema completo (no solo a un archivo local).
- En un comentario en el código **solo** cuando el "por qué" es contraintuitivo y un futuro lector lo va a preguntar.

**No es burocracia.** Es disciplina. Cada vez que se elige algo sin pensar en alternativas, se está eligiendo lo primero que vino a la cabeza, no necesariamente lo mejor.

**Excepción:** tareas triviales (renombrar una variable, agregar un null check obvio, escribir un test del happy path). Aquí el pensamiento crítico es desproporcionado.

### 2.9 Discernir entre lo simple y lo necesario

Cada vez que se vaya a implementar algo — una función, una lógica, un componente, un patrón — hacerse dos preguntas antes:

| Pregunta | Qué significa |
|---|---|
| **¿Es simple?** | Resuelve el problema con la menor cantidad de piezas, sin abstracciones que no se hayan ganado el derecho a estar. |
| **¿Es necesario?** | Resuelve un problema **real, presente**, no uno hipotético o futuro. |

Las cuatro combinaciones:

1. **Simple Y necesario** → ideal. Hacer esto.
2. **Simple pero NO necesario** → no implementar. Es código que no resuelve nada.
3. **Necesario pero NO simple** → implementar, con cuidado, documentando por qué tiene que ser así.
4. **Ni simple ni necesario** → bandera roja. Casi siempre es over-engineering. Escalar al orquestador.

**Preguntas para distinguir simple de necesario:**
- ¿Estoy resolviendo un problema que tengo, o uno que **podría** tener?
- ¿La solución más simple resuelve el problema? Si no la elegí, ¿por qué?
- ¿Esta abstracción se gana el derecho a existir con el código actual, o solo si imagino código futuro?
- Si borro esto ahora, ¿algo deja de funcionar HOY?

**Frases que delatan que se está implementando algo no necesario** (alarmas — pararse y revisar):
- "Por si acaso en el futuro lo necesitamos."
- "Es buena práctica."
- "Así se hace en X empresa famosa."
- "Lo vi en un tutorial / curso / video."
- "Es más limpio así" (sin definir qué significa *limpio* en este contexto).
- "Total, ya que estoy aquí…"

Cuando aparezcan estas frases — las propias o las del orquestador — **detenerse y aplicar las cuatro combinaciones de arriba**.

---

## 3. Lo que está FUERA de cualquier agent

- **Pasarelas de pago** (PRD §5.3) — fuera del producto, nunca.
- **Lo diferido a v2** (PRD §10) — repos in-memory, DI container, UnitOfWork, OpenAPI autogen, rate limiting, audit logs, SLA formal, k6, "DB-agnostic" como meta, logs estructurados con trace_id, multi-sucursal, app nativa, push, white-label, geolocalización anti-fraude, etc.

Si crees que necesitas algo de esta lista para terminar tu tarea, **escala al orquestador**. No lo agregues por tu cuenta.

---

## 4. Cómo entregar trabajo

Cada agent termina su tarea con:

1. **Código compilando** — `bun run typecheck` verde.
2. **Tests de su área pasando** (`bun test`) — el área de tu RULES específico.
3. **Resumen al orquestador** que incluya:
   - Qué archivos creaste/modificaste.
   - Qué decisiones tomaste que no estaban especificadas (si las hubo).
   - Qué dejaste fuera y por qué.
   - Riesgos o ambigüedades que detectaste.
4. **Sin commits sin permiso explícito.** El orquestador decide cuándo se commitea.

---

## 5. Cuándo escalar al orquestador (no avanzar)

Para inmediatamente y consulta si:
- La tarea contradice el PRD o el ARCHITECTURE.
- Necesitas tocar un área que no es la tuya.
- Encuentras una decisión técnica importante no especificada (ej. qué librería usar para X).
- Detectas un bug o problema fuera del alcance de tu tarea.
- Crees que la tarea requiere algo de la lista "diferido a v2".
- El alcance de tu tarea se está expandiendo a más de lo originalmente pedido.

Escalar no es debilidad — es disciplina. Mejor preguntar 1 min que reescribir 1 día.

---

## 6. Anti-patrones explícitamente prohibidos

| Anti-patrón | Por qué está prohibido |
|---|---|
| Mockear Drizzle o Postgres | Tests deben usar Postgres efímero vía testcontainers (con `bun test`). Ver agent_testing. |
| Devolver `any` o `unknown` desde una API pública | Tipado fuerte es no-negociable. |
| `console.log` permanente en código de producción | Está permitido como observabilidad mínima v1 (ARCHITECTURE §11.4) **estructurado**, no como debug temporal olvidado. |
| Hardcodear secretos o URLs | Todo a env vars. Ver `ARCHITECTURE §12.4`. |
| Hardcodear `business_id` o cualquier ID en tests | Generar con factories. |
| Modificar el schema de DB sin migración | Cada cambio pasa por `drizzle-kit generate`. |
| Catch genérico que oculta errores | `catch` solo para mapear a tipos de dominio o re-lanzar enriquecido. |
| Comentarios tipo `// TODO`, `// FIXME` sin issue asociado | Si es importante, abrir issue. Si no, no merece comentario. |
| Emojis en código o documentos | Salvo que el orquestador lo pida explícitamente. |

---

## 7. Referencias

- PRD: [`docs/PRD.md`](./PRD.md)
- Arquitectura: [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md)
- Memoria viva del proyecto: [`docs/ENGRAM.md`](./ENGRAM.md)
- Reglas específicas:
  - UI/UX: [`docs/agents/agent_ui_ux.md`](./agents/agent_ui_ux.md)
  - Data: [`docs/agents/agent_data.md`](./agents/agent_data.md)
  - Testing: [`docs/agents/agent_testing.md`](./agents/agent_testing.md)

---

## 8. Historial

| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-05-14 | Borrador inicial. |
| 1.1 | 2026-05-14 | Añadidas §2.8 (Toda implementación se decide entre alternativas — 2+ alternativas con justificación, qué pasaría con las otras, regla por defecto: la más simple que resuelva el problema) y §2.9 (Discernir entre lo simple y lo necesario — cuatro combinaciones simple/necesario, preguntas guía, frases-alarma). |
| 1.2 | 2026-05-14 | Añadido `docs/ENGRAM.md` como lectura obligatoria #5. Notas sobre cómo consultarlo antes de re-litigar decisiones y cómo alimentar al orquestador para que lo actualice. Referencia añadida en §7. |
| 1.3 | 2026-05-14 | Stack actualizado a Bun: §2.3 reemplaza Node + pnpm + vitest por Bun 1.3+ como runtime + package manager + test runner. Comandos de entregables (§4) actualizados a `bun run typecheck` y `bun test`. Detalle en ENGRAM D-014. |
