# Checklist global — Scan&Go

Tareas críticas pendientes. Marca con `[x]` al terminar.
Estado vivo y razonado en [`docs/ENGRAM.md`](./docs/ENGRAM.md).

---

## Fase A — Setup del monorepo

- [x] `git init` en la raíz
- [x] `.gitattributes` (`* text=auto eol=lf`) y `.editorconfig`
- [x] `package.json` raíz con workspaces de Bun
- [x] `tsconfig.base.json` y `bunfig.toml`
- [x] `apps/web` — Next.js 16 + TS + Tailwind + App Router (commit `dc814dc`)
- [x] `apps/pwa` — Next.js 16 + TS + Tailwind + App Router (scaffold)
- [x] Renombrar workspaces a `@scango/web` y `@scango/pwa` + alinear filtros
- [x] Commit del scaffold de `apps/pwa` + ajustes de nombres (commit `27192e2`)
- [x] Stub de `packages/shared-types` (Zod + tipos compartidos API ↔ SDK)
- [x] Stub de `packages/sdk` (`@scango/sdk`)
- [x] Stub de `packages/react` (`@scango/react`)
- [x] Placeholder de `examples/external-app` (scaffold completo diferido hasta tener componentes en `@scango/react`)
- [x] Drizzle ORM en `apps/web` (`drizzle-orm` + `postgres` + `drizzle-kit`)
- [x] `bunx drizzle-kit` setup (`drizzle.config.ts`, carpeta de migraciones)
- [x] Esqueleto de Clean Architecture en `apps/web/src` (`domain/`, `application/`, `infrastructure/`; `src/app/` cumple rol de presentation — ver D-015)
- [x] `composition.ts` placeholder en `infrastructure/` (ver D-005)

## Fase M1 — Modelado del dominio

Detalle en [`docs/PRD.md`](./docs/PRD.md) §12 y [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) §6.

- [x] Entidades del dominio del flujo de escaneo (Business, Customer, Package, QrToken, Attendance) — 58 tests verdes
- [x] `BusinessAdmin` entity + repo + tabla + RLS (Phase 1 auth)
- [x] Modelo multi-sede (D-018): entidad `Location` + `LocationRepository` + tabla `locations` + RLS + migración `0002_locations.sql` + `locationId` en `Attendance`/`QrToken`; `GenerateQr` recibe y valida la sede. Pendiente del usuario: aplicar `0002_locations` + re-seed
- [x] Entidades `WebhookSubscription` + `WebhookDelivery` + tipo `WebhookEventType` (dominio + repos + tablas `0003` + RLS)
- [x] Entidad `ApiKey` (dominio + repo + tabla `0004` + RLS + hasher argon2)
- [x] Schemas Zod en `packages/shared-types` (parcial: `ScanRequest`/`ScanResponse` + envelopes de éxito/error). Resto a medida que crezcan los endpoints.
- [x] Migración inicial Drizzle (`0000_init_scan_flow.sql`) + políticas RLS para las 5 tablas del flujo de escaneo (D-007)
- [x] Repositorios Drizzle del flujo de escaneo (5 mappers + 5 repos + composition factories)
- [x] Repositorios Drizzle de webhooks (`WebhookSubscriptionRepositoryDrizzle`, `WebhookDeliveryRepositoryDrizzle` + 2 mappers)
- [x] Repositorio Drizzle de `ApiKey` (`ApiKeyRepositoryDrizzle` + mapper)
- [x] Métodos atómicos: `QrTokenRepository.claim()` y `PackageRepository.decrementVisitAtomic()`
- [x] Soporte de transacciones en los repos (aceptan `DbOrTx = Database | DrizzleTx`)
- [x] Use case `RegisterAttendance` (CU-03) + `SystemClock` + `UuidGenerator` + factory `runRegisterAttendance(input)` envolviendo `db.transaction`
- [x] Idempotencia (§9.2) — chequeo previo en `RegisterAttendance` retorna la asistencia existente. `AttendanceRepository.findByCustomerAndDate` y `PackageRepository.findById` añadidos. Carrera concurrente sigue cayendo en el constraint UNIQUE (no rompe nada).
- [x] Fix del `isUniqueViolation` para caminar `.cause` de `DrizzleQueryError` (antes el mapeo a `AlreadyScannedTodayError` no se gatillaba)
- [x] Outbox en `RegisterAttendance` — `enqueueWebhooks` inserta filas pending para `attendance.created` (+ `package.depleted` cuando el paquete llega a 0) dentro de la misma transacción del escaneo
- [x] Use cases CU-02: `CreateCustomer`, `AssignPackage` + endpoints + business auth stub
- [ ] Use cases CU-01: `RegisterBusiness` (bloqueado hasta auth: requiere `BusinessAdmin` + `ApiKey`)
- [x] Use case `GenerateQr` + endpoint `POST /v1/qr/generate` (sirve también el caso "rotate": el frontend llama otra vez para obtener un QR nuevo)
- [x] Use cases de lectura del dashboard: `ListTodayAttendances`, `ListCustomersWithPackage` (read-models planos vía JOIN)
- [x] Use cases de edición de cliente (RF-06 completo): `UpdateCustomer`, `DisableCustomer`, `EnableCustomer` + Server Actions + UI `CustomerRow` (fila editable, botón contextual habilitar/deshabilitar) en el dashboard (D-021)
- [x] Use case `DeliverWebhook` (cron): `WebhookDispatcher` interface + `HttpWebhookDispatcher` (firma HMAC), transiciones `markDelivered`/`markFailedAttempt` en `WebhookDelivery` (reintentos 1/5/30min, RF-21), repos `listPendingDue`/`update`, cron route `/api/cron/deliver-webhooks` + `vercel.json`. Probado end-to-end. Fixture `db:seed-webhook` (D-023)
- [x] Use cases `IssueApiKey` + `RevokeApiKey` + middleware de auth real `getBusinessAuthContext` (lookup por prefijo + argon2 verify + scope). Fixture `db:seed-api-key`. Probado end-to-end (D-024)
- [ ] Use case restante: `CreateWebhookSubscription`
- [x] Tooling listo para aplicar la migración: scripts `db:migrate`, `db:seed`, `db:studio` en `apps/web/package.json`. Seed script idempotente en `apps/web/scripts/seed.ts`. Guía paso a paso en [`docs/DATABASE_SETUP.md`](docs/DATABASE_SETUP.md). El usuario es quien crea la Supabase y corre `db:migrate`.
- [ ] Tests unitarios con `bun test` (parcial: dominio del flujo de escaneo cubierto)
- [ ] Tests de integración con `@testcontainers/postgresql`

### Cleanup técnico (no urgente)

- [ ] Alinear `apps/web/tsconfig.json` para extender `tsconfig.base.json` (hoy es el default de `bun create next-app`, no comparte la strictness del base — `noUncheckedIndexedAccess`, `noImplicitOverride`, etc.)

## UI (M1)

- [x] Sistema de paleta swappable en ambas apps: tokens `@theme` de Tailwind v4 en `globals.css`. Cero hex/primitivos en componentes. Cambiar `--color-*` actualiza todas las pantallas.
- [x] `apps/pwa` — pantalla `/scan` con `@yudiel/react-qr-scanner`, mensajes específicos por código de error del backend.
- [x] `apps/pwa` — landing `/` con mini-form que persiste `customerId` + `businessId` en localStorage (stub hasta auth real).
- [x] `apps/web` — pantalla `/scan-display` con `qrcode.react`. RF-17 implementado vía polling barato (D-026): `useQuery` cada 5s al Server Action `getActiveQrAction` → `EnsureLocationQrUseCase` (reusa el último QR activo de la sede, o genera uno nuevo si el anterior fue usado). Pausa automática cuando la pestaña no está visible. Botón manual "Generar nuevo QR" fuerza emisión explícita.
- [x] State management: TanStack Query (server) + React Context (session) + Server Components donde se pueda. Convención registrada en [`docs/agents/agent_ui_ux.md`](docs/agents/agent_ui_ux.md) §3.9. Cero `useEffect` para fetching en todo el código de UI.
- [x] `/scan-display` migrada a Server Action `generateQrAction` (D-020): la UI interna ya no consume `/v1`. Eliminado `lib/api/client.ts` (código muerto). Fix de la regresión introducida por Auth Phase 4.
- [ ] Manifest PWA + service worker (`next-pwa`) en `apps/pwa`
- [x] Dashboard del negocio "cabina mínima" (D-020): shell + nav, asistencias de hoy, lista de clientes con paquete, formularios de alta de cliente y asignar paquete (Server Components + Server Actions). Falta: QR rotativo + feed en vivo.

## Cross-cutting (cuando aplique)

- [x] Auth Phase 1: `AuthProvider` interface en dominio + `SupabaseAuthProvider` (único archivo que importa `@supabase/supabase-js`). Errores tipados: `UnauthenticatedError`, `InvalidCredentialsError`, `EmailAlreadyRegisteredError`, `InvalidMagicLinkError`. Migración `0001_auth_business_admins.sql` con RLS lista para aplicar.
- [x] Auth Phase 2: login admin por magic link. Use cases `RequestAdminMagicLink`/`VerifyAdminMagicLink`, rutas `/api/auth/admin/magic-link`, `/api/auth/callback`, `/api/auth/signout`, cookie de sesión HttpOnly (`sg_admin_session`), UI `/login` + `/dashboard`, `getAdminAuthContext` reescrito (lee cookie + `verifySession`). Migración `0001` aplicada. Pendiente del usuario: config del email template de Supabase + env vars + `db:seed-admin`
- [x] Refresh token rotativo (D-025): `verifyMagicLink` devuelve `refreshToken`, dos cookies HttpOnly (`sg_admin_session` access + `sg_admin_refresh`), `middleware.ts` proactivamente canjea el refresh cuando el JWT está por expirar. Cierra el trigger de D-019.
- [ ] Auth Phase 3: customer magic link con `businessId` en el payload (multi-tenant §8.2) + reemplazar `getCustomerAuthContext` stub
- [x] Auth Phase 4: API keys — `ApiKey` entity + argon2id (`@node-rs/argon2`) + `IssueApiKey`/`RevokeApiKey` + `getBusinessAuthContext` real (header `Authorization: Bearer sg_…`, scope `read`/`write`). Migración `0004` aplicada.
- [x] Panel de API keys del dashboard (CU-07): `/dashboard/api-keys` con `ListApiKeys` (read), `issueApiKeyAction` (muestra el valor en claro UNA vez con botón "Copiar") y `revokeApiKeyAction`. Server Components + Server Actions (D-020). Link en el nav del dashboard.
- [x] Tabla `webhook_deliveries` + Vercel Cron dispatcher (D-006): outbox cableado en `RegisterAttendance` + cron `DeliverWebhook` cada minuto. Migración `0003` aplicada
- [x] API REST pública v1 bajo `/api/v1/...` (parcial: `POST /v1/scan` + error mapper §9.3)
- [ ] SDK `@scango/sdk` consumiendo API REST
- [ ] PWA consumiendo `@scango/sdk` (dogfooding)
- [ ] Dashboard del negocio en `apps/web`

---

## Cómo actualizar este archivo

- Marca `[x]` cuando termines la tarea.
- Si una tarea se vuelve obsoleta, **no la borres**: márcala con `~~tachado~~` y un comentario `<!-- obsoleta: razón -->`.
- Nuevas tareas críticas se añaden acá. Decisiones y razonamiento van al ENGRAM, no acá.
