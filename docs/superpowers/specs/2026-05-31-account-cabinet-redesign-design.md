# Account Cabinet Redesign — Design Spec

**Date:** 2026-05-31  
**Status:** Approved

---

## Overview

Redesign the user account cabinet (`/account`) to match the admin panel visual style: dark sidebar, topbar with page title, consistent nav item styling. Mobile layout remains unchanged.

---

## Design

### Desktop (tablet+)

Matches the admin panel layout:

- **Sidebar** (240px, fixed) — dark `#2c1810` background
  - NatsDoll brand logo (Corinthia font) + "My Account" label
  - User avatar (initials circle with gradient) + name + email
  - Navigation links with active state (accent left border `#8b5e52`, highlighted background)
  - Nav icons: same 17px SVG stroke style as admin sidebar
- **Topbar** (56px) — white background, border-bottom, page title + optional subtitle
- **Content area** — `var(--color-bg)` background, padding 28px 32px

### Mobile (below tablet breakpoint)

**Unchanged** from current implementation:
- 3-column icon grid navigation
- User avatar + name/email above nav
- No topbar (content flows directly)

---

## Navigation Items

| Label | Route | Icon |
|---|---|---|
| Profile | `/account/profile` | Person circle |
| Purchases | `/account/purchases` | Shopping bag |
| Favorites | `/account/favorites` | Heart |
| Addresses | `/account/addresses` | Map pin / location |
| Reviews | `/account/reviews` | Star |
| Messages | `/account/messages` | Chat bubble |

---

## Architecture

`AccountPage.vue` (the widget) is refactored in-place — same file, same FSD location. No new files needed for the layout itself. The existing icon components (`IconProfile.vue`, etc.) are reused unchanged.

**Changes:**
- `AccountPage.vue` — new layout structure + full SCSS rewrite (desktop sidebar matches admin style, mobile stays as-is)

No other files change.

---

## What Stays the Same

- All 6 section components (`AccountProfile.vue`, `AccountPurchases.vue`, etc.) — untouched
- Router — untouched
- Icon components — untouched
- Mobile layout — untouched
- All functionality — untouched

---

## CSS Notes

- Dark sidebar uses same color tokens as admin panel: `#2c1810` bg, `rgb(253 246 239 / 0.55)` inactive links, `var(--color-accent)` active border
- Topbar uses `var(--color-white)` background, `var(--color-border)` border-bottom
- Breakpoints via `@include tablet { ... }` from `@/assets/styles/breakpoints.module`
- No `cursor: pointer` (globally reset)
- Transparent colors: `rgb(r g b / alpha)` syntax only
