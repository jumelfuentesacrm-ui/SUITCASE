import { useEffect, useMemo, useRef, useState } from "react";
import { useServices } from "@/hooks/useServices";
import { useSpecialists } from "@/hooks/useSpecialists";
import { supabase } from "@/lib/supabase";
import { SERVICE_CATEGORIES } from "./data";
import { resolveStep, findWorkingOrder, findPartialFit, type BusyRange, type SpecialistLite, type SpecialistServiceLite, type ServiceAssignment } from "@/lib/scheduling";
import { business } from "@/config/business.config";

const TIME_SLOTS = [
  "8:00 AM","8:30 AM","9:00 AM","9:30 AM","10:00 AM","10:30 AM",
  "11:00 AM","11:30 AM","12:00 PM","12:30 PM","1:00 PM","1:30 PM",
  "2:00 PM","2:30 PM","3:00 PM","3:30 PM","4:00 PM","4:30 PM",
  "5:00 PM","5:30 PM",
];
// Saturday last slot is 4:00 PM; Mon-Fri last slot is 5:30 PM
function getSlotsForDate(d: Date | null): string[] {
  if (!d) return TIME_SLOTS;
  if (d.getDay() === 6) return TIME_SLOTS.filter(s => slotToMins(s) <= 16 * 60);
  return TIME_SLOTS;
}
const DAYS   = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const DESIGN_ADDONS = [
  { id: "none",     label: "Sin diseño",       price: 0,  minutes: 0  },
  { id: "sencillo", label: "Diseño sencillo",  price: 5,  minutes: 10 },
  { id: "elaborado",label: "Diseño elaborado", price: 10, minutes: 20 },
  { id: "extenso",  label: "Diseño extenso",   price: 15, minutes: 30 },
];

const PINK  = "#e87fac";
const DPINK = "#c4527e";
const GOLD  = "#c9a96e";
const INK   = "#2a1a20";
const TAUPE = "#9a7080";
const ff    = "'Montserrat', sans-serif";
const ffS   = "'Cormorant Garamond', serif";

function isClosed(d: Date) { return d.getDay() === 0; } // closed Sundays only
function todayMidnight() { const d = new Date(); d.setHours(0,0,0,0); return d; }

function slotToMins(slot: string): number {
  const [rawTime, ampm] = slot.split(" ");
  let [h, m] = rawTime.split(":").map(Number);
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return h * 60 + m;
}

function minsToSlot(mins: number): string {
  const h24 = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const ampm = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function parseDuration(dur: string | number): number {
  if (typeof dur === "number") return dur;
  if (!dur) return 60;
  const h = String(dur).match(/(\d+)\s*h/);
  const m = String(dur).match(/(\d+)\s*min/);
  return (h ? parseInt(h[1]) * 60 : 0) + (m ? parseInt(m[1]) : 0) || 60;
}

function parsePriceNum(s: string | undefined): number {
  if (!s) return 0;
  const match = String(s).replace(/,/g, ".").match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

const inp: React.CSSProperties = {
  width: "100%", padding: "12px 16px", border: "1px solid #f0d8e4",
  background: "#fff", fontFamily: ff, fontSize: 13, color: INK,
  outline: "none", transition: "border-color .2s", boxSizing: "border-box",
};

export function Booking({ preselected, onConsumePreselected }: {
  preselected: { categoryId: string; serviceName: string } | null;
  onConsumePreselected: () => void;
}) {
  const { groups } = useServices();
  const { specialists, specialistServices, loading: specsLoading } = useSpecialists();

  // Step 1 — personal info
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "" });
  const fullName = `${form.firstName} ${form.lastName}`.trim();

  // Step 2 — services (multi-select)
  const [catId, setCatId] = useState("");
  const [expandedSvc, setExpandedSvc] = useState<string | null>(null);
  const [selectedServices, setSelectedServices] = useState<{catId: string; svcName: string}[]>([]);
  const [isDiabetico, setIsDiabetico] = useState<"yes"|"no"|"">("");

  // Step 3 — add-on + ref image (manicure only)
  const [addon, setAddon]     = useState("none");
  const [refImage, setRefImage] = useState<{ file: File; preview: string } | null>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);

  // Step 4 — technique preference
  const [techMode, setTechMode] = useState<"any" | "specific" | "">("");
  const [techId, setTechId]     = useState("");

  // Step 5 — date/time
  const [date, setDate]         = useState<Date | null>(null);
  const [time, setTime]         = useState("");
  const [takenSlots, setTakenSlots] = useState<Set<string>>(new Set());
  const [extraSlots, setExtraSlots] = useState<string[]>([]);
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  // Promo days
  const [promoDays, setPromoDays] = useState<Array<{date:string;discount_type:string;discount_value:number;specialist_name:string;service_name?:string;note?:string}>>([]);
  const [activeDayPromo, setActiveDayPromo] = useState<{date:string;discount_type:'percent'|'fixed';discount_value:number;specialist_name:string;service_name?:string;note?:string}|null>(null);

  // Draft booking ID (saved when date+time are selected)
  const [draftId, setDraftId] = useState<string|null>(null);

  // Multi-service specialist assignment — resolved sequentially once date+time
  // are chosen: auto-assigned when only one specialist is free for a given
  // service at that point in the sequence, or offered as a choice when more
  // than one is free. See src/lib/scheduling.ts.
  const [planChoices, setPlanChoices] = useState<Record<string, string>>({}); // serviceName -> chosen specialist id
  type PlanState =
    | { kind: "empty" }
    | { kind: "loading" }
    | { kind: "awaiting"; assignments: ServiceAssignment[]; pendingService: string; options: { specialist: SpecialistLite; duration: number }[] }
    | { kind: "done"; assignments: ServiceAssignment[]; note?: string }
    | { kind: "partial"; fitted: ServiceAssignment[]; leftover: string; suggestionTime: number | null; leftoverAssignment: ServiceAssignment | null }
    | { kind: "none" };
  const [planState, setPlanState] = useState<PlanState>({ kind: "empty" });
  // When not everything fits consecutively, the client can accept the leftover
  // service at the next available slot — it becomes its own separate booking
  // so specialists see two normal appointments, not one confusing combined one.
  const [partialAccept, setPartialAccept] = useState<"yes" | "no" | null>(null);

  // Active promo (from service-based promotions table)
  const [activePromo, setActivePromo] = useState<{title:string;discount_type:'percent'|'fixed';discount_value:number}|null>(null);
  const svcNames = selectedServices.map(s => s.svcName);
  useEffect(()=>{
    if(!svcNames.length){setActivePromo(null);return}
    const today=new Date().toISOString().slice(0,10)
    supabase.from('promotions').select('*').eq('active',true).then(({data})=>{
      const promos=(data??[]) as Array<{title:string;discount_type:'percent'|'fixed';discount_value:number;service_name?:string;starts_at?:string;ends_at?:string}>
      const match=promos.find(p=>{
        if(p.service_name&&!svcNames.includes(p.service_name))return false
        if(p.starts_at&&p.starts_at>today)return false
        if(p.ends_at&&p.ends_at<today)return false
        return true
      })
      setActivePromo(match??null)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[svcNames.join(",")])

  // Fetch promo days for the visible calendar month
  useEffect(() => {
    const y = monthCursor.getFullYear();
    const m = monthCursor.getMonth();
    const start = `${y}-${String(m+1).padStart(2,"0")}-01`;
    const end   = `${y}-${String(m+1).padStart(2,"0")}-${new Date(y,m+1,0).getDate()}`;
    supabase.from("promo_days").select("date,discount_type,discount_value,specialist_name,service_name,note").eq("active",true).gte("date",start).lte("date",end)
      .then(({data}) => setPromoDays((data ?? []) as typeof promoDays));
  }, [monthCursor]);

  // Meta
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [loading, setLoading]       = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Horario VIP — a request for a time outside regular hours. Never reserves
  // a slot automatically: it lands as a pending review for the salon, who
  // approves/proposes-another-time/rejects from admin before any deposit.
  const [showVipModal, setShowVipModal] = useState(false);
  const [vipSubmitted, setVipSubmitted] = useState(false);
  const [vipForm, setVipForm] = useState({ specialistId: "", date: "", time: "", note: "" });
  const [vipSaving, setVipSaving] = useState(false);
  async function submitVipRequest(e: React.FormEvent) {
    e.preventDefault();
    setVipSaving(true);
    const specName = vipForm.specialistId ? specialists.find(s => s.id === vipForm.specialistId)?.full_name ?? null : null;
    await supabase.from("bookings").insert([{
      name: fullName, phone: form.phone, business: fullName,
      service: svcNames.length ? svcNames.join(" + ") : "Por definir",
      specialist: specName,
      date: vipForm.date, time: vipForm.time || "Por definir",
      notes: vipForm.note || null,
      status: "vip_pending", is_vip: true, archived: false,
    }]);
    setVipSaving(false);
    setShowVipModal(false);
    setVipSubmitted(true);
  }

  const panel2Ref = useRef<HTMLDivElement>(null);
  const panel3Ref = useRef<HTMLDivElement>(null);
  const panel4Ref = useRef<HTMLDivElement>(null);
  const panel5Ref = useRef<HTMLDivElement>(null);
  const panel6Ref = useRef<HTMLDivElement>(null);

  // Save draft when date + time are both selected
  const step5Done_local = !!date && !!time && !!fullName && !!form.phone.trim();
  useEffect(() => {
    if (!step5Done_local || !date || !time) return;
    const dateStr = date.getFullYear() + "-" + String(date.getMonth()+1).padStart(2,"0") + "-" + String(date.getDate()).padStart(2,"0");
    const row = {
      name: fullName, phone: form.phone,
      service: selectedServices.map(s=>s.svcName).join(" + ") || null,
      specialist: techMode === "specific" ? (specialists.find(s=>s.id===techId)?.full_name ?? null) : null,
      date: dateStr, time, status: "draft", archived: false,
      notes: "Borrador — dejó en: selección de fecha y hora",
    };
    if (draftId) {
      supabase.from("bookings").update(row).eq("id", draftId);
    } else {
      supabase.from("bookings").insert([row]).select("id").single().then(({data}) => {
        if (data) setDraftId((data as {id:string}).id);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date?.toISOString(), time]);

  // URL params
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const tech = p.get("tech");
    const cat  = p.get("cat");
    const svc  = p.get("svc");
    if (tech) { setTechId(tech); setTechMode("specific"); }
    if (cat)  setCatId(cat);
    if (svc && cat)  setSelectedServices([{catId: cat, svcName: svc}]);
    if (tech || cat || svc) window.history.replaceState({}, "", "/#agendar");
  }, []);

  useEffect(() => {
    if (preselected) {
      setCatId(preselected.categoryId);
      setSelectedServices([{catId: preselected.categoryId, svcName: preselected.serviceName}]);
      onConsumePreselected();
    }
  }, [preselected, onConsumePreselected]);

  // Derived
  const chosenSpec  = specialists.find(s => s.id === techId);
  const category    = groups.find(g => g.id === catId);
  const isManicure  = selectedServices.some(s => s.catId === "manicure");
  const isPedicure  = selectedServices.some(s => s.catId === "pedicure");
  const needsDiabeticoQ = isManicure || isPedicure;
  const selectedAddon = DESIGN_ADDONS.find(a => a.id === addon) ?? DESIGN_ADDONS[0];

  // Prices across all selected services
  const basePrice = selectedServices.reduce((sum, ss) => {
    const cat = groups.find(g => g.id === ss.catId);
    const svc = cat?.services.find(s => s.name === ss.svcName);
    return sum + parsePriceNum(svc?.price);
  }, 0);
  const totalPrice  = basePrice + selectedAddon.price;
  // Day promo takes precedence over service promo
  const effectivePromo = activeDayPromo ?? activePromo;
  const discountAmt = effectivePromo
    ? (effectivePromo.discount_type==='percent' ? Math.round(totalPrice*effectivePromo.discount_value/100) : effectivePromo.discount_value)
    : 0;
  const finalPrice  = Math.max(0, totalPrice - discountAmt);
  const priceDisplay = totalPrice > 0 ? ("$" + finalPrice.toFixed(0)) : (selectedServices.length ? "—" : "—");

  // Specialists that offer ALL chosen services
  const eligibleSpecs = useMemo(() => {
    if (!svcNames.length) return specialists;
    // Per-service: set of specialist IDs configured for that service
    const specIdSets = svcNames.map(name =>
      new Set(specialistServices.filter(ss => ss.service_name === name).map(ss => ss.specialist_id))
    );
    // If any service has no configured specialists at all, fall back to all
    if (specIdSets.some(set => set.size === 0)) return specialists;
    // Only specialists who can do every selected service
    const eligible = specialists.filter(spec => specIdSets.every(set => set.has(spec.id)));
    return eligible.length > 0 ? eligible : specialists;
  }, [svcNames.join(","), specialists, specialistServices]);

  const serviceDurationMins = useMemo(() => {
    const base = selectedServices.reduce((sum, ss) => {
      if (techMode === "specific" && techId) {
        const found = specialistServices.find(s => s.specialist_id === techId && s.service_name === ss.svcName);
        if (found) return sum + found.duration_minutes;
      }
      const cat = groups.find(g => g.id === ss.catId);
      const svc = cat?.services.find(s => s.name === ss.svcName);
      return sum + parseDuration(svc?.duration ?? 60);
    }, 0) || 60;
    // A design add-on (French, air brush, charms, etc.) adds real chair time
    // on top of the base manicure/pedicure duration.
    return base + selectedAddon.minutes;
  }, [selectedServices, techMode, techId, specialistServices, groups, selectedAddon]);

  // Step completion gates
  const step1Done = !!(fullName && form.phone.trim());
  const step2Done = step1Done && selectedServices.length > 0 && (!needsDiabeticoQ || isDiabetico !== "");
  const step3Done = step2Done; // addon is optional, auto-satisfied
  const step4Done = step3Done && (techMode === "any" || (techMode === "specific" && !!techId));
  const step5Done = step4Done && !!date && !!time;
  const planResolved = selectedServices.length < 2 || planState.kind === "done" || (planState.kind === "partial" && (planState.suggestionTime === null || partialAccept !== null));

  // Scroll to next panel
  function scrollTo(ref: React.RefObject<HTMLDivElement | null>) {
    setTimeout(() => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }
  useEffect(() => { if (step1Done) scrollTo(panel2Ref); }, [step1Done]);
  useEffect(() => { if (step2Done) scrollTo(panel3Ref); }, [step2Done, isDiabetico]);
  useEffect(() => { if (step3Done) scrollTo(panel4Ref); }, [step3Done]);
  useEffect(() => { if (step4Done) scrollTo(panel5Ref); }, [step4Done]);
  useEffect(() => { if (step5Done && planResolved) scrollTo(panel6Ref); }, [step5Done, planResolved]);

  useEffect(() => { setAddon("none"); setRefImage(null); }, [svcNames.join(",")]);
  useEffect(() => { setPlanChoices({}); setPartialAccept(null); }, [date, time]);

  // Taken slots — also computes "tight" slots that snap to right after an
  // existing appointment ends, instead of leaving unbookable dead time until
  // the next fixed 30-min grid mark.
  useEffect(() => {
    if (!date) { setTakenSlots(new Set()); setExtraSlots([]); return; }
    const dateStr = date.getFullYear() + "-" + String(date.getMonth()+1).padStart(2,"0") + "-" + String(date.getDate()).padStart(2,"0");
    async function load() {
      let q = supabase.from("bookings").select("time, service, specialist").eq("date", dateStr).not("status","eq","cancelled").not("status","eq","vip_pending");
      if (techMode === "specific" && chosenSpec) q = q.eq("specialist", chosenSpec.full_name);
      // Pending block requests (submitted by a specialist, awaiting admin
      // approval) must not remove availability until they're approved.
      let blkQ = supabase.from("availability_blocks").select("specialist_name, all_day, start_time, end_time").eq("date", dateStr).neq("status", "pending");
      if (techMode === "specific" && chosenSpec) blkQ = blkQ.eq("specialist_name", chosenSpec.full_name);
      const [{ data: bkgs }, { data: avBlocks }] = await Promise.all([q, blkQ]);
      const slots = getSlotsForDate(date);
      const blocked = new Set<string>();
      // A specialist's own block (full-day time-off or a specific blocked hour
      // range set in admin's Disponibilidad panel) removes those slots from
      // what a client can book — same effect as an existing appointment.
      for (const blk of avBlocks ?? []) {
        if (blk.all_day) { for (const slot of slots) blocked.add(slot); continue; }
        if (!blk.start_time || !blk.end_time) continue;
        const bStart = slotToMins(blk.start_time);
        const bEnd = slotToMins(blk.end_time);
        for (const slot of slots) {
          const sm = slotToMins(slot);
          if (sm >= bStart && sm < bEnd) blocked.add(slot);
        }
      }
      if (!bkgs || bkgs.length === 0) { setTakenSlots(blocked); setExtraSlots([]); return; }
      const busyRanges: { start: number; end: number }[] = [];
      for (const b of bkgs) {
        let dur = 60;
        if (techMode === "specific" && techId) {
          const ss = specialistServices.find(s => s.specialist_id === techId && s.service_name === b.service);
          dur = ss ? ss.duration_minutes : parseDuration(SERVICE_CATEGORIES.find(c => c.services.some(sv => sv.name === b.service))?.services.find(sv => sv.name === b.service)?.duration ?? 60);
        } else {
          dur = parseDuration(SERVICE_CATEGORIES.find(c => c.services.some(sv => sv.name === b.service))?.services.find(sv => sv.name === b.service)?.duration ?? 60);
        }
        const start = slotToMins(b.time);
        busyRanges.push({ start, end: start + dur });
        for (const slot of slots) {
          const sm = slotToMins(slot);
          if (sm >= start && sm < start + dur) blocked.add(slot);
        }
      }
      setTakenSlots(blocked);

      // For each appointment end that doesn't land on the fixed grid, offer
      // the next clean 10-minute mark as an extra bookable slot — as long as
      // it doesn't fall inside another appointment's busy window.
      const gridMins = new Set(slots.map(slotToMins));
      const extras = new Set<number>();
      for (const r of busyRanges) {
        const snapped = Math.ceil(r.end / 10) * 10;
        if (gridMins.has(snapped)) continue;
        const insideAnother = busyRanges.some(o => snapped >= o.start && snapped < o.end);
        if (insideAnother) continue;
        extras.add(snapped);
      }
      setExtraSlots([...extras].sort((a, b) => a - b).map(minsToSlot));
    }
    load();
  }, [date, techMode, techId, chosenSpec, specialistServices]);

  // Multi-service specialist assignment plan — only relevant when the client
  // picked more than one service. Runs once date+time are chosen, and again
  // every time the client answers a "¿con quién deseas este servicio?" choice.
  useEffect(() => {
    if (selectedServices.length < 2 || !date || !time) { setPlanState({ kind: "empty" }); return; }
    let cancelled = false;
    setPlanState({ kind: "loading" });
    async function load() {
      const dateStr = date!.getFullYear() + "-" + String(date!.getMonth()+1).padStart(2,"0") + "-" + String(date!.getDate()).padStart(2,"0");

      const [{ data: svcRows }, { data: legacyRows }] = await Promise.all([
        supabase.from("booking_services").select("booking_id, specialist_id, start_time, duration_minutes, bookings!inner(date,status)").eq("bookings.date", dateStr).not("bookings.status", "eq", "cancelled").not("bookings.status","eq","vip_pending"),
        supabase.from("bookings").select("id, time, service, specialist, status").eq("date", dateStr).not("status", "eq", "cancelled").not("status","eq","vip_pending"),
      ]);
      if (cancelled) return;

      const coveredBookingIds = new Set<string>((svcRows ?? []).map((r: any) => r.booking_id)); // legacy bookings that already have booking_services rows — don't double count

      const busy = new Map<string, BusyRange[]>();
      for (const r of svcRows ?? []) {
        const start = slotToMins((r as any).start_time);
        const end = start + (r as any).duration_minutes;
        const id = (r as any).specialist_id as string | null;
        if (!id) continue;
        busy.set(id, [...(busy.get(id) ?? []), { start, end }]);
      }
      for (const b of legacyRows ?? []) {
        if (coveredBookingIds.has(b.id) || !b.specialist) continue;
        const sp = specialists.find(s => s.full_name === b.specialist);
        if (!sp) continue;
        const dur = parseDuration(SERVICE_CATEGORIES.find(c => c.services.some(sv => sv.name === b.service))?.services.find(sv => sv.name === b.service)?.duration ?? 60);
        const start = slotToMins(b.time);
        busy.set(sp.id, [...(busy.get(sp.id) ?? []), { start, end: start + dur }]);
      }

      const order = svcNames;
      const start = slotToMins(time);
      const assignments: ServiceAssignment[] = [];
      const working = new Map<string, BusyRange[]>();
      for (const [id, ranges] of busy) working.set(id, [...ranges]);
      let cursor = start;
      let stuckAt = -1;
      for (let i = 0; i < order.length; i++) {
        const svcName = order[i];
        const chosenId = planChoices[svcName];
        if (chosenId) {
          const sp = specialists.find(s => s.id === chosenId);
          const row = specialistServices.find(s => s.specialist_id === chosenId && s.service_name === svcName);
          const dur = row ? row.duration_minutes : parseDuration(SERVICE_CATEGORIES.find(c => c.services.some(sv => sv.name === svcName))?.services.find(sv => sv.name === svcName)?.duration ?? 60);
          if (sp) {
            assignments.push({ serviceName: svcName, specialistId: sp.id, specialistName: sp.full_name, start: cursor, duration: dur });
            working.set(sp.id, [...(working.get(sp.id) ?? []), { start: cursor, end: cursor + dur }]);
            cursor += dur;
            continue;
          }
        }
        const res = resolveStep(svcName, cursor, specialists, specialistServices, working);
        if (res.type === "blocked") { stuckAt = i; break; }
        if (res.type === "choice") {
          // "Primera disponible" means the client opted out of picking anyone —
          // never ask them to break a tie between named specialists, just take
          // the first free option silently, same as the single-candidate case.
          if (techMode === "any") {
            const pick = res.options[0];
            assignments.push({ serviceName: svcName, specialistId: pick.specialist.id, specialistName: pick.specialist.full_name, start: cursor, duration: pick.duration });
            working.set(pick.specialist.id, [...(working.get(pick.specialist.id) ?? []), { start: cursor, end: cursor + pick.duration }]);
            cursor += pick.duration;
            continue;
          }
          if (cancelled) return;
          setPlanState({ kind: "awaiting", assignments, pendingService: svcName, options: res.options });
          return;
        }
        assignments.push({ serviceName: svcName, specialistId: res.specialist.id, specialistName: res.specialist.full_name, start: cursor, duration: res.duration });
        working.set(res.specialist.id, [...(working.get(res.specialist.id) ?? []), { start: cursor, end: cursor + res.duration }]);
        cursor += res.duration;
      }
      if (cancelled) return;
      if (stuckAt === -1) { setPlanState({ kind: "done", assignments }); return; }

      // The direct order got stuck — try every other order of the same services.
      const reordered = findWorkingOrder(order, start, specialists, specialistServices, busy);
      if (reordered) {
        setPlanState({ kind: "done", assignments: reordered.assignments, note: "Ajustamos el orden de tus servicios para que quepan todos seguidos." });
        return;
      }

      // No order fits everything — find the largest subset that does, and
      // suggest an alternate time (within 2h) for whatever's left over.
      const partial = findPartialFit(order, start, specialists, specialistServices, busy, 120);
      if (partial) {
        const leftoverAssignment = partial.leftoverSuggestion ? partial.leftoverSuggestion.assignments[0] : null;
        setPlanState({ kind: "partial", fitted: partial.fitted.assignments, leftover: partial.leftover, suggestionTime: leftoverAssignment ? leftoverAssignment.start : null, leftoverAssignment });
      } else {
        setPlanState({ kind: "none" });
      }
    }
    load();
    return () => { cancelled = true; };
  }, [date, time, svcNames.join(","), specialists, specialistServices, planChoices, techMode]);

  const calDays = useMemo(() => {
    const first = new Date(monthCursor);
    const firstDay = first.getDay();
    const dim = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= dim; d++) cells.push(new Date(first.getFullYear(), first.getMonth(), d));
    return cells;
  }, [monthCursor]);

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setRefImage({ file, preview: URL.createObjectURL(file) });
  }

  function removeImage() {
    if (refImage) URL.revokeObjectURL(refImage.preview);
    setRefImage(null);
    if (imgInputRef.current) imgInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !time || !policyAccepted) return;
    if (selectedServices.length > 1 && !planResolved) return; // defensive — UI already gates this
    setLoading(true); setSubmitError("");

    let refImageUrl: string | null = null;
    if (refImage) {
      const ext  = refImage.file.name.split(".").pop() ?? "jpg";
      const path = "refs/" + Date.now() + "." + ext;
      const { data: upData } = await supabase.storage.from("reference-images").upload(path, refImage.file, { upsert: false });
      if (upData) {
        const { data: urlData } = supabase.storage.from("reference-images").getPublicUrl(path);
        refImageUrl = urlData.publicUrl;
      }
    }

    const dateStr = date.getFullYear() + "-" + String(date.getMonth()+1).padStart(2,"0") + "-" + String(date.getDate()).padStart(2,"0");
    // A "partial" plan means one service didn't fit consecutively — it's carved
    // out into its own separate booking (below) so this one only covers what
    // actually fits at this date/time. The leftover never joins this booking.
    const multiAssignments = selectedServices.length > 1 && planState.kind === "done"
      ? planState.assignments
      : selectedServices.length > 1 && planState.kind === "partial"
        ? planState.fitted
        : null;
    const specLabel = multiAssignments
      ? [...new Set(multiAssignments.map(a => a.specialistName))].join(", ")
      : (techMode === "any" ? null : chosenSpec?.full_name ?? null);
    const serviceLabel = multiAssignments ? multiAssignments.map(a => a.serviceName).join(" + ") : svcNames.join(" + ");
    const notesParts = [
      techMode === "any" && !multiAssignments ? "Especialista: primera disponible" : "",
      selectedAddon.id !== "none" ? ("Diseño: " + selectedAddon.label + " (+$" + selectedAddon.price + ")") : "",
      refImageUrl ? ("Ref: " + refImageUrl) : (refImage ? "Imagen ref: adjunta" : ""),
      needsDiabeticoQ ? ("Diabético: " + (isDiabetico === "yes" ? "Sí" : "No")) : "",
    ].filter(Boolean);

    const bookingRow = {
      name: fullName, phone: form.phone,
      business: fullName,
      service: serviceLabel, specialist: specLabel,
      date: dateStr, time,
      notes: notesParts.join(" | ") || null,
      status: "pending", archived: false,
    };
    let error: {message:string}|null = null;
    let bookingId: string | null = draftId;
    if (draftId) {
      const res = await supabase.from("bookings").update(bookingRow).eq("id", draftId);
      error = res.error;
    } else {
      const res = await supabase.from("bookings").insert([bookingRow]).select().single();
      error = res.error;
      bookingId = res.data?.id ?? null;
    }
    if (!error && bookingId) {
      // Record the real per-service specialist assignment so the calendar,
      // dashboard filters, and duration math are all based on who's actually
      // doing what — not a single name covering everything in the booking.
      await supabase.from("booking_services").delete().eq("booking_id", bookingId); // clear any stale rows (e.g. re-submitting a draft)
      const rows = multiAssignments
        ? multiAssignments.map((a, i) => ({ booking_id: bookingId, service_name: a.serviceName, specialist_id: a.specialistId, specialist_name: a.specialistName, sequence_order: i + 1, start_time: minsToSlot(a.start), duration_minutes: a.duration }))
        : (techMode === "specific" && chosenSpec)
          ? [{ booking_id: bookingId, service_name: svcNames[0] ?? serviceLabel, specialist_id: chosenSpec.id, specialist_name: chosenSpec.full_name, sequence_order: 1, start_time: time, duration_minutes: serviceDurationMins }]
          : [];
      if (rows.length) await supabase.from("booking_services").insert(rows);

      // Leftover service the client accepted at the suggested alternate time —
      // a second, independent booking so it shows up as its own normal
      // appointment (own card, own specialist agenda entry), not folded into
      // this one.
      if (planState.kind === "partial" && partialAccept === "yes" && planState.leftoverAssignment) {
        const a = planState.leftoverAssignment;
        const leftoverTime = minsToSlot(a.start);
        const { data: leftoverBooking, error: leftoverErr } = await supabase.from("bookings").insert([{
          name: fullName, phone: form.phone, business: fullName,
          service: a.serviceName, specialist: a.specialistName,
          date: dateStr, time: leftoverTime,
          notes: notesParts.join(" | ") || null,
          status: "pending", archived: false,
        }]).select().single();
        if (!leftoverErr && leftoverBooking) {
          await supabase.from("booking_services").insert([{
            booking_id: leftoverBooking.id, service_name: a.serviceName,
            specialist_id: a.specialistId, specialist_name: a.specialistName,
            sequence_order: 1, start_time: leftoverTime, duration_minutes: a.duration,
          }]);
        }
      }
    }
    setLoading(false);
    if (error) { setSubmitError(error.message); return; }
    // Auto-add to CRM
    supabase.from("crm_clients").select("id").eq("phone",form.phone).maybeSingle().then(({data})=>{
      if(!data) supabase.from("crm_clients").insert([{name:fullName,phone:form.phone}]).then(()=>{})
    })
    setSubmitted(true);
    setTimeout(() => document.getElementById("agendar")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function reset() {
    if (draftId) { supabase.from("bookings").delete().eq("id", draftId); setDraftId(null); }
    setForm({ firstName: "", lastName: "", phone: "" });
    setCatId(""); setSelectedServices([]); setAddon("none"); setIsDiabetico("");
    setTechMode(""); setTechId("");
    setDate(null); setTime(""); setActiveDayPromo(null); setPolicyAccepted(false);
    if (refImage) URL.revokeObjectURL(refImage.preview);
    setRefImage(null); setSubmitted(false);
    setMonthCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    setTimeout(() => document.getElementById("agendar")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function buildCalLinks() {
    if (!date) return { google: "#", ics: "#" };
    const [rawTime, ampm] = time.split(" ");
    let [h, m] = rawTime.split(":").map(Number);
    if (ampm === "PM" && h !== 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m);
    const end   = new Date(start.getTime() + serviceDurationMins * 60 * 1000);
    const fmt   = (d: Date) => d.getFullYear() + String(d.getMonth()+1).padStart(2,"0") + String(d.getDate()).padStart(2,"0") + "T" + String(d.getHours()).padStart(2,"0") + String(d.getMinutes()).padStart(2,"0") + "00";
    const title = encodeURIComponent(svcNames.join(" + ") + " – " + business.name);
    const loc   = encodeURIComponent(business.address);
    const google = "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" + title + "&dates=" + fmt(start) + "/" + fmt(end) + "&location=" + loc;
    const ics   = "data:text/calendar;charset=utf8," + encodeURIComponent(["BEGIN:VCALENDAR","VERSION:2.0","BEGIN:VEVENT","DTSTART:"+fmt(start),"DTEND:"+fmt(end),"SUMMARY:"+svcNames.join(" + ")+" – "+business.name,"LOCATION:"+business.address.replace(/,/g,"\\,"),"END:VEVENT","END:VCALENDAR"].join("\r\n"));
    return { google, ics };
  }

  // ── Submitted ──────────────────────────────────────────────────────
  if (submitted) {
    const { google, ics } = buildCalLinks();
    const specName = techMode === "any" ? "Primera disponible" : (chosenSpec?.full_name ?? "");
    const serviceLabel = svcNames.join(" + ");
    return (
      <section id="agendar" style={{ padding: "80px 24px", background: "#fdf0f5" }}>
        <div style={{ maxWidth: 520, margin: "0 auto", textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(232,127,172,0.12)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={PINK} strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <h3 style={{ fontFamily: ffS, fontSize: 40, color: INK, margin: "0 0 16px", fontWeight: 300 }}>¡Solicitud enviada!</h3>
          <p style={{ fontFamily: ff, fontSize: 13, color: TAUPE, lineHeight: 1.9, maxWidth: 380, margin: "0 auto 12px" }}>
            Gracias <strong>{fullName}</strong>. Nos comunicaremos al <strong>{form.phone}</strong> para confirmar y enviarte los detalles del depósito.
          </p>
          <p style={{ fontFamily: ff, fontSize: 11, color: "#b09090", letterSpacing: "1px" }}>
            {serviceLabel}{selectedAddon.id !== "none" ? " + " + selectedAddon.label : ""} · {specName} · {date && (date.getDate() + " " + MONTHS[date.getMonth()])} · {time}
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 32, flexWrap: "wrap" }}>
            <a href={google} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 22px", background: PINK, color: "#fff", fontFamily: ff, fontSize: 10, letterSpacing: "2px", textDecoration: "none", fontWeight: 500 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
              GOOGLE CALENDAR
            </a>
            <a href={ics} download="cita.ics" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 22px", border: "1px solid " + PINK, color: PINK, fontFamily: ff, fontSize: 10, letterSpacing: "2px", textDecoration: "none", fontWeight: 500 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
              APPLE / ICAL
            </a>
          </div>
          <button onClick={reset} style={{ marginTop: 20, background: "none", border: "none", fontFamily: ff, fontSize: 11, color: "#b09090", cursor: "pointer", textDecoration: "underline" }}>
            Reservar otra cita
          </button>
        </div>
      </section>
    );
  }

  if (vipSubmitted) {
    return (
      <section id="agendar" style={{ padding: "80px 24px", background: "#fdf0f5" }}>
        <div style={{ maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(232,127,172,0.12)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={PINK} strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <h3 style={{ fontFamily: ffS, fontSize: 32, color: INK, margin: "0 0 16px", fontWeight: 300 }}>¡Solicitud de Horario VIP enviada!</h3>
          <p style={{ fontFamily: ff, fontSize: 13, color: TAUPE, lineHeight: 1.9, maxWidth: 380, margin: "0 auto 12px" }}>
            Tu solicitud debe ser confirmada por nuestro equipo antes de considerar la cita reservada. Te contactaremos al <strong>{form.phone}</strong> con la respuesta.
          </p>
          <button onClick={reset} style={{ marginTop: 20, background: "none", border: "none", fontFamily: ff, fontSize: 11, color: "#b09090", cursor: "pointer", textDecoration: "underline" }}>
            Volver al inicio
          </button>
        </div>
      </section>
    );
  }

  // ── Panel helpers ──────────────────────────────────────────────────
  const panelStyle = (locked: boolean): React.CSSProperties => locked ? { display: "none" } : {
    border: "1px solid #f0d8e4", background: "#fff", marginTop: 1,
  };

  const panelHead = (n: string, subtitle: string, summary?: string): React.ReactNode => (
    <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 24px", borderBottom: "1px solid #f8eef3" }}>
      <span style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, border: "1px solid " + INK, color: INK, fontFamily: ff, flexShrink: 0 }}>{n}</span>
      <span style={{ fontFamily: ffS, fontSize: 20, color: INK }}>{subtitle}</span>
      {summary && <span style={{ marginLeft: "auto", fontFamily: ff, fontSize: 11, color: "#b09090" }}>{summary}</span>}
    </div>
  );

  // ── Main render ─────────────────────────────────────────────────────
  return (
    <section id="agendar" style={{ padding: "80px 0", background: "#fdf0f5" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px" }}>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <p style={{ fontFamily: ff, fontSize: 10, letterSpacing: "4px", color: PINK, marginBottom: 12, textTransform: "uppercase" }}>Reservas</p>
          <h2 style={{ fontFamily: ffS, fontSize: "clamp(36px,5vw,56px)", fontWeight: 300, color: INK, margin: "0 0 12px" }}>Agenda tu cita</h2>
          <p style={{ fontFamily: ff, fontSize: 13, color: TAUPE, maxWidth: 420 }}>Se requiere un depósito para confirmar. Recibirás confirmación por mensaje.</p>
        </div>

        {/* ── PANEL 1: Información inicial ── */}
        <div style={{ border: "1px solid #f0d8e4", background: "#fff" }}>
          {panelHead("1", "Tus datos", step1Done ? fullName : undefined)}
          <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontFamily: ff, fontSize: 10, letterSpacing: "2px", color: TAUPE, marginBottom: 8, textTransform: "uppercase" }}>Nombre *</label>
                <input
                  required value={form.firstName}
                  onChange={e => setForm(f => ({...f, firstName: e.target.value}))}
                  placeholder="Nombre"
                  style={inp}
                  onFocus={e => (e.currentTarget.style.borderColor = PINK)}
                  onBlur={e => (e.currentTarget.style.borderColor = "#f0d8e4")}
                />
              </div>
              <div>
                <label style={{ display: "block", fontFamily: ff, fontSize: 10, letterSpacing: "2px", color: TAUPE, marginBottom: 8, textTransform: "uppercase" }}>Apellido *</label>
                <input
                  required value={form.lastName}
                  onChange={e => setForm(f => ({...f, lastName: e.target.value}))}
                  placeholder="Apellido"
                  style={inp}
                  onFocus={e => (e.currentTarget.style.borderColor = PINK)}
                  onBlur={e => (e.currentTarget.style.borderColor = "#f0d8e4")}
                />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontFamily: ff, fontSize: 10, letterSpacing: "2px", color: TAUPE, marginBottom: 8, textTransform: "uppercase" }}>Teléfono *</label>
                <input
                  required type="tel" value={form.phone}
                  onChange={e => setForm(f => ({...f, phone: e.target.value}))}
                  placeholder="(787) 000-0000"
                  style={inp}
                  onFocus={e => (e.currentTarget.style.borderColor = PINK)}
                  onBlur={e => (e.currentTarget.style.borderColor = "#f0d8e4")}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── PANEL 2: Selección de servicio(s) ── */}
        <div ref={panel2Ref} style={panelStyle(!step1Done)}>
          {panelHead("2", "Servicio", selectedServices.length > 0 ? selectedServices.map(s => s.svcName).join(", ") : undefined)}
          <div style={{ padding: "24px" }}>

            {/* Selected services chips */}
            {selectedServices.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                {selectedServices.map(ss => (
                  <div key={ss.svcName} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "#fdf0f5", border: "1px solid " + PINK, fontFamily: ff, fontSize: 11, color: PINK }}>
                    <span>{ss.svcName}</span>
                    <button type="button" onClick={() => setSelectedServices(prev => prev.filter(s => s.svcName !== ss.svcName))}
                      style={{ background: "none", border: "none", cursor: "pointer", color: PINK, padding: 0, lineHeight: 1, fontSize: 14 }}>×</button>
                  </div>
                ))}
              </div>
            )}

            {/* Category tabs */}
            <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #f8eef3", marginBottom: 20, overflowX: "auto" }}>
              {groups.map(g => (
                <button key={g.id} onClick={() => setCatId(g.id)}
                  style={{ padding: "10px 20px", background: "none", border: "none", cursor: "pointer", fontFamily: ff, fontSize: 11, letterSpacing: "2px", fontWeight: 500, color: catId === g.id ? PINK : TAUPE, borderBottom: catId === g.id ? "2px solid " + PINK : "2px solid transparent", whiteSpace: "nowrap", transition: "color .2s", textTransform: "uppercase" }}>
                  {g.title}
                </button>
              ))}
            </div>

            {/* Service limit hints */}
            {catId === "manicure" && <p style={{ fontFamily: ff, fontSize: 10, color: TAUPE, marginBottom: 10 }}>Máximo 1 manicura por cita.</p>}
            {catId === "pedicure" && <p style={{ fontFamily: ff, fontSize: 10, color: TAUPE, marginBottom: 10 }}>Máximo 1 pedicura por cita.</p>}

            {category && (
              <div style={{ maxHeight: 280, overflowY: "auto", borderTop: "1px solid #f8eef3" }}>
                {category.services.map(s => {
                  const isSelected = selectedServices.some(ss => ss.svcName === s.name);
                  const isExpanded = expandedSvc === s.name;
                  return (
                    <div key={s.name} style={{ borderBottom: "1px solid #f8eef3" }}>
                      <div style={{ width: "100%", display: "flex", alignItems: "center", gap: 4, background: isSelected ? "#fdf0f5" : "transparent", transition: "background .15s" }}>
                        <button type="button" onClick={() => {
                          setSelectedServices(prev => {
                            if (isSelected) return prev.filter(ss => ss.svcName !== s.name);
                            // manicure/pedicure: max 1 → replace existing in that category
                            if (catId === "manicure" || catId === "pedicure") {
                              return [...prev.filter(ss => ss.catId !== catId), { catId, svcName: s.name }];
                            }
                            return [...prev, { catId, svcName: s.name }];
                          });
                        }}
                          style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 8px", background: "none", border: "none", cursor: "pointer", textAlign: "left", gap: 12 }}>
                          <span style={{ fontFamily: ff, fontSize: 13, color: isSelected ? PINK : "#000", fontWeight: isSelected ? 600 : 400 }}>{s.name}</span>
                          <span style={{ fontFamily: ff, fontSize: 11, color: "#000", whiteSpace: "nowrap", flexShrink: 0 }}>
                            {s.duration} · <span style={{ color: "#000", fontWeight: 600 }}>{s.price}</span>
                          </span>
                        </button>
                        {s.description && (
                          <button type="button" onClick={() => setExpandedSvc(isExpanded ? null : s.name)} title="Ver descripción"
                            style={{ flexShrink: 0, padding: "14px 8px", background: "none", border: "none", cursor: "pointer" }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TAUPE} strokeWidth="2" style={{ transition: "transform .2s", transform: isExpanded ? "rotate(180deg)" : "none" }}><polyline points="6 9 12 15 18 9"/></svg>
                          </button>
                        )}
                      </div>
                      {isExpanded && s.description && (
                        <p style={{ fontFamily: ff, fontSize: 11, color: TAUPE, lineHeight: 1.8, padding: "0 8px 14px" }}>{s.description}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Diabéticos question */}
            {needsDiabeticoQ && (
              <div style={{ marginTop: 20, padding: "16px", background: "#fff8fb", border: "1px solid #f0d8e4" }}>
                <p style={{ fontFamily: ff, fontSize: 11, fontWeight: 600, color: INK, marginBottom: 12 }}>¿Eres diabético/a? *</p>
                <div style={{ display: "flex", gap: 10 }}>
                  {(["yes","no"] as const).map(opt => (
                    <button key={opt} type="button" onClick={() => setIsDiabetico(opt)}
                      style={{ padding: "9px 24px", border: "1px solid " + (isDiabetico === opt ? PINK : "#f0d8e4"), background: isDiabetico === opt ? "#fdf0f5" : "#fff", fontFamily: ff, fontSize: 12, color: isDiabetico === opt ? PINK : INK, cursor: "pointer", fontWeight: isDiabetico === opt ? 600 : 400, transition: "all .15s" }}>
                      {opt === "yes" ? "Sí" : "No"}
                    </button>
                  ))}
                </div>
                <p style={{ fontFamily: ff, fontSize: 10, color: TAUPE, marginTop: 8, lineHeight: 1.6 }}>
                  Esta información es necesaria para garantizar tu seguridad durante el servicio.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── PANEL 3: Add-on (manicure only) + Imagen (todos los servicios) ── */}
        <div ref={panel3Ref} style={panelStyle(!step2Done)}>
          {panelHead("3", "Diseño & Referencia", addon !== "none" ? selectedAddon.label : undefined)}
          <div style={{ padding: "24px" }}>
            {(isManicure || isPedicure) && (
              <>
                <p style={{ fontFamily: ff, fontSize: 10, letterSpacing: "3px", color: TAUPE, marginBottom: 14, textTransform: "uppercase" }}>
                  Add-on de diseño <span style={{ letterSpacing: "1px", fontWeight: 400, color: "#b09090" }}>(opcional)</span>
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px,1fr))", gap: 8, marginBottom: 24 }}>
                  {DESIGN_ADDONS.map(a => (
                    <button key={a.id} onClick={() => setAddon(a.id)}
                      style={{ padding: "12px 10px", border: "1px solid " + (addon === a.id ? PINK : "#f0d8e4"), background: addon === a.id ? "#fdf0f5" : "#fff", cursor: "pointer", textAlign: "left", transition: "border-color .2s" }}>
                      <p style={{ fontFamily: ff, fontSize: 12, fontWeight: 600, color: addon === a.id ? PINK : INK, marginBottom: 4 }}>{a.label}</p>
                      <p style={{ fontFamily: ff, fontSize: 11, color: TAUPE }}>{a.price === 0 ? "Incluido" : "+$" + a.price}</p>
                    </button>
                  ))}
                </div>
              </>
            )}

            <p style={{ fontFamily: ff, fontSize: 10, letterSpacing: "3px", color: TAUPE, marginBottom: 12, textTransform: "uppercase" }}>
              Imagen de referencia <span style={{ letterSpacing: "1px", fontWeight: 400, color: "#b09090" }}>(opcional)</span>
            </p>
            <input ref={imgInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageSelect}/>
            {!refImage ? (
              <button type="button" onClick={() => imgInputRef.current?.click()}
                style={{ width: "100%", border: "1px dashed #f0d8e4", padding: "20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "pointer", background: "transparent", transition: "border-color .2s" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = PINK)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "#f0d8e4")}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={TAUPE} strokeWidth="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                <span style={{ fontFamily: ff, fontSize: 11, color: TAUPE }}>Sube una foto de inspiración</span>
              </button>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 16, padding: 12, border: "1px solid #f0d8e4" }}>
                <img src={refImage.preview} alt="ref" style={{ width: 60, height: 60, objectFit: "cover", flexShrink: 0 }}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: ff, fontSize: 12, color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{refImage.file.name}</p>
                  <p style={{ fontFamily: ff, fontSize: 10, color: TAUPE }}>{(refImage.file.size/1024).toFixed(0)} KB</p>
                </div>
                <button type="button" onClick={removeImage} style={{ background: "none", border: "none", cursor: "pointer", color: TAUPE, padding: 4 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── PANEL 4: Técnica ── */}
        <div ref={panel4Ref} style={panelStyle(!step2Done)}>
          {panelHead("4", "Especialista", step4Done ? (techMode === "any" ? "Primera disponible" : (chosenSpec?.full_name ?? "")) : undefined)}
          <div style={{ padding: "24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: techMode === "specific" ? 24 : 0 }}>
              <button onClick={() => { setTechMode("any"); setTechId(""); }}
                style={{ padding: "10px 12px", border: "1px solid " + (techMode === "any" ? PINK : "#f0d8e4"), background: techMode === "any" ? "#fdf0f5" : "#fff", cursor: "pointer", textAlign: "left", transition: "border-color .2s, background .2s", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontFamily: ffS, fontSize: 20, flexShrink: 0, color: techMode === "any" ? PINK : TAUPE }}>✦</span>
                <div>
                  <span style={{ fontFamily: ff, fontSize: 11, fontWeight: 600, color: techMode === "any" ? PINK : INK, display: "block", marginBottom: 2 }}>Primera disponible</span>
                  <span style={{ fontFamily: ff, fontSize: 10, color: TAUPE }}>Más horarios disponibles</span>
                </div>
              </button>
              <button onClick={() => setTechMode("specific")}
                style={{ padding: "10px 12px", border: "1px solid " + (techMode === "specific" ? PINK : "#f0d8e4"), background: techMode === "specific" ? "#fdf0f5" : "#fff", cursor: "pointer", textAlign: "left", transition: "border-color .2s, background .2s", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontFamily: ffS, fontSize: 20, flexShrink: 0, color: techMode === "specific" ? PINK : TAUPE }}>♡</span>
                <div>
                  <span style={{ fontFamily: ff, fontSize: 11, fontWeight: 600, color: techMode === "specific" ? PINK : INK, display: "block", marginBottom: 2 }}>Elegir especialista</span>
                  <span style={{ fontFamily: ff, fontSize: 10, color: TAUPE }}>Ve las técnicas disponibles</span>
                </div>
              </button>
            </div>

            {techMode === "specific" && (
              specsLoading ? (
                <p style={{ fontFamily: ff, fontSize: 12, color: "#b09090" }}>Cargando especialistas…</p>
              ) : eligibleSpecs.length === 0 ? (
                <p style={{ fontFamily: ff, fontSize: 12, color: "#b09090" }}>No hay especialistas disponibles para este servicio en este momento.</p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                  {eligibleSpecs.map(s => (
                    <button key={s.id} onClick={() => setTechId(s.id)}
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px", border: "1px solid " + (techId === s.id ? PINK : "#f0d8e4"), background: techId === s.id ? "#fdf0f5" : "#fff", cursor: "pointer", textAlign: "left", transition: "border-color .2s, background .2s" }}>
                      <div style={{ width: 44, height: 44, borderRadius: "50%", overflow: "hidden", background: "#f8eef3", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {s.avatar_url ? (
                          <img src={s.avatar_url} alt={s.full_name} style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
                        ) : (
                          <span style={{ fontFamily: ffS, fontSize: 18, color: PINK }}>
                            {(s.full_name || "?").split(" ").map(w => w[0]).slice(0,2).join("")}
                          </span>
                        )}
                      </div>
                      <div>
                        <p style={{ fontFamily: ff, fontSize: 13, fontWeight: 600, color: techId === s.id ? PINK : INK, marginBottom: 2 }}>{s.full_name}</p>
                        <p style={{ fontFamily: ff, fontSize: 10, color: TAUPE }}>Especialista</p>
                      </div>
                    </button>
                  ))}
                </div>
              )
            )}
          </div>
        </div>

        {/* ── PANEL 5: Disponibilidad ── */}
        <div ref={panel5Ref} style={panelStyle(!step4Done)}>
          {panelHead("5", "Disponibilidad", (date && time) ? (date.getDate() + " " + MONTHS[date.getMonth()] + " · " + time) : undefined)}
          <div style={{ padding: "24px" }}>
            <p style={{ fontFamily: ff, fontSize: 11, color: TAUPE, marginBottom: 20 }}>Cerrado domingos. Sábados hasta las 4:00 PM.</p>

            {/* Calendar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <button type="button" onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth()-1, 1))}
                style={{ width: 32, height: 32, border: "1px solid #f0d8e4", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: INK, transition: "border-color .2s" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = PINK)} onMouseLeave={e => (e.currentTarget.style.borderColor = "#f0d8e4")}>‹</button>
              <span style={{ fontFamily: ffS, fontSize: 18, color: INK }}>{MONTHS[monthCursor.getMonth()]} {monthCursor.getFullYear()}</span>
              <button type="button" onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth()+1, 1))}
                style={{ width: 32, height: 32, border: "1px solid #f0d8e4", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: INK, transition: "border-color .2s" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = PINK)} onMouseLeave={e => (e.currentTarget.style.borderColor = "#f0d8e4")}>›</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 20 }}>
              {DAYS.map(d => <div key={d} style={{ textAlign: "center", fontFamily: ff, fontSize: 10, color: TAUPE, padding: "6px 0", letterSpacing: "1px" }}>{d}</div>)}
              {calDays.map((d, i) => {
                if (!d) return <div key={i}/>;
                const past     = d < todayMidnight();
                const closed   = isClosed(d);
                const disabled = past || closed;
                const selected = date && d.toDateString() === date.toDateString();
                const dStr     = d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
                const dayPromo = promoDays.find(p => p.date === dStr);
                return (
                  <button key={i} type="button" disabled={disabled} onClick={() => {
                    setDate(d); setTime("");
                    if (dayPromo) {
                      const svcMatch = !dayPromo.service_name || svcNames.includes(dayPromo.service_name);
                      if (svcMatch) {
                        setActiveDayPromo({...dayPromo, discount_type: dayPromo.discount_type as 'percent'|'fixed'});
                        if (dayPromo.specialist_name === "random") { setTechMode("any"); setTechId(""); }
                      } else {
                        setActiveDayPromo(null);
                      }
                    } else {
                      setActiveDayPromo(null);
                    }
                  }}
                    style={{ aspectRatio: "1/1", fontFamily: ff, fontSize: 12, border: dayPromo && !disabled ? `2px solid ${GOLD}` : "none", background: selected ? PINK : "transparent", color: selected ? "#fff" : disabled ? "#d0b0c0" : INK, cursor: disabled ? "not-allowed" : "pointer", textDecoration: disabled ? "line-through" : "none", transition: "background .15s", position:"relative" as const, borderRadius: 4 }}
                    onMouseEnter={e => { if (!disabled && !selected) (e.currentTarget as HTMLElement).style.background = "#fdf0f5"; }}
                    onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                    {d.getDate()}
                    {dayPromo && !disabled && <span style={{ position:"absolute", top:1, right:1, width:6, height:6, borderRadius:"50%", background:GOLD, display:"block" }}/>}
                  </button>
                );
              })}
            </div>

            {activeDayPromo && date && (
              <div style={{ padding:"10px 14px", background:"#fffbf0", border:`1.5px solid ${GOLD}`, borderRadius:8, marginBottom:14, display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontSize:18 }}>✨</span>
                <div>
                  <p style={{ fontFamily:ff, fontSize:11, fontWeight:700, color:GOLD, margin:0, letterSpacing:"0.06em", textTransform:"uppercase" as const }}>¡Día promocional!</p>
                  <p style={{ fontFamily:ff, fontSize:12, color:INK, margin:"2px 0 0" }}>
                    {activeDayPromo.discount_type==='percent' ? `${activeDayPromo.discount_value}% de descuento` : `$${activeDayPromo.discount_value} de descuento`}
                    {activeDayPromo.service_name ? ` en ${activeDayPromo.service_name}` : ""}
                    {activeDayPromo.specialist_name==='random' ? " · Primera disponible" : ""}
                  </p>
                  {activeDayPromo.note && <p style={{ fontFamily:ff, fontSize:11, color:TAUPE, margin:"2px 0 0", fontStyle:"italic" }}>{activeDayPromo.note}</p>}
                </div>
              </div>
            )}
            {date && (
              <div>
                <p style={{ fontFamily: ff, fontSize: 10, letterSpacing: "3px", color: TAUPE, marginBottom: 12, textTransform: "uppercase" }}>Hora disponible</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                  {(() => {
                    const nowMs = Date.now();
                    const cutoff = nowMs + 6 * 60 * 60 * 1000;
                    const allSlots = [...getSlotsForDate(date), ...extraSlots].sort((a, b) => slotToMins(a) - slotToMins(b));
                    return allSlots.map(t => {
                      const taken = takenSlots.has(t);
                      const [timePart, ampm] = t.split(" ");
                      const [h, m] = timePart.split(":").map(Number);
                      const hours = h % 12 + (ampm === "PM" ? 12 : 0);
                      const slotMs = new Date(date!.getFullYear(), date!.getMonth(), date!.getDate(), hours, m, 0, 0).getTime();
                      const past = slotMs < nowMs;
                      const tooSoon = !past && slotMs < cutoff;
                      const disabled = taken || past || tooSoon;
                      const bg = time === t ? PINK : taken ? "#fdf8fc" : (past || tooSoon) ? "#f9f9f9" : "#fff";
                      const clr = time === t ? "#fff" : taken ? "#d0b0c0" : (past || tooSoon) ? "#ccc" : INK;
                      return (
                        <button key={t} type="button" disabled={disabled} onClick={() => !disabled && setTime(t)}
                          style={{ padding: "10px 4px", fontFamily: ff, fontSize: 11, border: "1px solid " + (time === t ? PINK : taken ? "#f0d8e4" : (past || tooSoon) ? "#eee" : "#f0d8e4"), background: bg, color: clr, cursor: disabled ? "not-allowed" : "pointer", textDecoration: taken ? "line-through" : "none", transition: "border-color .15s, background .15s" }}>
                          {t}
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>
            )}

            <div style={{ marginTop: 20, textAlign: "center" }}>
              <button type="button" onClick={() => setShowVipModal(true)}
                style={{ background: "none", border: "none", cursor: "pointer", fontFamily: ff, fontSize: 11, color: TAUPE, textDecoration: "underline" }}>
                ¿No encuentras un horario que te funcione? <span style={{ color: PINK, fontWeight: 600 }}>Solicitar Horario VIP</span>
              </button>
            </div>

            {date && time && selectedServices.length > 1 && (
              <div style={{ marginTop: 20 }}>
                <p style={{ fontFamily: ff, fontSize: 10, letterSpacing: "3px", color: TAUPE, marginBottom: 12, textTransform: "uppercase" }}>Especialista por servicio</p>
                {planState.kind === "loading" && (
                  <p style={{ fontFamily: ff, fontSize: 12, color: TAUPE }}>Verificando disponibilidad…</p>
                )}
                {(planState.kind === "done" || planState.kind === "awaiting") && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {planState.kind === "done" && planState.note && (
                      <p style={{ fontFamily: ff, fontSize: 12, color: PINK, fontStyle: "italic", margin: "0 0 4px" }}>{planState.note}</p>
                    )}
                    {planState.assignments.map(a => (
                      <div key={a.serviceName} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", border: "1px solid #f0d8e4", background: "#fdf8fc" }}>
                        <span style={{ fontFamily: ff, fontSize: 12, color: INK }}>{a.serviceName} · {minsToSlot(a.start)}</span>
                        <span style={{ fontFamily: ff, fontSize: 12, fontWeight: 600, color: PINK }}>{techMode === "any" ? "Primera disponible" : a.specialistName}</span>
                      </div>
                    ))}
                    {planState.kind === "awaiting" && (
                      <div style={{ padding: "12px 14px", border: "1px solid " + PINK, background: "#fff" }}>
                        <p style={{ fontFamily: ff, fontSize: 12, color: INK, marginBottom: 10 }}>¿Con quién deseas <strong>{planState.pendingService}</strong>?</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <button type="button"
                            onClick={() => setPlanChoices(prev => ({ ...prev, [planState.kind === "awaiting" ? planState.pendingService : ""]: planState.kind === "awaiting" ? planState.options[0].specialist.id : "" }))}
                            style={{ padding: "10px 12px", border: "1px solid " + PINK, background: "#fdf0f5", cursor: "pointer", textAlign: "left", fontFamily: ff, fontSize: 12, fontWeight: 600, color: PINK }}>
                            Primera disponible
                          </button>
                          {planState.options.map(o => (
                            <button key={o.specialist.id} type="button"
                              onClick={() => setPlanChoices(prev => ({ ...prev, [planState.kind === "awaiting" ? planState.pendingService : ""]: o.specialist.id }))}
                              style={{ padding: "10px 12px", border: "1px solid #f0d8e4", background: "#fff", cursor: "pointer", textAlign: "left", fontFamily: ff, fontSize: 12, color: INK }}>
                              {o.specialist.full_name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {planState.kind === "partial" && (
                  <div style={{ padding: "12px 14px", border: "1px solid " + PINK, background: "#fdf0f5" }}>
                    <p style={{ fontFamily: ff, fontSize: 12, color: INK, marginBottom: planState.suggestionTime !== null && partialAccept === null ? 10 : 0 }}>
                      Solo podremos atender {planState.fitted.length} de tus {selectedServices.length} servicios consecutivamente a las {time}.
                      {planState.suggestionTime !== null
                        ? ` Podemos hacer "${planState.leftover}" en la siguiente hora disponible: ${minsToSlot(planState.suggestionTime)}. ¿Deseas tomarlo?`
                        : ` No encontramos espacio disponible para "${planState.leftover}" cerca de esta hora — prueba otro horario.`}
                    </p>
                    {planState.suggestionTime !== null && partialAccept === null && (
                      <div style={{ display: "flex", gap: 8 }}>
                        <button type="button" onClick={() => setPartialAccept("yes")}
                          style={{ flex: 1, padding: "9px 12px", border: "1px solid " + PINK, background: PINK, cursor: "pointer", fontFamily: ff, fontSize: 12, fontWeight: 600, color: "#fff" }}>
                          Sí, tomarlo
                        </button>
                        <button type="button" onClick={() => setPartialAccept("no")}
                          style={{ flex: 1, padding: "9px 12px", border: "1px solid #f0d8e4", background: "#fff", cursor: "pointer", fontFamily: ff, fontSize: 12, color: INK }}>
                          No, gracias
                        </button>
                      </div>
                    )}
                    {planState.suggestionTime !== null && partialAccept !== null && (
                      <p style={{ fontFamily: ff, fontSize: 12, color: PINK, fontWeight: 600, margin: 0 }}>
                        {partialAccept === "yes"
                          ? `Se agendará "${planState.leftover}" como cita aparte a las ${minsToSlot(planState.suggestionTime)}.`
                          : `"${planState.leftover}" no se incluirá en esta cita.`}
                        {" "}<button type="button" onClick={() => setPartialAccept(null)} style={{ background: "none", border: "none", color: INK, textDecoration: "underline", cursor: "pointer", fontFamily: ff, fontSize: 12, padding: 0 }}>Cambiar</button>
                      </p>
                    )}
                  </div>
                )}
                {planState.kind === "none" && (
                  <div style={{ padding: "12px 14px", border: "1px solid #f0d8e4", background: "#fdf8fc" }}>
                    <p style={{ fontFamily: ff, fontSize: 12, color: INK }}>No hay especialistas disponibles para todos estos servicios a esta hora. Prueba otro horario.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── PANEL 6: Resumen + Políticas + Submit ── */}
        <div ref={panel6Ref} style={panelStyle(!step5Done || !planResolved)}>
          {panelHead("6", "Resumen y confirmación")}
          <form onSubmit={handleSubmit} style={{ padding: "24px" }}>

            {/* Summary box */}
            <div style={{ background: "#fdf0f5", border: "1px solid #f0d8e4", padding: "18px 20px", marginBottom: 24 }}>
              <p style={{ fontFamily: ff, fontSize: 10, letterSpacing: "3px", color: TAUPE, marginBottom: 14, textTransform: "uppercase" }}>Detalle de tu cita</p>
              {[
                ["Servicio",      planState.kind === "partial" ? planState.fitted.map(a => a.serviceName).join(" + ") : (svcNames.join(" + ") || "—")],
                selectedAddon.id !== "none" ? ["Diseño add-on", selectedAddon.label + " (+$" + selectedAddon.price + ")"] : null,
                refImage ? ["Imagen ref.", refImage.file.name] : null,
                needsDiabeticoQ ? ["Diabético/a", isDiabetico === "yes" ? "Sí" : "No"] : null,
                ["Especialista",  techMode === "any" ? "Primera disponible" : (chosenSpec?.full_name ?? "—")],
                ["Fecha",         date ? (DAYS[date.getDay()] + " " + date.getDate() + " " + MONTHS[date.getMonth()]) : "—"],
                ["Hora",          time || "—"],
                planState.kind === "partial" && partialAccept === "yes" && planState.leftoverAssignment
                  ? ["Cita aparte", `${planState.leftover} a las ${minsToSlot(planState.leftoverAssignment.start)}`]
                  : null,
              ].filter((x): x is [string,string] => x !== null).map(([k, v]) => (
                <div key={k as string} style={{ display: "flex", justifyContent: "space-between", fontFamily: ff, fontSize: 12, marginBottom: 8 }}>
                  <span style={{ color: TAUPE }}>{k}</span>
                  <span style={{ color: INK, fontWeight: 500, textAlign: "right", maxWidth: "60%" }}>{v}</span>
                </div>
              ))}
              {effectivePromo && discountAmt > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: ff, fontSize: 12, marginBottom: 6 }}>
                  <span style={{ color: "#73815e" }}>🎉 {activeDayPromo ? "Día promocional" : (activePromo as {title:string}).title}</span>
                  <span style={{ color: "#73815e", fontWeight: 600 }}>-{effectivePromo.discount_type==='percent' ? effectivePromo.discount_value+'%' : '$'+effectivePromo.discount_value.toFixed(0)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: ff, fontSize: 13, paddingTop: 12, borderTop: "1px solid #f0d8e4", marginTop: 6 }}>
                <span style={{ color: TAUPE, fontWeight: 600 }}>Precio estimado</span>
                <div style={{ textAlign: "right" }}>
                  {effectivePromo && discountAmt > 0 && totalPrice > 0 && (
                    <span style={{ fontFamily: ff, fontSize: 12, color: TAUPE, textDecoration: "line-through", display: "block", marginBottom: 2 }}>${totalPrice.toFixed(0)}</span>
                  )}
                  <span style={{ color: GOLD, fontWeight: 700, fontSize: 16 }}>{priceDisplay}</span>
                </div>
              </div>
            </div>

            {/* Policy checkbox */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 24 }}>
              <div onClick={() => setPolicyAccepted(!policyAccepted)}
                style={{ marginTop: 2, width: 20, height: 20, flexShrink: 0, border: "1px solid " + (policyAccepted ? PINK : "#f0d8e4"), background: policyAccepted ? PINK : "#fff", display: "flex", alignItems: "center", justifyContent: "center", transition: "background .2s, border-color .2s", cursor: "pointer" }}>
                {policyAccepted && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
              </div>
              <span style={{ fontFamily: ff, fontSize: 12, color: TAUPE, lineHeight: 1.7 }}>
                Al agendar acepto las{" "}
                <a href="/#politicas" style={{ color: PINK, textDecoration: "underline" }}>políticas del salón</a>
                {" "}incluyendo la política de cancelación y depósito.
              </span>
            </div>

            {submitError && <p style={{ fontFamily: ff, fontSize: 12, color: "#c0392b", marginBottom: 16 }}>{submitError}</p>}

            <button type="submit" disabled={loading || !policyAccepted}
              style={{ width: "100%", padding: "15px", background: (loading || !policyAccepted) ? "#d0b0c0" : PINK, color: "#fff", border: "none", fontFamily: ff, fontSize: 12, letterSpacing: "3px", fontWeight: 600, cursor: (loading || !policyAccepted) ? "not-allowed" : "pointer", transition: "background .2s", textTransform: "uppercase" }}
              onMouseEnter={e => { if (!loading && policyAccepted) (e.currentTarget as HTMLElement).style.background = DPINK; }}
              onMouseLeave={e => { if (!loading && policyAccepted) (e.currentTarget as HTMLElement).style.background = PINK; }}>
              {loading ? "Enviando…" : "Agendar →"}
            </button>
          </form>
        </div>

      </div>

      {showVipModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(42,26,32,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", overflowY: "auto" }} onClick={() => setShowVipModal(false)}>
          <div style={{ background: "#fff", maxWidth: 460, width: "100%", padding: 28 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: ffS, fontSize: 24, color: INK, margin: "0 0 8px" }}>Horario VIP</h3>
            <p style={{ fontFamily: ff, fontSize: 12, color: TAUPE, lineHeight: 1.8, marginBottom: 20 }}>
              ¿Necesitas tu cita fuera de nuestro horario regular? Nuestro Horario VIP te permite solicitar determinados servicios en horarios especiales, sujeto a disponibilidad de la profesional. Este servicio conlleva un cargo adicional al precio regular. La solicitud deberá ser confirmada por nuestro equipo antes de realizar cualquier pago o considerar la cita reservada.
            </p>
            <form onSubmit={submitVipRequest} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {svcNames.length > 0 && (
                <div>
                  <label style={{ fontFamily: ff, fontSize: 10, letterSpacing: "2px", color: TAUPE, textTransform: "uppercase" }}>Servicio(s)</label>
                  <p style={{ fontFamily: ff, fontSize: 13, color: INK, margin: "4px 0 0" }}>{svcNames.join(", ")}</p>
                </div>
              )}
              <div>
                <label style={{ fontFamily: ff, fontSize: 10, letterSpacing: "2px", color: TAUPE, textTransform: "uppercase" }}>Profesional de preferencia (opcional)</label>
                <select value={vipForm.specialistId} onChange={e => setVipForm(f => ({ ...f, specialistId: e.target.value }))}
                  style={{ width: "100%", marginTop: 6, padding: "11px 12px", border: "1px solid #f0d8e4", fontFamily: ff, fontSize: 13, color: INK, background: "#fff" }}>
                  <option value="">Cualquiera / primera disponible</option>
                  {specialists.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontFamily: ff, fontSize: 10, letterSpacing: "2px", color: TAUPE, textTransform: "uppercase" }}>Fecha deseada</label>
                  <input required type="date" min={new Date().toISOString().slice(0,10)} value={vipForm.date} onChange={e => setVipForm(f => ({ ...f, date: e.target.value }))}
                    style={{ width: "100%", marginTop: 6, padding: "11px 12px", border: "1px solid #f0d8e4", fontFamily: ff, fontSize: 13, color: INK, boxSizing: "border-box" }}/>
                </div>
                <div>
                  <label style={{ fontFamily: ff, fontSize: 10, letterSpacing: "2px", color: TAUPE, textTransform: "uppercase" }}>Hora deseada</label>
                  <input required type="time" value={vipForm.time} onChange={e => setVipForm(f => ({ ...f, time: e.target.value }))}
                    style={{ width: "100%", marginTop: 6, padding: "11px 12px", border: "1px solid #f0d8e4", fontFamily: ff, fontSize: 13, color: INK, boxSizing: "border-box" }}/>
                </div>
              </div>
              <div>
                <label style={{ fontFamily: ff, fontSize: 10, letterSpacing: "2px", color: TAUPE, textTransform: "uppercase" }}>Nota adicional (opcional)</label>
                <textarea rows={2} value={vipForm.note} onChange={e => setVipForm(f => ({ ...f, note: e.target.value }))}
                  style={{ width: "100%", marginTop: 6, padding: "11px 12px", border: "1px solid #f0d8e4", fontFamily: ff, fontSize: 13, color: INK, resize: "none", boxSizing: "border-box" }}/>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button type="submit" disabled={vipSaving} style={{ flex: 1, padding: "13px", background: PINK, color: "#fff", border: "none", fontFamily: ff, fontSize: 11, letterSpacing: "2px", fontWeight: 600, cursor: vipSaving ? "not-allowed" : "pointer", textTransform: "uppercase" }}>
                  {vipSaving ? "Enviando..." : "Enviar Solicitud"}
                </button>
                <button type="button" onClick={() => setShowVipModal(false)} style={{ flex: 1, padding: "13px", background: "#fff", color: TAUPE, border: "1px solid #f0d8e4", fontFamily: ff, fontSize: 11, letterSpacing: "2px", fontWeight: 600, cursor: "pointer", textTransform: "uppercase" }}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
