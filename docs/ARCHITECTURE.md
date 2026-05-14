# ARCHITECTURE — Scan&Go

**Versión:** 1.3
**Fecha:** 2026-05-14
**Estado:** Borrador
**Acompaña a:** [PRD.md](./PRD.md)

Este documento explica **cómo** está construido Scan&Go. Para entender **qué** y **por qué**, ver el PRD.

---

## 1. Resumen de la arquitectura

Scan&Go se distribuye como un **servicio API-first** con una PWA propia encima. La lógica de negocio vive en un núcleo independiente de la base de datos y del framework HTTP, expuesta de cuatro formas:

```
                  ┌─────────────────────────────┐
                  │   Lógica de negocio (core)  │ ──── Webhooks HTTPS+HMAC ───►
                  │   Clean Architecture en TS  │      (salida hacia integradores)
                  └─────────────────────────────┘
                       ▲           ▲           ▲
        ┌──────────────┘           │           └──────────────┐
        │                          │                          │
   API REST pública      Dashboard del negocio       PWA del cliente
   (/v1/..., API keys)   (server actions/components) (sesión magic link)
        │                          │                          │
        ▼                          ▼                          ▼
   SDK JS + SDK React          UI propia                  UI del scanner
   (npm, consumen /v1)         de admin                   (consume /v1)
```

**Cuatro superficies sobre el mismo núcleo:**

1. **API REST pública** (`/v1/...`) — entrada para integradores externos. Auth por API keys. Los SDKs (`@scango/sdk`, `@scango/react`) son envoltorios tipados sobre esta API.
2. **Dashboard del negocio** — UI propia para el admin. Invoca los use cases del core directamente vía Next.js server actions / server components (NO pasa por la API REST pública). Auth por sesión Supabase.
3. **PWA del cliente** — la app instalable donde el cliente escanea. Consume `/v1/scan` con sesión propia (magic link).
4. **Webhooks** — única salida del sistema hacia sistemas externos, firmados con HMAC. Los SDKs ayudan a recibir/verificar webhooks, no a emitirlos.

---

## 2. Clean Architecture interna

El código se organiza en **cuatro capas concéntricas**. La regla de dependencias es estricta: las flechas apuntan **siempre hacia adentro**, nunca hacia afuera.

```
┌────────────────────────────────────────────────────────────────┐
│  Presentation                                                  │
│  Next.js route handlers, controllers, middleware HTTP          │
│         │                                                      │
│         ▼ depende de                                           │
│  Application                                                   │
│  Use cases (RegisterAttendance, CreateCustomer, …)             │
│         │                                                      │
│         ▼ depende de                                           │
│  Domain                                                        │
│  Entidades, value objects, errores, interfaces de repositorio  │
│         ▲                                                      │
│         │ implementada por                                     │
│  Infrastructure                                                │
│  Drizzle, Supabase Auth, HTTP webhooks, Clock                  │
└────────────────────────────────────────────────────────────────┘
```

### 2.1 Capa Domain
**Cero dependencias externas.** TypeScript puro. Compila sin Node ni navegador.

Contiene:
- **Entidades** — `Customer`, `Business`, `Package`, `Attendance`, `QrToken`, `ApiKey`, `WebhookSubscription`, `WebhookDelivery`.
- **Value Objects** — `VisitCount`, `BusinessId`, `CustomerId`, `PackageId`, `AttendanceId`, `Email`, `ApiKeyScope`.
- **Errores de dominio** — `PackageDepletedError`, `AlreadyScannedTodayError`, `InvalidQrTokenError`, `CustomerNotFoundError`, `NoActivePackageError`.
- **Interfaces de repositorio (puertos)** — `BusinessRepository`, `CustomerRepository`, `PackageRepository`, `AttendanceRepository`, `QrTokenRepository`, `ApiKeyRepository`, `WebhookSubscriptionRepository`, `WebhookDeliveryRepository`.
- **Interfaces de servicios externos** — `AuthProvider`, `Clock`, `IdGenerator`, `WebhookDispatcher` (este último solo lo usa el cron handler, NO los use cases del flujo de escaneo).

Las entidades **encapsulan invariantes**. Un `Package` con `remainingVisits === 0` no permite `decrement()` — lanza `PackageDepletedError`. La regla vive en el dominio, no se duplica en cada use case ni en la DB.

### 2.2 Capa Application
**Use cases.** Una clase por intención del usuario, con un método `execute()`.

Use cases v1:

| Use case | Cubre RFs |
|---|---|
| `RegisterBusinessUseCase` | RF-05 |
| `CreateCustomerUseCase` | RF-06 |
| `UpdateCustomerUseCase` | RF-06 (editar) |
| `DisableCustomerUseCase` | RF-06 (deshabilitar) |
| `AssignPackageUseCase` | RF-07, RF-08 |
| `GenerateQrUseCase` | RF-10, RF-17 |
| `RotateQrUseCase` | RF-17 |
| `RegisterAttendanceUseCase` | RF-11, RF-12, RF-13, RF-14, RF-15 (el corazón) |
| `ListAttendancesUseCase` | RF-16 (dashboard "asistencias del día") |
| `IssueApiKeyUseCase` | RF-03 |
| `RevokeApiKeyUseCase` | RF-04 |
| `CreateWebhookSubscriptionUseCase` | RF-18 |
| `DeliverWebhookUseCase` | RF-19, RF-20, RF-21 (lo invoca el cron) |

Los use cases reciben sus dependencias por constructor. No importan Drizzle, no importan Next.js, no importan Zod.

### 2.3 Capa Infrastructure
**Adaptadores concretos.** Implementan las interfaces del dominio.

- `persistence/drizzle/` — implementaciones de los repositorios.
- `auth/SupabaseAuthProvider.ts` — implementa `AuthProvider` en prod/staging.
- `auth/FakeAuthProvider.ts` — implementa `AuthProvider` para dev local y tests, sin tocar Supabase.
- `webhooks/HttpWebhookDispatcher.ts` — firma HMAC y hace UN POST. **NO** maneja reintentos — eso lo hace el cron reagendando `webhook_deliveries`.
- `clock/SystemClock.ts`, `ids/UuidGenerator.ts`.
- `composition.ts` — wiring manual de use cases con sus dependencias.

### 2.4 Capa Presentation
**Route handlers de Next.js, delgados.** Cada handler:

1. Parsea el request con Zod.
2. Pide el use case al composition.
3. Llama `useCase.execute(input)`.
4. Mapea el resultado a respuesta HTTP.

Sin lógica de negocio. Si un handler crece más de ~30 líneas, esa lógica pertenece al use case.

---

## 3. Aplicación de SOLID

| Principio | Cómo se aplica |
|---|---|
| **S** Single Responsibility | Un use case = una intención. `RegisterAttendance` no crea clientes. Un repositorio = una entidad. |
| **O** Open/Closed | Nueva DB = nueva impl de los repositorios. Domain y use cases intactos. Nuevo proveedor de auth = nueva impl de `AuthProvider`. |
| **L** Liskov | Cualquier impl de `CustomerRepository` (Drizzle hoy, eventual caché mañana) cumple el mismo contrato y es intercambiable. |
| **I** Interface Segregation | Interfaces pequeñas: `CustomerRepository` solo expone operaciones de customer. No hay "super-interfaz" tipo `IDataStore`. |
| **D** Dependency Inversion | Use cases dependen de **interfaces** del dominio. `composition.ts` inyecta las implementaciones concretas. |

---

## 4. Stack y decisiones técnicas

| Capa | Tecnología | Justificación corta |
|---|---|---|
| Lenguaje | TypeScript 5.x | Tipos compartidos entre API, SDK y dominio sin runtime. |
| Runtime + package manager | **Bun** 1.3+ | Reemplaza Node + pnpm + vitest con una sola herramienta. Install ~3-5x más rápido, ejecución más rápida, TypeScript nativo sin transpilación previa. |
| Framework HTTP | Next.js 15 (App Router) | Route handlers para la API + páginas para dashboard/PWA en el mismo deploy. Corre sobre Bun. |
| ORM | Drizzle (`drizzle-orm/postgres-js`) | TypeScript-first, queries explícitas, soporte de primera para Postgres. Bien soportado en Bun. |
| DB | Postgres (vía Supabase) | Postgres directo. SDK de Supabase **no** se usa para datos — solo para Auth. |
| Auth | Supabase Auth detrás de `AuthProvider` | Magic link + password listos. Swappable a Clerk/BetterAuth si duele. |
| Realtime | Supabase Realtime detrás de interfaz | Para que el dashboard del negocio se entere de nuevas asistencias. |
| Validación | Zod | Schemas compartidos entre API, SDK y tests. |
| QR scan | `@yudiel/react-qr-scanner` | Usa `BarcodeDetector` nativo + fallback a `jsQR`. |
| QR generación | `qrcode` | Generación server-side del PNG/SVG. |
| Tests | **`bun test`** + `@testcontainers/postgresql` | Test runner nativo de Bun (API tipo Jest/vitest, mucho más rápido). Postgres efímero por suite vía testcontainers. |
| E2E | Playwright (vía `bunx playwright`) | Para los flujos críticos en PWA. Independiente del runner. |
| Composition | `composition.ts` plano (sin DI container) | Para los ~13 use cases de v1 no se justifica awilix/tsyringe. |
| Hosting | Vercel + Supabase | Vercel free tier sobra para arrancar. Vercel soporta Bun runtime nativamente. Supabase requiere plan Pro ($25/mes) si se quieren staging y prod separados sin riesgo de pausa (ver §12.2). |
| Monorepo | **Bun workspaces** | Workspaces nativos de Bun (configurados en `package.json` raíz, no necesita `pnpm-workspace.yaml` separado ni Turborepo en v1). |

### 4.1 Por qué Drizzle sobre Prisma
Drizzle no genera código (no hay `prisma generate`). Las queries se escriben con TypeScript que se mapea 1-a-1 a SQL — sin abstracciones mágicas que oculten lo que va a la DB. Bundle más pequeño, mejor para edge runtime. Postgres es su DB de primera clase.

### 4.2 Por qué Supabase pero accedido vía Drizzle
Supabase es Postgres + features extra (Auth, Realtime, Storage). Usamos:
- ✅ El Postgres que provee.
- ✅ Supabase Auth (detrás de interfaz, swappable).
- ✅ Supabase Realtime (detrás de interfaz, swappable).
- ❌ El SDK `@supabase/supabase-js` para operaciones de datos.

Toda persistencia pasa por Drizzle. El día que Supabase se vuelva caro o problemático, migrar el Postgres a Neon/Railway sin tocar dominio ni use cases.

### 4.3 Por qué `composition.ts` plano sin DI container
Para ~13 use cases, un container es maquinaria gratuita. Cuando se llegue a ~20 use cases o aparezcan árboles de dependencias complejos, se introduce awilix.

```ts
// infrastructure/composition.ts
export function buildRegisterAttendance() {
  return new RegisterAttendanceUseCase(
    new CustomerRepositoryDrizzle(db),
    new PackageRepositoryDrizzle(db),
    new AttendanceRepositoryDrizzle(db),
    new QrTokenRepositoryDrizzle(db),
    new WebhookDeliveryRepositoryDrizzle(db),  // insert outbox entries
    new WebhookSubscriptionRepositoryDrizzle(db), // para saber a quién notificar
    new SystemClock(),
    new UuidGenerator(),
  )
}

// El dispatcher solo lo usa el cron — NO el use case del escaneo.
export function buildDeliverWebhook() {
  return new DeliverWebhookUseCase(
    new WebhookDeliveryRepositoryDrizzle(db),
    new WebhookSubscriptionRepositoryDrizzle(db),
    new HttpWebhookDispatcher(),     // firma+POST con el signing_secret de la suscripción
    new SystemClock(),
  )
}
```

**Punto clave:** con el patrón outbox, el `RegisterAttendanceUseCase` **no conoce al dispatcher**. Solo inserta filas en `webhook_deliveries`. El secret HMAC tampoco es una env var: vive en `webhook_subscriptions.signing_secret`, único por suscripción, y el dispatcher lo lee al momento de entregar.

### 4.4 Por qué argon2id sobre bcrypt para API keys
argon2id es el ganador del Password Hashing Competition (2015) y la recomendación actual de OWASP. Resiste mejor ataques GPU/ASIC que bcrypt. Para datos que se hashean una vez y se verifican millones (API keys), la diferencia importa. Disponible en `@node-rs/argon2` con buen rendimiento en Node.js.

---

## 5. Estructura del monorepo

```
docs/
  PRD.md
  ARCHITECTURE.md

apps/
  web/                                   # Next.js — API REST pública + dashboard del negocio
    src/                                 # (servido bajo scango.com)
      domain/                            # SIN dependencias externas
        entities/
        value-objects/
        errors/
        repositories/                    # interfaces solamente
        services/                        # AuthProvider, WebhookDispatcher, Clock, IdGenerator
        events/

      application/
        use-cases/
          RegisterBusiness.ts
          CreateCustomer.ts
          UpdateCustomer.ts
          DisableCustomer.ts
          AssignPackage.ts
          GenerateQr.ts
          RotateQr.ts
          RegisterAttendance.ts
          ListAttendances.ts
          IssueApiKey.ts
          RevokeApiKey.ts
          CreateWebhookSubscription.ts
          DeliverWebhook.ts              # invocado por el cron
        dto/

      infrastructure/
        persistence/drizzle/
          schema.ts                      # tablas Drizzle
          client.ts                      # conexión postgres-js
          CustomerRepositoryDrizzle.ts
          PackageRepositoryDrizzle.ts
          AttendanceRepositoryDrizzle.ts
          QrTokenRepositoryDrizzle.ts
          ApiKeyRepositoryDrizzle.ts
          WebhookSubscriptionRepositoryDrizzle.ts
          WebhookDeliveryRepositoryDrizzle.ts
          BusinessRepositoryDrizzle.ts
          mappers/
        auth/
          SupabaseAuthProvider.ts        # prod/staging
          FakeAuthProvider.ts            # dev local + tests
        webhooks/HttpWebhookDispatcher.ts
        clock/SystemClock.ts
        ids/UuidGenerator.ts
        composition.ts                   # factories planas

      presentation/
        api/v1/
          customers/route.ts
          packages/route.ts
          qr/generate/route.ts
          scan/route.ts
          webhook-subscriptions/route.ts
        api/cron/
          deliver-webhooks/route.ts      # Vercel Cron
        middleware/apiKey.ts
        dashboard/
          business/[slug]/admin/page.tsx
          (auth)/login/page.tsx

    drizzle/
      migrations/
      drizzle.config.ts
    tests/
      unit/domain/                       # entidades, VOs puros
      integration/
        use-cases/                       # con repos Drizzle vs Postgres efímero
        persistence/drizzle/             # constraints, índices, concurrencia
      e2e/v1/                            # HTTP end-to-end

  pwa/                                   # Next.js — PWA del cliente final
    src/app/scan/page.tsx                # (servida bajo scango.com/scan)
    public/manifest.json
    tests/
      e2e/                               # Playwright (CU-03, CU-04, CU-05)

packages/
  sdk/                                   # @scango/sdk
    src/index.ts
    src/resources/customers.ts
    src/resources/scan.ts
    src/webhooks.ts
    tests/
      unit/                              # mockeando fetch
      contract/                          # contra API real en container
  react/                                 # @scango/react
    src/ScanGoProvider.tsx
    src/QrDisplay.tsx
    src/ScanButton.tsx
    tests/                               # @testing-library/react
  shared-types/                          # schemas Zod + tipos compartidos API ↔ SDK
    src/schemas.ts

examples/
  external-app/                          # Next.js de prueba integrando @scango/react

package.json                             # con workspaces de Bun: ["apps/*", "packages/*", "examples/*"]
bunfig.toml                              # config opcional de Bun (registry, install, test)
tsconfig.base.json                       # config TS compartida que cada workspace extiende
```

---

## 6. Modelo de datos

Las tablas viven en Postgres, gestionadas con `drizzle-kit`. Cada fila multi-tenant lleva `business_id`.

```
businesses
  id              uuid PK
  slug            text unique
  name            text
  type            text                    (gym | academy | coworking | other)
  timezone        text                    IANA tz (ej. 'America/Bogota')
  created_at      timestamptz

business_admins                           el dueño es simplemente el primer admin
  business_id     uuid FK businesses
  user_id         uuid                    supabase.auth
  PK (business_id, user_id)

api_keys
  id              uuid PK
  business_id     uuid FK businesses
  hashed_key      text                    argon2id del valor real
  prefix          text                    primeros 8 chars del key para mostrarlo en panel
  scope           text                    'read' | 'write'
  created_at      timestamptz
  revoked_at      timestamptz nullable

customers
  id              uuid PK
  business_id     uuid FK businesses
  user_id         uuid nullable           se setea cuando el cliente acepta el magic link
  full_name       text
  email           text
  phone           text nullable
  status          text                    (active | disabled)
  created_at      timestamptz
  UNIQUE (business_id, email)             email único POR negocio (no global)

packages
  id              uuid PK
  customer_id     uuid FK customers
  business_id     uuid FK businesses      denormalizado para queries de tenant
  total_visits    int
  remaining_visits int
  status          text                    (active | depleted | expired)
  purchased_at    timestamptz
  expires_at      timestamptz nullable    se guarda pero v1 no bloquea por vencimiento

  CREATE UNIQUE INDEX one_active_package_per_customer
    ON packages (customer_id) WHERE status = 'active';
                                          ← RF-08: máximo 1 paquete activo a la vez

qr_tokens
  token           uuid PK                 UUID v7 (o crypto.randomUUID si no disponible)
  business_id     uuid FK businesses
  generated_at    timestamptz             DEFAULT now()
  expires_at      timestamptz             DEFAULT (now() + interval '24 hours') — limita acumulación
  used_by         uuid nullable FK customers
  used_at         timestamptz nullable

attendances
  id              uuid PK
  customer_id     uuid FK customers
  business_id     uuid FK businesses
  package_id      uuid FK packages
  qr_token        uuid FK qr_tokens
  scanned_at      timestamptz             instante exacto (UTC)
  scanned_date    date NOT NULL           día calendario en zona del NEGOCIO, calculado
                                          en el use case y persistido como columna normal
  UNIQUE (customer_id, business_id, scanned_date)   ← anti-doble-marcado a nivel DB

webhook_subscriptions
  id              uuid PK
  business_id     uuid FK businesses
  url             text                    endpoint HTTPS del receptor
  signing_secret  text                    secreto para HMAC (se muestra una vez al crear)
  events          text[]                  ['attendance.created', 'package.depleted']
  status          text                    (active | disabled)
  created_at      timestamptz

webhook_deliveries                        outbox de entregas pendientes
  id              uuid PK
  subscription_id uuid FK webhook_subscriptions
  event_type      text
  payload         jsonb
  status          text                    (pending | delivered | failed)
  attempt         int default 0
  next_attempt_at timestamptz             cuando el cron debe intentar de nuevo
  delivered_at    timestamptz nullable
  last_error      text nullable
  created_at      timestamptz
  INDEX (status, next_attempt_at)         ← para que el cron escanee rápido
```

**Decisiones clave del modelo:**

1. **`email` único por negocio, no global.** Juan puede ser cliente en 3 gyms con `juan@email.com` — son 3 filas en `customers` separadas, con `business_id` distinto.
2. **`scanned_date` NO es columna generada.** Postgres no permite que una `GENERATED ALWAYS AS` referencie otra tabla (necesitaríamos `businesses.timezone`), por lo que el use case calcula la fecha en zona del negocio y la persiste explícitamente. El constraint UNIQUE sigue operando sobre la columna persistida — defensa de último recurso a nivel DB (RF-12).
3. **`packages` con partial unique index** sobre `customer_id WHERE status = 'active'` — enforce RF-08 a nivel DB.
4. **`api_keys.hashed_key`** con argon2id. El valor real solo se muestra una vez al crear; el panel solo expone el `prefix`.
5. **`businesses.timezone`** (IANA, no offset) — necesario para interpretar `scanned_date` correctamente.
6. **El dueño del negocio es simplemente el primer registro en `business_admins`.** No hay columna `role` en v1 (admin vs recepcionista está diferido a v2 según PRD §5.2), ni `owner_user_id` redundante en `businesses` — una sola fuente de verdad.
7. **`qr_tokens.expires_at`** — el QR caduca 24h después de generarse aunque no se use. Evita que se acumulen tokens huérfanos. Un cleanup periódico (cron diario) puede eliminar tokens expirados sin usar.

---

## 7. Multi-tenancy y aislamiento

Cada negocio es un tenant. El aislamiento se aplica en **dos capas** (defensa en profundidad):

### 7.1 Application layer (siempre activa)
Todo repositorio recibe el `business_id` actual y lo aplica como filtro obligatorio:

```ts
async findById(id: CustomerId, businessId: BusinessId): Promise<Customer | null> {
  return this.db
    .select()
    .from(customers)
    .where(and(eq(customers.id, id.value), eq(customers.businessId, businessId.value)))
    .limit(1)
    .then(rows => rows[0] ? CustomerMapper.toDomain(rows[0]) : null)
}
```

El middleware de API key extrae el `business_id` de la key y lo inyecta en el contexto del request. El use case recibe ese contexto y se lo pasa a los repos. **Nunca** hay una query sin `business_id`.

### 7.2 Database layer (obligatoria en v1)
Row Level Security (RLS) de Postgres está **activa desde día 1** en todas las tablas multi-tenant. Razón: el browser del dashboard se conecta **directo** a Supabase Realtime con el `ANON_KEY` (ver §12.1). Sin RLS, ese anon key permitiría a cualquier negocio suscribirse a la tabla `attendances` y ver datos de otros tenants. RLS no es solo "defensa en profundidad" — es **necesaria** por la decisión de Realtime directo.

Políticas RLS mínimas:
- `customers`, `packages`, `attendances`, `qr_tokens`, `api_keys`, `webhook_subscriptions`, `webhook_deliveries`:
  `USING (business_id = (auth.jwt() ->> 'business_id')::uuid)` para SELECT/UPDATE/DELETE.
- `businesses`: solo el propio negocio puede leerse a sí mismo.
- `business_admins`: solo si el `user_id = auth.uid()`.

El backend (Drizzle) se conecta con el rol `postgres` que **bypassea RLS**, así que los repositorios siguen aplicando el filtrado de `business_id` a mano como capa de aplicación. RLS solo aplica al tráfico que entra con anon/authenticated key — es decir, el browser conectándose a Realtime.

### 7.3 API keys
Cada API key está scoped a **un** `business_id`. La key del Gym A nunca puede leer datos del Gym B aunque el código de presentación tuviera un bug — el middleware bloquea antes.

---

## 8. Autenticación

Tres flujos distintos, cada uno con su propósito:

### 8.1 Admin del negocio
- **Quién:** María, dueña del gym.
- **Cómo:** Email + password **o** magic link, ambos vía Supabase Auth.
- **Sesión:** cookie HttpOnly con JWT de Supabase, validado server-side.
- **Acceso:** dashboard del negocio + panel de API keys.

### 8.2 Cliente final
- **Quién:** Juan, socio del gym.
- **Cómo:** Magic link por email. Sin password. Una vez logueado, sesión persistente.
- **Sesión:** cookie HttpOnly, refresh automático.
- **Acceso:** PWA del cliente — escanea, ve historial, ve saldo.
- **Resolución del email-en-múltiples-negocios:** dado que un mismo email puede ser cliente en N negocios (modelo de §6), el magic link enviado por el negocio incluye `business_id` en el payload. Cuando Juan hace click, queda autenticado **en contexto de ese negocio específico**. Si va a otro gym, abre otro magic link enviado por ese otro gym. La PWA muestra siempre el negocio del contexto activo; cambiar de contexto requiere otro magic link (no hay "switcher" en v1).

### 8.3 Integrador externo (API key)
- **Quién:** Sofía, dev del CRM externo.
- **Cómo:** API key generada desde el panel del negocio. Header `Authorization: Bearer sg_<random>`.
- **Validación:** middleware hashea la key recibida con argon2id y compara contra `api_keys.hashed_key`.
- **Scope:** `read` o `write` (RF-03 v1). Granularidad fina queda para v2.
- **Test mode:** v1 no tiene distinción live/test. Cada negocio puede crear cuantas keys quiera y revocar las que no use. Cuando aparezca demanda real de un modo sandbox, se introduce el prefix `sg_test_` vs `sg_live_`.

### 8.4 La interfaz `AuthProvider`
La capa de dominio no conoce a Supabase. Define:

```ts
export interface AuthProvider {
  // Cliente final y admin (sin password)
  sendMagicLink(email: Email, context: AuthContext): Promise<void>
  verifyMagicLink(token: string): Promise<{ userId: UserId, context: AuthContext } | null>

  // Admin con password
  createUserWithPassword(email: Email, password: string): Promise<UserId>
  signInWithPassword(email: Email, password: string): Promise<UserId | null>

  // Verificación de sesión (cookie/JWT)
  verifySession(sessionToken: string): Promise<UserId | null>
}

// AuthContext lleva el business_id u otra info necesaria para resolver multi-negocio
type AuthContext = { businessId: BusinessId; role: 'admin' | 'customer' }
```

**Implementaciones:**
- `SupabaseAuthProvider` (`infrastructure/auth/`) — prod y staging.
- `FakeAuthProvider` — dev local (sin red) y tests (sin Supabase efímero).

Si en v2 se cambia a Clerk o BetterAuth, se reemplaza solo `SupabaseAuthProvider`.

---

## 9. Flujo de escaneo (caso central)

Este es el único flujo que justifica especificar a nivel de secuencia, porque combina concurrencia + invariantes + eventos.

```
┌─────────┐         ┌──────────┐        ┌──────────┐       ┌──────────┐
│Cliente  │         │API /scan │        │Use case  │       │Drizzle / │
│  PWA    │         │ handler  │        │Register  │       │ Postgres │
│         │         │          │        │Attendance│       │          │
└────┬────┘         └─────┬────┘        └─────┬────┘       └─────┬────┘
     │ POST /v1/scan       │                   │                  │
     │ {qrToken}           │                   │                  │
     ├────────────────────►│                   │                  │
     │                     │ Valida Zod        │                  │
     │                     │ Valida sesión     │                  │
     │                     │ del cliente       │                  │
     │                     ├──────────────────►│                  │
     │                     │ execute({         │                  │
     │                     │   qrToken,        │                  │
     │                     │   customerId      │                  │
     │                     │ })                │                  │
     │                     │                   │ BEGIN TX         │
     │                     │                   ├─────────────────►│
     │                     │                   │ findToken        │
     │                     │                   │ findCustomer     │
     │                     │                   │ findActivePackage│
     │                     │                   │ assertNotToday   │
     │                     │                   │ insert attendance│
     │                     │                   │ update package   │
     │                     │                   │ mark token used  │
     │                     │                   │ insert webhook_  │
     │                     │                   │ deliveries (pen) │
     │                     │                   │ COMMIT           │
     │                     │                   │◄─────────────────┤
     │                     │◄──────────────────┤                  │
     │                     │ Attendance        │                  │
     │ 200 OK              │                   │                  │
     │ {remaining:14}      │                   │                  │
     │◄────────────────────┤                   │                  │

(Posteriormente, una Vercel Cron task lee webhook_deliveries
 con status='pending' y next_attempt_at <= now() y entrega los
 webhooks firmados. Si falla, incrementa attempt y next_attempt_at.)
```

### 9.1 Concurrencia y consistencia
Cuatro cosas que pueden fallar concurrentemente:

1. **Dos clientes escanean el mismo QR al mismo tiempo.** Resolución: el QR token solo se invalida atómicamente con `UPDATE qr_tokens SET used_by = $1, used_at = $2 WHERE token = $3 AND used_by IS NULL RETURNING *`. Si retorna 0 filas, otro ganó. Lanzar `InvalidQrTokenError`.

2. **El mismo cliente escanea dos QRs distintos en milisegundos.** Resolución: constraint `UNIQUE (customer_id, business_id, scanned_date)`. La segunda inserción falla con violación de unique → mapear a `AlreadyScannedTodayError`.

3. **Paquete está exactamente en `remaining_visits = 1` y dos requests intentan descontar.** Resolución: `UPDATE packages SET remaining_visits = remaining_visits - 1 WHERE id = $1 AND remaining_visits > 0 RETURNING *`. La condición en el `WHERE` hace el chequeo y el decremento atómicos sin necesidad de lock explícito. Si retorna 0 filas, el paquete ya estaba en 0 → `PackageDepletedError`. Preferimos esto sobre `SELECT FOR UPDATE` porque es una sola query y no bloquea filas.

4. **El servidor se cae después del COMMIT pero antes de despachar el webhook.** Resolución: **patrón outbox**. El evento se inserta en `webhook_deliveries` con `status='pending'` **dentro de la misma transacción** del escaneo. Una **Vercel Cron task** que corre cada minuto lee los `pending` con `next_attempt_at <= now()` y los entrega firmados con HMAC. Si falla, incrementa `attempt` y reagenda según RF-21 (1min, 5min, 30min). Esto garantiza at-least-once delivery sin necesidad de un worker long-running.

### 9.2 Idempotencia
La regla `UNIQUE (customer_id, business_id, scanned_date)` hace que el endpoint sea **naturalmente idempotente por día**. Reintentos en la misma fecha no crean duplicados; retornan el `Attendance` existente.

### 9.3 Error handling: mapeo dominio → HTTP
Los errores de dominio se lanzan como tipos específicos. La capa de presentación tiene un mapper único:

| Error de dominio | HTTP | Código de error |
|---|---|---|
| `InvalidQrTokenError` | 422 | `invalid_qr_token` |
| `AlreadyScannedTodayError` | 409 | `already_scanned_today` |
| `PackageDepletedError` | 422 | `package_depleted` |
| `NoActivePackageError` | 422 | `no_active_package` |
| `CustomerNotFoundError` | 404 | `customer_not_found` |
| `ApiKeyInvalidError` | 401 | `invalid_api_key` |
| `ApiKeyScopeError` | 403 | `insufficient_scope` |
| (zod validation) | 400 | `invalid_request` |
| (cualquier otro) | 500 | `internal_error` |

Formato de respuesta de error (estable para SDK):
```json
{
  "error": {
    "code": "package_depleted",
    "message": "El paquete del cliente está agotado",
    "details": { "package_id": "pkg_01H8..." }
  }
}
```

El mapper vive en `presentation/middleware/errorHandler.ts` y se aplica a todos los handlers vía un wrapper.

---

## 10. Webhooks

### 10.1 Eventos v1
- `attendance.created` — disparado tras un escaneo exitoso.
- `package.depleted` — disparado cuando un escaneo deja al paquete en 0.

### 10.2 Estructura del payload
```json
{
  "id": "evt_01H8...",
  "type": "attendance.created",
  "created_at": "2026-05-14T18:42:17Z",
  "data": {
    "attendance_id": "att_01H8...",
    "customer_id": "cus_01H8...",
    "business_id": "biz_01H8...",
    "package_id": "pkg_01H8...",
    "remaining_visits": 14,
    "scanned_at": "2026-05-14T18:42:15Z"
  }
}
```

### 10.3 Firma HMAC
Header `X-ScanGo-Signature: t=<timestamp>,scheme=v1,sig=<hex>` donde `sig = HMAC_SHA256(signing_secret, timestamp + "." + body)`. El receptor reconstruye y compara con `timingSafeEqual`. Formato inspirado en el de Stripe — bien probado, bien documentado.

**Nota:** el `scheme=v1` identifica la versión del **esquema de firma**, no la versión de la API (que va en la URL `/v1/...`). Son independientes. Si cambia el algoritmo de firma en el futuro, será `scheme=v2`.

### 10.4 Estrategia de entregas (v1 lineal)
Alineado con PRD RF-21: **1 intento inicial + hasta 3 reintentos** = máximo 4 ejecuciones por delivery.

| Ejecución | Cuándo | En caso de fallo |
|---|---|---|
| Intento inicial | Próximo tick del cron (≤1 min tras el escaneo) | Reagenda a 1 min |
| Reintento 1 | A 1 min del fallo previo | Reagenda a 5 min |
| Reintento 2 | A 5 min del fallo previo | Reagenda a 30 min |
| Reintento 3 | A 30 min del fallo previo | Marca `status='failed'` |

Tras el 3er reintento fallido, el delivery queda visible en el panel del negocio como "no entregado" con el último error.

### 10.5 El cron handler
`/api/cron/deliver-webhooks` está protegido con `CRON_SECRET` y se invoca por Vercel Cron cada minuto. Por cada tick:

1. Hace `SELECT ... FROM webhook_deliveries WHERE status='pending' AND next_attempt_at <= now() ORDER BY next_attempt_at LIMIT 50 FOR UPDATE SKIP LOCKED`.
2. Por cada delivery, intenta el POST con HMAC.
3. Actualiza `status`, `attempt`, `next_attempt_at` o marca `delivered_at`.

**Por qué 50 por tick:** una función serverless en Vercel tiene timeout de 60s (plan hobby) o 300s (pro). Asumiendo P95 de 1s por delivery (red + handshake) y dejando margen para empezar y terminar, 50 es seguro en el plan hobby. Si el cron se queda corto, el siguiente tick (1 min después) procesa los restantes — no se pierden, están en la outbox. Backoff exponencial completo y procesamiento paralelo quedan para v2 si la tasa lo amerita.

---

## 11. Testing

La estrategia completa vive en el plan; aquí solo los puntos arquitectónicos.

```
       /\
      /  \   E2E (15%)   ── Playwright para CU-03, CU-04, CU-05
     /----\
    /      \  Integración (45%)  ── use cases + repos Drizzle vs Postgres efímero
   /--------\
  /          \  Unit (40%)  ── dominio puro (entidades, VOs, errores)
 /____________\
```

### 11.0 Test runner
**`bun test`** — nativo del runtime, API tipo Jest/vitest (`describe`, `it`, `expect`, `beforeAll`, `afterAll`, `mock()`). Mucho más rápido que vitest porque no transpila. Soporta TypeScript directo, watch mode (`bun test --watch`), coverage (`bun test --coverage`).

### 11.1 Por qué los use cases se testean con Postgres real (no mockeado)
- Drizzle no se mockea (regla de oro).
- Repos in-memory diferidos — pagar el costo de mantenerlos solo cuando un test sea lento.
- testcontainers levanta un Postgres por suite, corre migraciones de Drizzle, ejecuta tests.

### 11.2 Qué se mockea
Solo lo que cruza el proceso o controla tiempo real:
- `Clock` → `FakeClock` para testear "ya marcaste hoy" sin esperar 24h.
- `IdGenerator` → opcional, para snapshots predecibles.
- `AuthProvider` → `FakeAuthProvider` para tests del flujo de auth sin red.
- `WebhookDispatcher` → spy/fake **solo en tests de `DeliverWebhookUseCase`** (el único que lo recibe). El `RegisterAttendanceUseCase` no usa dispatcher — escribe a la outbox y se testea verificando que la fila aparezca en `webhook_deliveries`.

### 11.3 Cobertura objetivo
- Domain: ~100% (es código puro, sin excusa).
- Use cases críticos (escaneo, paquete, cliente): camino feliz + errores principales.
- Infraestructura: solo donde haya lógica propia. Mappers triviales no se testean.

### 11.4 Observabilidad mínima en v1
Sin métricas estructuradas ni `trace_id` obligatorio (ambas diferidas — ver PRD §10). Lo único que sí está en v1:

- **Logs de aplicación** vía `console.log/error` con estructura mínima: `{ level, msg, route, status, durationMs, error }`. Vercel los captura automáticamente.
- **Errores no manejados** se loguean con stack completo. Cualquier 500 es investigado.
- **Vercel Analytics** (gratis) para latencia de endpoints — no requiere código.

Logger estructurado serio (pino/winston con `trace_id` propagado), Sentry y dashboards de métricas se agregan cuando aparezca el primer bug de producción difícil de reproducir.

---

## 12. Despliegue

### 12.1 Topología
```
                              ┌─────────────────────────┐
                              │      Supabase           │
                              │                         │
   ┌──────────────┐           │   ┌─────────────────┐   │
   │   Vercel     │  pooler   │   │   Postgres      │   │
   │              │──────────►│   │  (drizzle)      │   │
   │  apps/web    │           │   └─────────────────┘   │
   │  apps/pwa    │           │                         │
   │              │  REST     │   ┌─────────────────┐   │
   │              │──────────►│   │   Auth          │   │
   └──────┬───────┘           │   └─────────────────┘   │
          │                   │                         │
          │ HTML/JS           │   ┌─────────────────┐   │
          ▼                   │   │   Realtime      │   │
   ┌──────────────┐    WSS    │   │  (WebSocket)    │   │
   │  Browser     │──────────►│   └─────────────────┘   │
   │ (dashboard,  │ (directo, │                         │
   │  PWA)        │  con ANON_└─────────────────────────┘
   └──────────────┘   KEY)
```
El browser se conecta **directamente** al Realtime de Supabase con `SUPABASE_ANON_KEY` para suscribirse a cambios de la tabla `attendances` filtrados por `business_id`. Vercel no proxy-ea ese tráfico.

### 12.2 Entornos
- **dev:** Postgres local en Docker + `FakeAuthProvider` (no toca Supabase). Sin red externa requerida para correr el sistema.
- **staging:** un proyecto Supabase pago básico + Vercel preview deploys por PR. **Nota sobre Supabase free tier:** el plan free permite 2 proyectos activos; uno se pausa tras 1 semana sin actividad. Para tener staging y prod separados sin riesgo de pausas, conviene el plan Pro de Supabase ($25/mes) con varios proyectos. Si el budget no lo permite todavía, una alternativa: usar Neon (free tier permite múltiples branches sin pausa) solo para staging hasta que el producto genere ingresos.
- **prod:** Supabase + Vercel production con dominio propio.

### 12.3 Migraciones
`bunx drizzle-kit generate` en local → commit del SQL → CI corre `bunx drizzle-kit migrate` contra staging y prod. Nunca SQL manual.

### 12.4 Variables de entorno
```
# Server-only (NO usar NEXT_PUBLIC_ prefix)
DATABASE_URL=                    # Postgres (Supabase URL con pooler) — usado por Drizzle
SUPABASE_URL=                    # para Supabase Auth desde server
SUPABASE_SERVICE_KEY=            # service role key — admin operations en server
CRON_SECRET=                     # protege /api/cron/* — Vercel lo manda como Authorization

# Client-exposable (NEXT_PUBLIC_ prefix permite leerlas en el browser)
NEXT_PUBLIC_APP_URL=             # base URL del deploy
NEXT_PUBLIC_SUPABASE_URL=        # mismo valor que SUPABASE_URL, expuesto al browser
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # anon key — el browser la usa para Realtime con RLS
```

(Nota: los secretos HMAC de webhooks NO son una env var — viven en `webhook_subscriptions.signing_secret` por suscripción, generados aleatoriamente al crear cada suscripción.)

### 12.5 Vercel Cron
Un solo cron job para v1:
```json
{
  "crons": [
    { "path": "/api/cron/deliver-webhooks", "schedule": "* * * * *" }
  ]
}
```
Maneja la entrega del outbox de webhooks. Cualquier otra tarea programada se agrega aquí.

---

## 13. Decisiones revisables

Decisiones que tomamos con la información actual pero pueden cambiar:

| Decisión | Alternativa | Trigger para revisar |
|---|---|---|
| Supabase como host de Postgres | Neon / Railway | Costo creciente, downtime, lock-in molesto |
| Supabase Auth detrás de interfaz | Clerk / BetterAuth / Lucia | Necesidad de SSO empresarial, MFA avanzado |
| Composition manual sin DI | awilix | >20 use cases o árboles de dependencias complejos |
| Outbox en tabla `webhook_deliveries` + Vercel Cron cada minuto | Inngest / Upstash QStash / SQS | Volumen alto que sature el cron o necesidad de delivery con latencia <1min |
| Reintentos lineales (3) | Backoff exponencial | Tasa de fallos de webhook >5% |
| Realtime directo browser ↔ Supabase con RLS obligatoria | Polling cada 2s desde el dashboard, o SSE server-side | Coste/limitaciones de Supabase Realtime, o necesidad de eventos que no son cambios de tabla |

---

## 14. Lo que NO está aquí (intencionalmente)

Para no repetir el PRD:

- **Pasarela de pagos** — fuera del producto, nunca. Ver PRD §5.3.
- **Diferidos con disparador concreto** (ver PRD §10 para la lista completa con triggers):
  - Repos in-memory + contract tests cruzados entre implementaciones de repo.
  - DI container (awilix / tsyringe).
  - UnitOfWork pattern.
  - OpenAPI autogenerado + docs site (Mintlify / Nextra).
  - Rate limiting por API key + por IP.
  - Audit logs de acciones sensibles.
  - Logs estructurados con `trace_id` obligatorio.
  - SLA formal de disponibilidad.
  - Tests de carga con k6.
  - "DB-agnostic" como objetivo en sí mismo.
- **Diferidos a v2** (ver PRD §5.2): multi-sucursal, app nativa, push, white-label, geolocalización anti-fraude, reportería avanzada, permisos granulares, caducidad de paquetes con bloqueo.

---

## 15. Historial

| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-05-14 | Borrador inicial, alineado con PRD v1.3. |
| 1.1 | 2026-05-14 | Auditoría completa, 26 hallazgos resueltos. Críticos: `scanned_date` ya no es generated column (Postgres no permite referencias cruzadas en generated columns con timezone); `RegisterAttendanceUseCase` ya no recibe `WebhookDispatcher` (con outbox solo inserta en `webhook_deliveries`); `composition.ts` reescrito sin env var de secret HMAC. Altos: use cases faltantes añadidos (`ListAttendances`, `UpdateCustomer`, `DisableCustomer`, `CreateWebhookSubscription`, `DeliverWebhook`); repositorios faltantes añadidos al dominio (`WebhookSubscription`, `WebhookDelivery`, `Business`); `AuthProvider` completado con `verifyMagicLink` y `signInWithPassword`; eliminado `owner_user_id` redundante; documentado flujo del email-en-múltiples-negocios para el cliente final. Medios: diagrama §1 reorientado (webhooks como salida del core, no del SDK); dashboard clarificado como server actions; `apps/api` renombrado a `apps/web`; partial unique index para "1 paquete activo"; `qr_tokens.expires_at` para evitar acumulación; tests de SDK/React/PWA añadidos. Bajos: argon2id justificado, "v1" del header HMAC aclarado como esquema de firma (no de API), número 50 por tick justificado, limitación de Supabase free tier admitida, `FakeAuthProvider` nombrado, error handling como sección nueva (§9.3), observabilidad mínima como sección nueva (§11.4), §14 alineado con PRD §10. |
| 1.2 | 2026-05-14 | Vista por encima final. Inconsistencias propias resueltas: "5-10 use cases" → "~13"; "free tier alcanza fácil" alineado con limitación admitida de §12.2; tests de use case mockean solo lo que cruza el proceso (sin `WebhookDispatcher` excepto en `DeliverWebhookUseCase`); diagrama de topología reorientado con browser conectándose **directo** a Realtime; concurrencia caso 3 fija el approach (UPDATE atómico con WHERE en vez de SELECT FOR UPDATE); `qr_tokens.expires_at` y `generated_at` con DEFAULT explícito; `SUPABASE_ANON_KEY` añadido a env vars. **Cambio importante de seguridad descubierto durante la revisión:** la decisión "RLS opcional" era incoherente con "Realtime directo desde browser con anon key" — sin RLS, el browser de un negocio podría suscribirse a datos de otros. RLS pasa a ser **obligatoria desde día 1** (políticas declarativas en Supabase). El backend usa rol `postgres` que bypassea RLS, así que el filtrado de aplicación sigue siendo la primera línea. |
| 1.3 | 2026-05-14 | Stack migrado a Bun: §4 stack table actualizada (Bun como runtime + package manager + test runner reemplaza Node + pnpm + vitest); §5 estructura del monorepo usa workspaces de Bun en `package.json` raíz (sin `pnpm-workspace.yaml` ni Turborepo en v1); §11 testing actualizado para `bun test` con nueva §11.0; §12.3 migraciones con `bunx drizzle-kit`. Decisión motivada por experiencia previa del usuario con Bun y deseo de una sola herramienta. Playwright se invoca con `bunx playwright`. |
