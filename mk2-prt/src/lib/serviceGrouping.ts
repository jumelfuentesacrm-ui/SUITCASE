import type { DbService } from "@/hooks/useServices";

export type ServiceSection = { label: string; services: DbService[] };

// Groups services by their admin-assigned `subgroup` (a free-text field set
// in the admin Servicios form — new section names just work, no predefined
// list required). Services without a subgroup fall into "Otros".
// `knownOrder` lets a page pin certain section names to a fixed order
// (e.g. cabello.tsx's "Cortes" before "Color & Mechas"); anything else
// (including brand-new sections an admin just typed in) appears after the
// known ones, before "Otros".
export function groupBySubgroup(services: DbService[], knownOrder: string[] = []): ServiceSection[] | null {
  const hasAny = services.some(s => s.subgroup && s.subgroup.trim());
  if (!hasAny) return null;
  const byLabel: Record<string, DbService[]> = {};
  for (const s of services) {
    const label = (s.subgroup && s.subgroup.trim()) || "Otros";
    (byLabel[label] ??= []).push(s);
  }
  const known = knownOrder.filter(l => l !== "Otros");
  const extra = Object.keys(byLabel).filter(l => !known.includes(l) && l !== "Otros");
  const order = [...known, ...extra, "Otros"];
  return order.filter(l => byLabel[l]?.length).map(label => ({ label, services: byLabel[label] }));
}
