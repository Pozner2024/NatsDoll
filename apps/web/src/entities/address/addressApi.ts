import { z } from 'zod'
import { authFetch, apiErrorMessage } from '@/shared'
import type { Address, AddressData } from './types'

const addressSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  line1: z.string(),
  line2: z.string().optional(),
  city: z.string(),
  country: z.string(),
  postalCode: z.string(),
  isDefault: z.boolean(),
  createdAt: z.string(),
})

export async function fetchAddresses(): Promise<Address[]> {
  const res = await authFetch('/me/addresses')
  if (!res.ok) throw new Error(await apiErrorMessage(res, 'Failed to load addresses'))
  return z.array(addressSchema).parse(await res.json())
}

export async function createAddress(data: AddressData): Promise<Address> {
  const res = await authFetch('/me/addresses', { method: 'POST', json: data })
  if (!res.ok) throw new Error(await apiErrorMessage(res, 'Failed to create address'))
  return addressSchema.parse(await res.json())
}

export async function updateAddress(id: string, data: Partial<AddressData>): Promise<Address> {
  const res = await authFetch(`/me/addresses/${id}`, { method: 'PATCH', json: data })
  if (!res.ok) throw new Error(await apiErrorMessage(res, 'Failed to update address'))
  return addressSchema.parse(await res.json())
}

export async function deleteAddress(id: string): Promise<void> {
  const res = await authFetch(`/me/addresses/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(await apiErrorMessage(res, 'Failed to delete address'))
}

export async function setDefaultAddress(id: string): Promise<void> {
  const res = await authFetch(`/me/addresses/${id}/default`, { method: 'POST' })
  if (!res.ok) throw new Error(await apiErrorMessage(res, 'Failed to update default address'))
}
