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
- [ ] Entidades restantes (BusinessAdmin, ApiKey, WebhookSubscription, WebhookDelivery)
- [ ] Schemas Zod en `packages/shared-types`
- [x] Migración inicial Drizzle (`0000_init_scan_flow.sql`) + políticas RLS para las 5 tablas del flujo de escaneo (D-007)
- [x] Repositorios Drizzle del flujo de escaneo (5 mappers + 5 repos + composition factories)
- [ ] Repositorios Drizzle del resto (ApiKey, BusinessAdmin, WebhookSubscription, WebhookDelivery)
- [x] Métodos atómicos: `QrTokenRepository.claim()` y `PackageRepository.decrementVisitAtomic()`
- [x] Soporte de transacciones en los repos (aceptan `DbOrTx = Database | DrizzleTx`)
- [x] Use case `RegisterAttendance` (CU-03) + `SystemClock` + `UuidGenerator` + factory `runRegisterAttendance(input)` envolviendo `db.transaction`
- [ ] Idempotencia (§9.2) — reintentos del mismo día deben retornar el `Attendance` existente, no lanzar `AlreadyScannedTodayError`. Requiere `AttendanceRepository.findByCustomerAndDate()` y catch + retorno en el use case
- [ ] Outbox en `RegisterAttendance` — insertar filas pending para `attendance.created` (+ `package.depleted` cuando aplique) dentro de la misma transacción. Bloqueado hasta tener `WebhookSubscription` + `WebhookDelivery`
- [ ] Resto de use cases v1 (~12 más, ver D-005)
- [ ] Aplicar la migración a una DB real (Supabase staging) — bloqueado hasta tener `DATABASE_URL` configurada
- [ ] Tests unitarios con `bun test` (parcial: dominio del flujo de escaneo cubierto)
- [ ] Tests de integración con `@testcontainers/postgresql`

### Cleanup técnico (no urgente)

- [ ] Alinear `apps/web/tsconfig.json` para extender `tsconfig.base.json` (hoy es el default de `bun create next-app`, no comparte la strictness del base — `noUncheckedIndexedAccess`, `noImplicitOverride`, etc.)

## Cross-cutting (cuando aplique)

- [ ] Auth provider (`SupabaseAuthProvider` — único punto que importa SDK Supabase)
- [ ] Tabla `webhook_deliveries` + Vercel Cron dispatcher (D-006)
- [ ] API REST pública v1 bajo `/api/v1/...`
- [ ] SDK `@scango/sdk` consumiendo API REST
- [ ] PWA consumiendo `@scango/sdk` (dogfooding)
- [ ] Dashboard del negocio en `apps/web`

---

## Cómo actualizar este archivo

- Marca `[x]` cuando termines la tarea.
- Si una tarea se vuelve obsoleta, **no la borres**: márcala con `~~tachado~~` y un comentario `<!-- obsoleta: razón -->`.
- Nuevas tareas críticas se añaden acá. Decisiones y razonamiento van al ENGRAM, no acá.
