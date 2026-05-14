# agent_testing — Reglas

**Aplican a:** el agent que escribe y mantiene tests.
**Hereda de:** [`docs/RULES.md`](../RULES.md). En conflicto, gana la regla global.

---

## 1. Misión

Garantizar que el sistema funcione **comprobablemente**, no solo que compile. Tres niveles:

1. **Unit tests** (40% de los tests) — dominio puro: entidades, value objects, errores. Sin DB, sin red.
2. **Integration tests** (45%) — use cases ejecutados contra Postgres efímero (testcontainers); repositorios Drizzle contra el mismo.
3. **E2E tests** (15%) — Playwright contra la PWA y el dashboard desplegados localmente, validando los casos de uso CU-03, CU-04, CU-05 del PRD.

Ver `ARCHITECTURE §11` para la estrategia completa.

---

## 2. Stack obligatorio

- **`bun test`** como runner — nativo del runtime de Bun, API tipo Jest/vitest. Comandos: `bun test`, `bun test --watch`, `bun test --coverage`. Sin transpilación previa, soporta TypeScript directo.
- **`@testcontainers/postgresql`** para Postgres efímero por suite.
- **Playwright** para E2E del browser, invocado como `bunx playwright test`.
- **`@testing-library/react`** + **`@testing-library/user-event`** para los componentes de `packages/react`.
- **No** `vitest`, **no** `jest`, **no** `mocha`, **no** `cypress`.

---

## 3. Filosofía: la regla de oro

> **No mockees lo que controlas. Mockea solo lo que cruza el proceso o controla tiempo real.**

| Qué | Cómo se prueba |
|---|---|
| Drizzle | NO se mockea. Postgres efímero. |
| Postgres | NO se mockea. testcontainers. |
| `SupabaseAuthProvider` en tests | Sustituir por `FakeAuthProvider` (ya existe en `infrastructure/auth/`). |
| `Clock` | `FakeClock` que el test controla. Único modo de probar "ya marcaste hoy" sin esperar 24h. |
| `IdGenerator` | `FakeIdGenerator` con secuencia predecible si el test necesita snapshots. |
| `WebhookDispatcher` en tests de `DeliverWebhookUseCase` | Spy/fake que registra los POSTs sin hacer red. |
| Llamadas externas HTTP en el SDK | `mock()` o `spyOn(globalThis, 'fetch')` de `bun:test` (solo en tests del SDK; en API real son tests de integración HTTP). |

---

## 4. Reglas por nivel

### 4.1 Unit tests del dominio
- **Ubicación:** `apps/web/tests/unit/domain/`.
- **Velocidad:** todos juntos en <1s.
- **Cobertura objetivo:** ~100%. Es código puro, sin excusa.
- **Estilo:** un `describe` por entidad/VO, casos con `it('rejects ...')` o `it('allows ...')`.
- **Sin mocks.** Todo se construye con datos planos.

Ejemplo de qué se prueba:
- `Package.decrement()` con `remainingVisits = 0` lanza `PackageDepletedError`.
- `Package.decrement()` con `remainingVisits = 1` retorna package con 0 y `status = 'depleted'`.
- `VisitCount` rechaza negativos.
- `Email` rechaza strings sin `@` válido.

### 4.2 Integration tests de use cases
- **Ubicación:** `apps/web/tests/integration/use-cases/`.
- **Setup:** levantar Postgres con testcontainers en `beforeAll`. Correr migraciones Drizzle. Derribar en `afterAll`.
- **Aislamiento entre tests:** truncar tablas en `beforeEach` o usar transacciones que se rollback.
- **Factories:** crear `apps/web/tests/factories/` con builders tipo `makeBusiness()`, `makeCustomer()`, `makePackage()`. Sin estos, los tests se vuelven ilegibles.
- **Sin** mockear el reloj salvo cuando la lógica depende del tiempo. Para `RegisterAttendanceUseCase` con anti-doble-marcado: SIEMPRE inyectar `FakeClock`.

Para `RegisterAttendanceUseCase` específicamente, los tests obligatorios son:
1. Camino feliz → crea `Attendance`, decrementa paquete, marca QR como usado, inserta en `webhook_deliveries`.
2. QR ya usado → `InvalidQrTokenError`.
3. QR no existe → `InvalidQrTokenError`.
4. QR expirado (>24h) → `InvalidQrTokenError`.
5. Cliente no tiene paquete activo → `NoActivePackageError`.
6. Paquete en 0 visitas → `PackageDepletedError`.
7. Cliente ya marcó hoy (mismo día calendario) → `AlreadyScannedTodayError` (con `FakeClock` controlando "hoy").
8. Camino feliz que deja paquete en 0 → emite también `package.depleted` en outbox.
9. Concurrencia: dos requests simultáneos con `remaining_visits = 1` → exactamente uno gana, el otro falla con `PackageDepletedError`.

### 4.3 Integration tests de repositorios Drizzle
- **Ubicación:** `apps/web/tests/integration/persistence/drizzle/`.
- **Qué prueban:** round-trip de save/load, mappers, constraints, índices, concurrencia.
- Específicos obligatorios:
  - `AttendanceRepository`: insertar dos attendances del mismo `(customer_id, business_id, scanned_date)` → la segunda falla con violación de unique. El repo mapea a `AlreadyScannedTodayError`.
  - `QrTokenRepository.markAsUsed()`: dos transacciones concurrentes intentando marcar el mismo token → solo una gana.
  - `PackageRepository`: insertar dos paquetes `active` para el mismo customer → la segunda falla por partial unique index.

### 4.4 E2E tests con Playwright
- **Ubicación:** `apps/pwa/tests/e2e/` y `apps/web/tests/e2e/`.
- **Browsers:** Chromium mínimo. WebKit (Safari) si Playwright lo permite en CI.
- **Permisos de cámara:** Playwright permite conceder permiso `camera` y simular un stream. Para los tests de scan, inyectar un stream con un QR válido.
- **Flujos a cubrir en v1:**
  - **CU-03** Juan escanea exitosamente → ve confirmación + saldo decrementado.
  - **CU-04** Juan intenta escanear dos veces el mismo día → segundo intento rechazado.
  - **CU-05** Juan escanea su última visita → ve mensaje de paquete agotado.
- **NO** cubrir en v1 (queda para después): signup completo del negocio, generación de API key, flujo de webhooks recibidos por un sistema externo.
- **Datos:** seed con factories antes de cada test. Truncar después.

### 4.5 Tests de `packages/sdk` y `packages/react`
- **SDK** (`packages/sdk/tests/`):
  - `unit/` — mockear `fetch` con `mock()` o `spyOn(globalThis, 'fetch')` de `bun:test` y verificar que el SDK hace los requests correctos con headers y body esperados.
  - `contract/` — correr contra la API real levantada en container. Si la API cambia un contrato, este test debe fallar.
- **React** (`packages/react/tests/`):
  - `@testing-library/react` para `<QrDisplay/>`, `<ScanButton/>`, `<ScanGoProvider/>`.
  - Verificar render, interacción de usuario, manejo de error.

### 4.6 Helpers, abstracciones y nuevos tipos de test: solo con reuso real

Cuando aparezca la tentación de extraer un helper de test, un custom matcher, un fixture compartido, o introducir un tipo de test nuevo (snapshot, property-based, mutation testing, etc.), **detenerse** y aplicar las reglas globales §2.8 y §2.9 de `docs/RULES.md`:

1. **¿La duplicación es real o aparente?**
   - **3 tests** con el mismo setup textual → ahí sí extraer factory o helper.
   - **2 tests** con setup parecido pero distinto → NO extraer todavía. La premature-DRY en tests duele más que en producción, porque oculta la intención del test.
   - **1 test** con setup largo pero único → inline está bien, aunque sean 15 líneas. Un test debe ser legible de arriba a abajo sin saltar a otros archivos.

2. **¿El nuevo tipo de test cubre una clase de bugs que la pirámide actual no cubre?**
   - **Snapshot tests:** solo para respuestas HTTP estables o render complejo de componentes. No para entidades de dominio — usar asserts específicos.
   - **Property-based tests** (fast-check): cuando hay invariantes algebraicas no triviales (parseo/serialización round-trip, idempotencias matemáticas). Para `RegisterAttendance`, los 9 tests específicos del §4.2 ya cubren los casos relevantes mejor.
   - **Mutation testing, fuzz testing:** fuera de v1 sin disparador concreto.

3. **Solo si persiste tras (1) y (2):** introducir, y documentar al entregar (alineado con §2.8 global):
   - Qué cobertura agrega que no existía antes.
   - Qué cuesta mantener (tiempo de CI, complejidad de lectura del test).
   - Qué alternativas se descartaron.

**Reglas concretas para factories:**
- `makeX()` con valores default sensatos para cada entidad relevante.
- Permite override por keys: `makeCustomer({ email: 'x@y.com' })`.
- Genera IDs únicos automáticamente (vía `FakeIdGenerator` o `crypto.randomUUID`).
- Vive en `tests/factories/<entidad>.ts`, no esparcida en archivos de test.

**Reglas concretas para helpers:**
- Si el helper se usa en **3+** archivos de test, vive en `tests/helpers/`.
- Si se usa en **2** archivos, considerarlo — usualmente inline sigue siendo más legible.
- Si se usa en **1** archivo, **siempre inline**.

**Anti-patrones a evitar en abstracciones de test:**
- `setupTest()` o `beforeEach` que oculta el estado inicial relevante. Los tests deben mostrar arriba a abajo qué se está probando.
- Custom matchers tipo `expect(foo).toBeValidCustomer()` — un assert específico (`expect(foo.email).toBe(...)`) es más explícito sobre qué falla cuando falla.
- Fixtures JSON grandes — usar factories en su lugar.
- "Test utilities" que evolucionan en otro sistema a mantener paralelo al de producción.

**Frases-alarma específicas en testing** (cuando aparezcan, parar):
- "Por si después escribo más tests parecidos." (No los hay todavía.)
- "Para que el código de test se vea más limpio." (Limpieza de test ≠ limpieza de producción; los tests deben ser **obvios**, no elegantes.)
- "Es buena práctica tener un helper para esto."
- "Snapshot tests para todo, así es más rápido."

**El default es: inline el setup, expandir cuando duela 3 veces.**

---

## 5. Convenciones de los tests

- **Naming:** `<archivo-bajo-prueba>.test.ts` junto al archivo o en `tests/` espejado.
- **Arrange-Act-Assert** estructura clara. Separar con líneas en blanco.
- **Un assert principal por test** (varios asserts compuestos están bien si verifican el mismo comportamiento).
- **Mensajes descriptivos** en `it('...')`. No `it('works')`.
- **Factories sobre fixtures.** `makeCustomer({ email: 'x@y.com' })` es mejor que un JSON gigante.
- **No tests que dependen del orden** ni de tests previos. Cada test es independiente.
- **No `sleep()` o `wait(ms)`.** Para tiempo, usar `FakeClock`. Para eventos asincrónicos, esperar la condición específica (`await expect(...).toResolve()`).

---

## 6. Lo que NO hace este agent

- Escribir componentes UI nuevos → `agent_ui_ux`. Si un componente necesita ser testeable y no lo es, devolver al UI/UX con propuesta de cómo hacerlo testeable.
- Cambiar lógica de producción para "facilitar" un test (test smell). Si un test es difícil de escribir, **eso es señal de que el diseño se puede mejorar** — coordinar con `agent_data` o `agent_ui_ux` para discutir el rediseño.
- Tests de carga (k6, JMeter) → diferido a v2 (PRD §10).
- Auditorías de seguridad → fuera del alcance v1.

---

## 7. Entregables esperados

Para cada tarea de testing:

1. Tests escritos según el nivel apropiado (unit / integration / E2E).
2. Setup de testcontainers o Playwright si la tarea lo requiere y no existe todavía.
3. Factories nuevas en `tests/factories/` si los tests las necesitan.
4. CI corriendo verde con los tests nuevos.
5. Documentación mínima: si el setup de un nuevo tipo de test requiere config especial, dejar un README de 10 líneas en la carpeta correspondiente.

---

## 8. Anti-patrones específicos prohibidos

| Anti-patrón | Por qué |
|---|---|
| `mock.module('drizzle-orm/postgres-js', ...)` | Drizzle no se mockea, NUNCA. Postgres efímero. |
| `spyOn(useCase, 'execute')` | El test debe ejercer el use case real, no espiarlo. |
| `await sleep(1000)` esperando que algo suceda | Esperar la condición concreta. Si el código tiene timing real, refactorizar con `Clock` inyectable. |
| Tests que escriben al filesystem real | Usar `os.tmpdir()` y limpieza, o mejor: in-memory. |
| Snapshots gigantes de objetos completos | Snapshots solo de respuestas HTTP estables. Para entidades, asserts específicos. |
| `if (process.env.CI) ...` saltando tests | Si un test no funciona en CI, no es un test válido. |
| Tests acoplados al orden | `beforeEach` con setup limpio, no `beforeAll` con estado compartido (salvo container). |
| `expect(true).toBe(true)` o equivalentes | Esos no son tests. |
| Mockear `Date`/`Date.now()` con `setSystemTime()` o helpers globales cuando el sistema acepta `Clock` inyectado | Usar `FakeClock` — más explícito, no afecta otros tests por error. |
| Comentarios `// @ts-expect-error` para callar TS en tests | Si TS se queja, hay un problema real. Tipar el test correctamente. |
| Custom matcher creado para 1 test | Inline el assert explícito. Custom matchers solo cuando 3+ tests piden el mismo aserto compuesto y la sintaxis natural es awkward. |
| Factory con 30 props default | Probablemente la entidad tiene demasiados campos o demasiadas responsabilidades. Coordinar con `agent_data`. |
| Snapshot test de objetos de dominio | Usar asserts específicos. Snapshots solo para respuestas HTTP estables o render complejo de componentes. |
| `beforeEach` que hace 50 líneas de setup oculto | El test debe ser legible de arriba a abajo. Inline lo relevante; el container de DB sí puede vivir en `beforeAll`. |

---

## 9. Cuándo escalar al orquestador

- Un test es genuinamente imposible sin mockear algo que el §3 prohíbe.
- La cobertura objetivo no se puede alcanzar sin cambios de producción que ya están fuera de scope.
- El comportamiento esperado de un edge case no está claro en el PRD o ARCHITECTURE.
- testcontainers tarda demasiado en CI (>2 min para suite de integration).
- Detectas un bug real en producto al escribir el test (informar antes de "arreglarlo" tú mismo).

---

## 10. Referencias

- Reglas globales: [`docs/RULES.md`](../RULES.md)
- PRD: [`docs/PRD.md`](../PRD.md) — §6 (casos de uso a probar), §9 (criterios de aceptación), §10 (lo diferido a v2).
- Arquitectura: [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) — §9 (concurrencia, escenarios a probar), §11 (estrategia completa).
