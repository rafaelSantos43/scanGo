import { z } from "zod"

export const uuid = z.string().uuid()

export const ScanRequestSchema = z.object({
  qrToken: uuid,
})
export type ScanRequest = z.infer<typeof ScanRequestSchema>

export const ScanResponseSchema = z.object({
  attendanceId: uuid,
  packageId: uuid,
  remainingVisits: z.number().int().nonnegative(),
  packageStatus: z.enum(["active", "depleted", "expired"]),
  scannedAt: z.string().datetime(),
  scannedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})
export type ScanResponse = z.infer<typeof ScanResponseSchema>

export const SuccessEnvelopeSchema = <T extends z.ZodTypeAny>(data: T) =>
  z.object({ data })

export const ErrorPayloadSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
})
export const ErrorEnvelopeSchema = z.object({ error: ErrorPayloadSchema })
export type ErrorPayload = z.infer<typeof ErrorPayloadSchema>
export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>

// POST /v1/customers
export const CreateCustomerRequestSchema = z.object({
  fullName: z.string().min(1).max(120).trim(),
  email: z.string().email().max(254),
  phone: z.string().max(40).optional(),
})
export type CreateCustomerRequest = z.infer<typeof CreateCustomerRequestSchema>

export const CreateCustomerResponseSchema = z.object({
  customerId: uuid,
  businessId: uuid,
  fullName: z.string(),
  email: z.string().email(),
  phone: z.string().nullable(),
  status: z.enum(["active", "disabled"]),
  createdAt: z.string().datetime(),
})
export type CreateCustomerResponse = z.infer<typeof CreateCustomerResponseSchema>

// POST /v1/packages
export const AssignPackageRequestSchema = z.object({
  customerId: uuid,
  totalVisits: z.number().int().positive().max(1000),
  expiresAt: z.string().datetime().optional(),
})
export type AssignPackageRequest = z.infer<typeof AssignPackageRequestSchema>

export const AssignPackageResponseSchema = z.object({
  packageId: uuid,
  customerId: uuid,
  businessId: uuid,
  totalVisits: z.number().int().nonnegative(),
  remainingVisits: z.number().int().nonnegative(),
  status: z.enum(["active", "depleted", "expired"]),
  purchasedAt: z.string().datetime(),
  expiresAt: z.string().datetime().nullable(),
})
export type AssignPackageResponse = z.infer<typeof AssignPackageResponseSchema>

// POST /v1/qr/generate
// Sin body — el businessId viene del auth context. .strict() evita que un
// caller mande campos extra silenciosamente.
export const GenerateQrRequestSchema = z.object({}).strict()
export type GenerateQrRequest = z.infer<typeof GenerateQrRequestSchema>

export const GenerateQrResponseSchema = z.object({
  token: uuid,
  businessId: uuid,
  generatedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
})
export type GenerateQrResponse = z.infer<typeof GenerateQrResponseSchema>
