# Correr Scan&Go en Windows

Guía paso a paso para levantar el proyecto en Windows 10/11 y probarlo de
punta a punta. Los comandos son los mismos en PowerShell o Windows Terminal.

> La base de datos vive en **Supabase (la nube)**, no en tu máquina. Mover
> el proyecto a Windows no mueve la DB: si apuntas al mismo Supabase, todo
> tu data y las migraciones ya están ahí.

---

## 0. Instalar lo necesario

1. **Git** — https://git-scm.com/download/win (instalador, dale "Next" a todo).
2. **Bun** (runtime + gestor de paquetes). Abre **PowerShell** y corre:
   ```powershell
   powershell -c "irm bun.sh/install.ps1 | iex"
   ```
   Cierra y vuelve a abrir la terminal. Verifica:
   ```powershell
   bun --version
   ```
   Debe ser **1.3.0 o mayor**. Si dice "no se reconoce", reinicia la terminal
   (o el PC) para que tome el PATH.
3. **VS Code** (opcional) — https://code.visualstudio.com

---

## 1. Traer el proyecto

```powershell
git clone <URL-del-repo> scango
cd scango
bun install
```

`bun install` desde la raíz instala las dependencias de todos los workspaces
(`apps/web`, `apps/pwa`, `packages/*`). Tarda un par de minutos la primera vez.

---

## 2. Variables de entorno

Los archivos `.env.local` **no viajan con git** (tienen secretos). Hay que
crearlos a mano. Cópialos de tu `.env.local` actual en la Mac, o de los
valores del dashboard de Supabase.

**`apps/web/.env.local`** — crea el archivo con:
```
DATABASE_URL=postgresql://postgres.kijmsbralkywjwzcoylh:[PASSWORD]@aws-1-us-east-2.pooler.supabase.com:5432/postgres
SUPABASE_URL=https://kijmsbralkywjwzcoylh.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[tu service_role key]
SUPABASE_MAGIC_LINK_REDIRECT_URL=https://localhost:3000/api/auth/callback
```

**`apps/pwa/.env.local`** — crea el archivo con:
```
NEXT_PUBLIC_API_BASE_URL=https://localhost:3000
```

> Esta guía usa **HTTPS** (`https://`) porque la cámara de la PWA solo
> funciona en contexto seguro. Si vas a correr en HTTP plano (sin probar
> cámara), usa `http://` en ambas variables.
>
> `DATABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` son secretos — cópialos tal
> cual de tu `.env.local` de la Mac. Los otros dos valores son los de
> arriba (no son secretos).

---

## 3. Base de datos — normalmente NO hay que hacer nada

Si usas el **mismo proyecto Supabase** (el `DATABASE_URL` de arriba), las
3 migraciones (`0000`, `0001`, `0002`) **ya están aplicadas**. Salta al
paso 4.

Solo si creas una base de datos **nueva y vacía**, aplica las migraciones
en orden (desde `apps/web`):
```powershell
cd apps\web
bun run scripts/apply-migration.ts 0000_init_scan_flow
bun run scripts/apply-migration.ts 0001_auth_business_admins
bun run scripts/apply-migration.ts 0002_locations
cd ..\..
```

---

## 4. Datos de prueba (seed)

Desde `apps/web`. Son **idempotentes**: si ya existen, solo imprimen los IDs.
```powershell
cd apps\web
bun run db:seed
bun run db:seed-admin
cd ..\..
```

`db:seed` imprime el **Business ID**, los **Location ID** (Sede Norte / Sur)
y el **Customer ID**. **Anótalos** — los necesitas en el paso 6.
`db:seed-admin` crea el admin de prueba `admin@demo.com`.

---

## 5. Levantar los servidores

Necesitas **dos terminales** abiertas en la raíz del proyecto.

**Terminal 1 — el backend + dashboard (`apps/web`):**
```powershell
bun run dev:web:https
```
Queda en `https://localhost:3000`.

**Terminal 2 — la PWA del cliente (`apps/pwa`):**
```powershell
bun run dev:pwa:https
```
Queda en `https://localhost:3001` (el puerto 3000 ya está ocupado, Next
toma el siguiente).

> **Primera vez:** Windows puede mostrar (a) un aviso del Firewall — dale
> **"Permitir acceso"** (necesario para abrir la PWA desde el celular);
> (b) el certificado de `--experimental-https` es autofirmado, el navegador
> mostrará una advertencia → **"Avanzado" → "Continuar a localhost"**.
>
> Versión sin HTTPS (más simple, sin cámara): `bun run dev:web` y
> `bun run dev:pwa` — recuerda poner `http://` en los `.env.local`.

---

## 6. Flujo de prueba completo

### a) Entrar al dashboard (admin)
El login es por magic link. Para no depender del correo, genera el enlace
directo (desde `apps/web`, en una tercera terminal):
```powershell
cd apps\web
bun run dev:login-link
cd ..\..
```
Copia la URL que imprime y pégala en el navegador → te crea la sesión y
caes en **`/dashboard`**. Deberías ver el nombre del negocio, las
asistencias de hoy y la navegación.

### b) Gestionar clientes
En `/dashboard/clientes`: ves la lista de clientes con su paquete. Prueba
**crear un cliente** y **asignarle un paquete** con los formularios. La
lista se actualiza sola.

### c) Mostrar el QR
Abre `https://localhost:3000/scan-display`. Pega el **Business ID** y un
**Location ID** (del paso 4). Se muestra el QR de esa sede.

### d) Escanear desde la PWA
Abre `https://localhost:3001`. En el mini-formulario pega el **Customer ID**
y el **Business ID** (del paso 4). Entra a `/scan` y escanea el QR de la
pantalla del paso c.
- Desde el **celular**: conéctalo al mismo WiFi que el PC, averigua la IP
  del PC con `ipconfig` (busca "Dirección IPv4"), y abre
  `https://<IP-del-PC>:3001` en el celular.

### e) Confirmar
Vuelve a `/dashboard` y recarga: la asistencia recién registrada aparece
con el nombre del cliente, la sede y la hora.

---

## 7. Comandos útiles

Todos desde la **raíz** del proyecto salvo que se indique:

| Comando | Qué hace |
|---|---|
| `bun install` | Instala dependencias de todo el monorepo |
| `bun run dev:web:https` | Backend + dashboard en `https://localhost:3000` |
| `bun run dev:pwa:https` | PWA del cliente en `https://localhost:3001` |
| `bun run dev:web` / `dev:pwa` | Igual pero en HTTP (sin cámara) |
| `bun run typecheck` | Chequeo de tipos de todos los workspaces |
| `bun test` | Tests unitarios |
| `bun run lint` | Linter |
| `bun run build` | Build de producción de las apps |
| `cd apps\web && bun run db:seed` | Datos demo (negocio, sedes, cliente) |
| `cd apps\web && bun run db:seed-admin` | Admin de prueba `admin@demo.com` |
| `cd apps\web && bun run dev:login-link` | Genera un magic link de login |
| `cd apps\web && bun run db:studio` | Explorador visual de la base de datos |

---

## 8. Problemas comunes en Windows

- **`bun` no se reconoce** → reinicia la terminal (o el PC) tras instalarlo.
- **El navegador bloquea `https://localhost`** → es el certificado
  autofirmado; "Avanzado → Continuar". Es normal en dev.
- **`ERR_EMPTY_RESPONSE`** → estás entrando por `http://` a un servidor que
  corre en `https://` (o al revés). Usa el esquema correcto.
- **El login redirige a `/login?error=...`** → el magic link expiró o ya se
  usó (son de un solo uso). Genera otro con `dev:login-link`.
- **Un script dice "Faltan env vars"** → córrelo desde `apps\web` (Bun lee
  el `.env.local` de la carpeta actual).
- **El celular no abre la PWA** → mismo WiFi, usa la IP del PC (`ipconfig`),
  y acepta el aviso del Firewall de Windows la primera vez.
- **Puerto ocupado** → Next toma el siguiente puerto libre y lo dice en la
  terminal; si `apps/web` no quedó en 3000, ciérralo y vuelve a levantarlo
  (el `apps/web` debe estar en 3000 porque la PWA le apunta ahí).
- **`drizzle-kit` falla en `db:migrate`** → usa el script casero
  `apply-migration.ts` (paso 3), no `db:migrate`. Es una limitación conocida
  contra el pooler de Supabase.
