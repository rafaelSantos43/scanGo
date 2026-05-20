'use server'

import { z } from 'zod'
import { BusinessSlugAlreadyExistsError } from '@/domain/errors/BusinessSlugAlreadyExistsError'
import { InvalidEmailError } from '@/domain/errors/InvalidEmailError'
import { InvalidSlugError } from '@/domain/errors/InvalidSlugError'
import { InvalidTimezoneError } from '@/domain/errors/InvalidTimezoneError'
import { runRegisterBusiness } from '@/infrastructure/composition'
import type { ActionState } from './action-state'

const schema = z.object({
  ownerEmail: z.string().trim().email('Email inválido').max(254),
  businessName: z.string().trim().min(1, 'Obligatorio').max(120),
  businessSlug: z
    .string()
    .trim()
    .min(2, 'Mínimo 2 caracteres')
    .max(48, 'Máximo 48 caracteres')
    .regex(/^[a-z0-9-]+$/, 'Solo minúsculas, números y guiones'),
  businessType: z.enum(['gym', 'academy', 'coworking', 'other']),
  timezone: z.string().trim().min(1, 'Obligatorio').max(64),
})

function fieldErrors(error: z.ZodError): Record<string, string> {
  const flat = error.flatten().fieldErrors
  const out: Record<string, string> = {}
  for (const [k, msgs] of Object.entries(flat)) {
    if (msgs && msgs[0]) out[k] = msgs[0]
  }
  return out
}

export async function registerBusinessAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = schema.safeParse({
    ownerEmail: formData.get('ownerEmail'),
    businessName: formData.get('businessName'),
    businessSlug: formData.get('businessSlug'),
    businessType: formData.get('businessType'),
    timezone: formData.get('timezone'),
  })
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Revisa los campos.',
      fieldErrors: fieldErrors(parsed.error),
    }
  }

  try {
    await runRegisterBusiness({
      ownerEmail: parsed.data.ownerEmail,
      businessName: parsed.data.businessName,
      businessSlug: parsed.data.businessSlug,
      businessType: parsed.data.businessType,
      timezone: parsed.data.timezone,
    })
  } catch (err) {
    if (err instanceof BusinessSlugAlreadyExistsError) {
      return {
        status: 'error',
        message: 'Ese identificador ya está tomado.',
        fieldErrors: { businessSlug: 'Ya en uso' },
      }
    }
    if (err instanceof InvalidEmailError) {
      return {
        status: 'error',
        message: 'Email inválido.',
        fieldErrors: { ownerEmail: 'Email inválido' },
      }
    }
    if (err instanceof InvalidSlugError) {
      return {
        status: 'error',
        message: 'Identificador inválido.',
        fieldErrors: { businessSlug: 'Inválido' },
      }
    }
    if (err instanceof InvalidTimezoneError) {
      return {
        status: 'error',
        message: 'Zona horaria inválida.',
        fieldErrors: { timezone: 'Inválida' },
      }
    }
    console.error('registerBusinessAction:', err)
    return { status: 'error', message: 'Algo salió mal. Intenta de nuevo.' }
  }

  return { status: 'success', email: parsed.data.ownerEmail }
}
