import { computed } from 'vue'
import { useAsyncData } from '@/shared'
import { fetchHomeGallery, type HomeGallery } from './galleryApi'

const EMPTY_GALLERY: HomeGallery = { preview: [], pool: [] }

export function useGalleryGrid() {
  const { data, isLoading, hasError } = useAsyncData<HomeGallery>(fetchHomeGallery, EMPTY_GALLERY)
  const preview = computed(() => data.value.preview)
  const pool = computed(() => data.value.pool)
  return { preview, pool, isLoading, hasError }
}
