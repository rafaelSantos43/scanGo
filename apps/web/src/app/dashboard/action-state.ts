// Tipo y estado inicial de las Server Actions del dashboard. Vive aquí
// (no en actions.ts) porque un archivo 'use server' solo puede exportar
// funciones async — no un objeto como `initialActionState`.

export type ActionState =
  | { status: 'idle' }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string; fieldErrors?: Record<string, string> }

export const initialActionState: ActionState = { status: 'idle' }
