import { ref, onMounted } from 'vue'
import { fetchHomeGallery, type GalleryItem } from './galleryApi'

export function useGalleryGrid() {
  const preview = ref<GalleryItem[]>([])
  const pool = ref<GalleryItem[]>([])
  const isLoading = ref(false)
  const hasError = ref(false)

  onMounted(async () => {
    isLoading.value = true
    try {
      const data = await fetchHomeGallery()
      preview.value = data.preview
      pool.value = data.pool
    } catch (err) {
      console.error('Failed to load gallery', err)
      hasError.value = true
    } finally {
      isLoading.value = false
    }
  })

  return { preview, pool, isLoading, hasError }
}
