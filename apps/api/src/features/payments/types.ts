export type PaymentMode = 'SANDBOX' | 'LIVE'

export interface PaypalCreds {
  clientId: string
  secret: string
  mode: PaymentMode
}

export interface CreatedPaypalOrder {
  paypalOrderId: string
}

export interface CapturedPayment {
  status: string        // 'COMPLETED' при успехе
  captureId: string | null
}

export interface PaypalClient {
  createOrder(input: { creds: PaypalCreds; amountUsd: number; invoiceId: string }): Promise<CreatedPaypalOrder>
  captureOrder(input: { creds: PaypalCreds; paypalOrderId: string }): Promise<CapturedPayment>
  getOrderStatus(input: { creds: PaypalCreds; paypalOrderId: string }): Promise<CapturedPayment>
}

// --- Settings ---
export interface PaymentSettingsView {
  enabled: boolean
  mode: PaymentMode
  clientId: string | null
  hasSecret: boolean
}

export interface UpdatePaymentSettingsInput {
  enabled: boolean
  mode: PaymentMode
  clientId: string | null
  secret?: string | null
}

export interface PublicPaymentConfig {
  enabled: boolean
  clientId: string | null
  mode: PaymentMode
  serverFlow: boolean
}

// --- Repository ---
export interface OrderForPayment {
  id: string
  userId: string
  orderNumber: number
  status: string
  totalAmount: number
  paypalOrderId: string | null
}

export interface PaymentRepository {
  getSettings(): Promise<{ enabled: boolean; mode: PaymentMode; clientId: string | null; secret: string | null } | null>
  upsertSettings(data: { enabled: boolean; mode: PaymentMode; clientId: string | null; secret: string | null | undefined }): Promise<void>
  getOrderForPayment(orderId: string): Promise<OrderForPayment | null>
  setPaypalOrderId(orderId: string, paypalOrderId: string): Promise<void>
  markOrderPaid(orderId: string, captureId: string | null): Promise<void>
}
