export type MessageView = {
  id: string
  text: string
  orderId: string | null
  orderNumber: number | null
  createdAt: string
  fromAdmin: boolean
}

export type SendMessageData = {
  text: string
  orderId?: string
}
