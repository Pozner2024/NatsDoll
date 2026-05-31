export type AddressData = {
  fullName: string
  line1: string
  line2?: string
  city: string
  country: string
  postalCode: string
}

export type AddressView = {
  id: string
  fullName: string
  line1: string
  line2?: string
  city: string
  country: string
  postalCode: string
  isDefault: boolean
  createdAt: string
}

export interface AddressRepository {
  findByUser(userId: string): Promise<AddressView[]>
  create(userId: string, data: AddressData): Promise<AddressView>
  update(id: string, userId: string, data: Partial<AddressData>): Promise<AddressView>
  delete(id: string, userId: string): Promise<void>
  setDefault(id: string, userId: string): Promise<void>
  countByUser(userId: string): Promise<number>
}

export type GetAddresses = (userId: string) => Promise<AddressView[]>
export type CreateAddress = (userId: string, data: AddressData) => Promise<AddressView>
export type UpdateAddress = (userId: string, addressId: string, data: Partial<AddressData>) => Promise<AddressView>
export type DeleteAddress = (userId: string, addressId: string) => Promise<void>
export type SetDefaultAddress = (userId: string, addressId: string) => Promise<void>
