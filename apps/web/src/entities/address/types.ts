export type AddressData = {
  fullName: string
  line1: string
  line2?: string
  city: string
  country: string
  postalCode: string
}

export type Address = AddressData & {
  id: string
  isDefault: boolean
  createdAt: string
}
