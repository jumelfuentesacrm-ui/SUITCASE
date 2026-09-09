// Multi-service, multi-specialist scheduling engine.
//
// A booking can contain several services, each performed by a possibly
// different specialist, back-to-back (service N+1 starts the instant
// service N ends for whichever specialist does it). This module answers:
// "given these services and a preferred start time, who can do each one,
// and does the whole thing actually fit today?"
//
// Pure functions only — no Supabase calls, no React. Callers fetch the
// specialists / specialist_services / existing bookings once and pass them
// in, so this module is trivially testable and reusable from both the
// public Booking flow and the admin panel.

import { SERVICE_CATEGORIES } from "@/components/site/data";

export type SpecialistLite = { id: string; full_name: string };
export type SpecialistServiceLite = { specialist_id: string; service_name: string; duration_minutes: number };
export type BusyRange = { start: number; end: number };

export type ServiceAssignment = {
  serviceName: string;
  specialistId: string;
  specialistName: string;
  start: number; // minutes since midnight
  duration: number;
};

export type SchedulePlan = {
  order: string[]; // the service name order that worked
  assignments: ServiceAssignment[];
};

export function slotToMins(slot: string): number {
  const [rawTime, ampm] = slot.split(" ");
  let [h, m] = rawTime.split(":").map(Number);
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return h * 60 + m;
}

export function minsToSlot(mins: number): string {
  const h24 = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const ampm = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function staticDuration(serviceName: string): number {
  for (const cat of SERVICE_CATEGORIES) {
    const svc = cat.services.find((s) => s.name === serviceName);
    if (svc) {
      const h = svc.duration.match(/(\d+)\s*h/);
      const m = svc.duration.match(/(\d+)\s*min/);
      const mins = (h ? parseInt(h[1]) * 60 : 0) + (m ? parseInt(m[1]) : 0);
      return mins || 60;
    }
  }
  return 60;
}

/**
 * How long a specific specialist takes for a service. Always reads the
 * live specialist_services list passed in — if she updates her estimated
 * time, the very next availability calculation picks it up automatically.
 */
export function getDuration(specialistId: string, serviceName: string, specialistServices: SpecialistServiceLite[]): number {
  const row = specialistServices.find((s) => s.specialist_id === specialistId && s.service_name === serviceName);
  return row ? row.duration_minutes : staticDuration(serviceName);
}

/** Does this specialist offer this service at all (any approved row for it)? */
export function offersService(specialistId: string, serviceName: string, specialistServices: SpecialistServiceLite[]): boolean {
  return specialistServices.some((s) => s.specialist_id === specialistId && s.service_name === serviceName);
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

function isFree(specialistId: string, start: number, end: number, busyBySpecialist: Map<string, BusyRange[]>): boolean {
  const ranges = busyBySpecialist.get(specialistId);
  if (!ranges) return true;
  return !ranges.some((r) => overlaps(start, end, r.start, r.end));
}

/** Specialists who offer this service and are free for its full duration starting at `start`. */
export function findFreeSpecialists(
  serviceName: string,
  start: number,
  specialists: SpecialistLite[],
  specialistServices: SpecialistServiceLite[],
  busyBySpecialist: Map<string, BusyRange[]>
): { specialist: SpecialistLite; duration: number }[] {
  const out: { specialist: SpecialistLite; duration: number }[] = [];
  for (const sp of specialists) {
    if (!offersService(sp.id, serviceName, specialistServices)) continue;
    const duration = getDuration(sp.id, serviceName, specialistServices);
    if (isFree(sp.id, start, start + duration, busyBySpecialist)) out.push({ specialist: sp, duration });
  }
  return out;
}

/**
 * Greedy feasibility check for one specific service order: at each step,
 * auto-pick the first free specialist (deterministic — used only to test
 * "does some assignment exist", not as the final real assignment, since the
 * real flow lets the client choose when more than one is free).
 */
function tryOrderGreedy(
  order: string[],
  start: number,
  specialists: SpecialistLite[],
  specialistServices: SpecialistServiceLite[],
  busyBySpecialist: Map<string, BusyRange[]>
): SchedulePlan | null {
  const assignments: ServiceAssignment[] = [];
  const reserved = new Map<string, BusyRange[]>();
  for (const [id, ranges] of busyBySpecialist) reserved.set(id, [...ranges]);

  let cursor = start;
  for (const serviceName of order) {
    const free = findFreeSpecialists(serviceName, cursor, specialists, specialistServices, reserved);
    if (free.length === 0) return null;
    const pick = free[0];
    assignments.push({ serviceName, specialistId: pick.specialist.id, specialistName: pick.specialist.full_name, start: cursor, duration: pick.duration });
    const existing = reserved.get(pick.specialist.id) ?? [];
    reserved.set(pick.specialist.id, [...existing, { start: cursor, end: cursor + pick.duration }]);
    cursor += pick.duration;
  }
  return { order, assignments };
}

function permutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const p of permutations(rest)) out.push([arr[i], ...p]);
  }
  return out;
}

/**
 * Tries the client's chosen order first. If it doesn't fit consecutively,
 * tries every other order of the same services — same idea as "switch the
 * order so they all fit" from the spec. Returns the first order that works.
 */
export function findWorkingOrder(
  serviceNames: string[],
  start: number,
  specialists: SpecialistLite[],
  specialistServices: SpecialistServiceLite[],
  busyBySpecialist: Map<string, BusyRange[]>
): SchedulePlan | null {
  const direct = tryOrderGreedy(serviceNames, start, specialists, specialistServices, busyBySpecialist);
  if (direct) return direct;
  if (serviceNames.length > 4) return null; // cap permutation search (4! = 24, 5! = 120 — keep it cheap)
  for (const order of permutations(serviceNames)) {
    if (order.join("|") === serviceNames.join("|")) continue; // already tried
    const plan = tryOrderGreedy(order, start, specialists, specialistServices, busyBySpecialist);
    if (plan) return plan;
  }
  return null;
}

/**
 * Nothing fits at the preferred time in any order. Scan forward in 10-minute
 * steps up to `maxWindowMins` (default 2h per spec) looking for the first
 * start where everything fits. Returns null if nothing turns up in the window
 * — per spec, that means don't offer anything at all.
 */
export function suggestNextSlot(
  serviceNames: string[],
  preferredStart: number,
  specialists: SpecialistLite[],
  specialistServices: SpecialistServiceLite[],
  busyBySpecialist: Map<string, BusyRange[]>,
  maxWindowMins = 120,
  stepMins = 10
): SchedulePlan | null {
  for (let delta = stepMins; delta <= maxWindowMins; delta += stepMins) {
    const candidate = preferredStart + delta;
    const plan = findWorkingOrder(serviceNames, candidate, specialists, specialistServices, busyBySpecialist);
    if (plan) return plan;
  }
  return null;
}

export type StepResolution =
  | { type: "auto"; specialist: SpecialistLite; duration: number }
  | { type: "choice"; options: { specialist: SpecialistLite; duration: number }[] }
  | { type: "blocked" };

/**
 * Resolve ONE service at a given cursor time: zero free specialists →
 * blocked (caller should try reordering / suggest an alternate time), one
 * free → auto-assign silently, more than one → the client must be asked
 * "¿con quién deseas este servicio?".
 */
export function resolveStep(
  serviceName: string,
  start: number,
  specialists: SpecialistLite[],
  specialistServices: SpecialistServiceLite[],
  busyBySpecialist: Map<string, BusyRange[]>
): StepResolution {
  const free = findFreeSpecialists(serviceName, start, specialists, specialistServices, busyBySpecialist);
  if (free.length === 0) return { type: "blocked" };
  if (free.length === 1) return { type: "auto", specialist: free[0].specialist, duration: free[0].duration };
  return { type: "choice", options: free };
}

/**
 * When even reordering can't fit every service at the preferred time, find
 * the largest subset that DOES fit consecutively right now, plus a
 * suggested alternate time (within the window) for whatever's left over —
 * matches: "solo podremos atender 2 de tus 3 servicios... el único espacio
 * disponible para el otro es a las X, ¿deseas reservarlo?"
 */
export function findPartialFit(
  serviceNames: string[],
  preferredStart: number,
  specialists: SpecialistLite[],
  specialistServices: SpecialistServiceLite[],
  busyBySpecialist: Map<string, BusyRange[]>,
  maxWindowMins = 120
): { fitted: SchedulePlan; leftover: string; leftoverSuggestion: SchedulePlan | null } | null {
  // Try dropping exactly one service at a time (drop the one that unblocks the rest).
  for (let i = 0; i < serviceNames.length; i++) {
    const subset = [...serviceNames.slice(0, i), ...serviceNames.slice(i + 1)];
    const plan = findWorkingOrder(subset, preferredStart, specialists, specialistServices, busyBySpecialist);
    if (!plan) continue;
    const leftover = serviceNames[i];
    // Reserve the fitted plan's assignments before searching for the leftover's slot.
    const reserved = new Map<string, BusyRange[]>();
    for (const [id, ranges] of busyBySpecialist) reserved.set(id, [...ranges]);
    for (const a of plan.assignments) {
      const existing = reserved.get(a.specialistId) ?? [];
      reserved.set(a.specialistId, [...existing, { start: a.start, end: a.start + a.duration }]);
    }
    const leftoverSuggestion = suggestNextSlot([leftover], preferredStart, specialists, specialistServices, reserved, maxWindowMins);
    return { fitted: plan, leftover, leftoverSuggestion };
  }
  return null;
}
