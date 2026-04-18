import { watch, onUnmounted } from 'vue'
import type { Ref } from 'vue'

export function useClickOutside(target: Ref<HTMLElement | null>, isActive: Ref<boolean>, handler: () => void) {
  function onClick(e: MouseEvent) {
    if (target.value && !target.value.contains(e.target as Node)) {
      handler()
    }
  }

  watch(isActive, (active) => {
    if (active) document.addEventListener('click', onClick)
    else document.removeEventListener('click', onClick)
  })

  onUnmounted(() => document.removeEventListener('click', onClick))
}
