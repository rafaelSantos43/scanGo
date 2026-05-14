# Database setup

Guia paso a paso para conectar `apps/web` a una Postgres real, aplicar la migracion inicial y probar el flujo de escaneo end-to-end.

Estado al momento de escribir esto: hay una migracion `0000_init_scan_flow.sql` lista (5 tablas + politicas RLS) y un seed minimo. Falta solo conectar a la DB.

---

## 1. Crear proyecto Supabase (free tier)

1. Entra a https://supabase.com y crea cuenta.
2. **New project**:
   - Name: `scango-dev` (o el que quieras).
   - Database password: **generala fuerte** y guardala en un gestor — solo se muestra una vez.
   - Region: la mas cercana a ti.
   - Plan: Free tier.
3. Espera ~2 minutos a que aprovisione.

**Limitacion del free tier:** los proyectos sin actividad por ~1 semana se pausan automaticamente. Ver [hallazgo H-002 en ENGRAM](./ENGRAM.md). Si vas a tener staging y prod separados sin uso constante, considera plan Pro o usar Neon free para staging.

## 2. Obtener la connection string

En el panel de Supabase: **Project Settings → Database → Connection string**.

Hay dos modos relevantes:

- **Session mode** (puerto 5432, conexion directa al Postgres). Usado por `drizzle-kit migrate` porque las migraciones necesitan conexiones largas.
- **Transaction mode** (puerto 6543, via PgBouncer pooler). Usado en runtime por la app porque escala mejor.

Para v1, **una sola conexion alcanza** — usa la directa (Session mode) para todo. La distincion del pooler entra cuando llegue trafico real.

Formato de la URL (Session mode):
```
postgresql://postgres:<TU-PASSWORD>@db.<TU-PROJECT-REF>.supabase.co:5432/postgres
```

## 3. Configurar el entorno local

Crea `apps/web/.env.local` (existe un `.env.local.example` que puedes copiar):

```bash
cp apps/web/.env.local.example apps/web/.env.local
```

Edita `apps/web/.env.local` y pega tu URL real:

```
DATABASE_URL=postgresql://postgres:<TU-PASSWORD>@db.<TU-PROJECT-REF>.supabase.co:5432/postgres
```

> El archivo `.env.local` esta gitignoreado. **No lo committees.**

## 4. Aplicar la migracion inicial

Desde la raiz del repo:

```bash
cd apps/web
bun run db:migrate
```

Esto ejecuta `drizzle-kit migrate` usando `drizzle/drizzle.config.ts`. Aplica `0000_init_scan_flow.sql` que crea:

- 5 tablas: `businesses`, `customers`, `packages`, `qr_tokens`, `attendances`.
- 3 unique indexes (incluyendo el partial `one_active_package_per_customer WHERE status='active'`).
- 9 foreign keys.
- Politicas RLS para las 5 tablas (ver ARCHITECTURE §7.2 y D-007).

**Nota sobre RLS y Supabase:** la migracion usa `auth.jwt() ->> 'business_id'` en sus politicas. Esto requiere el schema `auth` que Supabase trae preinstalado. Si en algun momento usas Postgres vainilla (Neon, RDS, local), el migrate fallara hasta que crees un stub:

```sql
CREATE SCHEMA IF NOT EXISTS auth;
CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb AS $$
  SELECT '{}'::jsonb
$$ LANGUAGE sql STABLE;
```

(En Supabase no hace falta.)

## 5. Sembrar datos de prueba

```bash
bun run db:seed
```

Crea 1 Business (`Demo Gym`, slug `demo-gym`, timezone `America/Bogota`), 1 Customer activo (`Juan Demo`) y 1 Package activo de 30 visitas. **Imprime los UUIDs** que vas a necesitar para los stubs de auth.

Es idempotente: si ya existe el business `demo-gym`, no inserta nada nuevo y solo te muestra los UUIDs existentes.

Salida tipica:

```
Seed creado correctamente. Usa estos UUIDs en los stubs:

  Business ID:  3f2e1d0c-...
  Customer ID:  8a7b6c5d-...
  Package ID:   1e2f3a4b-...

En la PWA (http://localhost:3001):
  Customer ID = 8a7b6c5d-...
  Business ID = 3f2e1d0c-...

En el dashboard (http://localhost:3000/scan-display):
  Business ID = 3f2e1d0c-...
```

## 6. Arrancar los dos servers

En dos terminales separadas (o con un `&` al final si te animas):

```bash
# Terminal 1 — backend + dashboard
bun run dev:web      # http://localhost:3000

# Terminal 2 — PWA cliente
bun run dev:pwa      # http://localhost:3001
```

## 7. Probar end-to-end (camino feliz)

1. Abre **http://localhost:3000/scan-display** → pega el `Business ID` → ves un QR grande.
2. Abre **http://localhost:3001** en otro tab/celular → pega `Customer ID` + `Business ID` → "Ir a escanear".
3. Toca **"Iniciar escaner"** → permite la camara → apunta al QR del paso 1.
4. **Asistencia registrada. 29 visitas restantes.**
5. Vuelve a la pantalla del display: pasados <=30 segundos veras un QR nuevo.

## 8. Curl playbook (sin UI)

Si prefieres probar con curl directo. Reemplaza `<BUSINESS_ID>` y `<CUSTOMER_ID>` por los UUIDs del seed.

**Generar un QR token nuevo:**
```bash
curl -sS -X POST http://localhost:3000/api/v1/qr/generate \
  -H 'content-type: application/json' \
  -H "x-business-id: <BUSINESS_ID>" \
  -d '{}' | jq
```

Respuesta esperada:
```json
{
  "data": {
    "token": "c4d5e6f7-...",
    "businessId": "<BUSINESS_ID>",
    "generatedAt": "2026-05-14T...",
    "expiresAt": "2026-05-15T..."
  }
}
```

**Registrar asistencia con ese token:**
```bash
curl -sS -X POST http://localhost:3000/api/v1/scan \
  -H 'content-type: application/json' \
  -H "x-business-id: <BUSINESS_ID>" \
  -H "x-customer-id: <CUSTOMER_ID>" \
  -d '{"qrToken":"<TOKEN_DEL_PASO_ANTERIOR>"}' | jq
```

Respuesta esperada:
```json
{
  "data": {
    "attendanceId": "...",
    "packageId": "...",
    "remainingVisits": 29,
    "packageStatus": "active",
    "scannedAt": "...",
    "scannedDate": "2026-05-14"
  }
}
```

**Intentar marcar dos veces el mismo dia (debe fallar con 409):**
```bash
curl -sS -X POST http://localhost:3000/api/v1/scan ... # mismo qrToken o uno nuevo
# El segundo retorna:
# {"error":{"code":"already_scanned_today","message":"..."}}
```

**Crear otro cliente desde la API (rol integrador):**
```bash
curl -sS -X POST http://localhost:3000/api/v1/customers \
  -H 'content-type: application/json' \
  -H "x-business-id: <BUSINESS_ID>" \
  -d '{
    "fullName":"Maria Demo",
    "email":"maria@demo.com",
    "phone":null
  }' | jq
```

**Asignar paquete a un cliente:**
```bash
curl -sS -X POST http://localhost:3000/api/v1/packages \
  -H 'content-type: application/json' \
  -H "x-business-id: <BUSINESS_ID>" \
  -d '{
    "customerId":"<CUSTOMER_ID_NUEVO>",
    "totalVisits":15
  }' | jq
```

## 9. Drizzle Studio (opcional)

Para inspeccionar los datos en una GUI web local:

```bash
bun run db:studio
```

Abre la URL que imprime (suele ser `https://local.drizzle.studio`). Ve las tablas, filas, edita en caliente. Util para confirmar que la asistencia se registro.

## 10. Reset rapido en dev

Si quieres empezar de cero:

1. En Supabase dashboard: **Project Settings → General → Reset database** (cuidado, borra todo).
2. Re-corre `bun run db:migrate` + `bun run db:seed`.

O via SQL editor de Supabase:
```sql
TRUNCATE attendances, qr_tokens, packages, customers, businesses RESTART IDENTITY CASCADE;
```
Y vuelve a correr `db:seed`.

---

## Troubleshooting

| Sintoma | Probable causa | Solucion |
|---|---|---|
| `DATABASE_URL no esta definido` | falta `.env.local` o no se cargo | Confirma que existe `apps/web/.env.local` y que corres el comando desde `apps/web/` |
| `password authentication failed` | typo en la password | Vuelve a copiar la URL de Supabase Settings → Database |
| `relation "businesses" does not exist` | migracion no aplicada | `bun run db:migrate` |
| `function auth.jwt() does not exist` | no estas en Supabase | Aplica el stub del paso 4 o cambia a Supabase |
| `x-customer-id` UUID malformado → 401 `unauthenticated` | typo o estas usando el package_id en vez del customer_id | Re-corre `db:seed` y copia exactamente |
| Scanner no abre la camara | permisos del navegador | Chrome/Safari: candado URL → permisos → cámara: permitir |
