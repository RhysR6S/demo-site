// Path: src/types/navigation.ts
export interface NavigationItem {
  id: string
  label: string
  href: string
  icon: React.ReactNode
  children?: NavigationItem[]
  requiresAuth?: boolean
  requiresCreator?: boolean
}
