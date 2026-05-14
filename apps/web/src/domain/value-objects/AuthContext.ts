import type { BusinessId } from './ids'

/**
 * Contexto de autenticacion resuelto por el AuthProvider. Lleva quien
 * es el usuario y bajo que rol/negocio actua. Para clientes finales
 * (multi-negocio por email), el businessId del contexto desambigua
 * cual gym es el activo (§8.2 de ARCHITECTURE).
 */
export interface AuthContext {
  businessId: BusinessId
  role: 'admin' | 'customer'
}
