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
  amount: string | null // value из purchase_units[0] (capture или order), null если недоступно
  currencyCode: string | null
  invoiceId: string | null
}

export interface PaypalWebhookHeaders {
  transmissionId: string
  transmissionTime: string
  certUrl: string
  authAlgo: string
  transmissionSig: string
}

export interface PaypalClient {
  createOrder(input: { creds: PaypalCreds; amountUsd: number; invoiceId: string }): Promise<CreatedPaypalOrder>
  captureOrder(input: { creds: PaypalCreds; paypalOrderId: string }): Promise<CapturedPayment>
  getOrderStatus(input: { creds: PaypalCreds; paypalOrderId: string }): Promise<CapturedPayment>
  verifyWebhookSignature(input: { creds: PaypalCreds; webhookId: string; headers: PaypalWebhookHeaders; rawBody: string }): Promise<boolean>
}

// --- Settings ---
export interface ModeCredsView {
  clientId: string | null
  hasSecret: boolean
  webhookId: string | null
}

export interface PaymentSettingsView {
  enabled: boolean
  mode: PaymentMode
  sandbox: ModeCredsView
  live: ModeCredsView
  externalPageEnabled: boolean
}

export interface UpdateModeCredsInput {
  clientId: string | null
  secret?: string | null
  webhookId?: string | null
}

export interface UpdatePaymentSettingsInput {
  enabled: boolean
  mode: PaymentMode
  sandbox: UpdateModeCredsInput
  live: UpdateModeCredsInput
  externalPageEnabled: boolean
}

export interface PublicPaymentConfig {
  enabled: boolean
  clientId: string | null
  mode: PaymentMode
  serverFlow: boolean
  external: boolean
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

export interface AdminPaymentSettings {
  enabled: boolean
  mode: PaymentMode
  sandboxClientId: string | null
  sandboxSecret: string | null
  sandboxWebhookId: string | null
  liveClientId: string | null
  liveSecret: string | null
  liveWebhookId: string | null
  externalPageEnabled: boolean
}

export interface UpsertModeCreds {
  clientId: string | null
  secret: string | null | undefined
  webhookId: string | null | undefined
}

export interface UpsertPaymentSettingsData {
  enabled: boolean
  mode: PaymentMode
  sandbox: UpsertModeCreds
  live: UpsertModeCreds
  externalPageEnabled: boolean
}

export interface WooLineItem {
  name: string
  quantity: number
  subtotalUsd: number
}

export interface WooCreateOrderInput {
  orderNumber: number
  lineItems: WooLineItem[]
  shippingUsd: number
  customerName: string
  customerEmail: string
  returnUrl: string
}

export interface WooCreatedOrder {
  wooOrderId: number
  wooOrderKey: string
}

export interface WooClient {
  createOrder(input: WooCreateOrderInput): Promise<WooCreatedOrder>
  payUrl(wooOrderId: number, wooOrderKey: string): string
}

export interface OrderForWooPayment {
  id: string
  userId: string
  orderNumber: number
  status: string
  totalAmount: number
  shippingCost: number
  wooOrderId: number | null
  wooOrderKey: string | null
  customerName: string
  customerEmail: string
  items: WooLineItem[]
}

export interface PaymentRepository {
  getSettings(): Promise<{ enabled: boolean; mode: PaymentMode; clientId: string | null; secret: string | null; webhookId: string | null; externalPageEnabled: boolean } | null>
  getAdminSettings(): Promise<AdminPaymentSettings | null>
  upsertSettings(data: UpsertPaymentSettingsData): Promise<void>
  getOrderForPayment(orderId: string): Promise<OrderForPayment | null>
  getOrderForPaymentByNumber(orderNumber: number): Promise<OrderForPayment | null>
  setPaypalOrderId(orderId: string, paypalOrderId: string): Promise<void>
  claimPaypalOrder(orderId: string, paypalOrderId: string): Promise<void>
  markOrderPaid(orderId: string, captureId: string | null): Promise<boolean>
  getOrderForWooPayment(orderId: string): Promise<OrderForWooPayment | null>
  setWooOrder(orderId: string, wooOrderId: number, wooOrderKey: string): Promise<boolean>
  getOrderByWooOrderId(wooOrderId: number): Promise<OrderForPayment | null>
}
