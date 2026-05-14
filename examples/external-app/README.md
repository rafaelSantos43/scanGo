# @scango/example-external-app

Placeholder. Será un Next.js de prueba que integra `@scango/react` para demostrar el flujo de integración de un consumidor externo del servicio Scan&Go.

**Scaffold completo diferido** hasta que `@scango/react` exporte al menos un componente real (`ScanGoProvider`, `QrDisplay`, `ScanButton`). Antes de eso, este ejemplo no agrega valor.

Cuando se active, se scaffoldea con:

```bash
bun create next-app examples/external-app
```

Y se renombra a `@scango/example-external-app` para mantener consistencia con el resto del monorepo.

Ver [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) §5.
