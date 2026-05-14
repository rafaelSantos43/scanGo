# Scan&Go

Servicio de control de asistencia por QR para cualquier negocio que opere con paquetes de visitas.

Producto integrable (API + SDK + webhooks) con PWA propia como producto autónomo.

> **Antes de tocar código:** lee la documentación en este orden — [`docs/PRD.md`](./docs/PRD.md), [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md), [`docs/RULES.md`](./docs/RULES.md), [`docs/agents/<tu_agent>.md`](./docs/agents/), [`docs/ENGRAM.md`](./docs/ENGRAM.md).

---

## Requisitos

- **Bun** 1.3.0+ (runtime + package manager + test runner). [Instalación oficial](https://bun.sh/).
- **Git** 2.30+.
- **Docker** (solo cuando lleguemos a tests de integración con `@testcontainers/postgresql`). Diferido hasta Fase B.

### Setup macOS / Linux

```bash
# Bun
curl -fsSL https://bun.sh/install | bash

# Clonar e instalar dependencias
git clone <repo-url>
cd Scan-Go
bun install
```

### Setup Windows

```powershell
# Bun (PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"

# Clonar e instalar
git clone <repo-url>
cd Scan-Go
bun install
```

**Notas para Windows:**
- Habilitar **modo desarrollador** en Windows para que los symlinks de Bun funcionen sin elevación: Settings → Privacy & security → For developers → Developer Mode = ON.
- Usar **PowerShell** o **Git Bash** como terminal. Scripts del proyecto evitan sintaxis bash específica, pero si encuentras un script con `&&` o env vars al estilo `VAR=x cmd`, abre issue.
- Los line endings se normalizan automáticamente vía `.gitattributes` — no hay que tocar `core.autocrlf`.

---

## Estructura

```
apps/
  web/        Next.js — API REST pública + dashboard del negocio
  pwa/        Next.js — PWA del cliente final (escanea QR)

packages/
  shared-types/   Schemas Zod + tipos compartidos API ↔ SDK
  sdk/            @scango/sdk — cliente JS/TS
  react/          @scango/react — componentes drop-in

examples/
  external-app/   Next.js de prueba integrando @scango/react

docs/         Toda la documentación viva del proyecto
```

Ver [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) §5 para detalles.

---

## Scripts

```bash
bun install            # instalar todas las dependencias del monorepo
bun run dev:web        # arrancar Next.js de apps/web
bun run dev:pwa        # arrancar Next.js de apps/pwa
bun run build          # build de todos los workspaces
bun run typecheck      # tsc --noEmit en todos los workspaces
bun run lint           # lint en todos los workspaces
bun test               # tests con bun test
bun test --watch       # tests en modo watch
bun test --coverage    # tests con cobertura
```

---

## Filosofía de desarrollo

Lee [`docs/RULES.md`](./docs/RULES.md) entero antes de tu primer commit. Resumen:

- Cada implementación se decide entre **2+ alternativas** con tradeoffs documentados (§2.8).
- Distinguir entre lo **simple** y lo **necesario** (§2.9). No implementar por costumbre, por "buena práctica", o "por si acaso".
- Patrones complejos (UnitOfWork, DI containers, caché) están **diferidos** con triggers concretos — ver [PRD §10](./docs/PRD.md).
- Sin emojis en código ni docs salvo pedido explícito.

---

## Conectar a una base de datos real

Ver [`docs/DATABASE_SETUP.md`](./docs/DATABASE_SETUP.md) para los pasos: crear proyecto en Supabase, configurar `apps/web/.env.local`, aplicar la migración inicial, sembrar datos de prueba y probar el flujo de escaneo end-to-end (con UI o con `curl`).

---

## Estado del proyecto

Ver [`docs/ENGRAM.md`](./docs/ENGRAM.md) para el estado vivo: qué se decidió, qué está en progreso, qué bloqueadores hay.
