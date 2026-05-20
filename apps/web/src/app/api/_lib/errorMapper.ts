import { ZodError } from 'zod'
import type { ErrorEnvelope } from '@scango/shared-types'
import { DomainError } from '@/domain/errors/DomainError'
import { AlreadyScannedTodayError } from '@/domain/errors/AlreadyScannedTodayError'
import { BusinessNotFoundError } from '@/domain/errors/BusinessNotFoundError'
import { CustomerAlreadyHasActivePackageError } from '@/domain/errors/CustomerAlreadyHasActivePackageError'
import { CustomerDisabledError } from '@/domain/errors/CustomerDisabledError'
import { CustomerEmailAlreadyExistsError } from '@/domain/errors/CustomerEmailAlreadyExistsError'
import { CustomerNotFoundError } from '@/domain/errors/CustomerNotFoundError'
import { InvalidEmailError } from '@/domain/errors/InvalidEmailError'
import { InvalidIdError } from '@/domain/errors/InvalidIdError'
import { InvalidMagicLinkError } from '@/domain/errors/InvalidMagicLinkError'
import { InvalidSlugError } from '@/domain/errors/InvalidSlugError'
import { InvalidTimezoneError } from '@/domain/errors/InvalidTimezoneError'
import { InvalidVisitCountError } from '@/domain/errors/InvalidVisitCountError'
import { InvalidWebhookUrlError } from '@/domain/errors/InvalidWebhookUrlError'
import { NoWebhookEventsError } from '@/domain/errors/NoWebhookEventsError'
import { BusinessSlugAlreadyExistsError } from '@/domain/errors/BusinessSlugAlreadyExistsError'
import { LocationNotFoundError } from '@/domain/errors/LocationNotFoundError'
import { NegativeVisitCountError } from '@/domain/errors/NegativeVisitCountError'
import { NotABusinessAdminError } from '@/domain/errors/NotABusinessAdminError'
import { NoActivePackageError } from '@/domain/errors/NoActivePackageError'
import { PackageDepletedError } from '@/domain/errors/PackageDepletedError'
import { QrTokenAlreadyUsedError } from '@/domain/errors/QrTokenAlreadyUsedError'
import { QrTokenExpiredError } from '@/domain/errors/QrTokenExpiredError'
import { QrTokenNotFoundError } from '@/domain/errors/QrTokenNotFoundError'
import {
  UnauthenticatedAdminError,
  UnauthenticatedCustomerError,
} from './authContext'
import {
  ApiKeyInvalidError,
  ApiKeyScopeError,
} from './businessAuthContext'

export interface MappedError {
  status: number
  body: ErrorEnvelope
}

interface DomainMapEntry {
  status: number
  code: string
}

// El `code` del envelope HTTP NO se deriva del `code` interno del domain error
// (que es UPPER_SNAKE como `PACKAGE_DEPLETED`). Se mapea explicitamente al
// contrato snake_case publico definido en ARCHITECTURE §9.3 para que el shape
// del API no cambie si renombramos un codigo de dominio.
function mapDomainError(err: DomainError): DomainMapEntry | null {
  if (err instanceof AlreadyScannedTodayError)
    return { status: 409, code: 'already_scanned_today' }
  if (err instanceof PackageDepletedError)
    return { status: 422, code: 'package_depleted' }
  if (err instanceof NoActivePackageError)
    return { status: 422, code: 'no_active_package' }
  if (err instanceof CustomerNotFoundError)
    return { status: 404, code: 'customer_not_found' }
  if (err instanceof CustomerDisabledError)
    return { status: 403, code: 'customer_disabled' }
  if (err instanceof BusinessNotFoundError)
    return { status: 404, code: 'business_not_found' }
  if (err instanceof LocationNotFoundError)
    return { status: 404, code: 'location_not_found' }
  if (err instanceof NotABusinessAdminError)
    return { status: 403, code: 'not_a_business_admin' }
  if (err instanceof InvalidMagicLinkError)
    return { status: 400, code: 'invalid_magic_link' }
  if (err instanceof CustomerEmailAlreadyExistsError)
    return { status: 409, code: 'customer_email_already_exists' }
  if (err instanceof CustomerAlreadyHasActivePackageError)
    return { status: 409, code: 'customer_already_has_active_package' }
  if (err instanceof QrTokenNotFoundError)
    return { status: 422, code: 'qr_token_not_found' }
  if (err instanceof QrTokenExpiredError)
    return { status: 422, code: 'qr_token_expired' }
  if (err instanceof QrTokenAlreadyUsedError)
    return { status: 409, code: 'qr_token_already_used' }
  if (err instanceof InvalidEmailError)
    return { status: 400, code: 'invalid_email' }
  if (err instanceof InvalidSlugError)
    return { status: 400, code: 'invalid_slug' }
  if (err instanceof InvalidTimezoneError)
    return { status: 400, code: 'invalid_timezone' }
  if (err instanceof InvalidVisitCountError)
    return { status: 400, code: 'invalid_visit_count' }
  if (err instanceof NegativeVisitCountError)
    return { status: 400, code: 'negative_visit_count' }
  if (err instanceof InvalidWebhookUrlError)
    return { status: 400, code: 'invalid_webhook_url' }
  if (err instanceof NoWebhookEventsError)
    return { status: 400, code: 'no_webhook_events' }
  if (err instanceof BusinessSlugAlreadyExistsError)
    return { status: 409, code: 'business_slug_already_exists' }
  // InvalidIdError generado desde branded constructors en el handler (auth o
  // body) ya esta manejado antes en `mapErrorToHttp` como 401. Aqui solo
  // cubrimos el caso de un InvalidIdError que escape de capas internas.
  if (err instanceof InvalidIdError)
    return { status: 400, code: 'invalid_id' }
  return null
}

export function mapErrorToHttp(err: unknown): MappedError {
  if (
    err instanceof UnauthenticatedCustomerError ||
    err instanceof UnauthenticatedAdminError
  ) {
    return {
      status: 401,
      body: {
        error: {
          code: 'unauthenticated',
          message: 'Missing or invalid credentials',
        },
      },
    }
  }

  // API key invalida (RF-03, ARCHITECTURE §9.3). Contrato del API publico.
  if (err instanceof ApiKeyInvalidError) {
    return {
      status: 401,
      body: {
        error: {
          code: 'invalid_api_key',
          message: 'Missing, invalid or revoked API key',
        },
      },
    }
  }

  if (err instanceof ApiKeyScopeError) {
    return {
      status: 403,
      body: {
        error: {
          code: 'insufficient_scope',
          message: 'The API key does not have the required scope',
        },
      },
    }
  }

  // Un InvalidIdError originado en `getCustomerAuthContext` o
  // `getAdminAuthContext` significa que algun header de credencial
  // (`X-Customer-Id`, `X-User-Id`, `X-Business-Id`) traia un UUID malformado.
  // A efectos del cliente equivale a "no autenticado", no a un input
  // invalido, porque la credencial es lo que esta corrupto.
  if (err instanceof InvalidIdError) {
    return {
      status: 401,
      body: {
        error: {
          code: 'unauthenticated',
          message: 'Missing or invalid credentials',
        },
      },
    }
  }

  if (err instanceof ZodError) {
    return {
      status: 400,
      body: {
        error: {
          code: 'invalid_request',
          message: 'Request validation failed',
          details: { issues: err.issues },
        },
      },
    }
  }

  if (err instanceof DomainError) {
    const mapped = mapDomainError(err)
    if (mapped) {
      return {
        status: mapped.status,
        body: {
          error: {
            code: mapped.code,
            message: err.message,
          },
        },
      }
    }
  }

  // Solo logeamos errores no tipados. Los domain errors son flujo esperado.
  if (err instanceof Error) {
    console.error(err)
  } else {
    console.error('Non-Error thrown:', err)
  }

  return {
    status: 500,
    body: {
      error: {
        code: 'internal_error',
        message: 'An unexpected error occurred',
      },
    },
  }
}
