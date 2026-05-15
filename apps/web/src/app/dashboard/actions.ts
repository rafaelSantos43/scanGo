'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { runAssignPackage, runCreateCustomer } from '@/infrastructure/composition'
import { BusinessNotFoundError } from '@/domain/errors/BusinessNotFoundError'
import { CustomerAlreadyHasActivePackageError } from '@/domain/errors/CustomerAlreadyHasActivePackageError'
import { CustomerDisabledError } from '@/domain/errors/CustomerDisabledError'
import { CustomerEmailAlreadyExistsError } from '@/domain/errors/CustomerEmailAlreadyExistsError'
import { CustomerNotFoundError } from '@/domain/errors/CustomerNotFoundError'
import { InvalidEmailError } from '@/domain/errors/InvalidEmailError'
import { InvalidVisitCountError } from '@/domain/errors/InvalidVisitCountError'
import { CustomerId } from '@/domain/value-objects/ids'
import { getAdminAuthContext } from '@/app/api/_lib/authContext'
import type { ActionState } from './action-state'

const SESSION_EXPIRED: ActionState = {
  status: 'error',
  message: 'Sesión expirada. Vuelve a iniciar sesión.',
}

/** Primer mensaje de error de cada campo, plano para la UI. */
function fieldErrors(error: z.ZodError): Record<string, string> {
  const flat = error.flatten().fieldErrors
  const out: Record<string, string> = {}
  for (const [key, msgs] of Object.entries(flat)) {
    if (msgs && msgs[0]) out[key] = msgs[0]
  }
  return out
}

/** Mapea errores de dominio a un ActionState de error en español. */
function mapDomainError(err: unknown): ActionState {
  if (err instanceof CustomerEmailAlreadyExistsError) {
    return {
      status: 'error',
      message: 'Ya existe un cliente con ese email.',
      fieldErrors: { email: 'Email ya registrado' },
    }
  }
  if (err instanceof InvalidEmailError) {
    return {
      status: 'error',
      message: 'El email no es válido.',
      fieldErrors: { email: 'Email inválido' },
    }
  }
  if (err instanceof CustomerAlreadyHasActivePackageError) {
    return {
      status: 'error',
      message: 'Este cliente ya tiene un paquete activo.',
    }
  }
  if (err instanceof CustomerNotFoundError) {
    return { status: 'error', message: 'Cliente no encontrado.' }
  }
  if (err instanceof CustomerDisabledError) {
    return { status: 'error', message: 'El cliente está deshabilitado.' }
  }
  if (err instanceof InvalidVisitCountError) {
    return {
      status: 'error',
      message: 'La cantidad de visitas no es válida.',
      fieldErrors: { totalVisits: 'Cantidad inválida' },
    }
  }
  if (err instanceof BusinessNotFoundError) {
    return { status: 'error', message: 'Negocio no encontrado.' }
  }
  console.error('dashboard action error:', err)
  return { status: 'error', message: 'Algo salió mal. Intenta de nuevo.' }
}

const createCustomerSchema = z.object({
  fullName: z.string().trim().min(1, 'El nombre es obligatorio').max(120),
  email: z.string().trim().email('Email inválido').max(254),
  phone: z.string().trim().max(40).optional(),
})

export async function createCustomerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let businessId
  try {
    businessId = (await getAdminAuthContext()).businessId
  } catch {
    return SESSION_EXPIRED
  }

  const parsed = createCustomerSchema.safeParse({
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    phone: formData.get('phone') || undefined,
  })
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Revisa los campos.',
      fieldErrors: fieldErrors(parsed.error),
    }
  }

  try {
    await runCreateCustomer({
      businessId,
      fullName: parsed.data.fullName,
      email: parsed.data.email,
      phone: parsed.data.phone ?? null,
    })
  } catch (err) {
    return mapDomainError(err)
  }

  revalidatePath('/dashboard/clientes')
  return { status: 'success', message: 'Cliente creado.' }
}

const assignPackageSchema = z.object({
  customerId: z.string().uuid('Selecciona un cliente'),
  totalVisits: z.coerce
    .number()
    .int('Debe ser un número entero')
    .positive('Debe ser mayor que 0'),
  expiresAt: z.string().optional(),
})

export async function assignPackageAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let businessId
  try {
    businessId = (await getAdminAuthContext()).businessId
  } catch {
    return SESSION_EXPIRED
  }

  const parsed = assignPackageSchema.safeParse({
    customerId: formData.get('customerId'),
    totalVisits: formData.get('totalVisits'),
    expiresAt: formData.get('expiresAt') || undefined,
  })
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Revisa los campos.',
      fieldErrors: fieldErrors(parsed.error),
    }
  }

  try {
    await runAssignPackage({
      businessId,
      customerId: CustomerId(parsed.data.customerId),
      totalVisits: parsed.data.totalVisits,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
    })
  } catch (err) {
    return mapDomainError(err)
  }

  revalidatePath('/dashboard/clientes')
  return { status: 'success', message: 'Paquete asignado.' }
}
