import { z } from "zod"

export const uuid = z.string().uuid()

export const ScanRequestSchema = z.object({
  qrToken: uuid,
})
export type ScanRequest = z.infer<typeof ScanRequestSchema>

export const ScanResponseSchema = z.object({
  attendanceId: uuid,
  packageId: uuid,
  locationId: uuid,
  remainingVisits: z.number().int().nonnegative(),
  packageStatus: z.enum(["active", "depleted", "expired"]),
  scannedAt: z.string().datetime(),
  scannedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  // true si la visita ya estaba registrada hoy (idempotencia §9.2) y se
  // devuelve sin consumir otra visita; false si es un registro fresco.
  alreadyRegistered: z.boolean(),
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
// El businessId viene del auth context; locationId va en el body porque una
// pantalla de QR pertenece a una sede concreta. .strict() evita que un caller
// mande campos extra silenciosamente.
export const GenerateQrRequestSchema = z.object({ locationId: uuid }).strict()
export type GenerateQrRequest = z.infer<typeof GenerateQrRequestSchema>

export const GenerateQrResponseSchema = z.object({
  token: uuid,
  businessId: uuid,
  locationId: uuid,
  generatedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
})
export type GenerateQrResponse = z.infer<typeof GenerateQrResponseSchema>

// POST /v1/webhook-subscriptions — el integrador externo registra una URL
// para recibir eventos. El businessId lo da el auth context (API key).
// La URL DEBE ser HTTPS; eventos válidos: attendance.created, package.depleted.
export const CreateWebhookSubscriptionRequestSchema = z
  .object({
    url: z.string().url().max(2048),
    events: z
      .array(z.enum(['attendance.created', 'package.depleted']))
      .min(1)
      .max(10),
  })
  .strict()
export type CreateWebhookSubscriptionRequest = z.infer<
  typeof CreateWebhookSubscriptionRequestSchema
>

export const CreateWebhookSubscriptionResponseSchema = z.object({
  subscriptionId: uuid,
  businessId: uuid,
  url: z.string().url(),
  events: z.array(z.string()),
  status: z.enum(['active', 'disabled']),
  createdAt: z.string().datetime(),
  // Secreto en claro para firmar HMAC — solo se muestra una vez.
  signingSecret: z.string(),
})
export type CreateWebhookSubscriptionResponse = z.infer<
  typeof CreateWebhookSubscriptionResponseSchema
>

// POST /auth/admin/magic-link — pide un magic link de login de admin.
export const RequestAdminMagicLinkRequestSchema = z
  .object({ email: z.string().email().max(254) })
  .strict()
export type RequestAdminMagicLinkRequest = z.infer<
  typeof RequestAdminMagicLinkRequestSchema
>

// Respuesta neutral: no revela si el email existe o es admin.
export const RequestAdminMagicLinkResponseSchema = z.object({
  sent: z.literal(true),
})
export type RequestAdminMagicLinkResponse = z.infer<
  typeof RequestAdminMagicLinkResponseSchema
>

// POST /auth/signout
export const SignoutResponseSchema = z.object({ signedOut: z.literal(true) })
export type SignoutResponse = z.infer<typeof SignoutResponseSchema>
