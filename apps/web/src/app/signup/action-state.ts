// Estado de la Server Action de signup. El success carga el email del
// dueño para mostrarle "te enviamos un magic link a juan@...". Vive
// aquí (no en actions.ts) porque un archivo 'use server' solo puede
// exportar funciones async.

export type ActionState =
  | { status: 'idle' }
  | { status: 'success'; email: string }
  | { status: 'error'; message: string; fieldErrors?: Record<string, string> }

export const initialActionState: ActionState = { status: 'idle' }
