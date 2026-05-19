import { InvalidMagicLinkError } from '@/domain/errors/InvalidMagicLinkError'
import { NotABusinessAdminError } from '@/domain/errors/NotABusinessAdminError'
import type { BusinessAdminRepository } from '@/domain/repositories/BusinessAdminRepository'
import type { AuthProvider } from '@/domain/services/AuthProvider'
import type { BusinessId, UserId } from '@/domain/value-objects/ids'

export interface VerifyAdminMagicLinkInput {
  token: string
}

export interface VerifyAdminMagicLinkResult {
  userId: UserId
  businessId: BusinessId
  accessToken: string
  refreshToken: string
}

/**
 * Verifica el magic link del callback. Resuelve el negocio DESPUES de
 * verificar (el businessId no viaja en el link): busca en
 * `business_admins` los negocios del user. Si no es admin de ninguno,
 * rechaza. El `accessToken` se devuelve para que el caller lo guarde en
 * la cookie de sesion.
 */
export class VerifyAdminMagicLinkUseCase {
  constructor(
    private readonly auth: AuthProvider,
    private readonly businessAdmins: BusinessAdminRepository,
  ) {}

  async execute(
    input: VerifyAdminMagicLinkInput,
  ): Promise<VerifyAdminMagicLinkResult> {
    const verified = await this.auth.verifyMagicLink(input.token)
    // null = token invalido/expirado. role !== 'admin' = un link de
    // customer usado en el flujo de admin — se trata igual de invalido.
    if (!verified || verified.role !== 'admin') {
      throw new InvalidMagicLinkError()
    }

    const admins = await this.businessAdmins.findBusinessesByUserId(
      verified.userId,
    )
    if (admins.length === 0) {
      throw new NotABusinessAdminError()
    }

    // N negocios → se toma el primero. Un selector multi-negocio queda
    // fuera de alcance de Phase 2.
    return {
      userId: verified.userId,
      businessId: admins[0]!.businessId,
      accessToken: verified.accessToken,
      refreshToken: verified.refreshToken,
    }
  }
}
