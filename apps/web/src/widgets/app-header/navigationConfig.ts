export interface NavItem {
  label: string
  to: string
}

export const homeItem: NavItem = { label: 'Home', to: '/' }

export const navItems: NavItem[] = [
  { label: 'The gallery', to: '/gallery' },
]

export const staticShopItems: NavItem[] = [
  { label: 'All', to: '/shop' },
  { label: 'On sale', to: '/shop/on-sale' },
]
