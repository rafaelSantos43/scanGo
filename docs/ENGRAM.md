# ENGRAM — Memoria de contexto del proyecto

**Propósito:** capturar el estado vivo del proyecto, decisiones tomadas con sus alternativas, blockers, y hallazgos no obvios. Cualquier agente (orquestador o sub-agente) que arranque una sesión debe leerlo antes de tocar código.

**Diferencia con otros documentos:**
- [`PRD.md`](./PRD.md) — qué construimos y por qué (estable).
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — cómo está diseñado (cambia con decisiones de diseño).
- [`RULES.md`](./RULES.md) — cómo trabajar (estable).
- **`ENGRAM.md` (este)** — qué está pasando ahora, qué se decidió, qué se aprendió (cambia constantemente).

**Quién lo actualiza:** el orquestador (Claude en sesión principal) al cerrar cada tarea. Los sub-agentes reportan al orquestador; el orquestador decide qué entra al engram.

---

## 1. Última actualización

**Fecha:** 2026-05-14
**Cambio:** v1.8 — Quinto chunk de M1: CU-02 backend (admin/integrador). Use cases `CreateCustomerUseCase` (con validación defensiva de Business existente vía `BusinessRepository.findById`) y `AssignPackageUseCase` (valida cliente existe y está activo, luego `PackageRepository.save` mapea unique violation de `one_active_package_per_customer` a `CustomerAlreadyHasActivePackageError`). Extendidas firmas `save` en `BusinessRepository` y `CustomerRepository` (no existían). Drizzle `CustomerRepositoryDrizzle.save` mapea 23505+`customers_business_email_unique` a `CustomerEmailAlreadyExistsError`. Nuevos errores: `CustomerEmailAlreadyExistsError`, `CustomerAlreadyHasActivePackageError`, `InvalidVisitCountError`. Endpoints `POST /v1/customers` y `POST /v1/packages` con status 201. Nuevo stub `getBusinessAuthContext(req)` que lee `X-Business-Id` (auth de integrador vía API key, futuro). Agente añadió pre-emptivamente `getAdminAuthContext(req)` (`X-User-Id` + `X-Business-Id`) para futuros endpoints de dashboard — sin consumidores hoy, marcado TODO(auth). `isUniqueViolation` extraído a `infrastructure/persistence/drizzle/_lib/pgErrors.ts` (3 consumidores justifican la abstracción per RULES §2.9). Build verde con 3 rutas dinámicas (`/api/v1/{scan,customers,packages}`).

**Cambio anterior (v1.7):** Cuarto chunk de M1: presentación del flujo de escaneo. Schemas Zod (`ScanRequestSchema`, `ScanResponseSchema`, envelopes éxito/error) en `@scango/shared-types`. Error mapper `apps/web/src/app/api/_lib/errorMapper.ts` que traduce `DomainError`/`ZodError`/`UnauthenticatedCustomerError`/`InvalidIdError` a HTTP per §9.3 con un switch explícito (el `code` interno UPPER_SNAKE NO se deriva al wire). Auth context stub `getCustomerAuthContext(req)` lee `X-Customer-Id` y `X-Business-Id` de headers — TODO(auth) hasta SupabaseAuthProvider. Route handler `POST /v1/scan` en `apps/web/src/app/api/v1/scan/route.ts` (30 líneas, sin lógica de negocio, invoca `runRegisterAttendance(input)` de composition). `bun run build` verde, ruta marcada dinámica. typecheck verde en los 6 workspaces. NOTA previa: tercer chunk (use case RegisterAttendance) v1.6 ya commiteado.

**Cambio anterior (v1.6):** Use case `RegisterAttendance` (CU-03, caso central) entregado por `agent_data`. Extiende interfaces `QrTokenRepository.claim(token, businessId, customerId, now)` y `PackageRepository.decrementVisitAtomic(packageId, businessId)`, ambas implementadas con SQL atómico per §9.1 casos 1 y 3. Repos refactorizados para aceptar `DbOrTx = Database | DrizzleTx`. Use case en `application/use-cases/RegisterAttendance.ts` orquesta: load business → load customer → claim token → load active package → atomic decrement → calcular `scanned_date` con `Intl.DateTimeFormat` en timezone del negocio (D-008) → save attendance. `SystemClock` + `UuidGenerator` (infrastructure). Composition expone `runRegisterAttendance(input)` que envuelve `db.transaction((tx) => ...)` y construye los repos con `tx`. Cero imports prohibidos en `application/`. Corrección orquestador: el agente usó `PackageNotFoundError` cuando el cliente no tiene paquete activo; semánticamente correcto era `NoActivePackageError` (§9.3, código 422 distinto del 404), arreglado antes del commit.

---

## 2. Estado actual del proyecto

### 2.1 Fase
**M0 — Documentación y setup** (según roadmap del PRD §12).

### 2.2 Hitos completados
- `docs/PRD.md` v1.3 — 3 iteraciones, alineación final entre RFs, RNFs, casos de uso y alcance v1.
- `docs/ARCHITECTURE.md` v1.2 — 1 auditoría completa (26 hallazgos) + 1 vista final (7 hallazgos + 1 de seguridad).
- `docs/RULES.md` v1.2 — reglas globales con §2.8 (decisiones con alternativas), §2.9 (simple vs necesario), y referencia obligatoria al ENGRAM.
- `docs/agents/agent_ui_ux.md` — incluye §3.8 (hooks como último recurso).
- `docs/agents/agent_data.md` — incluye §3.11 (patrones de persistencia: modelar antes de abstraer).
- `docs/agents/agent_testing.md` — incluye §4.6 (helpers/abstracciones solo con reuso real).
- `docs/ENGRAM.md` v1.1 (este archivo).

### 2.3 En progreso
Nada en este momento. Listos para arrancar implementación.

### 2.4 Próximo paso recomendado
**Fase A — Setup del monorepo con Bun**, antes de empezar M1 propiamente.

Setup concreto en orden:
1. `git init` en la raíz.
2. `.gitattributes` (`* text=auto eol=lf`) y `.editorconfig` para cross-platform Mac/Windows.
3. Archivos raíz del monorepo: `package.json` con workspaces de Bun, `.gitignore`, `tsconfig.base.json`, `bunfig.toml` opcional.
4. `bun create next-app apps/web` (Next.js 15 + TS + Tailwind + App Router).
5. `bun create next-app apps/pwa` (igual al anterior).
6. Stubs de `packages/{shared-types, sdk, react}` y `examples/external-app`.
7. `bun add` Drizzle en apps/web + `bunx drizzle-kit` setup.
8. Estructura de Clean Architecture en apps/web (carpetas vacías por ahora).
9. **Solo después:** M1 según PRD §12 (modelar entidades del dominio + tests con `bun test`).

---

## 3. Log de decisiones tomadas

Cada entrada sigue el formato de §2.8 de RULES global: decisión + alternativas consideradas + por qué + qué se gana/pierde.

### D-001 — PWA en lugar de app nativa
- **Fecha:** 2026-05-14
- **Decisión:** Construir como Progressive Web App (PWA).
- **Alternativas:** App nativa (Swift + Kotlin), React Native, Flutter.
- **Por qué:** baja fricción para el cliente final (sin App Store), un solo deploy para todos los dispositivos, soporte completo de cámara + geolocalización en iOS 16.4+ y Android Chrome 100+. Las capacidades que faltarían en PWA (background location, NFC) no aplican al producto.
- **Qué se pierde:** funcionamiento offline más limitado, push notifications con menos features en iOS antiguo.
- **Donde queda:** PRD §3, ARCHITECTURE §4.

### D-002 — Servicio API-first integrable, no solo app standalone
- **Fecha:** 2026-05-14
- **Decisión:** Diseñar Scan&Go como un servicio que cualquier software de gestión puede integrar (tipo Stripe), con SDK + webhooks + API REST pública. La PWA propia es uno de varios consumidores.
- **Alternativas:** producto cerrado solo con su propia UI.
- **Por qué:** abre canal de distribución vía integradores. Si solo es app cerrada, el TAM se limita a negocios sin software previo.
- **Qué se pierde:** complejidad adicional (mantener contratos públicos, SDK, webhooks), latencia hasta primer cliente integrador real.
- **Donde queda:** PRD §1, §3.1, §5.1, ARCHITECTURE §1.

### D-003 — Clean Architecture + Repository pattern
- **Fecha:** 2026-05-14
- **Decisión:** Código en 4 capas (Domain → Application ← Infrastructure → Presentation). Repository pattern con interfaces en domain.
- **Alternativas:** Next.js plano sin capas, una sola capa de "services", arquitectura hexagonal estricta con DI container.
- **Por qué:** API + Dashboard + PWA + SDK consumen la misma lógica de negocio. Sin separación, la lógica se duplica. Repository hace los tests del dominio rápidos y permite swap de DB sin reescribir use cases.
- **Qué se pierde:** más archivos por feature, curva de aprendizaje para nuevos devs.
- **Donde queda:** ARCHITECTURE §2.

### D-004 — Drizzle + Postgres directo (NO SDK de Supabase para datos)
- **Fecha:** 2026-05-14
- **Decisión:** Drizzle ORM accediendo a Postgres directamente. Supabase solo provee el Postgres (y Auth detrás de interfaz).
- **Alternativas:** Prisma, SDK de Supabase para todo, Postgres puro sin ORM.
- **Por qué:** Drizzle es TS-first sin codegen mágico, queries explícitas, bundle pequeño. Usar el SDK de Supabase para datos acopla todo al provider; usar Drizzle preserva la opción de migrar a Neon/Railway sin reescribir.
- **Qué se pierde:** algunas convenciones de Supabase (Realtime, RLS) hay que tenerlas en cuenta manualmente.
- **Donde queda:** ARCHITECTURE §4.

### D-005 — Composition manual sin DI container
- **Fecha:** 2026-05-14
- **Decisión:** Un archivo `composition.ts` con factories `buildXxx()` que hacen `new` directo.
- **Alternativas:** awilix, tsyringe (con decoradores), inversify.
- **Por qué:** ~13 use cases v1 no justifican container. `new` plano es claro y debugable.
- **Qué se pierde:** menos elegancia, refactor si llegamos a >20 use cases.
- **Trigger para revisar:** >20 use cases o árboles de dependencias complejos.
- **Donde queda:** ARCHITECTURE §4.3.

### D-006 — Outbox pattern para webhooks + Vercel Cron
- **Fecha:** 2026-05-14
- **Decisión:** Los eventos se insertan en tabla `webhook_deliveries` dentro de la misma transacción del escaneo. Una Vercel Cron task cada minuto entrega los `pending`.
- **Alternativas:** invocar dispatcher síncrono después de COMMIT, usar Inngest/Upstash QStash, servidor worker dedicado.
- **Por qué:** garantiza at-least-once delivery sin worker long-running (Vercel es serverless). Si el dispatcher falla post-COMMIT, el cron reintenta. Si la red falla, el cron reintenta.
- **Qué se pierde:** latencia mínima del webhook (≤1 min vs inmediato).
- **Trigger para revisar:** volumen alto que sature el cron, o necesidad de latencia <1min.
- **Donde queda:** ARCHITECTURE §9.1 caso 4, §10.5.

### D-007 — RLS de Postgres obligatoria desde día 1
- **Fecha:** 2026-05-14
- **Decisión:** Row Level Security activada en todas las tablas multi-tenant desde la primera migración.
- **Alternativas:** RLS opcional (lo que pensábamos al principio), polling desde el dashboard, SSE server-side.
- **Por qué:** el browser del dashboard se conecta **directo** al Realtime de Supabase con `SUPABASE_ANON_KEY` para escuchar nuevas asistencias. Sin RLS, ese anon key permitiría a un negocio suscribirse a datos de otros. **Es necesaria, no opcional.**
- **Qué se pierde:** un poco más de complejidad en cada migración (políticas RLS). Casi nada porque son declarativas.
- **Donde queda:** ARCHITECTURE §7.2, §12.1.

### D-008 — `scanned_date` NO es generated column
- **Fecha:** 2026-05-14
- **Decisión:** `attendances.scanned_date` se calcula en el use case usando la timezone del negocio y se persiste como columna normal.
- **Alternativas:** generated column en Postgres que dependa de `businesses.timezone`.
- **Por qué:** Postgres no permite que una `GENERATED ALWAYS AS` referencie otra tabla. La alternativa "fácil" no compila.
- **Qué se pierde:** un par de líneas más en el use case (poco). Constraint UNIQUE sigue operando idéntico sobre la columna persistida.
- **Donde queda:** ARCHITECTURE §6 decisión 2.

### D-009 — Engram como archivo Markdown en repo (no tool externa)
- **Fecha:** 2026-05-14
- **Decisión:** Memoria de contexto en `docs/ENGRAM.md`, versionado con git.
- **Alternativas:** Engram tool de Gentleman-Programming (binario Go + SQLite + MCP), sistema nativo de Claude Code (solo).
- **Por qué:** el corpus es pequeño todavía (decenas de entradas, no miles). Markdown en repo es compartible entre devs/agentes sin tooling extra. Los sub-agentes pueden recibirlo como contexto en su prompt sin instalación. El sistema nativo de Claude Code ya complementa con memoria personal del usuario.
- **Qué se pierde:** sin búsqueda FTS5, sin TUI integrada. Búsqueda manual con grep/lectura del doc.
- **Trigger para revisar:** ENGRAM supera ~500 líneas o se vuelve lento de leer entero. Considerar migración a Engram tool MCP.
- **Donde queda:** este archivo.

### D-010 — Pasarela de pagos explícitamente fuera del producto (nunca)
- **Fecha:** 2026-05-14
- **Decisión:** Scan&Go no procesa pagos. El cobro del paquete es responsabilidad del negocio fuera del sistema.
- **Alternativas:** integrar Stripe/MercadoPago, ser pasarela propia.
- **Por qué:** el producto es control de asistencia, no fintech. Pagos añaden compliance (PCI), responsabilidad legal, complejidad masiva sin pertenecer al alcance.
- **Donde queda:** PRD §5.3.

### D-011 — Recortes anti-sobreingeniería aplicados al alcance de v1
- **Fecha:** 2026-05-14
- **Decisión:** Eliminar de v1 (y diferir con triggers concretos) un conjunto de patrones y prácticas que la primera iteración del PRD incluía: repos in-memory + contract tests cruzados, DI container (awilix/tsyringe), UnitOfWork pattern, OpenAPI autogenerado + docs site (Mintlify/Nextra), rate limiting por API key + por IP, audit logs de acciones sensibles, logs estructurados con `trace_id` obligatorio, SLA formal de disponibilidad, tests de carga con k6, "DB-agnostic" como objetivo en sí mismo.
- **Alternativas:** mantener todo eso en v1 (la versión original del PRD), recortar selectivamente solo lo más obvio.
- **Por qué:** ninguno de esos elementos resolvía un problema **medido**. El v1 original era de ~8 semanas; tras recortes pasó a ~16-18 días enfocados en validar la hipótesis del producto con un piloto real. Cada elemento recortado tiene un disparador concreto documentado en PRD §10 para volverlo a meter cuando se gane el derecho.
- **Qué se pierde:** "Día 1" más austero (menos métricas, menos docs públicas, menos abstracciones "por si acaso"). Si llega un integrador exigente antes de los triggers, hay que improvisar.
- **Donde queda:** PRD §10 "Diferido a v2 — agregar si duele", agent_data §3.11, agent_ui_ux §3.8, agent_testing §4.6.

### D-012 — Modelo de trabajo: orquestador + 3 sub-agentes especializados
- **Fecha:** 2026-05-14
- **Decisión:** El desarrollo de v1 se hace con un **orquestador** (Claude en sesión principal) que delega tareas acotadas a **3 sub-agentes especializados** (sesiones individuales sin memoria entre sí): `agent_ui_ux` (Tailwind, Next.js, PWA, scanner, dashboard), `agent_data` (Domain + Application + Infrastructure + API REST), `agent_testing` (unit + integration + E2E). Cada uno tiene reglas específicas en `docs/agents/<nombre>.md` y hereda las reglas globales de `docs/RULES.md`.
- **Alternativas:** un solo agente generalista que toque todo (menos contexto cargado pero más simple de coordinar); más agentes con mayor granularidad (ej. `agent_dashboard` separado de `agent_pwa`); sin orquestador, el usuario invocando cada agente directamente.
- **Por qué:** las 3 áreas (UI, datos, tests) tienen vocabularios y disciplinas distintas. Un agente especializado con reglas claras toma decisiones más alineadas con su área. El orquestador maneja la coordinación, las decisiones cross-cutting, y la actualización del ENGRAM — evitando que cada sub-agente reinvente lo mismo o tome decisiones que afecten a las otras áreas sin coordinación.
- **Qué se pierde:** overhead leve en cada delegación (cargar el contexto a la sesión nueva). Los sub-agentes no se hablan entre sí; toda la coordinación pasa por el orquestador.
- **Trigger para revisar:** aparece un área nueva no cubierta (ej. devops/infra dedicado, integraciones complejas) o los agentes empiezan a pedir cambios cross-area constantemente (señal de que la división está mal).
- **Donde queda:** `docs/agents/*.md` (reglas), `docs/RULES.md §1` (lectura obligatoria), este archivo.

### D-013 — Soporte cross-platform Mac + Windows desde día 1
- **Fecha:** 2026-05-14
- **Decisión:** El proyecto se desarrolla tanto en macOS como en Windows. Configuración explícita para que no haya sorpresas: `.gitattributes` con `* text=auto eol=lf` para que git normalice line endings; `.editorconfig` con `end_of_line = lf` e `indent_style = space`; uso de `cross-env` o equivalente cuando aparezcan scripts con env vars (`NODE_ENV=...` no funciona en `cmd.exe`); imports respetan case exacto (Linux/CI son case-sensitive, Mac/Windows típicamente no — un import `./Foo` que apunta a `./foo` falla solo en CI).
- **Alternativas:** asumir solo Mac (la más simple pero rompe Windows); WSL2 obligatorio para el dev Windows (transfiere el problema, no lo resuelve); Docker dev container para todos (más herramientas que mantener).
- **Por qué:** el usuario trabaja en ambos sistemas. Hacer el setup cross-platform desde el inicio cuesta poco (2 archivos de config); arreglarlo después de que aparezca un bug oculto en Windows cuesta mucho más.
- **Qué se pierde:** un par de archivos adicionales en la raíz. Pequeño costo en cada PR de tener que pensar "¿esto rompe en Windows?".
- **Trigger para revisar:** si se decide soportar solo un OS para v1 (no es el caso).
- **Donde queda:** `.gitattributes`, `.editorconfig`, README de setup, este archivo.

### D-014 — Stack migrado a Bun (runtime + package manager + test runner)
- **Fecha:** 2026-05-14
- **Decisión:** Bun 1.3+ reemplaza Node + pnpm + vitest. Comandos: `bun install`, `bun run dev`, `bun test`, `bunx playwright`, `bunx drizzle-kit`. Workspaces nativos de Bun configurados en `package.json` raíz (sin `pnpm-workspace.yaml` ni Turborepo en v1).
- **Alternativas:** (A) plan original con pnpm + Node + vitest — bloqueado por permisos para instalar pnpm globalmente en macOS sin sudo; (B) Bun para todo — el camino elegido; (C) híbrido Bun install + Node runtime + vitest — el sweet spot que recomendé inicialmente.
- **Por qué:** experiencia previa del usuario con Bun ("siempre trabajo con bun") elimina los riesgos de bleeding edge que motivaban la opción C. Una sola herramienta para todo simplifica el setup, comandos, y mantenimiento. Bun ya estaba instalado (v1.3.12 en `~/.bun/bin/bun`), pnpm requería resolver permisos en `/usr/local`.
- **Qué se pierde:** algunos edge cases todavía con Next.js + Bun runtime (oficialmente soportado pero menos battle-tested que Node), menos documentación en stack overflow que con vitest. En Windows, Bun GA pero menos battle-tested que Node — un riesgo a vigilar dado D-013.
- **Qué se gana:** install ~3-5x más rápido, ejecución más rápida, TypeScript nativo sin transpilación, una sola herramienta (menos contexto en el cerebro).
- **Trigger para revisar:** bug oscuro irresoluble en Next.js + Bun runtime, o problemas serios en Windows.
- **Donde queda:** ARCHITECTURE §4 (stack table), §5 (monorepo con Bun workspaces), §11.0 (bun test), §12.3 (bunx drizzle-kit); RULES §2.3 (stack obligatorio); agent_testing.md §2 (runner); agent_data.md §6 y agent_ui_ux.md §5 (entregables con `bun run typecheck`).

### D-015 — `src/app/` ES la capa presentation (no se renombra)
- **Fecha:** 2026-05-14
- **Decisión:** En `apps/web`, el directorio `src/app/` que requiere Next.js App Router cumple el rol de la capa **presentation** de Clean Architecture. Las capas `domain/`, `application/`, `infrastructure/` viven como hermanas de `app/` bajo `src/`. La doc ARCHITECTURE §5 (que muestra `presentation/api/v1/route.ts`) se interpreta como vista lógica, no literal.
- **Alternativas:** (A) mover `src/app/` a `src/presentation/app/` y overridear la convención de Next.js — pelea contra el framework, riesgo en upgrades; (B) actualizar ARCHITECTURE §5 para reflejar `app/` literal — limpio pero requiere editar la doc estable.
- **Por qué:** Next.js 16 espera `src/app/` o `app/` para el App Router. Renombrar requiere config experimental que no es estable, complica errores y rompe en upgrades del framework. Aceptar la convención cuesta cero, los archivos `route.ts` y `page.tsx` ya viven en Next.js de forma idéntica a como la doc los describe — solo cambia la carpeta padre.
- **Qué se pierde:** la doc §5 queda con una etiqueta ligeramente inexacta (`presentation/` en vez de `app/`). Riesgo bajo si quien la lee asume "presentation = app/ en Next.js".
- **Trigger para revisar:** si se migra a un framework que sí permita renombrar el dir (Remix, vanilla Node, etc.), volver a evaluar.
- **Donde queda:** `apps/web/src/` (estructura física), este archivo. Pendiente: aclarar §5 en una próxima pasada del ARCHITECTURE.

---

## 4. Blockers y ambigüedades pendientes

*(Vacío por ahora — toda la documentación de M0 está cerrada y consistente.)*

Cuando aparezcan, registrar acá con formato:

```
### B-001 — [Título corto]
- Detectado: [fecha]
- Bloquea: [qué tarea o agente está esperando]
- Pregunta abierta: [específicamente qué hay que decidir]
- Quién decide: [usuario / orquestador / agente específico]
```

---

## 5. Hallazgos no obvios

Cosas descubiertas durante el diseño que sería difícil derivar leyendo solo PRD + ARCHITECTURE.

### H-001 — Generated columns en Postgres no pueden referenciar otras tablas
- **Contexto:** intentábamos hacer `scanned_date` como columna generada que dependía de `businesses.timezone`.
- **Realidad:** Postgres rechaza esto. Las expresiones de `GENERATED ALWAYS AS` deben ser inmutables y deterministas con respecto a la propia fila.
- **Lección aplicada:** calcular en el use case y persistir como columna normal. Ver D-008.

### H-002 — Supabase free tier tiene una trampa para staging+prod
- **Contexto:** asumíamos "free tier alcanza fácil".
- **Realidad:** el free tier permite 2 proyectos activos, pero **pausa** los proyectos tras ~1 semana sin actividad. Eso rompe staging que no se usa todos los días.
- **Implicación:** para staging + prod separados sin pausas → plan Pro ($25/mes), o usar Neon free tier para staging.
- **Donde queda:** ARCHITECTURE §12.2.

### H-003 — Realtime de Supabase + anon key + RLS forman un trio que no se puede romper
- **Contexto:** queríamos "RLS opcional" como defensa secundaria.
- **Realidad:** si el browser se conecta directo a Supabase Realtime con el `ANON_KEY` (que viaja al cliente vía `NEXT_PUBLIC_*`), sin RLS el browser puede suscribirse a TODA la tabla, cross-tenant.
- **Lección:** o RLS obligatoria, o no usar Realtime directo desde browser (polling/SSE en su lugar). Elegimos RLS obligatoria. Ver D-007.

### H-004 — El patrón outbox simplifica los tests más de lo esperado
- **Contexto:** considerábamos `WebhookDispatcher` como dependencia del `RegisterAttendanceUseCase`.
- **Realidad:** con outbox, el use case NO recibe dispatcher. Solo escribe a `webhook_deliveries`. Los tests del use case verifican que la fila aparezca en la tabla, sin spies ni mocks del dispatcher.
- **Implicación:** lista de cosas a mockear en tests bajó. Ver `agent_testing.md §4.6`.

---

## 6. Convenciones aprendidas durante el diseño

Cosas que cristalizaron y deberían respetarse implícitamente:

- **Cualquier patrón "de libro" (UoW, DI container, Specification, CQRS) requiere justificación.** Lista de patrones diferidos a v2 con triggers concretos en PRD §10 y `agent_data.md §3.11`.
- **Memoización en React (`useMemo`/`useCallback`) sin medición está prohibida.** `agent_ui_ux.md §3.8`.
- **No mockear lo que controlamos.** Postgres real efímero con testcontainers, no `mock.module` sobre Drizzle. `agent_testing.md §3`.
- **`apps/web` sirve API + dashboard.** El nombre "api" engañaba — el dashboard del admin vive en el mismo Next.js que la API REST porque usa server actions/components.
- **El SDK de Supabase solo se importa en `SupabaseAuthProvider`.** En ningún otro archivo del backend. Para datos, siempre Drizzle.
- **Cada implementación se decide entre 2+ alternativas con tradeoffs documentados.** RULES global §2.8.

---

## 7. Cómo mantener este archivo

### 7.1 Cuándo actualizar
- Al cerrar cualquier tarea (sub-agente o orquestador).
- Al detectar un hallazgo no obvio.
- Al desbloquear o crear un blocker.
- Al tomar una decisión de diseño que valga la pena revisar después.

### 7.2 Qué NO entra al ENGRAM
- Información que ya vive estable en PRD, ARCHITECTURE o RULES.
- Cambios triviales (renames, fix de typo, formato).
- Lista de archivos modificados (eso es git log).
- "Hoy escribí X" sin contexto. Solo lo que valga la pena recordar la próxima sesión.

### 7.3 Cuándo limpiar
- Decisiones que ya no aplican (porque cambió el contexto): marcarlas con `[OBSOLETA — ver D-XXX]` en lugar de borrarlas. La trazabilidad histórica importa.
- Blockers resueltos: mover a una sección "B-XXX (resuelto)" o eliminar si el resumen ya está en otra parte.
- Si el archivo supera ~500 líneas, comprimir las decisiones viejas en resúmenes de 1 línea referenciando el commit/PR donde se decidieron.

---

## 8. Historial

| Versión | Fecha | Cambio principal |
|---|---|---|
| 1.0 | 2026-05-14 | Creación inicial. 10 decisiones (D-001 a D-010), 5 hallazgos (H-001 a H-005), 0 blockers. |
| 1.1 | 2026-05-14 | Auditoría aplicada (5 hallazgos). Críticos: versión de RULES.md sincronizada (v1.1 → v1.2), emojis ✅ eliminados de §2.2 por consistencia con RULES global §6. Medios: añadidas D-011 (recortes anti-sobreingeniería al pasar de v1 inflado de 8 semanas a v1 enfocado de ~16-18 días) y D-012 (modelo orquestador + 3 sub-agentes especializados). Bajo: H-005 (UUID v7 no nativo en Postgres <17) eliminado por ser nota técnica, no hallazgo no obvio del diseño. Resultado: 12 decisiones, 4 hallazgos, 0 blockers. |
| 1.2 | 2026-05-14 | Añadidas D-013 (soporte cross-platform Mac + Windows desde día 1: `.gitattributes`, `.editorconfig`, case-sensitivity en imports, scripts portables) y D-014 (stack migrado de Node+pnpm+vitest a Bun 1.3+ para runtime + package manager + test runner, motivado por experiencia del usuario con Bun y bloqueo de permisos para pnpm). Docs sincronizados: ARCHITECTURE v1.3, RULES v1.3, agent_testing actualizado para `bun test`, agent_data/agent_ui_ux con `bun run typecheck`. §2.4 actualizado con plan de Fase A (setup monorepo). Resultado: 14 decisiones, 4 hallazgos, 0 blockers. |
| 1.3 | 2026-05-14 | Añadida D-015 (`src/app/` cumple rol de presentation en Next.js App Router, no se renombra a `presentation/`; doc §5 se interpreta lógicamente). Fase A casi completa: monorepo con 5 workspaces activos + 1 placeholder, Drizzle ORM/postgres-js/drizzle-kit instalados, esqueleto Clean Architecture creado en `apps/web/src/{domain,application,infrastructure}`. Pendiente solo afinar ARCHITECTURE §5 en una próxima pasada. Resultado: 15 decisiones, 4 hallazgos, 0 blockers. |
| 1.4 | 2026-05-14 | Primer chunk de M1: capa Domain del flujo de escaneo entregada por sub-agente `agent_data`. 5 entidades + 6 IDs branded + 4 VOs + 14 errores tipados + 5 interfaces de repositorio + 2 interfaces de servicio. 58 tests unitarios verdes (`bun test`). Cero imports externos en `domain/`. Ajustes laterales: añadido `bun-types` como devDep de `apps/web` y `"types": ["bun-types"]` en su tsconfig para que `bun:test` typechequee. Cleanup pendiente registrado en CHECKLIST: alinear `apps/web/tsconfig.json` con `tsconfig.base.json` (legado de `bun create next-app`). Resultado: 15 decisiones, 4 hallazgos, 0 blockers. |
| 1.5 | 2026-05-14 | Segundo chunk de M1: capa Infrastructure del flujo de escaneo entregada por `agent_data`. Schema Drizzle de 5 tablas, migración inicial `0000_init_scan_flow.sql` con políticas RLS (D-007), 5 mappers, 5 repos Drizzle, composition con factories planas y Drizzle client lazy. `AttendanceRepositoryDrizzle.save` mapea PG `23505` a `AlreadyScannedTodayError`. Cero imports prohibidos en infrastructure. Identificadas 3 dependencias del próximo chunk (use case `RegisterAttendance`): método atómico `QrTokenRepository.claim`, método atómico `PackageRepository.decrementVisitAtomic`, repos que acepten `Database | Transaction`. Resultado: 15 decisiones, 4 hallazgos, 0 blockers. |
| 1.6 | 2026-05-14 | Tercer chunk de M1: use case `RegisterAttendance` entregado por `agent_data`. Cubre las 3 dependencias del chunk anterior (claim atómico, decrement atómico, repos con `DbOrTx`). Composition expone `runRegisterAttendance(input)` que envuelve `db.transaction()`. Helper `formatDateInTimezone` con `Intl.DateTimeFormat` para `scanned_date` en zona del negocio (D-008). Outbox queda como TODO marcado en el use case hasta tener `WebhookDelivery`. Identificado en CHECKLIST: idempotencia §9.2 todavía no soportada (re-scans del mismo día lanzan `AlreadyScannedTodayError` en lugar de retornar el `Attendance` existente — requiere `AttendanceRepository.findByCustomerAndDate`). Corrección semántica orquestador: cambió `PackageNotFoundError` → `NoActivePackageError` cuando el cliente no tiene paquete activo. Resultado: 15 decisiones, 4 hallazgos, 0 blockers. |
| 1.7 | 2026-05-14 | Cuarto chunk de M1: presentación del flujo de escaneo. `@scango/shared-types` deja de ser stub: `ScanRequestSchema`/`ScanResponseSchema` + envelopes éxito/error con tipos Zod inferidos. Error mapper único `apps/web/src/app/api/_lib/errorMapper.ts` con switch explícito por subclase de `DomainError` para que el `code` HTTP no derive accidentalmente del `code` interno (§9.3 contrato estable). Auth context stub `getCustomerAuthContext(req)` con headers temporales — refactor obligatorio cuando exista SupabaseAuthProvider. Endpoint `POST /v1/scan` (30 líneas) invoca `runRegisterAttendance(input)`. `zod@^3.23.8` y `@scango/shared-types@workspace:*` añadidos como deps de `apps/web`. `bun run build` verde. Resultado: 15 decisiones, 4 hallazgos, 0 blockers. |
| 1.8 | 2026-05-14 | Quinto chunk de M1: CU-02 backend. Use cases `CreateCustomerUseCase` y `AssignPackageUseCase` + endpoints `POST /v1/customers` (201) y `POST /v1/packages` (201). Extiende `save` en `BusinessRepository` y `CustomerRepository`. Mapeo de unique violations a errores tipados (`CustomerEmailAlreadyExistsError`, `CustomerAlreadyHasActivePackageError`). `isUniqueViolation` extraído a `_lib/pgErrors.ts` con 3 consumidores. Nuevo auth stub `getBusinessAuthContext` (integrador, `X-Business-Id`); `getAdminAuthContext` añadido pre-emptivamente sin consumidor actual (TODO retirar si no se usa pronto). Resultado: 15 decisiones, 4 hallazgos, 0 blockers. |
