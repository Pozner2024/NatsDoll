export type MessageView = {
  id: string
  text: string
  orderId: string | null
  orderNumber: number | null
  fromAdmin: boolean
  createdAt: string
}

export type CreateMessageData = {
  text: string
  orderId?: string
}

export type CreateMessageResult = {
  message: MessageView
  userName: string
  userEmail: string
}

export interface MessageRepository {
  findByUser(userId: string): Promise<MessageView[]>
  create(userId: string, data: CreateMessageData): Promise<CreateMessageResult>
}

export type GetMyMessages = (userId: string) => Promise<MessageView[]>
export type CreateMessage = (userId: string, data: CreateMessageData) => Promise<void>
