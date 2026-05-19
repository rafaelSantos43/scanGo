// Estado dedicado para la action de emisión: success lleva el valor en
// claro de la key (`plainKey`) para mostrarlo UNA sola vez en la UI. No
// reutiliza el `ActionState` genérico del dashboard porque ese no tiene
// hueco para payload.

export type IssueApiKeyActionState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | {
      status: 'success'
      plainKey: string
      prefix: string
      scope: 'read' | 'write'
    }

export const initialIssueState: IssueApiKeyActionState = { status: 'idle' }
