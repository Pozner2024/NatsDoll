import bp from '@/assets/styles/breakpoints.module.scss'

export const MEDIA = {
  tablet: `(width >= ${bp.tablet}px)`,
  desktop: `(width >= ${bp.desktop}px)`,
} as const
