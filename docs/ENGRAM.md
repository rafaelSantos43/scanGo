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

**Fecha:** 2026-05-20
**Cambio:** v3.6 — PWA integrada con la auth real del customer (cierra el lado client de Phase 3). Backend: CORS del proxy gana `Access-Control-Allow-Credentials: true` cuando hay `Origin` (necesario para que la PWA mande las cookies cross-origin); el callback del customer ahora redirige a `NEXT_PUBLIC_PWA_URL` tras un login exitoso (en vez de un `/scan` que no existía en apps/web); proxy con handler `handleCustomerRoute` que combina refresh proactivo + CORS para `/api/v1/scan` y `/api/v1/me/*`; nuevo endpoint `GET /api/v1/me/customer` que devuelve el customer autenticado (`{customerId, businessId, fullName, email}`). PWA: `scanQrToken` ya no recibe IDs (la cookie los lleva); todos los fetches con `credentials: 'include'`; nueva `getMyCustomer()`; `apps/pwa/src/lib/{session-context.tsx,session.ts}` borrados (dead code); landing `/` consume `/me/customer` (loader → "Hola {nombre}" + botón a `/scan` si OK, "abre tu enlace de invitación" si 401, mensajes específicos para `?error=invalid_link/expired/not_a_customer/unknown` del callback); `/scan` también valida sesión antes del scanner y saluda al customer por su nombre. typecheck verde en 5 workspaces, 78 tests. Env nuevo: `NEXT_PUBLIC_PWA_URL`. Pendiente del usuario: setear esa env var; en dev arrancar apps/pwa en otro puerto (3001).

**Cambio anterior (v3.5):** Auth Phase 3: customer magic link. Domain: `AuthProvider.sendMagicLink` recibe `options.emailRedirectTo` para que el callback del customer (que necesita `customer_id` en el query string) pase su URL específica; `CustomerRepository` gana `findByIdAcrossBusinesses` (cross-tenant, mismo patrón que `ApiKey.findByPrefix` — el callback aún no conoce el business al verificar) y `linkUserId` (idempotente, UPDATE WHERE user_id IS NULL). Application: use cases `RequestCustomerMagicLink` (con `callbackBaseUrl` inyectado desde `NEXT_PUBLIC_APP_URL`) y `VerifyCustomerMagicLink` (verifica token + role='customer' + carga el customer + setea user_id + devuelve tokens). Infrastructure: composition con `runRequestCustomerMagicLink`/`runVerifyCustomerMagicLink`. Presentation: `/api/auth/customer/callback` (GET, redirect-based como el del admin), `/api/auth/customer/signout`, **`getCustomerAuthContext` deja de ser stub** — async, lee tres cookies HttpOnly (`sg_customer_session` + `sg_customer_refresh` + `sg_customer_id`), valida el JWT contra Supabase Y verifica que `customers.user_id === verifiedUserId` (defensa contra manipulación de la cookie de id). `/api/v1/scan` migrado a `await`. Proxy: refresh proactivo de las cookies del customer en `/api/v1/scan` (handler genérico `refreshSessionCookies(req, sessionCookie, refreshCookie)` que sirve a admin y customer). `createCustomerAction` ahora envía invite automático tras crear (CU-02 paso 3); el fallo del invite NO deshace la creación. Script `dev:customer-link <customer_id>` para testing sin email. typecheck verde, 78 tests. D-027 (`sg_customer_id` cookie aparte porque el JWT de Supabase no carga claims custom de customer).

**Cambio anterior (v3.4):** RF-17 (auto-rotación del QR de la pantalla tras un escaneo) implementado vía polling barato (D-026), no Realtime. Domain: `QrTokenRepository.findLatestActiveByLocation(businessId, locationId, now)` — el último token sin usar y no expirado para una sede. Application: nuevo use case `EnsureLocationQrUseCase` (reusa el activo o genera uno fresco si no hay). Composition: `runEnsureLocationQr`. Presentation: nuevo Server Action `getActiveQrAction` (auto-polling) + `generateQrAction` mantenido para forzar emisión explícita, ambos en `scan-display/actions.ts`; `page.tsx` con `useQuery` + `refetchInterval: 5000` (TanStack Query pausa automáticamente cuando el tab no es visible) + `useMutation` para el botón manual con `queryClient.setQueryData` post-success. Mientras nadie escanee la pantalla mantiene el mismo QR; tras un uso, el latest-active desaparece y el siguiente tick devuelve el nuevo. typecheck verde, 78 tests. Pendiente: cron de limpieza de `qr_tokens` expirados (ARCHITECTURE §6 lo menciona; el acumulado real es solo por uso, ~100/día/gym, no urgente).

**Cambio anterior (v3.3):** Refresh token rotativo para la sesión del admin (cierra el trigger de D-019). `AuthProvider.verifyMagicLink` ahora devuelve también `refreshToken`; propagado por `SupabaseAuthProvider` y `VerifyAdminMagicLink`. La sesión queda en dos cookies HttpOnly: `sg_admin_session` (access JWT) + `sg_admin_refresh` (refresh rotativo), ambas con `maxAge` de 30 días (sessionCookie.ts: `applySessionCookies`/`clearSessionCookies`). El callback de auth escribe ambas; el signout las limpia. Nuevo `src/middleware.ts` que en cada navegación a `/dashboard/*` decodifica el `exp` del JWT localmente (sin verificar firma) y, si vence en <30s, canjea el refresh por un par nuevo vía POST `/auth/v1/token?grant_type=refresh_token` (fetch directo, sin SDK) y reescribe las cookies. Si el refresh falla, las borra y la page redirige a /login. Decisión D-025 (middleware en vez de refresh en `getAdminAuthContext`, porque los Server Components no pueden escribir cookies). typecheck verde, 78 tests. Pendiente del usuario: reiniciar el dev server (middleware nuevo) y re-loguearse UNA vez — las sesiones previas no tienen refresh cookie.

**Cambio anterior (v3.2):** Panel de API keys del dashboard (CU-07). Domain/Application: `ApiKeyRepository.listByBusinessId` + use case `ListApiKeys` + `runListApiKeys`. Presentation: ruta `/dashboard/api-keys` (Server Component que lista + `IssueApiKeyForm` client con clipboard + `ApiKeyRow` con botón revocar). Server Actions `issueApiKeyAction` (estado dedicado `IssueApiKeyActionState` que carga el `plainKey` en `success` para mostrarlo UNA vez) y `revokeApiKeyAction` (ActionState genérico del dashboard). Link "API keys" añadido al nav del layout. Cierra el ciclo CU-07: María puede emitir y revocar keys desde la UI sin tocar SQL. typecheck verde, 78 tests. La línea de "Pendiente" en la entrada de v3.0 queda cerrada.

**Cambio anterior (v3.1):** Fix de la regresión que dejó Auth Phase 4: `/scan-display` migrada a Server Action. La pantalla del gym (UI interna, D-020) llamaba `/api/v1/qr/generate` directamente — al volver `/v1` autenticada en v3.0, el botón "Generar QR" daba 401. Solución: `app/scan-display/actions.ts` con `generateQrAction` que invoca `runGenerateQr` desde el servidor; `page.tsx` lo llama vía `useQuery`. Eliminado `lib/api/client.ts` (dead code: era el único consumidor). Confirma la regla D-020 en práctica: UI interna usa Server Actions; `/api/v1/*` es solo para integradores externos con API key. typecheck verde, 78 tests. Pendiente del usuario: refrescar el dev server / la pestaña abierta para que cargue el código nuevo.

**Cambio anterior (v3.0):** Auth Phase 4: API keys (RF-03, RF-04). Domain: entidad `ApiKey` (`isRevoked`/`revoke` idempotente/`allows` — `write` implica `read`), tipo `ApiKeyScope`, `ApiKeyId`, `ApiKeyRepository`, servicio `ApiKeyHasher`, error `ApiKeyNotFoundError`, const compartida `API_KEY_PREFIX_LENGTH`. Infrastructure: tabla `api_keys` + migración `0004` con RLS, `ApiKeyMapper`, `ApiKeyRepositoryDrizzle`, `Argon2ApiKeyHasher` (dep nueva `@node-rs/argon2`; `serverExternalPackages` en `next.config.ts`). Application: `IssueApiKey` (genera `sg_`+64 hex, hashea argon2id, persiste; devuelve el valor en claro UNA vez) y `RevokeApiKey`. Presentation: `getBusinessAuthContext` deja de ser stub — async, valida `Authorization: Bearer sg_…` (lookup por prefijo + verify argon2 + chequeo de revocación + scope); las 3 rutas `/v1` exigen `write`; `errorMapper` añade `invalid_api_key` (401) e `insufficient_scope` (403). Fixture `scripts/seed-api-key.ts`. D-024: lookup por prefijo (argon2 no se puede consultar por hash). Probado end-to-end contra Supabase real (migración `0004` aplicada): key válida 201, sin auth/basura 401, key `read` en ruta `write` 403. typecheck verde 5 workspaces, 78 tests (+6). **Regresión conocida:** `/scan-display` llama `/api/v1/qr/generate` directo y ahora recibe 401 — debe migrarse a Server Action (UI interna no debe consumir el API pública, D-020); es la tarea siguiente.

**Cambio anterior (v2.9):** Webhooks: lado de entrega (RF-21). Domain: interfaz `WebhookDispatcher`; `WebhookDelivery` gana transiciones `markDelivered`/`markFailedAttempt` — la regla de reintentos vive en la entidad (1min/5min/30min; tras el 4º intento `failed`). Repos suman `WebhookSubscriptionRepository.findById` y `WebhookDeliveryRepository.listPendingDue`/`update` (`listPendingDue` es cross-tenant a propósito: el cron procesa el outbox de todos los negocios). Infrastructure: `HttpWebhookDispatcher` (firma HMAC-SHA256 en `X-ScanGo-Signature`, timeout 10s). Application: `DeliverWebhookUseCase` (toma ≤50 entregas vencidas, despacha, persiste resultado). Presentation: cron route `/api/cron/deliver-webhooks` protegido con `CRON_SECRET` + `vercel.json` (cada minuto). Fixture de pruebas `scripts/seed-webhook.ts` (alias `db:seed-webhook`). D-023: el cron NO usa transacción ni `FOR UPDATE SKIP LOCKED`. Probado end-to-end contra Supabase real (migración `0003` aplicada): escaneo de María → fila `pending` en el outbox → cron → POST firmado entregado a webhook.site → delivery `delivered`. typecheck verde en 5 workspaces, 72 tests (+4).

**Cambio anterior (v2.8):** Sistema de webhooks: entidades + outbox. Domain: tipo `WebhookEventType` (`attendance.created`/`package.depleted`), entidades `WebhookSubscription` (`isActive`, `isSubscribedTo`) y `WebhookDelivery` (factory `pending()`), interfaces `WebhookSubscriptionRepository.findActiveByBusinessId` y `WebhookDeliveryRepository.save`. Infrastructure: tablas `webhook_subscriptions` y `webhook_deliveries` (índice `(status, next_attempt_at)` para el cron), migración `0003_webhooks.sql` con RLS, 2 mappers + 2 repos Drizzle. Application: `RegisterAttendance` ya no arrastra el TODO del outbox — el método privado `enqueueWebhooks` inserta filas `pending` por cada (evento × suscripción suscrita a ese evento) dentro de la transacción del escaneo; la ruta idempotente NO encola. typecheck verde en 5 workspaces, 68 tests (+8 de dominio). D-022: `webhook_deliveries` lleva `business_id` denormalizado. Falta el lado de entrega: cron `DeliverWebhook` + `HttpWebhookDispatcher` + `CreateWebhookSubscription` (siguientes chunks).

**Cambio anterior (v2.7):** RF-06 completo: ciclo editar/deshabilitar/habilitar de clientes (D-021). `UpdateCustomer` reconstruye el `Customer` con nombre/email/phone nuevos preservando status/userId/createdAt; `DisableCustomer` y `EnableCustomer` usan `Customer.disable()`/`enable()` (idempotentes). Domain: nuevo método `Customer.enable()` y método `CustomerRepository.update()` (UPDATE de full_name/email/phone/status filtrado por id+business_id, mapea unique violation de email a `CustomerEmailAlreadyExistsError`). El consumidor es el dashboard (D-020), NO la API `/v1` pública: Server Actions `updateCustomerAction`/`disableCustomerAction`/`enableCustomerAction` + componente client `CustomerRow` con modo display/edición inline y botón contextual (Deshabilitar si activo, Habilitar si deshabilitado). typecheck verde en 5 workspaces, 60 tests (+2 de `enable()`). Además, fix de infraestructura hallado al probar el login del admin (ver H-005): el pooler de Supabase estaba en modo session (puerto 5432) y el HMR de Next filtraba un pool de `postgres-js` por recarga hasta agotarlo — el callback del magic link reventaba con error crudo (`?error=unknown`). Fix: `DATABASE_URL` a puerto 6543 (modo transaction), `client.ts` con `max: 5` y el cliente de DB cacheado en `globalThis` para sobrevivir al HMR.

**Cambio anterior (v2.6):** Dashboard del negocio "cabina mínima" (D-020). El dashboard es la app interna del admin para el cliente SIN software propio (el gym de cartones); el gym CON software se integra por API/webhooks (Phase 4) y nunca ve esta UI. Hace dos cosas y nada más: muestra asistencias y guarda clientes+paquetes. Arquitectura: NO usa los endpoints `/api/v1/*` (esos son la API pública); usa Server Components para leer (auth con `getAdminAuthContext()` cookie) y Server Actions para escribir. Domain: read-models `AttendanceListItem` y `CustomerListItem` + métodos `listByBusinessAndDate` / `listByBusinessWithActivePackage` (JOINs en el repo, no entidades). Application: use cases `ListTodayAttendances` (calcula "hoy" en la zona del negocio) y `ListCustomersWithPackage`. UI: `dashboard/layout.tsx` (shell + nav), `page.tsx` (asistencias de hoy), `clientes/page.tsx` (lista + formularios), `actions.ts` (`'use server'` — `createCustomerAction`/`assignPackageAction` con `ActionState` discriminado + `revalidatePath`), forms client con `useActionState`. typecheck + 58 tests verdes; lecturas verificadas contra Supabase real.

**Cambio anterior (v2.5):** Auth Phase 2: login del admin por magic link (D-019). Use cases `RequestAdminMagicLink` (envía link, respuesta neutral) y `VerifyAdminMagicLink` (verifica, resuelve el negocio vía `findBusinessesByUserId`, devuelve `accessToken`). Rutas: `POST /api/auth/admin/magic-link`, `GET /api/auth/callback` (verifica + setea cookie + redirige; responde con redirects no JSON), `POST /api/auth/signout`. Cookie de sesión HttpOnly `sg_admin_session` (utilidad `api/_lib/sessionCookie.ts`, guarda el access_token de Supabase, `SameSite=Lax`, ~1h). `getAdminAuthContext` reescrito: ahora `async` sin `req`, lee la cookie con `cookies()` + `verifySession` + resuelve negocio. UI `/login` (form de email, server page + `LoginForm` client) y `/dashboard` (server component, placeholder autenticado + `SignoutButton`). Tres ajustes a artefactos de Phase 1: `AuthProvider.sendMagicLink(email, role)` (sin `AuthContext`), `verifyMagicLink` devuelve `{userId, role, accessToken}` (antes descartaba el JWT), el businessId ya no viaja en el magic link. Error nuevo `NotABusinessAdminError` (403). Fixture `scripts/seed-admin.ts` (`db:seed-admin`). typecheck + 58 tests verdes. Pendiente del usuario: config del email template de Supabase (`token_hash`), 3 env vars de Supabase Auth, correr `db:seed-admin`.

**Cambio anterior (v2.4):** Undécimo chunk de M1: modelo multi-sede (D-018). El dueño del primer cliente confirmó que su gym tiene dos sedes y que un cliente entrena en cualquiera con el mismo paquete. `business` pasa a ser la empresa (tenant); nueva entidad `Location` (sede). Domain: `LocationId`, `Location` (id, businessId, name, createdAt), `LocationRepository`, `LocationNotFoundError`; `Attendance` y `QrToken` ganan `locationId`. Infrastructure: tabla `locations` en schema, `LocationMapper`, `LocationRepositoryDrizzle`, mappers de Attendance/QrToken actualizados, `buildLocationRepository()` en composition. Migración `0002_locations.sql` (tabla + RLS `locations_tenant_isolation` + backfill: una "Sede principal" por business existente, columnas `location_id` nullable→backfill→NOT NULL→FK). Application: `GenerateQr` recibe `locationId` y valida la sede; `RegisterAttendance` toma `locationId` del QR reclamado (el cliente NO elige sede — regla de seguridad). Contratos: `GenerateQrRequest` ahora `{locationId}`, `GenerateQrResponse`/`ScanResponse` ganan `locationId`. UI: `scan-display` pide Business ID + Location ID; `fetchNewQr` manda `locationId`. PWA sin cambios. Seed crea dos sedes (Norte/Sur). El índice anti-doble-scan NO cambia (sigue por negocio, no por sede). typecheck verde en apps/web + shared-types + pwa, 58 tests verdes. Pendiente que ejecuta el usuario: aplicar `0002_locations` y re-correr seed.

**Cambio anterior (v2.3):** Décimo chunk de M1: Phase 1 de auth real. Domain: `BusinessAdmin` (PK compuesta business_id+user_id, sin id propio per ARCHITECTURE §6 decision 6), `AuthContext` VO (`{businessId, role}`), `AuthProvider` interface (sendMagicLink, verifyMagicLink, createUserWithPassword, signInWithPassword, verifySession), 4 errores tipados (`UnauthenticatedError`, `InvalidCredentialsError`, `EmailAlreadyRegisteredError`, `InvalidMagicLinkError`), `BusinessAdminRepository` con métodos para lookup multi-tenant. Infrastructure: migración `0001_auth_business_admins.sql` (tabla + FK a businesses + RLS `business_admins_self` con `user_id = auth.uid()`), `BusinessAdminMapper`, `BusinessAdminRepositoryDrizzle`, `SupabaseAuthProvider` (único archivo que importa `@supabase/supabase-js`, instalado 2.105.4 en `apps/web`). Composition expone `buildAuthProvider()` y `buildBusinessAdminRepository()` con singletons. Env vars documentadas: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_MAGIC_LINK_REDIRECT_URL`. Sin use cases ni endpoints ni UI todavía — esos vienen en Phases 2-4.

**Cambio anterior (v2.2):** Noveno chunk de M1: tooling de DB para aplicar la migración. Seed script idempotente `apps/web/scripts/seed.ts` (crea Demo Gym + Juan Demo + Package 30 visitas, imprime UUIDs). Scripts `db:migrate`/`db:seed`/`db:studio` en `apps/web/package.json`. Guía completa [`docs/DATABASE_SETUP.md`](DATABASE_SETUP.md): pasos Supabase, env config, migración, seed, curl playbook (`POST /v1/qr/generate`, `/v1/scan`, `/v1/customers`, `/v1/packages`), troubleshooting. Documentado el caso de Postgres vainilla (sin Supabase Auth): stub `CREATE FUNCTION auth.jwt()` para que la migración con RLS funcione. README.md enlaza a la guía. El siguiente paso lo ejecuta el usuario (no es código): crear proyecto Supabase + correr migración + probar end-to-end.

**Cambio anterior (v2.1):** Octavo chunk de M1: state management establecido. D-017 (TanStack Query para server state + React Context para session/auth + Server Components donde se pueda). Refactor de `apps/pwa/scan`, `apps/pwa/`, `apps/web/scan-display`: cero `useEffect` para fetching, los únicos 2 useEffect en todo el código de UI viven en los providers para hidratar localStorage (justificación: browser-only API, una sola vez al mount). `<Providers>` (QueryClient + SessionProvider) montado en cada `layout.tsx`. Convención documentada en `docs/agents/agent_ui_ux.md` §3.9. Builds verdes, 5 workspaces typechequean.

**Cambio anterior (v2.0):** Séptimo chunk de M1: primera UI end-to-end (entregada por `agent_ui_ux`). `apps/pwa/src/app/scan` consume `POST /v1/scan` con `@yudiel/react-qr-scanner`, maneja 5 fases (idle/scanning/loading/success/error) con mensajes específicos por código de error (§9.3). `apps/web/src/app/scan-display` muestra el QR del negocio con `qrcode.react`, polling cada 30s a `POST /v1/qr/generate`. Ambas apps usan tokens `@theme` de Tailwind v4 en `globals.css` con nombres semánticos (`--color-primary`, `--color-surface`, `--color-foreground`, `--color-success`, `--color-danger`, ...) — D-016. Verificado con grep: cero colores primitivos (`bg-blue-500`, etc.) y cero hex en componentes. Swap probado cambiando `--color-primary`. Auth sigue siendo stub: PWA persiste `scango.customerId`/`scango.businessId` en localStorage, dashboard persiste `scango.dashboardBusinessId`. URL real de los endpoints es `/api/v1/...` (App Router), no `/v1/...`. Pendiente: manifest PWA + service worker (`next-pwa`).

**Cambio anterior (v1.9):** Sexto chunk de M1: `GenerateQrUseCase` + endpoint `POST /v1/qr/generate`. Valida que el negocio exista, crea un `QrToken` con `expiresAt = now + 24h` (consistente con default de DB) y lo persiste. Schemas Zod `GenerateQrRequest` (strict vacío) y `GenerateQrResponse`. `RotateQr` no se modela como caso separado — el frontend llama al mismo endpoint cada vez que necesita un nuevo QR. Build verde con 4 rutas dinámicas (`/api/v1/{scan,customers,packages,qr/generate}`).

**Cambio anterior (v1.8):** Quinto chunk de M1: CU-02 backend (admin/integrador). Use cases `CreateCustomerUseCase` (con validación defensiva de Business existente vía `BusinessRepository.findById`) y `AssignPackageUseCase` (valida cliente existe y está activo, luego `PackageRepository.save` mapea unique violation de `one_active_package_per_customer` a `CustomerAlreadyHasActivePackageError`). Extendidas firmas `save` en `BusinessRepository` y `CustomerRepository` (no existían). Drizzle `CustomerRepositoryDrizzle.save` mapea 23505+`customers_business_email_unique` a `CustomerEmailAlreadyExistsError`. Nuevos errores: `CustomerEmailAlreadyExistsError`, `CustomerAlreadyHasActivePackageError`, `InvalidVisitCountError`. Endpoints `POST /v1/customers` y `POST /v1/packages` con status 201. Nuevo stub `getBusinessAuthContext(req)` que lee `X-Business-Id` (auth de integrador vía API key, futuro). Agente añadió pre-emptivamente `getAdminAuthContext(req)` (`X-User-Id` + `X-Business-Id`) para futuros endpoints de dashboard — sin consumidores hoy, marcado TODO(auth). `isUniqueViolation` extraído a `infrastructure/persistence/drizzle/_lib/pgErrors.ts` (3 consumidores justifican la abstracción per RULES §2.9). Build verde con 3 rutas dinámicas (`/api/v1/{scan,customers,packages}`).

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

### D-024 — Lookup de API key por prefijo, no por hash
- **Fecha:** 2026-05-19
- **Decisión:** cada `api_key` guarda un `prefix` en claro (`sg_` + 11 hex, 14 chars, índice UNIQUE) además del `hashed_key` argon2id. El middleware de auth extrae el prefijo de la key recibida, busca la fila por prefijo, y verifica el valor completo con `argon2.verify`.
- **Alternativas:** (A) "hashear la key recibida y comparar contra `hashed_key`", como dice literalmente ARCHITECTURE §8.3 — imposible: argon2 usa salt aleatorio, dos hashes de la misma key difieren, no existe un `WHERE hashed_key = hash(recibida)`; (B) lookup por prefijo + verify — elegida; (C) formato tipo Stripe `sg_<keyid>_<secret>` con keyid separado — más estructura sin ganancia, el `prefix` que §6 ya pide cumple la función.
- **Por qué:** §8.3 está subespecificado. `argon2.verify` necesita primero la fila; el `prefix` (que §6 define "para mostrarlo en panel") sirve de id de lookup si se le pone índice UNIQUE. 11 hex de aleatoriedad hacen la colisión irrelevante.
- **Qué se pierde:** el prefijo viaja en claro — es identificador, no secreto, así que está bien. Una colisión de prefijo al emitir (astronómica) haría fallar el INSERT por el UNIQUE; no se añadió retry.
- **Donde queda:** `domain/entities/ApiKey.ts` (`API_KEY_PREFIX_LENGTH`), `ApiKeyRepository.findByPrefix`, `app/api/_lib/businessAuthContext.ts`, `application/use-cases/IssueApiKey.ts`. Pendiente: reconciliar ARCHITECTURE §8.3.

### D-023 — El cron de webhooks no usa transacción ni FOR UPDATE SKIP LOCKED
- **Fecha:** 2026-05-19
- **Decisión:** `DeliverWebhookUseCase` lee las entregas vencidas con un SELECT plano (sin lock), procesa cada una y persiste su resultado con un UPDATE independiente. No envuelve nada en una transacción.
- **Alternativas:** (A) `SELECT ... FOR UPDATE SKIP LOCKED` dentro de una transacción, como sugiere literalmente ARCHITECTURE §10.5; (B) SELECT plano sin lock — elegida; (C) "claim" en una transacción corta (marcar las filas) y procesarlas fuera.
- **Por qué:** (A) obliga a mantener la transacción abierta mientras se hacen hasta 50 POST HTTP (~segundos cada uno) — transacción larga, anti-patrón, conexión del pooler retenida. (C) es lo correcto a gran escala pero añade un round-trip y estado intermedio que v1 no necesita. La garantía es at-least-once (ARCHITECTURE §9.1 caso 4) y los receptores deben ser idempotentes; un reenvío ocasional por ticks solapados es aceptable. Vercel Cron además no suele solapar ejecuciones del mismo job.
- **Qué se pierde:** dos ticks solapados podrían entregar dos veces la misma fila. Mitigado por el contrato at-least-once.
- **Trigger para revisar:** receptores reportando duplicados molestos, o volumen que haga que un tick no termine antes del siguiente → pasar a la opción C.
- **Donde queda:** `application/use-cases/DeliverWebhook.ts`, `infrastructure/composition.ts` (`runDeliverWebhook` sin transacción), este archivo.

### D-027 — Sesión del customer: 3 cookies (session + refresh + customer_id)
- **Fecha:** 2026-05-19
- **Decisión:** La sesión del customer usa **tres** cookies HttpOnly: `sg_customer_session` (access JWT), `sg_customer_refresh` (refresh rotativo) y `sg_customer_id` (el `CustomerId` puro). `getCustomerAuthContext` lee las tres, valida el JWT, busca el customer por id cross-tenant, y comprueba que `customers.user_id === verifiedUserId` antes de aceptar el contexto.
- **Alternativas:** (A) custom JWT claims con `customer_id` y `business_id` vía Supabase auth hooks — el JWT carga todo el contexto sin necesidad de cookie extra ni round-trip a la DB; (B) solo session+refresh + lookup por `users.user_id` → 1 customer — falla si el mismo email es customer en N negocios (multi-business §8.2); (C) cookie extra de `customer_id` — la elegida.
- **Por qué:** (A) es lo "correcto" pero requiere configurar un Auth Hook en Supabase (escribir SQL function + linkearlo en el dashboard) — esfuerzo no trivial y atado a la plataforma. (B) rompe en multi-business — el mismo email puede mapear a múltiples customers en distintos negocios; sin la cookie no hay cómo elegir cuál. (C) es simple: el callback del magic link guarda el id en la cookie, y `getCustomerAuthContext` lo lee + verifica contra el user_id del JWT (defensa contra manipulación).
- **Qué se pierde:** un round-trip a la DB por cada `getCustomerAuthContext` (lookup del customer). Aceptable; es lo mismo que el admin hace con `findBusinessesByUserId`.
- **Trigger para revisar:** si se implementan custom JWT claims por otra razón (Realtime con RLS, ver D-026) y conviene unificar; o si el round-trip pesa medible.
- **Donde queda:** `app/api/_lib/sessionCookie.ts` (helpers de customer), `app/api/_lib/authContext.ts` (`getCustomerAuthContext`), `app/api/auth/customer/callback/route.ts`, `application/use-cases/VerifyCustomerMagicLink.ts`, `domain/repositories/CustomerRepository.ts` (`findByIdAcrossBusinesses`, `linkUserId`).

### D-026 — RF-17 (auto-rotación del QR) por polling, no Realtime
- **Fecha:** 2026-05-19
- **Decisión:** La pantalla del gym implementa la auto-rotación del QR tras escaneo (RF-17) mediante polling cada 5s a un Server Action `getActiveQrAction` que consulta el último QR activo (no usado, no expirado) de la sede. Mientras nadie escanee el server devuelve el mismo token; tras un uso, el latest-active desaparece y el siguiente tick devuelve uno fresco.
- **Alternativas:** (A) Supabase Realtime en el browser suscrito a `attendances` filtradas por business+location — el approach que insinúa D-007. Requiere que el JWT del browser tenga `business_id` como claim (custom claims hooks en Supabase) para que la RLS `business_id = (auth.jwt() ->> 'business_id')::uuid` deje ver solo lo del negocio. Esfuerzo de auth no trivial. (B) Polling cada N segundos sin lógica de "is used" — regenera siempre, acumula tokens inútiles, cambia el QR al cliente que está en medio del escaneo. (C) Status endpoint "¿token sigue válido?" + refetch on demand — más endpoints, mismo costo de red. (D) Polling con "ensure or generate" — elegida.
- **Por qué:** (D) tiene la misma semántica de (A) (rota SOLO cuando alguien usó el QR) con cero infra extra: un SELECT con índice por tick (~2ms), TanStack Query pausa polling cuando la pestaña no está visible (`refetchIntervalInBackground` default false), no requiere modificar el JWT de Supabase. Costo medido: ~7 200 polls/día por pantalla = ruido de fondo. Realtime sería más eficiente en push pero el costo de implementación supera el de polling para v1.
- **Qué se pierde:** latencia de hasta ~5s entre el escaneo y la rotación visible (en un gym es invisible). Y un poll de fondo aunque nadie escanee.
- **Trigger para revisar:** si una sola pantalla supera ~20K polls/día (gym muy activo), o si entra el chunk de custom JWT claims para otro motivo y Realtime queda barato.
- **Donde queda:** `application/use-cases/EnsureLocationQr.ts`, `infrastructure/persistence/drizzle/QrTokenRepositoryDrizzle.ts` (`findLatestActiveByLocation`), `app/scan-display/{actions.ts,page.tsx}`.

### D-025 — Refresh token de la sesión del admin se ejecuta en el proxy
- **Fecha:** 2026-05-19
- **Decisión:** El canje del `refresh_token` por un par nuevo (cierra D-019 trigger "si 1h molesta") se hace en el proxy de Next.js (`src/proxy.ts`, lo que Next 14 llamaba `middleware`) que matchea `/dashboard/:path*`. El proxy decodifica el `exp` del JWT localmente (sin verificar firma) y, si está por vencer, llama a Supabase `POST /auth/v1/token?grant_type=refresh_token` y reescribe las cookies.
- **Alternativas:** (A) bump del JWT expiry a 24h sin refresh — menos código, pero ventana de daño en caso de robo de cookie es 24× mayor; (B) refresh dentro de `getAdminAuthContext` — funciona en Server Actions / Route Handlers, pero los Server Components no pueden escribir cookies, así que el cookie nuevo no persistiría tras una page load; (C) proxy/middleware — la elegida.
- **Por qué:** el proxy es el único punto donde se puede escribir cookies *antes* de que la page se renderice. Decodificar el JWT localmente para decidir si refrescar evita un round-trip extra a Supabase cuando el access sigue vigente. El proxy usa fetch directo (no `@supabase/supabase-js`) para no arrastrar el SDK al runtime del proxy y respetar la regla "solo `SupabaseAuthProvider` importa el SDK".
- **Qué se pierde:** el proxy corre en cada request a `/dashboard/*` (chequeo de exp + posible refresh). Costo bajo, pero existe.
- **Nota:** la lógica vive integrada en `src/proxy.ts` junto a la de CORS para `/api/*` (un mismo archivo, dispatcher por path). Originalmente se metió como `src/middleware.ts`; al detectarse el warning de Next 16 ("middleware deprecated, use proxy"), se renombró y fusionó.
- **Trigger para revisar:** si Phase 3 (customer magic link) entra y queremos unificar; o si Supabase cambia su REST de refresh.
- **Donde queda:** `src/proxy.ts`, `app/api/_lib/sessionCookie.ts` (`applySessionCookies`/`clearSessionCookies`), `domain/services/AuthProvider.ts`, `infrastructure/auth/SupabaseAuthProvider.ts`, `application/use-cases/VerifyAdminMagicLink.ts`.

### D-022 — `webhook_deliveries` lleva `business_id` denormalizado
- **Fecha:** 2026-05-19
- **Decisión:** La tabla `webhook_deliveries` incluye una columna `business_id` (FK a `businesses`), además del `subscription_id`.
- **Alternativas:** (A) sin `business_id`, como literalmente lista ARCHITECTURE §6 — el negocio se resuelve vía join con `webhook_subscriptions`; (B) `business_id` denormalizado — elegida; (C) RLS por subconsulta sobre `webhook_subscriptions`.
- **Por qué:** ARCHITECTURE §6 no le da `business_id` a `webhook_deliveries`, pero §7.2 sí la lista entre las tablas con RLS `USING (business_id = ...)` — contradicción interna de la doc. Denormalizar (igual que `packages.business_id`) resuelve la incoherencia a favor de §7.2: hace la política RLS uniforme con el resto de tablas y habilita la futura vista "entregas fallidas" del panel del negocio (ARCHITECTURE §10.4) sin un join. El use case del outbox ya tiene el `businessId` del escaneo a mano, así que setearla es trivial.
- **Qué se pierde:** una columna redundante (derivable de la suscripción).
- **Donde queda:** `schema.ts`, `0003_webhooks.sql`, `domain/entities/WebhookDelivery.ts`, este archivo. Pendiente: reconciliar ARCHITECTURE §6.

### D-021 — Ciclo habilitar/deshabilitar de clientes (extiende RF-06)
- **Fecha:** 2026-05-19
- **Decisión:** El dashboard permite deshabilitar Y volver a habilitar un cliente. La entidad `Customer` gana `enable()` junto a `disable()`; hay un `EnableCustomerUseCase` espejo exacto de `DisableCustomerUseCase`. En la UI, cada fila (`CustomerRow`) muestra el botón inverso a su estado: "Deshabilitar" si está activo, "Habilitar" si está deshabilitado.
- **Alternativas:** (A) solo `deshabilitar`, al pie de la letra de RF-06 ("crear, editar, listar, deshabilitar") — deja un callejón sin salida: un cliente deshabilitado por error solo se recupera con SQL manual; (B) ciclo completo habilitar/deshabilitar — elegida.
- **Por qué:** RF-06 lista solo "deshabilitar", pero deshabilitar sin retorno en la UI es una trampa de UX que se confirmó probando. El costo de `EnableCustomer` es mínimo (espejo del de disable, reusa `CustomerRepository.update()`). El usuario, como dueño del producto, aprobó la extensión (RULES §5).
- **Qué se pierde:** el código va por delante del PRD. RF-06 debería decir "habilitar/deshabilitar" — pendiente de actualizar en el PRD para que doc y código no diverjan.
- **Donde queda:** `domain/entities/Customer.ts`, `application/use-cases/{Enable,Disable,Update}Customer.ts`, `app/dashboard/CustomerRow.tsx`, `app/dashboard/actions.ts`, `CHECKLIST.md`, este archivo. Pendiente: PRD RF-06.

### D-020 — El dashboard es "cabina mínima", no software de gym
- **Fecha:** 2026-05-15
- **Decisión:** El dashboard de `apps/web` es la app interna para el cliente SIN software propio. Hace exactamente dos cosas: muestra asistencias y guarda clientes con sus paquetes de visitas. Nada más — sin pagos, sin membresías, sin clases, sin facturación, sin reportes. Es la cabina mínima del "brazo" de asistencia (D-002). El cliente CON software propio NO ve este dashboard: se integra por API keys + webhooks + SDK (Phase 4). Técnicamente: el dashboard NO reusa los endpoints `/api/v1/*` (esos son la API pública con auth de API key); usa Server Components (lectura, auth por cookie) + Server Actions (escritura).
- **Alternativas:** (A) no construir dashboard, solo API — el primer cliente real (gym de cartones) no tiene dónde "engancharse", el brazo sin cuerpo no sirve; (B) dashboard completo de gestión de gym (membresías, clases, pagos) — contradice D-002/D-010 y mete a Scan&Go a competir con el software de gym establecido; (C) reusar `/api/v1/*` desde el dashboard — mezcla la API pública de integradores con la UI interna y su modelo de auth.
- **Por qué:** el cliente que se tiene (gym de cartones) no tiene software → necesita una cabina. Pero la disciplina de mantenerla mínima evita el deslizamiento hacia "software de gym". Server Components + Server Actions es el patrón Next 16 más simple para una UI interna same-origin y evita construir endpoints GET paralelos.
- **Qué se pierde:** dos consumidores del backend (dashboard turnkey + API de integradores) en vez de uno; hay que mantener el límite de alcance conscientemente.
- **Trigger para revisar:** si el dashboard empieza a necesitar features de gestión (membresías, pagos), es señal de que se cruzó el límite — parar.
- **Donde queda:** `apps/web/src/app/dashboard/`, `CHECKLIST.md`, este archivo.

### D-019 — Sesión del admin: cookie HttpOnly con el access_token de Supabase
- **Fecha:** 2026-05-15
- **Decisión:** Tras el login por magic link, la sesión del admin es una cookie HttpOnly (`sg_admin_session`) que guarda el `access_token` (JWT) de Supabase. `getAdminAuthContext` la lee server-side y la valida con `verifySession` (`getUser`). Sin refresh token: la sesión dura lo que el access_token (~1h, configurable en el dashboard de Supabase). El `businessId` NO viaja en el magic link — el admin se loguea solo con su email; el negocio se resuelve tras verificar vía `BusinessAdminRepository.findBusinessesByUserId`.
- **Alternativas:** (A) sesión propia (token firmado por nosotros) en vez del JWT de Supabase — duplica lo que Supabase ya da y `verifySession` ya espera un access_token; (B) guardar también el refresh_token y rotar — sesiones largas pero más código y un round-trip por request; pospuesto. (C) meter el businessId en la metadata del link (como asumía Phase 1) — imposible: al pedir el link solo se conoce el email.
- **Por qué:** el JWT de Supabase ya está firmado y es validable server-side sin estado; la cookie HttpOnly lo protege de XSS. Resolver el negocio post-verify es la única opción coherente con "el admin se loguea con su email". 1h de sesión es aceptable para Phase 2; subir el JWT expiry en Supabase mitiga.
- **Qué se pierde:** sin refresh, el admin re-inicia sesión cada ~1h. Cada request admin hace 2 llamadas (verifySession + DB).
- **Trigger para revisar:** si 1h molesta en uso real → añadir rotación de refresh token; si hay multi-negocio real → selector en vez de "primer negocio".
- **Donde queda:** `api/_lib/sessionCookie.ts`, `api/_lib/authContext.ts`, `application/use-cases/VerifyAdminMagicLink.ts`, este archivo.

### D-018 — Modelo multi-sede: `business` = empresa, `location` = sede
- **Fecha:** 2026-05-15
- **Decisión:** `business` representa la empresa/marca (el tenant que paga); una nueva entidad `Location` representa cada sucursal física. `Customer` y `Package` se quedan a nivel `business` (un cliente entrena en cualquier sede con el mismo paquete). `Attendance` y `QrToken` ganan `locationId` — registran en qué sede ocurren. El `locationId` de una asistencia sale del `QrToken` reclamado, nunca del request del cliente (la pantalla escaneada determina la sede; el cliente no la elige). `business_admin` se queda a nivel `business` (un admin ve todas las sedes). El índice único anti-doble-scan sigue en `(customerId, businessId, scannedDate)` — la regla es "una visita por día por negocio"; meterle `locationId` permitiría doble registro entre sedes el mismo día.
- **Alternativas:** (A) sedes como `business` separados — siloa clientes/paquetes por sede, contradice el hecho confirmado de que el paquete vale en ambas; (B) no modelar sedes, dejar `business` = local — incorrecto para el mercado (la mayoría de gyms tienen varias sedes), retrofit dolorosa después del dashboard; (C) `Location` con `timezone` propio — obligaría a refactorizar el cálculo de `scanned_date` (hoy usa `business.timezone`) y el constraint anti-doble-scan; pospuesto.
- **Por qué:** el dueño del primer cliente confirmó dos sedes con paquete compartido. Modelarlo en M1 (mientras se modela el dominio) es acotado; hacerlo después de construir dashboard + use cases de listado lo vuelve una refactorización mayor. La forma `business`→`location` es estándar y sirve incluso a gyms de un solo local (un `business` con una `location`).
- **Qué se pierde:** una entidad y una tabla más; `GenerateQr` ahora necesita saber la sede.
- **Trigger para revisar:** si se necesita `timezone`/`address` por sede, o permisos de admin por sede (hoy a nivel business).
- **Donde queda:** migración `0002_locations.sql`, `domain/entities/Location.ts`, `CHECKLIST.md`, este archivo.

### D-017 — State management: TanStack Query + Context, sin useEffect para fetching
- **Fecha:** 2026-05-14
- **Decisión:** En el código de UI (`apps/web`, `apps/pwa`) se prohíbe usar `useEffect` para hacer fetch. Server state se gestiona con `@tanstack/react-query` (`useQuery`/`useMutation`). Session/auth client-side va en React Context (`SessionProvider` en pwa, `DashboardSessionProvider` en web) — un único useEffect interno para hidratar desde localStorage al mount, justificado porque localStorage es browser-only. Vistas estáticas del dashboard de `apps/web` usan Server Components que invocan use cases directo via `composition.ts`.
- **Alternativas:** (A) SWR — más liviana (~4KB) pero menos features (no `useMutation` tan ergonómico, no `refetchInterval` tan directo); (B) Zustand/Jotai/Redux para server state — duplica el cache de TanStack Query, sin valor en este proyecto; (C) custom hooks de fetch caseros — reinventan TanStack Query con bugs y sin cache; (D) seguir con `useEffect + useState` ad-hoc — pedido del usuario explícitamente NO esto.
- **Por qué:** el usuario pidió evitar "reguero de `useEffect`". TanStack Query elimina la repetición de estados de carga/error/cache/retry en cada componente y trae los 4 estados de UI (§3.2 del agent_ui_ux) por defecto. React Context cubre el caso pequeño de sesión sin meter una librería global. Server Components eliminan fetch en cliente para listas/detalles que no cambian en el browser.
- **Qué se pierde:** ~13KB gzipped por app por TanStack Query (acceptable). Curva de aprendizaje mínima para devs que no la conocen.
- **Trigger para revisar:** si TanStack Query no escala bien con casos exóticos (subscripciones, optimistic updates complejos, etc.) o si se decide usar Server Actions para todas las mutaciones (entonces el `useMutation` se reemplazaría por `useFormState`).
- **Donde queda:** `docs/agents/agent_ui_ux.md` §3.9 (regla obligatoria), `apps/web/src/lib/providers.tsx`, `apps/pwa/src/lib/providers.tsx`, este archivo.

### D-016 — Paleta de colores swappable vía tokens `@theme` de Tailwind v4
- **Fecha:** 2026-05-14
- **Decisión:** Los colores de UI en `apps/web` y `apps/pwa` se definen en un bloque `@theme { --color-* }` en `globals.css` de cada app con nombres semánticos (`primary`, `surface`, `foreground`, `success`, `danger`, `warning`, `muted`, `border` + sus `*-foreground`). Componentes consumen utilities derivadas (`bg-primary`, `text-foreground`, ...). Cero hex hardcodeado, cero clases primitivas (`bg-blue-500`).
- **Alternativas:** (A) `tailwind.config.ts` con `theme.extend.colors` — Tailwind v3 style, ya no aplica; (B) constantes en TS importadas por cada componente — runtime sin beneficio sobre tokens CSS; (C) ad-hoc con hex/primitivos — lo que rompe el requisito de swap fácil.
- **Por qué:** el usuario pidió explícitamente que la paleta sea cambiable sin esfuerzo en cualquier momento. Los tokens semánticos en una sola ubicación (`globals.css`) cumplen el contrato: editar un valor y todas las pantallas se actualizan. Tailwind v4 genera las utility classes desde las variables `--color-*` automáticamente.
- **Qué se pierde:** mínimo overhead semántico al pensar nombres ("¿este botón es `primary` o `surface-foreground`?"). Refactor inicial si una marca quiere un color exótico fuera de los 8 tokens.
- **Trigger para revisar:** si se necesita dark mode (otro bloque `@theme` bajo `:where(.dark)` o `@media (prefers-color-scheme: dark)`), o si una marca quiere multi-theme runtime.
- **Donde queda:** `apps/web/src/app/globals.css`, `apps/pwa/src/app/globals.css`, [[feedback-ui-theme-tokens]] en memoria del orquestador, este archivo.

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

### H-005 — El pooler de Supabase tiene dos modos y el puerto define cuál
- **Contexto:** el login del admin fallaba de forma intermitente con "Algo salió mal"; el callback del magic link caía en la rama `?error=unknown` (error inesperado, no tipado).
- **Realidad:** `DATABASE_URL` apuntaba al pooler en puerto **5432** (modo *session*: reserva una conexión de servidor por cada cliente, tope `pool_size` ~15). El HMR de Next en dev re-evalúa el módulo del cliente de DB y filtra un pool nuevo de `postgres-js` por recarga; al superar 15, toda query revienta con `EMAXCONNSESSION` — un `PostgresError` crudo que, al no ser un error de dominio, cae en `unknown`.
- **Lección aplicada:** usar el puerto **6543** (modo *transaction*: multiplexa, no reserva conexión por cliente — el modo correcto para apps tipo Next.js) y cachear el cliente de DB en `globalThis` para que el HMR lo reúse en vez de filtrarlo. `client.ts` ya tenía `prepare: false`, obligatorio en modo transaction — la URL en 5432 era la pieza incoherente.
- **Donde queda:** `client.ts`, `composition.ts`, `apps/web/.env.local` (no versionado — el cambio de puerto lo aplica el usuario en su entorno).

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
| 1.9 | 2026-05-14 | Sexto chunk de M1: `GenerateQrUseCase` + endpoint `POST /v1/qr/generate` (201). Frontend del negocio llamará este endpoint cada vez que necesite un nuevo QR — el caso "rotate" no requiere use case separado. Build verde con 4 rutas dinámicas. Resultado: 15 decisiones, 4 hallazgos, 0 blockers. |
| 2.0 | 2026-05-14 | Séptimo chunk de M1: primera UI end-to-end. `apps/pwa/scan` (cliente final con `@yudiel/react-qr-scanner`) y `apps/web/scan-display` (negocio con `qrcode.react` y polling 30s). Añadida D-016 (paleta swappable vía tokens `@theme` de Tailwind v4 — pedido explícito del usuario, verificado con cero hex/primitivos). Ambas apps buildea, 5 workspaces typechequean. Auth sigue siendo stub: localStorage en cliente para `customerId`/`businessId`. Endpoint base: `/api/v1/...` (App Router). Resultado: 16 decisiones, 4 hallazgos, 0 blockers. |
| 2.1 | 2026-05-14 | Octavo chunk de M1: state management establecido (D-017). `@tanstack/react-query@5.100.10` instalado en ambas apps. `<Providers>` (QueryClient + SessionProvider/DashboardSessionProvider) montado en cada `layout.tsx`. `apps/pwa/scan`, `apps/pwa/`, `apps/web/scan-display` refactorizados a `useQuery`/`useMutation` + `useSession`. Cero useEffect para fetching en todo el código de UI; los únicos 2 useEffect (uno por app) viven en los SessionProviders y solo hidratan localStorage al mount. Convención documentada en `agent_ui_ux.md` §3.9. Resultado: 17 decisiones, 4 hallazgos, 0 blockers. |
| 2.2 | 2026-05-14 | Noveno chunk de M1: tooling de DB. Seed script `apps/web/scripts/seed.ts` idempotente, scripts npm `db:migrate`/`db:seed`/`db:studio`, guía paso a paso `docs/DATABASE_SETUP.md` con Supabase + curl playbook. Sin código de runtime nuevo; desbloquea al usuario para correr `bun run db:migrate` contra una DB real. Resultado: 17 decisiones, 4 hallazgos, 0 blockers. |
| 2.3 | 2026-05-14 | Décimo chunk de M1: Phase 1 de auth real. `BusinessAdmin` + `AuthContext` + `AuthProvider` interface en dominio. `SupabaseAuthProvider` concreto en infrastructure (único punto que importa `@supabase/supabase-js`). Migración 0001 con RLS. Composition wireada. Pendiente Phases 2-4: use cases, endpoints, UI, customer magic link, API keys. Resultado: 17 decisiones, 4 hallazgos, 0 blockers. |
| 2.6 | 2026-05-15 | Dashboard del negocio "cabina mínima" (D-020): shell + nav, asistencias de hoy, lista de clientes con paquete, formularios de alta (Server Components + Server Actions). Use cases `ListTodayAttendances`/`ListCustomersWithPackage` con read-models por JOIN. typecheck + 58 tests verdes; lecturas verificadas contra Supabase. Resultado: 20 decisiones, 4 hallazgos, 0 blockers. |
| 2.5 | 2026-05-15 | Auth Phase 2: login del admin por magic link (D-019). Use cases `RequestAdminMagicLink`/`VerifyAdminMagicLink`, rutas `/api/auth/{admin/magic-link,callback,signout}`, cookie HttpOnly `sg_admin_session` con el access_token de Supabase, `getAdminAuthContext` reescrito (async, lee cookie), UI `/login` + `/dashboard`, error `NotABusinessAdminError`, fixture `seed-admin.ts`. Ajustes a Phase 1: `verifyMagicLink` devuelve el JWT, el businessId ya no viaja en el link. typecheck + 58 tests verdes. Resultado: 19 decisiones, 4 hallazgos, 0 blockers. |
| 3.6 | 2026-05-20 | PWA integrada con auth real (cierra Phase 3 client-side): CORS con credentials, callback redirige a `NEXT_PUBLIC_PWA_URL`, endpoint `/api/v1/me/customer`, `getMyCustomer()` en la PWA, landing/scan consumen la cookie real, localStorage stub borrado. 78 tests verdes. |
| 3.5 | 2026-05-19 | Auth Phase 3: customer magic link. `RequestCustomerMagicLink` + `VerifyCustomerMagicLink`, callback `/api/auth/customer/callback`, 3 cookies HttpOnly (`sg_customer_session` + `sg_customer_refresh` + `sg_customer_id`), `getCustomerAuthContext` async real. Proxy refresca cookies del customer en `/api/v1/scan`. `createCustomerAction` envía invite automático (CU-02 paso 3). Repo gana `findByIdAcrossBusinesses` (cross-tenant) + `linkUserId` (idempotente). Script `dev:customer-link`. D-027 (3 cookies en vez de custom JWT claims). 78 tests verdes. |
| 3.4 | 2026-05-19 | RF-17 (auto-rotación del QR tras escaneo) por polling barato (D-026): `QrTokenRepository.findLatestActiveByLocation`, use case `EnsureLocationQr`, Server Action `getActiveQrAction`, `useQuery` con `refetchInterval: 5000` en `/scan-display`. TanStack Query pausa polling cuando la pestaña no es visible. Botón manual sigue forzando emisión vía `generateQrAction`. 78 tests verdes. |
| 3.3 | 2026-05-19 | Refresh token rotativo de la sesión del admin (cierra D-019 trigger): `verifyMagicLink` devuelve `refreshToken`, dos cookies HttpOnly (access + refresh) con maxAge 30 días, `src/middleware.ts` canjea refresh proactivamente cuando el JWT está por vencer. D-025. 78 tests verdes. Pendiente del usuario: reiniciar dev server + re-loguearse una vez. |
| 3.2 | 2026-05-19 | Panel de API keys del dashboard (CU-07): ruta `/dashboard/api-keys`, `ListApiKeys` + `IssueApiKeyForm` (muestra plainKey una vez, botón Copiar) + `ApiKeyRow` (revocar). Server Components + Server Actions. Cierra el ciclo emitir/revocar desde la UI. 78 tests verdes. |
| 3.1 | 2026-05-19 | Fix de regresión de v3.0: `/scan-display` migrada a Server Action (`generateQrAction`); ya no consume `/v1`. Eliminado `lib/api/client.ts` (dead). Confirma D-020 en práctica. 78 tests verdes. |
| 3.0 | 2026-05-19 | Auth Phase 4: API keys (RF-03/04). `ApiKey` entity + argon2id (`@node-rs/argon2`) + `IssueApiKey`/`RevokeApiKey` + `getBusinessAuthContext` real (lookup por prefijo + verify + scope `read`/`write`). Migración `0004` con RLS. `errorMapper` con `invalid_api_key`/`insufficient_scope`. Fixture `seed-api-key`. D-024 (lookup por prefijo). Probado end-to-end. 78 tests verdes. Regresión conocida: `/scan-display` debe migrar a Server Action. Resultado: 24 decisiones, 5 hallazgos, 0 blockers. |
| 2.9 | 2026-05-19 | Webhooks lado de entrega (RF-21): interfaz `WebhookDispatcher` + `HttpWebhookDispatcher` (firma HMAC), transiciones `markDelivered`/`markFailedAttempt` en `WebhookDelivery`, `DeliverWebhookUseCase`, cron `/api/cron/deliver-webhooks` + `vercel.json`, fixture `seed-webhook.ts`. D-023 (cron sin transacción ni SKIP LOCKED). Probado end-to-end contra Supabase real. 72 tests verdes. Resultado: 23 decisiones, 5 hallazgos, 0 blockers. |
| 2.8 | 2026-05-19 | Sistema de webhooks: entidades `WebhookSubscription`/`WebhookDelivery` + `WebhookEventType`, tablas + migración `0003` con RLS, 2 mappers + 2 repos Drizzle. Outbox cableado en `RegisterAttendance` (`enqueueWebhooks`) — el TODO del use case central queda cerrado. D-022 (`webhook_deliveries.business_id` denormalizado, resuelve incoherencia ARCHITECTURE §6 vs §7.2). 68 tests verdes. Falta el lado de entrega (cron `DeliverWebhook`). Resultado: 22 decisiones, 5 hallazgos, 0 blockers. |
| 2.7 | 2026-05-19 | RF-06 completo: ciclo editar/deshabilitar/habilitar de clientes (D-021). Domain: `Customer.enable()`, `CustomerRepository.update()`. Application: use cases `UpdateCustomer`/`DisableCustomer`/`EnableCustomer`. Presentation: Server Actions + componente `CustomerRow` con edición inline y botón contextual. Fix de infraestructura (H-005): pooler de Supabase a modo transaction (puerto 6543) + cliente de DB cacheado en `globalThis` contra el leak de pools del HMR; `client.ts` con `max: 5`. typecheck verde en 5 workspaces, 60 tests. Resultado: 21 decisiones, 5 hallazgos, 0 blockers. |
| 2.4 | 2026-05-15 | Undécimo chunk de M1: modelo multi-sede (D-018). `business` = empresa, nueva entidad `Location` = sede. `Attendance`/`QrToken` ganan `locationId` (sale del QR, no del cliente). Migración `0002_locations.sql` con backfill de "Sede principal" por business. `GenerateQr` recibe y valida `locationId`. Contratos y `scan-display` actualizados; PWA sin cambios. typecheck + 58 tests verdes. Pendiente del usuario: aplicar 0002 y re-seed. Resultado: 18 decisiones, 4 hallazgos, 0 blockers. |
