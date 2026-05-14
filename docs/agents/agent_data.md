# agent_data — Reglas

**Aplican a:** el agent que trabaja en el núcleo de negocio: dominio, use cases, persistencia y API.
**Hereda de:** [`docs/RULES.md`](../RULES.md). En conflicto, gana la regla global.

---

## 1. Misión

Construir y mantener **las tres capas internas** de Clean Architecture (ver `ARCHITECTURE §2`):

1. **Domain** (`apps/web/src/domain/`) — entidades, value objects, errores, interfaces de repositorios y servicios externos. TypeScript puro, cero dependencias externas.
2. **Application** (`apps/web/src/application/`) — los 13 use cases v1 (ver `ARCHITECTURE §2.2`). Orquestan dominio + interfaces.
3. **Infrastructure** (`apps/web/src/infrastructure/`) — adaptadores: repositorios Drizzle, `SupabaseAuthProvider`, `FakeAuthProvider`, `HttpWebhookDispatcher`, `SystemClock`, `UuidGenerator`, `composition.ts`.

Adicionalmente:
- **Presentation** capa fina (`apps/web/src/presentation/api/...`) — route handlers de Next.js que delegan a use cases.
- **Schema y migraciones** (`apps/web/drizzle/`) gestionadas con `drizzle-kit`.
- **API REST `/v1/...`** + **cron handler** `/api/cron/deliver-webhooks`.

---

## 2. Stack obligatorio

- **Drizzle ORM** con `drizzle-orm/postgres-js`. `drizzle-kit` para migraciones.
- **Postgres** vía Supabase (la conexión, no el SDK de Supabase para datos).
- **`@supabase/supabase-js`** **solo** dentro de `SupabaseAuthProvider`. En ningún otro archivo.
- **Zod** para validación en bordes: input de endpoints HTTP, env vars al arrancar.
- **`@node-rs/argon2`** para hashear API keys (ver `ARCHITECTURE §4.4`).
- **`uuid`** o `crypto.randomUUID()` para generación de IDs. UUID v7 si la librería lo soporta limpio, v4 es aceptable.

---

## 3. Reglas específicas de Clean Architecture

### 3.1 La regla de dependencias es sagrada
```
Presentation → Application → Domain ← Infrastructure
```
- `domain/` **NO** importa nada de fuera (ni Drizzle, ni Next.js, ni Zod, ni Supabase). TypeScript puro.
- `application/` solo importa de `domain/`.
- `infrastructure/` implementa interfaces de `domain/` y puede importar de `domain/` y de librerías externas.
- `presentation/` invoca `application/` vía `composition.ts`.

Si encuentras la necesidad de violar esta regla, **escala al orquestador**. La regla casi nunca tiene excepciones legítimas.

### 3.2 Entidades encapsulan invariantes
- `Package.decrement()` lanza `PackageDepletedError` si `remainingVisits === 0`. La regla NO se duplica en el use case ni en la DB.
- `VisitCount` no acepta negativos en su constructor.
- `Email` valida formato (con Zod o regex simple) en su constructor.

Una entidad nunca está en un estado inválido. Si lo necesitas, ese es un value object diferente o un error.

### 3.3 Use cases reciben dependencias por constructor
```ts
export class RegisterAttendanceUseCase {
  constructor(
    private customers: CustomerRepository,
    private packages: PackageRepository,
    private attendances: AttendanceRepository,
    private qrTokens: QrTokenRepository,
    private webhookDeliveries: WebhookDeliveryRepository,
    private webhookSubscriptions: WebhookSubscriptionRepository,
    private clock: Clock,
    private ids: IdGenerator,
  ) {}

  async execute(input: RegisterAttendanceInput): Promise<Attendance> { /* ... */ }
}
```
- **Sin** `static async create()` o singletons.
- **Sin** acceder a env vars, `process.env`, ni leer del filesystem desde un use case.
- Toda I/O pasa por las interfaces inyectadas.

### 3.4 Repositorios siempre filtran por `business_id`
**Sin excepción.** Toda firma de método de repositorio multi-tenant lleva `businessId`:
```ts
findById(id: CustomerId, businessId: BusinessId): Promise<Customer | null>
```
Si encuentras tentación de un método sin `businessId` (ej. "buscar por email global"), es señal de que el diseño está mal o que se necesita escalación.

### 3.5 Mappers explícitos
Cada repositorio Drizzle tiene un mapper `XMapper.toDomain(row)` y `XMapper.toPersistence(entity)`. La entidad **nunca** se construye con `new Customer({ ...row })` directo desde una fila de Drizzle. El mapper valida y traduce.

### 3.6 Transacciones
Para flujos que tocan múltiples tablas (ej. `RegisterAttendance` toca `attendances`, `packages`, `qr_tokens`, `webhook_deliveries`), envolver en `db.transaction(async (tx) => ...)`. Los repositorios deben aceptar un `tx` opcional o un Drizzle client que ya sea el tx.

**NO** uses `UnitOfWork` pattern como abstracción explícita (está diferido a v2 — ver PRD §10).

### 3.7 Outbox para webhooks
En `RegisterAttendanceUseCase` (y otros que disparan eventos), **no** llamar al `WebhookDispatcher`. Solo insertar filas en `webhook_deliveries` con `status='pending'`. El cron handler los entrega después. Ver `ARCHITECTURE §9.1 caso 4` y `§10.5`.

### 3.8 Constraints de DB como defensa de último recurso
- `UNIQUE (customer_id, business_id, scanned_date)` en `attendances` — RF-12 anti-doble-marcado.
- `CREATE UNIQUE INDEX ... ON packages (customer_id) WHERE status = 'active'` — RF-08 un paquete activo a la vez.
- `UNIQUE (business_id, email)` en `customers`.

Los use cases también validan estas reglas, pero los constraints garantizan integridad bajo concurrencia. Cuando una violación de unique se dispara, el repositorio la mapea al error de dominio correspondiente (ej. `AlreadyScannedTodayError`).

### 3.9 RLS (Row Level Security) obligatoria
Toda tabla multi-tenant debe tener políticas RLS. Ver `ARCHITECTURE §7.2`. El backend Drizzle se conecta como rol `postgres` que bypassea RLS, así que la primera línea es el filtrado de aplicación. RLS protege el tráfico que entra con anon/auth key (el browser conectándose a Realtime).

Política base: `USING (business_id = (auth.jwt() ->> 'business_id')::uuid)` para SELECT/UPDATE/DELETE.

### 3.10 Migraciones disciplinadas
- Generar con `drizzle-kit generate --name <descriptivo>`.
- Commit del SQL generado **junto con** el cambio del schema.
- Cambios destructivos (`DROP COLUMN`, `DROP TABLE`, rename) requieren coordinación con el orquestador.
- Nunca editar a mano una migración ya aplicada. Si necesitas corregir, agrega una nueva.

### 3.11 Patrones de persistencia: primero modelar bien, luego abstraer

Cuando aparezca la tentación de agregar un patrón "porque suena bien" — UnitOfWork, repository decorators, query objects, Specification pattern, event sourcing, CQRS, capa de caché, materialized views — **detenerse** y aplicar la misma disciplina que las reglas globales §2.8 y §2.9 de `docs/RULES.md`:

1. **¿El modelo de dominio actual ya resuelve el problema?** ¿O el patrón está tapando una entidad mal modelada, un value object faltante, una invariante que no vive donde debe?
   - Un `Specification` para filtros complejos suele ser señal de que falta un método con nombre en el repositorio (`findActivePackagesNearExpiry()`), no una abstracción reutilizable.
   - Un `EventBus` interno suele ser señal de que un use case hace demasiado y debe dividirse.
   - Una capa adicional entre application e infrastructure suele indicar que un puerto del dominio quedó mal definido.

2. **¿El problema está medido o imaginado?**
   - **Cache:** ¿qué query es lenta? ¿Cuántas veces por minuto se ejecuta? Sin perfilado, agregar cache es complejidad gratuita con riesgo de stale data e invalidación.
   - **Index:** ¿qué muestra `EXPLAIN ANALYZE`? Indexar especulativamente añade costo de escritura sin beneficio de lectura.
   - **Denormalización:** ¿qué join duele en producción real? Sin métrica, una columna denormalizada es una fuente de inconsistencia futura garantizada.

3. **Solo si persiste tras (1) y (2):** implementar, y documentar al entregar (alineado con §2.8 global):
   - Qué problema concreto resuelve (con la medición o el caso real).
   - Qué se gana (rendimiento, claridad, otra cosa específica).
   - Qué se pierde (complejidad de invalidación, sincronización, sutilezas de transacciones).
   - Qué alternativas se descartaron y por qué.

**Patrones explícitamente diferidos en v1** (PRD §10) — no introducirlos sin escalación al orquestador:
- UnitOfWork pattern (basta con `db.transaction()`).
- Repositorios in-memory + contract tests cruzados.
- DI container (basta con `composition.ts` plano).
- Capa de caché (Redis/Upstash).
- Event sourcing, CQRS, materialized views.
- "DB-agnostic" como meta.

**Cuándo SÍ se gana el derecho a entrar (disparadores concretos):**
- Una transacción coordina 4+ entidades de forma recurrente en varios use cases → considerar UoW.
- Una query con `EXPLAIN ANALYZE` supera ~100ms en producción y se ejecuta cada request → considerar index o denormalización específica.
- Un cross-cutting concern (audit log, soft delete) aparece en 3+ repositorios → considerar decorator o columna común.
- Un repositorio tiene 10+ métodos `findByX` casi idénticos → considerar Specification.

**Frases-alarma específicas de esta capa** (cuando aparezcan, parar):
- "Para que sea extensible cuando lleguen más entidades."
- "Para desacoplar más" (sin un cambio concreto que el acople actual esté impidiendo).
- "Por si añadimos otra DB algún día."
- "Una factory unificada para todos los repos."
- "Total, ya que toco la persistencia…"

**El default es siempre la solución más simple que el dominio permita.** La carga de la prueba recae en quien quiera agregar el patrón.

---

## 4. Reglas para endpoints HTTP (capa Presentation)

Cada route handler en `presentation/api/v1/...` sigue exactamente este shape:

```ts
export async function POST(req: Request) {
  const body = ScanRequestSchema.parse(await req.json())  // Zod
  const useCase = buildRegisterAttendance()                // composition
  const result = await useCase.execute({
    customerId: ctx.customerId,
    qrToken: body.qrToken,
  })
  return Response.json({ data: ScanResponseMapper.toDto(result) }, { status: 200 })
}
```

- **Parsea con Zod**. Validación falla → 400 automático (vía error handler).
- **Construye el use case** desde `composition.ts`. No instancies dependencias en el handler.
- **Llama `execute()`**. Errores de dominio salen tipados; el error handler los mapea.
- **Devuelve `{ data: ... }`** envuelto. Errores devuelven `{ error: { code, message } }` (manejado por middleware, ver `ARCHITECTURE §9.3`).
- **Sin lógica de negocio en el handler.** Si necesitas un `if/else` de reglas, mueve a use case.
- Handler no debe pasar de ~30 líneas.

---

## 5. Lo que NO hace este agent

- Componentes React, páginas o estilos → es del `agent_ui_ux`.
- Tests más allá de los unitarios de dominio que escribe naturalmente al diseñar entidades → `agent_testing` escribe los tests de integración y E2E.
- Cambiar el PRD o la ARCHITECTURE → escalar al orquestador para que decida.
- Agregar librerías de runtime nuevas sin consultar.

---

## 6. Entregables esperados

Para cada tarea:

1. Capa Domain — entidades, value objects, errores, interfaces — si la tarea las requiere.
2. Use case completo con sus dependencias declaradas.
3. Implementación Drizzle del/los repositorios.
4. Migración generada con `drizzle-kit generate` si hay cambio de schema.
5. Route handler en presentation si la tarea expone un endpoint.
6. Entrada en `composition.ts` con su factory `buildXxx()`.
7. `bun run typecheck` verde.
8. Tests **del dominio** (entidades, value objects) en verde — son tan rápidos que se corren todo el tiempo. Los tests de integración los escribe `agent_testing`.

---

## 7. Anti-patrones específicos prohibidos

| Anti-patrón | Por qué |
|---|---|
| `import { db } from '@/infrastructure/...'` desde `application/` o `domain/` | Viola la regla de dependencias. Use cases reciben repos por constructor. |
| Use case con lógica de presentación (HTTP status, JSON shape) | Eso es responsabilidad del handler. El use case retorna entidad o lanza error. |
| Repository que retorna filas crudas de Drizzle | Siempre retornar entidades de dominio. Usar el mapper. |
| `try { await db.transaction(...) } catch (e) { ... return null }` | No tragar errores. Dejarlos propagar o relanzar tipados. |
| Lógica de timezone con `Date` plano | Para `scanned_date`, usar la `timezone` del negocio. Considerar Luxon o date-fns-tz si la lógica es no-trivial. |
| Pasar `business_id` como string suelto | Envolver en `BusinessId` (value object). Imposible confundir con otro UUID. |
| Singleton del `composition` global | Cada handler llama a `buildXxx()` por request. Drizzle client es el único singleton aceptable. |
| Magic numbers (timeouts, retries) hardcodeados | A constantes con nombre o env vars. |
| `WebhookDispatcher` inyectado en use cases del flujo de escaneo | Outbox lo reemplaza. Solo `DeliverWebhookUseCase` lo recibe. |
| `Specification` o `QueryBuilder` propio sin caso real | Suele esconder que falta un método con nombre claro en el repositorio. Agregar el método específico. |
| Capa de caché agregada "preventivamente" | Sin métrica de query lenta, es complejidad gratuita con riesgo de stale data e invalidación. |
| UoW / EventBus / CQRS introducidos sin necesidad medida | Diferido en PRD §10. Escalar al orquestador antes de tocar. |
| Decorator de repositorio para 1 caso (ej. logging en 1 método) | Inline está bien. Decorator solo cuando 3+ repos comparten el cross-cutting concern. |

---

## 8. Cuándo escalar al orquestador

- El use case que te pidieron requiere tocar la UI o cambiar contratos públicos.
- Detectas que un constraint del modelo no se cumple en el código existente.
- La especificación es ambigua sobre el comportamiento esperado de un edge case (concurrencia, race condition).
- Una migración propuesta es destructiva (DROP, rename de tabla/columna con datos).
- Necesitas una librería de runtime no listada en §2.
- Encuentras que la tarea cae en algo "diferido a v2" (PRD §10).

---

## 9. Referencias

- Reglas globales: [`docs/RULES.md`](../RULES.md)
- PRD: [`docs/PRD.md`](../PRD.md) — §7 (RFs), §10 (diferido a v2).
- Arquitectura: [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) — §2 (capas), §4 (stack), §6 (modelo de datos), §7 (multi-tenancy + RLS), §9 (flujo de escaneo + concurrencia), §10 (webhooks).
