import type { RouterConfig } from '@nuxt/schema'
import type { RouteLocationNormalized } from 'vue-router'

export default <RouterConfig>{
  scrollBehavior(to: RouteLocationNormalized, _from: RouteLocationNormalized, savedPosition: { left: number, top: number } | null) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  },
}
