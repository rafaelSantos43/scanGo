import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex flex-1 w-full items-center justify-center px-6 py-16 bg-background text-foreground">
      <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Scan&amp;Go</h1>
        <p className="text-base text-muted-foreground">
          Panel del negocio. La pantalla de QR se proyecta a la entrada del local.
        </p>
        <Link
          href="/scan-display"
          className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-6 text-base font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Abrir pantalla de QR
        </Link>
      </div>
    </main>
  )
}
