'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { ApiKeyNotFoundError } from '@/domain/errors/ApiKeyNotFoundError'
import { BusinessNotFoundError } from '@/domain/errors/BusinessNotFoundError'
import { ApiKeyId } from '@/domain/value-objects/ids'
import { getAdminAuthContext } from '@/app/api/_lib/authContext'
import {
  runIssueApiKey,
  runRevokeApiKey,
} from '@/infrastructure/composition'
import type { ActionState } from '../action-state'
import type { IssueApiKeyActionState } from './action-state'

const SESSION_EXPIRED_ISSUE: IssueApiKeyActionState = {
  status: 'error',
  message: 'Sesión expirada. Vuelve a iniciar sesión.',
}
const SESSION_EXPIRED_REVOKE: ActionState = {
  status: 'error',
  message: 'Sesión expirada. Vuelve a iniciar sesión.',
}

const scopeSchema = z.object({
  scope: z.enum(['read', 'write']),
})

export async function issueApiKeyAction(
  _prev: IssueApiKeyActionState,
  formData: FormData,
): Promise<IssueApiKeyActionState> {
  let businessId
  try {
    businessId = (await getAdminAuthContext()).businessId
  } catch {
    return SESSION_EXPIRED_ISSUE
  }

  const parsed = scopeSchema.safeParse({ scope: formData.get('scope') })
  if (!parsed.success) {
    return { status: 'error', message: 'Scope inválido.' }
  }

  try {
    const { apiKey, plainKey } = await runIssueApiKey({
      businessId,
      scope: parsed.data.scope,
    })
    revalidatePath('/dashboard/api-keys')
    return {
      status: 'success',
      plainKey,
      prefix: apiKey.prefix,
      scope: apiKey.scope,
    }
  } catch (err) {
    if (err instanceof BusinessNotFoundError) {
      return { status: 'error', message: 'Negocio no encontrado.' }
    }
    console.error('issueApiKeyAction error:', err)
    return { status: 'error', message: 'Algo salió mal. Intenta de nuevo.' }
  }
}

const apiKeyIdSchema = z.object({
  apiKeyId: z.string().uuid('Key inválida'),
})

export async function revokeApiKeyAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let businessId
  try {
    businessId = (await getAdminAuthContext()).businessId
  } catch {
    return SESSION_EXPIRED_REVOKE
  }

  const parsed = apiKeyIdSchema.safeParse({
    apiKeyId: formData.get('apiKeyId'),
  })
  if (!parsed.success) {
    return { status: 'error', message: 'Key inválida.' }
  }

  try {
    await runRevokeApiKey({
      apiKeyId: ApiKeyId(parsed.data.apiKeyId),
      businessId,
    })
  } catch (err) {
    if (err instanceof ApiKeyNotFoundError) {
      return { status: 'error', message: 'La key ya no existe.' }
    }
    console.error('revokeApiKeyAction error:', err)
    return { status: 'error', message: 'Algo salió mal. Intenta de nuevo.' }
  }

  revalidatePath('/dashboard/api-keys')
  return { status: 'success', message: 'Key revocada.' }
}
