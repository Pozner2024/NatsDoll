import { computed } from 'vue'
import { useAsyncData } from 'nuxt/app'
import { fetchHomeGallery, type HomeGallery } from './galleryApi'

const EMPTY_GALLERY: HomeGallery = { preview: [], pool: [] }

export function useGalleryGrid() {
  const { data, status } = useAsyncData<HomeGallery>(
    'home-gallery',
    () => fetchHomeGallery(),
    { default: () => EMPTY_GALLERY },
  )
  const preview = computed(() => data.value.preview)
  const pool = computed(() => data.value.pool)
  const isLoading = computed(() => status.value === 'pending')
  const hasError = computed(() => status.value === 'error')
  return { preview, pool, isLoading, hasError }
}
