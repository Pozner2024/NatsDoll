import bp from '@/assets/styles/breakpoints.module.scss'

export const MEDIA = {
  tablet: `(min-width: ${bp.tablet}px)`,
  desktop: `(min-width: ${bp.desktop}px)`,
} as const
