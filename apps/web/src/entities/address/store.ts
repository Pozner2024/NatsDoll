import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import type { Address, AddressData } from './types'
import { fetchAddresses, createAddress, updateAddress, deleteAddress, setDefaultAddress } from './addressApi'

export const useAddressStore = defineStore('address', () => {
  const addresses = ref<Address[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const defaultAddress = computed(() => addresses.value.find(a => a.isDefault) ?? null)

  async function load(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      addresses.value = await fetchAddresses()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load addresses'
    } finally {
      loading.value = false
    }
  }

  async function add(data: AddressData): Promise<void> {
    await createAddress(data)
    await load()
  }

  async function update(id: string, data: Partial<AddressData>): Promise<void> {
    await updateAddress(id, data)
    await load()
  }

  async function remove(id: string): Promise<void> {
    await deleteAddress(id)
    await load()
  }

  async function setDefault(id: string): Promise<void> {
    await setDefaultAddress(id)
    await load()
  }

  return {
    addresses: readonly(addresses),
    loading: readonly(loading),
    error: readonly(error),
    defaultAddress,
    load,
    add,
    update,
    remove,
    setDefault,
  }
})
