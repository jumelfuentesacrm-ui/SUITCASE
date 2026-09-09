import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { SERVICE_CATEGORIES } from '@/components/site/data'

export type DbService = {
  id: string
  category_id: string
  category_title: string
  name: string
  description?: string
  duration: string
  price: string
  photo_url?: string
  display_order: number
  active: boolean
  subgroup?: string | null
}

export type ServiceGroup = {
  id: string
  icon: string
  title: string
  services: DbService[]
}

const ICON_MAP: Record<string, string> = Object.fromEntries(
  SERVICE_CATEGORIES.map(c => [c.id, c.icon])
)

function staticFallback(): ServiceGroup[] {
  return SERVICE_CATEGORIES.map(c => ({
    id: c.id,
    icon: c.icon,
    title: c.title,
    services: c.services.map((s, i) => ({
      id: `${c.id}-${i}`,
      category_id: c.id,
      category_title: c.title,
      name: s.name,
      description: s.description,
      duration: s.duration,
      price: s.price,
      display_order: i,
      active: true,
    })),
  }))
}

export function useServices() {
  const [groups, setGroups] = useState<ServiceGroup[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('services')
      .select('*')
      .eq('active', true)
      .order('display_order', { ascending: true })
      .then(({ data, error }) => {
        if (error || !data || data.length === 0) {
          setGroups(staticFallback())
        } else {
          const map: Record<string, ServiceGroup> = {}
          for (const svc of data as DbService[]) {
            if (!map[svc.category_id]) {
              map[svc.category_id] = {
                id: svc.category_id,
                icon: ICON_MAP[svc.category_id] ?? '✨',
                title: svc.category_title,
                services: [],
              }
            }
            map[svc.category_id].services.push(svc)
          }
          setGroups(Object.values(map))
        }
        setLoading(false)
      })
  }, [])

  return { groups, loading }
}
