# PRD — Scan&Go

**Producto:** Scan&Go — Servicio de control de asistencia por QR para cualquier negocio que opere con paquetes de visitas.
**Autor:** Equipo Scan&Go
**Fecha:** 2026-05-14
**Estado:** Borrador v1.3 — pendiente de validación con usuario piloto
**Versión del documento:** 1.3

---

## 1. Resumen ejecutivo

Scan&Go reemplaza la "ticketera física" (tarjeta de cartón perforada o sellada que se le entrega al cliente para marcar cada visita) por un sistema digital ligero, basado en escaneo de QR desde el celular del cliente. No es solo una aplicación: es un **servicio integrable** que cualquier software de gestión existente puede acoplar — gyms, academias de baile, coworkings, clases particulares, centros de yoga, peluquerías por paquete — y también funciona como producto autónomo (PWA) para negocios sin software propio.

El objetivo es ofrecer una solución multi-tenant, API-first, con baja fricción para el cliente final (sin descargar app de la Store) y con un modelo de integración tipo Stripe: API REST + SDKs + webhooks.

---

## 2. Contexto y problema

### 2.1 Situación actual

La gran mayoría de los negocios pequeños y medianos que venden paquetes de asistencias (15 clases, 30 visitas al gym, etc.) administran ese control con **tarjetas físicas**:

- El cliente compra un paquete y recibe una tarjeta de cartón.
- Cada vez que asiste, el personal del negocio marca, sella o perfora la tarjeta.
- Al agotarse, el cliente debe renovar.

### 2.2 Pain points observados

| Para el negocio | Para el cliente |
|---|---|
| Tarjetas se pierden o se daña | "Olvidé mi tarjeta" — tensión en recepción |
| Difícil cuantificar asistencia real | No sabe cuántas visitas le quedan sin preguntar |
| Imposible analizar patrones de uso | No tiene historial propio |
| Fraude: tarjeta puede ser usada por terceros | No recibe avisos cuando está por agotarse |
| Cero datos para marketing/retención | Difícil reactivar paquete vencido |

### 2.3 ¿Por qué ahora?

- La penetración de smartphones con cámara en zonas urbanas de LatAm es alta y suficiente para que un sistema basado en celular sea viable como reemplazo de la tarjeta de cartón.
- Las PWAs en iOS 16.4+ ya soportan cámara, geolocalización e instalación en home screen sin fricción.
- Los negocios pequeños están abiertos a digitalizar procesos simples si la herramienta no requiere infraestructura, ni capacitación pesada, ni inversión inicial.

---

## 3. Objetivos del producto

### 3.1 Visión a largo plazo
Convertirse en una pieza de infraestructura para el control de asistencia en LatAm — un servicio que otros productos puedan integrar como dependencia, análogo a cómo Stripe lo es para pagos. **Esta es una ambición direccional, no un objetivo de v1.**

### 3.2 Objetivos de negocio
1. Permitir que un negocio pequeño (1–3 empleados) opere su control de asistencia sin tener software de gestión propio.
2. Permitir que un software de gestión existente integre control de asistencia con bajo esfuerzo de desarrollo.
3. Mantener el dominio del producto independiente del proveedor de persistencia (vía repository pattern), preservando la opción de migrar de Postgres/Supabase a otra DB si en el futuro lo justifica un cliente real.

### 3.3 Objetivos del producto (v1)
1. Un cliente puede marcar asistencia en menos de **5 segundos** desde que abre la app hasta que ve la confirmación.
2. Un negocio puede dar de alta un cliente y entregarle un paquete en menos de **30 segundos**.
3. Un desarrollador externo puede integrar Scan&Go en su software existente en menos de **4 horas** siguiendo el README + los ejemplos del repositorio.
4. Cero descargas de App Store para el cliente final.

### 3.4 Métricas de éxito (post-lanzamiento)
- **Activación:** % de negocios registrados que registran al menos 10 asistencias en su primera semana.
- **Retención:** % de negocios activos que siguen registrando asistencias 30 días después del alta.
- **Tiempo a primera asistencia (TTFA):** mediana del tiempo desde signup hasta el primer escaneo válido.
- **Integraciones:** número de softwares externos que consumen la API en producción.
- **Adopción cliente final:** % de clientes invitados que efectivamente instalan la PWA y marcan al menos 1 vez.

---

## 4. Usuarios y personas

> **Nota sobre el alcance del término "negocio":** en v1 un negocio = una sucursal. Si una marca tiene varias ubicaciones físicas (ej. cadena de gyms con 3 sedes), cada sede es un negocio independiente con sus propios clientes, paquetes y dashboard. La consolidación multi-sucursal está diferida a v2.

### 4.1 Persona A — María, dueña de gimnasio (administrador del negocio)
- 38 años, dueña de un gym de barrio con 120 socios activos.
- Usa Excel y tarjetas de cartón para llevar la asistencia.
- No tiene tiempo para aprender software complicado.
- **Necesidad clave:** dar de alta clientes rápido, ver quién vino hoy, vender renovaciones.

### 4.2 Persona B — Juan, cliente del gym (usuario final)
- 28 años, va al gym 3 veces por semana.
- Compró un bono de 30 clases.
- Quiere saber cuántas le quedan sin tener que preguntar.
- **Necesidad clave:** marcar entrada en segundos, ver su saldo.

### 4.3 Persona C — Sofía, desarrolladora de un CRM para gyms (integrador)
- Trabaja en una startup que vende un CRM SaaS para gyms.
- Sus clientes le piden "control de asistencia con QR".
- No quiere construir esa funcionalidad desde cero.
- **Necesidad clave:** integrar Scan&Go en su CRM con pocas líneas de código, mantener su propia UI/UX.

> **Persona diferida a v2:** un dueño no-técnico que activa Scan&Go vía un marketplace de plugins en su software de gestión. Requiere un sistema de plugins/marketplace que no existe en v1.

---

## 5. Alcance

### 5.1 Dentro del alcance — v1
1. **Multi-tenant SaaS:** cada negocio tiene su espacio aislado. Un mismo email puede existir como cliente en N negocios distintos: cada par (negocio, email) es una entidad de cliente independiente, sin tabla "global" de personas.
2. **Auth de negocios:** signup por email + magic link o password.
3. **Onboarding:** crear negocio, ajustar configuración básica.
4. **CRUD de clientes:** alta, edición, búsqueda. Asignar paquetes (N visitas configurable).
5. **Generación de QR rotativo:** el negocio muestra un QR en una pantalla; rota tras cada uso.
6. **Escaneo desde PWA del cliente:** login con magic link, scanner, confirmación, contador.
7. **Anti-doble-marcado:** el sistema rechaza dos asistencias del mismo cliente en el mismo día.
8. **Dashboard del negocio en tiempo real:** lista de asistencias del día, contador por cliente.
9. **API REST pública v1:** endpoints versionados (`/v1/...`) con autenticación por API keys con scopes básicos.
10. **SDK JS y SDK React:** publicados en npm.
11. **Webhooks:** eventos con firma HMAC y reintentos lineales (3 intentos).
12. **PWA instalable:** manifest, service worker, ícono en home screen.

### 5.2 Fuera del alcance — v1 (postergado a v2+)
- Geolocalización como segunda capa anti-fraude.
- Branding/white-label de la PWA por negocio.
- Notificaciones push.
- App nativa (iOS / Android).
- Multi-idioma (v1: español únicamente).
- Reportería avanzada (cohortes, predicciones).
- Permisos granulares en el dashboard (admin vs recepcionista).
- Multi-sucursal dentro de un mismo negocio.
- Caducidad de paquetes con bloqueo automático.

### 5.3 Explícitamente NO en el roadmap (nunca)
- **Pasarelas de pago (Stripe, MercadoPago, etc.).** El cobro del paquete es responsabilidad del negocio fuera del sistema. Scan&Go solo registra que un cliente tiene N visitas; cómo las pagó no es problema del producto.
- Reservas / agenda de clases (es otro problema, no asistencia).
- Gestión de clases / horarios / profesores.
- POS / facturación.
- Gestión de empleados.

---

## 6. Casos de uso principales

### 6.1 CU-01 — Negocio se da de alta y configura sistema
1. María entra a `scango.com/signup`.
2. Crea cuenta con email + nombre del negocio + tipo (gym, academia, coworking, otro).
3. Recibe magic link, ingresa al dashboard.
4. Configura: tamaño de paquete default (15, 30, custom). En v1 la regla anti-doble-marcado es fija (1 asistencia por cliente por día); no es configurable.
5. Sistema asigna URL `scango.com/b/gym-maria` y emite primera API key.

### 6.2 CU-02 — Negocio crea un cliente y le entrega paquete
1. María ingresa al dashboard, sección "Clientes".
2. Click "Nuevo cliente": ingresa nombre, email, teléfono opcional, selecciona paquete (15 visitas, ej.).
3. Sistema crea el cliente y le envía link de invitación por **email** (magic link). SMS queda fuera de v1.
4. Cliente queda activo con saldo de 15.

### 6.3 CU-03 — Cliente registra su asistencia
1. Juan llega al gym.
2. Abre la PWA Scan&Go ya instalada en su celular (o navega a su URL si es primera vez).
3. Si es primera vez: ingresa email, recibe magic link, queda logueado para siempre.
4. Toca botón "Escanear".
5. Se abre la cámara; apunta al QR proyectado en la pantalla del gym.
6. Sistema valida: token válido + paquete con saldo + no escaneó hoy.
7. Pantalla confirma con un ✓ + "14 visitas restantes".
8. El QR del gym se regenera automáticamente; la siguiente persona ya no puede usar el QR anterior.

### 6.4 CU-04 — Cliente intenta marcar dos veces el mismo día
1. Juan, ya habiendo escaneado, intenta escanear de nuevo.
2. Sistema rechaza con mensaje claro: "Ya marcaste tu asistencia hoy."
3. Su contador no cambia (sigue en 14).

### 6.5 CU-05 — Paquete se agota
1. Juan escanea su visita número 15 (la última).
2. Sistema confirma asistencia y muestra: "Tu paquete se agotó. Renueva con María para seguir asistiendo."
3. Webhook `package.depleted` se dispara al sistema externo del negocio (si está integrado).
4. En el dashboard de María: Juan aparece marcado como "Paquete agotado".

### 6.6 CU-06 — Desarrollador integra Scan&Go en CRM externo
1. Sofía lee el README del repositorio de Scan&Go y revisa los ejemplos en `examples/`.
2. Su CRM ya tiene cuenta de negocio en Scan&Go (creada manualmente desde el panel — el alta programática de negocios queda para v2).
3. Genera API key desde el panel.
4. `npm install @scango/react`.
5. Monta `<ScanGoProvider apiKey={...}>` y usa `<QrDisplay/>` en la vista del gym.
6. Suscribe webhook `attendance.created` para sincronizar asistencias en su CRM.
7. **Tiempo objetivo:** menos de 4 horas de trabajo end-to-end.

### 6.7 CU-07 — Negocio revoca una API key comprometida
1. María sospecha que su key se filtró.
2. Va al panel → API Keys → "Revocar".
3. La key deja de funcionar inmediatamente (no espera a expirar).
4. Genera una nueva key y la configura en su software integrador.

---

## 7. Requisitos funcionales

### 7.1 Autenticación y autorización
- **RF-01:** Negocios se autentican con email + password o magic link.
- **RF-02:** Clientes finales se autentican con magic link (sin password).
- **RF-03:** APIs externas se autentican con API keys con dos scopes básicos: `read` (consultas) y `write` (mutaciones). Scopes granulares por recurso quedan diferidos hasta que un integrador real lo justifique.
- **RF-04:** API keys son revocables instantáneamente.

### 7.2 Gestión de negocios y clientes
- **RF-05:** Un negocio puede registrarse, ver/editar su perfil, listar sus admins.
- **RF-06:** Un admin puede crear, editar, listar, deshabilitar clientes.
- **RF-07:** Un admin puede asignar un paquete a un cliente con N visitas (entero positivo).
- **RF-08:** Un cliente puede tener al máximo 1 paquete activo a la vez en v1.
- **RF-09:** Los datos de un negocio no son accesibles a otro negocio bajo ninguna circunstancia.

### 7.3 Escaneo y asistencia
- **RF-10:** El sistema genera tokens QR únicos, criptográficamente aleatorios (UUID v7 o equivalente).
- **RF-11:** Un token QR se invalida tras su primer uso exitoso.
- **RF-12:** Un mismo cliente no puede registrar más de una asistencia en el mismo día calendario para el mismo negocio (constraint server-side, zona horaria del negocio).
- **RF-13:** El escaneo descuenta exactamente 1 visita del paquete activo del cliente.
- **RF-14:** Si el paquete está agotado (visitas restantes = 0), el escaneo es rechazado con error claro.
- **RF-15:** Toda asistencia queda registrada con timestamp, cliente, negocio, paquete y token usado.

### 7.4 Tiempo real
- **RF-16:** El dashboard del negocio recibe en menos de 2 segundos la notificación de una nueva asistencia.
- **RF-17:** El QR mostrado en pantalla del negocio se regenera automáticamente tras cada uso exitoso.

### 7.5 Webhooks (v1 simplificado)
- **RF-18:** Un negocio puede suscribir un endpoint HTTPS a eventos.
- **RF-19:** Eventos soportados v1: `attendance.created`, `package.depleted`.
- **RF-20:** Cada webhook lleva firma HMAC-SHA256 en header `X-ScanGo-Signature`.
- **RF-21:** Si el receptor responde con error o no responde en 10s, se reintenta hasta 3 veces de forma lineal (1min, 5min, 30min). Backoff exponencial completo queda para v2.

### 7.6 SDK y componentes
- **RF-22:** SDK `@scango/sdk` expone todos los endpoints públicos con tipado TypeScript.
- **RF-23:** SDK `@scango/react` ofrece tres componentes drop-in mínimos: `<ScanGoProvider/>`, `<QrDisplay/>`, `<ScanButton/>`. Otros widgets (listas, contadores, gráficas) quedan para v2.
- **RF-24:** Versionado semántico con changesets.

---

## 8. Requisitos no funcionales

### 8.1 Seguridad
- **RNF-01:** Todas las comunicaciones por HTTPS / TLS 1.3.
- **RNF-02:** API keys hasheadas en reposo (bcrypt o argon2id). Solo se muestran una vez al crear.
- **RNF-03:** Defensa en profundidad multi-tenant: aislamiento a nivel de aplicación (filtrado por `business_id` en repositorios). RLS de Postgres como capa adicional opcional.

### 8.2 Compatibilidad
- **RNF-04:** PWA funciona en iOS 16.4+ y Android Chrome 100+.
- **RNF-05:** Dashboard del negocio funciona en navegadores modernos de escritorio (últimas 2 versiones de Chrome, Safari, Firefox, Edge).
- **RNF-06:** SDK soporta Node.js 20+ y runtimes edge modernos.

### 8.3 Privacidad
- **RNF-07:** Los datos personales del cliente (nombre, teléfono, email) solo son visibles para el negocio que los registró.
- **RNF-08:** Soporte para eliminación de datos a solicitud del cliente (derecho al olvido).
- **RNF-09:** No se comparten datos entre negocios. No hay endpoints "globales" de búsqueda de personas.

### 8.4 Mantenibilidad
- **RNF-10:** Arquitectura en capas (domain, application, infrastructure, presentation) con repository pattern. Dependencias hacia adentro.
- **RNF-11:** Cobertura mínima de tests: ~100% en domain (es código puro), tests de los use cases críticos (escaneo, asignar paquete, crear cliente), tests de integración del flujo end-to-end. Cobertura porcentual en infrastructure no se persigue.
- **RNF-12:** Migraciones de DB versionadas con `drizzle-kit`, nunca SQL manual en producción.

### 8.5 Performance (objetivos blandos, sin SLA formal en v1)
Sirven como brújula, no como bloqueo de release. Se medirán cuando haya tráfico real.
- **RNF-13:** El endpoint `POST /v1/scan` debe responder rápido en condiciones normales — apuntar a P95 < 300 ms cuando haya datos para medir.
- **RNF-14:** La PWA del cliente debe sentirse instantánea en visitas recurrentes gracias al service worker.

**Diferido a v2:** SLA formal de disponibilidad, métricas estructuradas, audit logs, trace_id obligatorio, rate limiting. Ver sección 10.

---

## 9. Criterios de aceptación de v1

v1 se declara listo cuando **todos** estos puntos pasan:

1. Los dos flujos E2E del documento de plan pasan en dispositivos reales (iPhone y Android).
2. Un desarrollador externo de prueba puede integrar Scan&Go en una app siguiendo solo el README + ejemplo en `examples/`, sin contacto con el equipo, en menos de 4 horas.
3. Tests verdes en CI: dominio + use cases críticos + E2E del flujo de escaneo.
4. No hay vulnerabilidades críticas o altas en el security review (interno o automatizado).
5. Onboarding de un negocio nuevo (signup → primera asistencia registrada) toma menos de 10 minutos para un usuario sin asistencia.

**No bloquean v1:** SLA formal, test de carga con k6, docs site completo, OpenAPI autogenerado. Ver sección 10.

---

## 10. Diferido a v2 — "agregar si duele"

Lista explícita de elementos que **estuvieron** considerados para v1 y se sacaron por sobreingeniería. Cada uno tiene un disparador claro que justificaría agregarlo después.

| Elemento | Por qué se difiere | Disparador para agregarlo |
|---|---|---|
| **Repositorios in-memory además de Drizzle** | Duplicar implementación de cada repo cuando solo hay un consumidor en producción | Cuando un test de CI tarde >2s por levantar Postgres |
| **Contract tests cruzados entre implementaciones de repo** | Solo valen cuando hay 2+ implementaciones reales | Cuando exista una segunda implementación (ej. caché) |
| **DI container (awilix/tsyringe)** | Para 5–10 use cases, un `composition.ts` con `new` plano alcanza | Cuando se superen ~20 use cases o aparezcan árboles de dependencias complejos |
| **UnitOfWork pattern** | `db.transaction(...)` de Drizzle resuelve los pocos casos transaccionales de v1 | Cuando un use case necesite coordinar 4+ entidades en una transacción |
| **OpenAPI autogenerado + docs en Mintlify/Nextra** | Documentar un contrato sin consumidores externos | Cuando aparezca el primer integrador externo real pidiendo docs |
| **Rate limiting por API key + por IP** | Defensa contra abuso que aún no existe | Primer indicio de abuso real o llegada a un plan con SLA |
| **Audit logs de acciones sensibles** | Útil cuando hay obligación legal o múltiples admins | Cuando un negocio tenga 3+ admins o requerimiento de compliance |
| **Logs estructurados con trace_id obligatorio** | "Nice to have", no bloquea validar el producto | Cuando aparezca el primer bug de producción difícil de reproducir |
| **SLA formal (99.5%)** | Métrica de vanidad sin tráfico real | Cuando se firme un contrato que lo exija |
| **Tests de carga con k6** | Optimizar para tráfico que no existe | Cuando los logs muestren P95 acercándose a límites aceptables |
| **"DB-agnostic" como objetivo en sí mismo** | Te impide usar features de Postgres (JSONB, NOTIFY, advisory locks) por miedo a un escenario hipotético | Cuando un cliente real exija MySQL/SQL Server o el costo de Postgres se vuelva prohibitivo |

**Filosofía:** el repository pattern preserva la *opción* de hacer todo esto sin reescribir el dominio. No hace falta pagarlo todo desde el día 1.

---

## 11. Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Fraude por compartir QR estático | Media | Alto | QR rotativo + 1-por-día por cliente + opción de geolocalización en v2 |
| iOS limita acceso a cámara en PWA | Baja | Alto | iOS 16.4+ ya lo soporta. Si aparece bug en versión específica, fallback a `<input type="file" capture>` |
| Lock-in con Supabase | Media | Medio | Clean architecture + repository pattern hacen la migración a Neon viable sin tocar dominio |
| Integradores externos no adoptan el SDK | Media | Alto | README claro, ejemplo funcional en `examples/`, mantener fricción <4h hasta primera asistencia integrada |
| Picos de tráfico en horas pico (gym 7am-9am, 6pm-8pm) | Alta | Medio | Vercel/Supabase escalan automáticamente. Validar comportamiento bajo carga cuando haya tráfico real (k6 diferido a v2) |
| Conflictos de doble-escaneo (race condition) | Baja | Alto | Transacciones a nivel DB + constraint UNIQUE (cliente, día) en `attendances` |
| Confusión del cliente: ¿escanea con mi cámara o me escanean a mí? | Media | Medio | UX explícito en el primer onboarding, video corto de demostración |

---

## 12. Timeline / Hitos

| Hito | Entregable | Fecha objetivo |
|---|---|---|
| M0 | PRD + ARCHITECTURE.md aprobados | Semana 1 |
| M1 | Dominio modelado + persistencia Drizzle funcional + tests del dominio en verde | Semana 2 |
| M2 | API REST con auth de API keys + use cases CRUD de clientes | Semana 3 |
| M3 | Use case de escaneo end-to-end con tests E2E pasando | Semana 4 |
| M4 | SDK y componentes React publicados en npm | Semana 5 |
| M5 | PWA standalone funcionando en dispositivos reales | Semana 6 |
| M6 | README pulido + ejemplos en `examples/` + onboarding probado por desarrollador externo | Semana 7 |
| **GA** | **v1.0 en producción** | **Semana 8** |

---

## 13. Glosario

- **Tenant / negocio:** entidad cliente del servicio Scan&Go (un gym, una academia, etc.). En v1 equivale a una sucursal — la consolidación multi-sucursal está diferida a v2.
- **Cliente final:** persona que asiste al negocio y marca su asistencia (el "socio del gym").
- **Paquete / bono:** conjunto de N asistencias prepagas por un cliente final.
- **QR rotativo:** código QR que se regenera tras cada uso exitoso.
- **API key:** credencial que un integrador externo usa para autenticarse contra la API.
- **Scope:** permiso asociado a una API key. En v1 hay dos: `read` (consultas) y `write` (mutaciones).
- **Webhook:** notificación HTTP que Scan&Go envía a un sistema externo cuando ocurre un evento.
- **PWA:** Progressive Web App — aplicación web instalable que se comporta como nativa.
- **Repository:** patrón que abstrae la persistencia para que la lógica de negocio no conozca la base de datos.
- **Use case:** clase que orquesta entidades y repositorios para resolver una intención del usuario.

---

## 14. Anexos

### 14.1 Referencias
- Documento de arquitectura: `docs/ARCHITECTURE.md` (pendiente — siguiente entregable).
- Decisiones de stack y testing: ver `docs/ARCHITECTURE.md` cuando exista.

### 14.2 Historial de cambios
| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 2026-05-14 | Borrador inicial. |
| 1.1 | 2026-05-14 | Recortes anti-sobreingeniería: pasarelas de pago fuera para siempre; rate limiting, audit logs, SLA, OpenAPI autogen, DI container, repos in-memory, UnitOfWork, contract tests cruzados, "DB-agnostic como meta" → diferidos a "agregar si duele". |
| 1.2 | 2026-05-14 | Auditoría completa del PRD. Corregidas 18 inconsistencias: alineación con recortes anteriores (rate limiting fuera del alcance, docs site reemplazado por README + ejemplos, scopes reducidos a `read`/`write`), datos sin fuente suavizados, conflictos entre casos de uso y RFs resueltos, Persona D diferida a v2, `<AttendanceList/>` movido a v2, alcance de "negocio" definido como una sucursal en v1, política de email por tenant explicitada. |
| 1.3 | 2026-05-14 | Última pasada de pulido. Resuelta inconsistencia entre RF-12 ("12 horas") y el resto del documento ("día calendario") — la regla anti-doble-marcado ahora es "una asistencia por día calendario en zona horaria del negocio". CU-06 ajustado (alta de negocio solo desde panel en v1, no por API). Glosario completado: "Tenant" = sucursal en v1, "Scope" = `read`/`write`. Renumeradas las secciones para eliminar la numeración "9.bis" (ahora sección 10), y referencias internas actualizadas. Sincronizada la versión del header con el historial. |
