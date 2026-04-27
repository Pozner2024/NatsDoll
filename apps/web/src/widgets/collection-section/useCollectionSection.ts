import { useAsyncData } from '@/shared'
import { fetchCollections, type Collection } from './collectionsApi'

export function useCollectionSection() {
  const { data, isLoading, hasError } = useAsyncData<Collection[]>(fetchCollections, [])
  return { collections: data, isLoading, hasError }
}
