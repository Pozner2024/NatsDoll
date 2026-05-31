export type MessageView = {
  id: string
  text: string
  orderId: string | null
  orderNumber: number | null
  createdAt: string
}

export type SendMessageData = {
  text: string
  orderId?: string
}
