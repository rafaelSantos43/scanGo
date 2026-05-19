import { ScanRequestSchema, type ScanResponse } from '@scango/shared-types'
import { runRegisterAttendance } from '@/infrastructure/composition'
import { QrTokenValue } from '@/domain/value-objects/ids'
import { getCustomerAuthContext } from '../../_lib/authContext'
import { mapErrorToHttp } from '../../_lib/errorMapper'

export async function POST(req: Request): Promise<Response> {
  try {
    const auth = await getCustomerAuthContext()
    const body = ScanRequestSchema.parse(await req.json())

    const result = await runRegisterAttendance({
      customerId: auth.customerId,
      businessId: auth.businessId,
      qrToken: QrTokenValue(body.qrToken),
    })

    const dto: ScanResponse = {
      attendanceId: result.attendance.id,
      packageId: result.package.id,
      locationId: result.attendance.locationId,
      remainingVisits: result.remainingVisits,
      packageStatus: result.package.status,
      scannedAt: result.attendance.scannedAt.toISOString(),
      scannedDate: result.attendance.scannedDate,
      alreadyRegistered: result.alreadyRegistered,
    }

    return Response.json({ data: dto }, { status: 200 })
  } catch (err) {
    const mapped = mapErrorToHttp(err)
    return Response.json(mapped.body, { status: mapped.status })
  }
}
