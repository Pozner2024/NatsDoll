export interface NavItem {
  label: string
  to: string
}

export const navItems: NavItem[] = [
  { label: 'The gallery', to: '/gallery' },
  { label: 'Contact',     to: '/contact' },
  { label: 'Login',       to: '/login' },
]

export const shopCategories: NavItem[] = [
  { label: 'All', to: '/shop' },
  { label: 'On sale', to: '/shop/on-sale' },
  { label: 'Art Dolls', to: '/shop/art-dolls' },
  { label: 'Birthday Gifts', to: '/shop/birthday-gifts' },
  { label: 'Christmas Gifts', to: '/shop/christmas-gifts' },
  { label: 'Valentines Day Gifts', to: '/shop/valentines-day-gifts' },
  { label: 'Halloween Gifts', to: '/shop/halloween-gifts' },
  { label: 'Graduation Gifts', to: '/shop/graduation-gifts' },
  { label: 'Cake Toppers', to: '/shop/cake-toppers' },
  { label: 'Dollhouse Miniature', to: '/shop/dollhouse-miniature' },
  { label: 'Party favors BULK', to: '/shop/party-favors-bulk' },
]
