import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { SERVICE_CATEGORIES } from '@/components/site/data'
import { business } from '@/config/business.config'
import { resolveStep, findWorkingOrder, findPartialFit, slotToMins, minsToSlot, type BusyRange, type SpecialistLite, type SpecialistServiceLite, type ServiceAssignment } from '@/lib/scheduling'

function parseDuration(dur: string | number | undefined): number {
  if (typeof dur === 'number') return dur
  if (!dur) return 60
  const h = String(dur).match(/(\d+)\s*h/)
  const m = String(dur).match(/(\d+)\s*min/)
  return (h ? parseInt(h[1]) * 60 : 0) + (m ? parseInt(m[1]) : 0) || 60
}

type Profile = { id: string; full_name: string; role: 'admin' | 'specialist' | 'agenda'; email: string; avatar_url?: string; bio?: string; active?: boolean; role_label?: string }

export const Route = createFileRoute('/admin')({ component: AdminPage })

const ff  = 'Montserrat, DM Sans, ui-sans-serif, system-ui, sans-serif'
const ffS = 'Cinzel Decorative, serif'
const ffBody = 'Cormorant Garamond, serif'
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAYS   = ['D','L','M','M','J','V','S']
const TIMES  = ['8:00 AM','8:30 AM','9:00 AM','9:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM','12:00 PM','12:30 PM','1:00 PM','1:30 PM','2:00 PM','2:30 PM','3:00 PM','3:30 PM','4:00 PM','4:30 PM','5:00 PM','5:30 PM']
const DURATIONS=['15min','30min','45min','1h','1h 15min','1h 30min','1h 45min','2h','2h 15min','2h 30min','2h 45min','3h']
// Wider range than TIMES (which is capped at 5:30 PM for appointment slots) —
// a salon's open/close hours can extend later than the last bookable slot.
const SCHEDULE_TIMES=['6:00 AM','6:30 AM','7:00 AM','7:30 AM','8:00 AM','8:30 AM','9:00 AM','9:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM','12:00 PM','12:30 PM','1:00 PM','1:30 PM','2:00 PM','2:30 PM','3:00 PM','3:30 PM','4:00 PM','4:30 PM','5:00 PM','5:30 PM','6:00 PM','6:30 PM','7:00 PM','7:30 PM','8:00 PM','8:30 PM','9:00 PM','9:30 PM','10:00 PM']
const DAY_NAMES_SHORT=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
function formatHours(hours:DayHours[]):string{
  const byDay=[...hours].sort((a,b)=>a.day-b.day)
  const parts:string[]=[]
  let i=0
  while(i<byDay.length){
    const start=byDay[i]
    let j=i
    while(j+1<byDay.length&&byDay[j+1].closed===start.closed&&byDay[j+1].open===start.open&&byDay[j+1].close===start.close) j++
    const label=i===j?DAY_NAMES_SHORT[start.day]:`${DAY_NAMES_SHORT[start.day]} y ${DAY_NAMES_SHORT[byDay[j].day]}`
    const rangeLabel=j>i+1?`${DAY_NAMES_SHORT[start.day]} – ${DAY_NAMES_SHORT[byDay[j].day]}`:label
    parts.push(`${rangeLabel} · ${start.closed?'Cerrado':`${start.open} – ${start.close}`}`)
    i=j+1
  }
  return parts.join('\n')
}
const DUR_MINS=Array.from({length:18},(_,i)=>(i+1)*10) // 10,20,...,180
const fmtDur=(m:number)=>m<60?`${m} min`:m===60?'1 h':`${Math.floor(m/60)}h${m%60?' '+m%60+'m':''}`
const WEEKDAYS_ES=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
const WORK_TIMES=['6:00 AM','6:30 AM','7:00 AM','7:30 AM','8:00 AM','8:30 AM','9:00 AM','9:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM','12:00 PM','12:30 PM','1:00 PM','1:30 PM','2:00 PM','2:30 PM','3:00 PM','3:30 PM','4:00 PM','4:30 PM','5:00 PM','5:30 PM','6:00 PM','6:30 PM','7:00 PM','7:30 PM','8:00 PM']

const C = {
  ink: 'var(--ink)', gold: 'var(--gold)', gray: 'var(--gray)',
  rosa: 'var(--rosa)', green: 'var(--green)', red: 'var(--red)', bg: 'var(--bg)',
  surface: 'var(--surface)', sb: 'var(--surface-border)',
  inputBg: 'var(--input-bg)', inputBorder: 'var(--input-border)',
  navBg: 'var(--nav-bg)', headerBg: 'var(--header-bg)',
}

const THEME = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700&family=Cinzel:wght@400;500;600&family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=Montserrat:wght@300;400;500;600&display=swap');
:root{--bg:#feeff2;--bg2:#f8e4ea;--surface:rgba(255,255,255,0.82);--surface-border:rgba(255,168,198,0.25);--ink:#2a1a20;--gray:#8a7080;--gold:#4A90D9;--rosa:#ffa8c6;--green:#73815e;--red:#c0392b;--nav-bg:rgba(254,239,242,0.96);--header-bg:rgba(254,239,242,0.98);--input-bg:rgba(255,255,255,0.85);--input-border:rgba(255,168,198,0.35);--overlay:rgba(42,26,32,0.5);}
[data-dark=true]{--bg:#1e1015;--bg2:#160c10;--surface:rgba(255,255,255,0.06);--surface-border:rgba(255,168,198,0.15);--ink:#f5eef0;--gray:#a08090;--gold:#6aaff5;--rosa:#ffa8c6;--green:#8fa87a;--red:#e05555;--nav-bg:rgba(24,13,18,0.97);--header-bg:rgba(24,13,18,0.98);--input-bg:rgba(255,255,255,0.07);--input-border:rgba(255,168,198,0.2);--overlay:rgba(0,0,0,0.65);}
*,*::before,*::after{box-sizing:border-box;}
html,body{overscroll-behavior:none;-webkit-font-smoothing:antialiased;margin:0;padding:0;background:var(--bg);}
button{touch-action:manipulation;outline:none;-webkit-tap-highlight-color:transparent;background:none;border:none;}
button:focus{outline:none;box-shadow:none;}
button:focus-visible{outline:2px solid color-mix(in srgb,var(--rosa) 55%,transparent);outline-offset:2px;}
button::-moz-focus-inner{border:0;padding:0;}
input,select,textarea{touch-action:manipulation;font-size:16px!important;-webkit-text-size-adjust:100%;}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes kFadeIn{from{opacity:0}to{opacity:1}}
@keyframes kMoreIn{from{opacity:0;transform:translateY(12px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}}
select option{background:var(--bg);color:var(--ink);}
/* ── Sheet modal clean inputs ───────────────────── */
.sheet-inner input,.sheet-inner select,.sheet-inner textarea{background:color-mix(in srgb,var(--rosa) 5%,#f8f8f8)!important;border-color:color-mix(in srgb,var(--rosa) 18%,transparent)!important;box-shadow:none!important;}
.sheet-inner input:focus,.sheet-inner select:focus,.sheet-inner textarea:focus{background:color-mix(in srgb,var(--rosa) 8%,#f8f8f8)!important;border-color:color-mix(in srgb,var(--rosa) 45%,transparent)!important;outline:none!important;}
[data-dark=true] .sheet-inner{background:#1e1015!important;}
[data-dark=true] .sheet-inner input,[data-dark=true] .sheet-inner select,[data-dark=true] .sheet-inner textarea{background:rgba(255,255,255,0.07)!important;border-color:rgba(255,168,198,0.18)!important;}
input[type=date]::-webkit-calendar-picker-indicator{opacity:0;position:absolute;right:0;width:100%;height:100%;cursor:pointer;}
input[type=date]{position:relative;}
/* ── Desktop sidebar layout ─────────────────────────── */
.admin-sidebar{display:none;}
.admin-pill-nav{display:flex;}
.admin-more-drawer{display:block;}
@media(min-width:900px){
  /* Sidebar */
  .admin-sidebar{
    display:flex!important;flex-direction:column;
    position:fixed;top:0;left:0;bottom:0;width:240px;z-index:110;
    padding:0 12px 20px;overflow-y:auto;
    scrollbar-width:none;
  }
  .admin-sidebar::-webkit-scrollbar{display:none;}
  /* Hide mobile elements */
  .admin-pill-nav{display:none!important;}
  .admin-more-drawer{display:none!important;}
  .admin-header-logo{display:none!important;}
  /* Header offset */
  .admin-header-wrap{margin-left:240px!important;}
  .admin-header-inner{max-width:100%!important;padding:0 32px!important;}
  /* Body offset */
  .admin-body-wrap{margin-left:240px!important;padding-bottom:48px!important;}
  .admin-content{max-width:1100px!important;padding:28px 0 0!important;}
  /* Dashboard 2-col grid */
  .dash-main-grid{display:grid!important;grid-template-columns:1fr 340px!important;grid-template-rows:auto auto!important;grid-template-areas:"cal stats" "cal pend"!important;gap:20px!important;align-items:start!important;}
  .dash-cal{grid-area:cal;}
  .dash-stats{grid-area:stats;}
  .dash-pend{grid-area:pend;}
  .dash-stats-grid{grid-template-columns:repeat(3,1fr)!important;}
  /* Cards hover lift */
  .glass-card{transition:box-shadow .18s,transform .18s!important;}
  .glass-card:hover{transform:translateY(-2px)!important;box-shadow:0 8px 32px rgba(42,26,32,0.13)!important;}
  /* ── Dashboard hero strip ───────────────────────── */
  .dash-hero{display:flex!important;align-items:center;justify-content:space-between;gap:24px;padding:26px 32px;border-radius:22px;margin-bottom:24px;background:linear-gradient(135deg,color-mix(in srgb,var(--rosa) 10%,var(--surface)),color-mix(in srgb,var(--gold) 8%,var(--surface)));border:1.5px solid color-mix(in srgb,var(--rosa) 22%,transparent);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);box-shadow:0 2px 28px rgba(42,26,32,0.08);}
  /* ── Stat card accent bars ──────────────────────── */
  .dash-stat-card{padding:20px 18px!important;overflow:hidden!important;}
  .dash-stat-card.stat-gold::after{content:'';position:absolute;left:0;top:0;bottom:0;width:4px;border-radius:0 3px 3px 0;background:var(--gold);}
  .dash-stat-card.stat-green::after{content:'';position:absolute;left:0;top:0;bottom:0;width:4px;border-radius:0 3px 3px 0;background:var(--green);}
  .dash-stat-card.stat-red::after{content:'';position:absolute;left:0;top:0;bottom:0;width:4px;border-radius:0 3px 3px 0;background:var(--red);}
  /* ── Calendar compact on desktop ───────────────── */
  .cal-day-btn{aspect-ratio:unset!important;height:34px!important;font-size:11px!important;}
  /* ── Historial premium cards ────────────────────── */
  .hist-session-card{padding:14px 18px!important;border-radius:14px!important;box-shadow:0 1px 8px rgba(42,26,32,0.05)!important;}
  .hist-log-card{padding:14px 16px!important;border-radius:14px!important;box-shadow:0 1px 8px rgba(42,26,32,0.04)!important;}
  .hist-section-hdr{font-size:13px!important;letter-spacing:0.06em!important;}
}
.dash-hero{display:none;}
/* ── Mobile improvements (max 899px) ──────────────── */
@media(max-width:899px){
  /* Stats + pending BEFORE calendar */
  /* Mobile order: pending → calendar → stats */
  .dash-main-grid{display:flex!important;flex-direction:column!important;}
  .dash-pend{order:1!important;}
  .dash-cal{order:2!important;}
  .dash-stats{order:3!important;}
  /* Compact calendar cells on mobile too */
  .cal-day-btn{aspect-ratio:unset!important;height:30px!important;font-size:11px!important;}
  /* Tighter stat cards */
  .dash-stat-card{padding:11px 10px!important;}
  /* Smaller stat number on mobile */
  .mob-stat-num{font-size:22px!important;margin:3px 0 1px!important;}
  /* Money values run wider than plain counts — shrink further so $ amounts never crowd the card */
  .mob-stat-num-money{font-size:18px!important;margin:3px 0 1px!important;}
  /* Show mobile-only hero strip */
  .mob-hero-strip{display:flex!important;}
  /* Hide redundant elements on mobile */
  .mob-hide{display:none!important;}
  /* Bigger bottom nav tap targets */
  .mob-pill-btn{padding:8px 14px!important;min-width:54px!important;}
  .mob-nav-lbl{font-size:10px!important;}
  /* Tighter filter bar on mobile */
  .mob-filter-bar{gap:8px!important;}
}
.mob-hero-strip{display:none;}
/* ═══ REDESIGN 2.0 — visual layer only, no logic ═══ */
/* Micro-interactions: every button feels alive */
button{transition:transform .12s ease, opacity .15s ease, background .15s ease, box-shadow .15s ease, color .15s ease;}
button:not(:disabled):active{transform:scale(0.97);}
button:disabled{cursor:not-allowed;}
a{transition:opacity .15s ease, transform .12s ease, box-shadow .15s ease;}
a:active{transform:scale(0.98);}
/* Input focus ring — subtle rosa glow */
input:focus,select:focus,textarea:focus{border-color:color-mix(in srgb,var(--rosa) 55%,transparent)!important;box-shadow:0 0 0 3px color-mix(in srgb,var(--rosa) 14%,transparent)!important;}
/* Sheet/modal entrance */
@keyframes kSheetIn{from{opacity:0;transform:translateY(18px) scale(0.98)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes kOverlayIn{from{opacity:0}to{opacity:1}}
.sheet-inner{animation:kSheetIn .28s cubic-bezier(.32,.72,.28,1) both;}
/* Skeleton shimmer for loading states */
@keyframes kShimmer{from{background-position:200% 0}to{background-position:-200% 0}}
.skeleton{background:linear-gradient(90deg,color-mix(in srgb,var(--ink) 5%,transparent) 25%,color-mix(in srgb,var(--ink) 10%,transparent) 50%,color-mix(in srgb,var(--ink) 5%,transparent) 75%);background-size:200% 100%;animation:kShimmer 1.4s linear infinite;border-radius:8px;}
/* Sleek scrollbars */
::-webkit-scrollbar{width:8px;height:8px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:color-mix(in srgb,var(--ink) 14%,transparent);border-radius:99px;}
::-webkit-scrollbar-thumb:hover{background:color-mix(in srgb,var(--ink) 24%,transparent);}
/* Typography polish: crisper headings */
h1,h2,h3{letter-spacing:-0.01em;}
/* Sidebar nav items: hover feedback */
.admin-sidebar button:hover{background:color-mix(in srgb,var(--rosa) 9%,transparent);}
/* Desktop refinements */
@media(min-width:900px){
  /* Sticky header with deeper blur */
  .admin-header-wrap{backdrop-filter:blur(16px) saturate(150%);-webkit-backdrop-filter:blur(16px) saturate(150%);}
  /* Card hover: layered shadow instead of flat */
  .glass-card:hover{box-shadow:0 2px 4px rgba(42,26,32,0.05), 0 12px 36px rgba(42,26,32,0.12)!important;}
  /* Buttons get lift on hover */
  button:not(:disabled):hover{opacity:0.92;}
}
/* Mobile refinements */
@media(max-width:899px){
  /* Min 44px tap targets on nav + primary actions */
  .mob-pill-btn{min-height:44px!important;}
  .admin-pill-nav button{min-height:44px;}
}
/* Respect reduced-motion */
@media(prefers-reduced-motion:reduce){
  *,*::before,*::after{animation-duration:0.01ms!important;transition-duration:0.01ms!important;}
}
`

//  ICONS
type IP={size?:number;color?:string;style?:React.CSSProperties}
const Ic={
  Calendar: ({size=20,color='currentColor',style}:IP)=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  Scissors: ({size=20,color='currentColor',style}:IP)=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>,
  Users:    ({size=20,color='currentColor',style}:IP)=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Archive:  ({size=20,color='currentColor',style}:IP)=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>,
  Plus:     ({size=20,color='currentColor',style}:IP)=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" style={style}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Check:    ({size=16,color='currentColor',style}:IP)=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={style}><polyline points="20 6 9 17 4 12"/></svg>,
  X:        ({size=16,color='currentColor',style}:IP)=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" style={style}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Search:   ({size=16,color='currentColor',style}:IP)=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" style={style}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  CL:       ({size=18,color='currentColor',style}:IP)=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><polyline points="15 18 9 12 15 6"/></svg>,
  CR:       ({size=18,color='currentColor',style}:IP)=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><polyline points="9 18 15 12 9 6"/></svg>,
  CD:       ({size=16,color='currentColor',style}:IP)=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><polyline points="6 9 12 15 18 9"/></svg>,
  Edit:     ({size=16,color='currentColor',style}:IP)=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Camera:   ({size=16,color='currentColor',style}:IP)=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  Trash:    ({size=16,color='currentColor',style}:IP)=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
  Clock:    ({size=16,color='currentColor',style}:IP)=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  WA:       ({size=16,style}:IP)=><svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={style}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>,
  Link:     ({size=16,color='currentColor',style}:IP)=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  Refresh:  ({size=18,color='currentColor',style}:IP)=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>,
  Logout:   ({size=18,color='currentColor',style}:IP)=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  Sun:      ({size=18,color='currentColor',style}:IP)=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  Moon:     ({size=18,color='currentColor',style}:IP)=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  Bell:     ({size=18,color='currentColor',style}:IP)=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  Warn:     ({size=20,color='currentColor',style}:IP)=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  Dollar:   ({size=20,color='currentColor',style}:IP)=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  Block:    ({size=20,color='currentColor',style}:IP)=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>,
  Download: ({size=16,color='currentColor',style}:IP)=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  Upload:   ({size=16,color='currentColor',style}:IP)=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  Settings: ({size=20,color='currentColor',style}:IP)=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  Package:  ({size=20,color='currentColor',style}:IP)=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  Tag:      ({size=18,color='currentColor',style}:IP)=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
}

//  TYPES
type Booking = {id:string;name:string;phone:string;service:string;date:string;time:string;status:string;notes?:string;created_at:string;business?:string;specialist?:string;gcal_event_id?:string|null;is_vip?:boolean;vip_surcharge?:number|null}
type BookingServiceRow = {id:string;booking_id:string;service_name:string;specialist_id:string|null;specialist_name:string;sequence_order:number;start_time:string;duration_minutes:number}
// Per-service breakdown for a booking — real rows when the booking was made
// with several services (each possibly a different specialist), or a single
// synthetic entry mirroring the booking's own service/specialist fields when
// it has no booking_services rows (legacy or single-service bookings).
function serviceBreakdown(b:Booking,svcMap:Map<string,BookingServiceRow[]>):{service:string;specialist:string;time?:string;duration?:number}[]{
  const rows=svcMap.get(b.id)
  if(rows&&rows.length) return [...rows].sort((a,c)=>a.sequence_order-c.sequence_order).map(r=>({service:r.service_name,specialist:r.specialist_name,time:r.start_time,duration:r.duration_minutes}))
  return [{service:b.service||'Sin servicio',specialist:b.specialist||'',time:b.time}]
}
// The client's reference/inspo photo (manicure design ref) is stored as a
// "Ref: <url>" segment inside the booking's pipe-joined notes field — pull
// the URL out so it can be shown as an actual thumbnail, not just text.
function refImageFromNotes(notes?:string|null):string|null{
  if(!notes)return null
  const part=notes.split('|').map(s=>s.trim()).find(s=>s.startsWith('Ref:'))
  return part?part.slice(4).trim():null
}
type Service = {id:string;category_id:string;category_title:string;name:string;description?:string;duration:string;price:string;cost:number;photo_url?:string;display_order:number;active:boolean;subgroup?:string|null}
type CategorySubgroup = {id:string;category_title:string;name:string;display_order:number}
type CrmClient = {id?:string;name:string;phone?:string;notes?:string;preferences?:string;profile_notes?:string;email?:string;address?:string;city?:string;allergens?:string;discount?:number;booking_count?:number;web_communication_agreement?:boolean;processing_consent?:boolean;blacklisted?:boolean;booksy_id?:string}
type Deposit = {id:string;client_name:string;client_phone:string;amount:number;concept:string;status:'pendiente'|'solicitado'|'recibido'|'utilizado'|'retenido';booking_id?:string;notes?:string;created_at:string}
type AvailBlock = {id:string;specialist_name:string;date:string;start_time?:string;end_time?:string;all_day:boolean;reason?:string;created_at:string;status?:'pending'|'approved'|'rejected'}
type Product = {id:string;name:string;price:number;cost:number;description?:string;stock:number;active:boolean;photo_url?:string;created_at:string;category?:string|null}
type SpecialistSchedule = {id:string;specialist_id:string;day_of_week:number;start_time:string;end_time:string;active:boolean}
type Promotion = {id:string;title:string;description?:string;discount_type:'percent'|'fixed';discount_value:number;service_name?:string;specialist_name?:string;active:boolean;starts_at?:string;ends_at?:string;created_at:string}
type PromoDay = {id:string;date:string;discount_type:'percent'|'fixed';discount_value:number;specialist_name:string;service_name?:string;note?:string;active:boolean;created_at:string}
type DayHours = {day:number;open:string;close:string;closed:boolean}
type SalonSettings = {salon_name:string;address:string;phone:string;email:string;whatsapp:string;instagram_url:string;facebook_url:string;schedule_notes:string;payment_methods:string;policies_text:string;hours?:DayHours[]|null}

//  HELPERS
const glass=(e:React.CSSProperties={}):React.CSSProperties=>({background:C.surface,backdropFilter:'blur(20px) saturate(160%)',WebkitBackdropFilter:'blur(20px) saturate(160%)',border:`1px solid ${C.sb}`,boxShadow:'0 1px 2px rgba(46,27,20,0.04), 0 8px 28px rgba(46,27,20,0.07)',borderRadius:20,...e})
const inp=(e:React.CSSProperties={}):React.CSSProperties=>({width:'100%',boxSizing:'border-box' as const,padding:'11px 14px',borderRadius:10,border:`1.5px solid ${C.inputBorder}`,background:C.inputBg,fontSize:13,fontFamily:ff,color:C.ink,outline:'none',transition:'border-color .15s ease, background .15s ease, box-shadow .15s ease',...e})
const lbl:React.CSSProperties={fontSize:11,fontWeight:700,color:C.gray,textTransform:'uppercase',letterSpacing:'0.08em',display:'block',marginBottom:4}
const STAFF=['Norelis Cruz','Paola N. Rolón']

// Hook: specialist full names from DB (used in modals)
function useSpecialistNames(){
  const[names,setNames]=useState<string[]>(STAFF)
  useEffect(()=>{
    supabase.from('profiles').select('full_name').eq('active',true).eq('role','specialist').order('full_name')
      .then(({data})=>{ if(data&&data.length>0) setNames(data.map((p:any)=>p.full_name)) },()=>{})
  },[])
  return names
}
function SpecialistSelect({value,onChange,required}:{value:string;onChange:(v:string)=>void;required?:boolean}){
  const names=useSpecialistNames()
  return(
    <select style={inp()} value={value} onChange={e=>onChange(e.target.value)} required={required}>
      <option value="">Sin asignar</option>
      {names.map(s=><option key={s} value={s}>{s}</option>)}
    </select>
  )
}
// Input with left icon
function IconInput({icon,children}:{icon:React.ReactNode;children:React.ReactNode}){
  return(
    <div style={{position:'relative',display:'flex',alignItems:'center'}}>
      <div style={{position:'absolute',left:12,pointerEvents:'none',display:'flex',zIndex:1}}>{icon}</div>
      <div style={{width:'100%'}}>{children}</div>
    </div>
  )
}
const fmtDate=(d:string)=>{const[y,m,day]=d.split('-');return`${day}/${m}/${y}`}
const DIAS_LARGO=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
const MESES_LARGO=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
const fmtDateLong=(d:string)=>{const[y,m,day]=d.split('-').map(Number);return`${DIAS_LARGO[new Date(y,m-1,day).getDay()]} ${day} de ${MESES_LARGO[m-1]} ${y}`}

type NotifyTarget={role:'admin'}|{role:'specialist';name:string}|{role:'admin_and_specialist';name:string}
type NotifyKind='new_booking'|'cancelled'|'no_show'|'rescheduled'|'block_request'|'block_approved'|'block_rejected'|'service_request'|'service_approved'|'service_rejected'|'auto_completed'
// Push for admin/specialist actions other than a brand-new booking (that one
// fires from the Supabase webhook instead). Best-effort — never blocks the
// action it's attached to if the push fails or isn't configured yet. Also
// logs a row to `notifications` (in-panel feed, see Notificaciones) so the
// admin/specialist has a persistent place to see and act on this even if
// the push itself never arrives or gets dismissed.
async function sendNotify(payload:{title:string;body:string;tag?:string;bookingId?:string;target:NotifyTarget;kind?:NotifyKind;refId?:string;refDate?:string;requiresAction?:boolean}){
  const{title,body,tag,bookingId,target,kind,refId,refDate,requiresAction}=payload
  try{
    await fetch('/api/notify',{
      method:'POST',
      headers:{'Content-Type':'application/json',Authorization:`Bearer ${import.meta.env.VITE_SUPABASE_SERVICE_KEY}`},
      body:JSON.stringify({title,body,tag,bookingId,target}),
    })
  }catch{}
  if(!kind)return
  try{
    await supabaseAdmin.from('notifications').insert([{
      title,body,kind,
      target_role:target.role,
      target_specialist_name:target.role==='admin'?null:target.name,
      ref_id:refId??bookingId??null,
      ref_date:refDate??null,
      requires_action:!!requiresAction,
    }])
  }catch{}
}
const todayStr=()=>new Date().toISOString().slice(0,10)
const waUrl=(phone:string,msg:string)=>`https://wa.me/${phone.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`
function gcalDelete(eventId?:string|null){
  if(!eventId)return
  // gcal_event_id may hold several comma-separated ids for a multi-service booking.
  for(const id of eventId.split(',').map(s=>s.trim()).filter(Boolean)){
    fetch('/api/gcal-delete-event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({eventId:id})}).catch(e=>console.error('[gcal-delete]',e))
  }
}
async function gcalPostEvent(b:{id:string;name:string;service:string;specialist?:string;date:string;time:string;notes?:string;duration_minutes?:number}):Promise<string|null>{
  try{
    const r=await fetch('/api/gcal-add-event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({booking_id:b.id,client_name:b.name,service:b.service,specialist:b.specialist||'',date:b.date,time:b.time,notes:b.notes,duration_minutes:b.duration_minutes})})
    const body=await r.json().catch(()=>null)
    return r.ok&&body?.eventId?body.eventId as string:null
  }catch(e){console.error('[gcal-create]',e);return null}
}
async function gcalCreate(b:{id:string;name:string;service:string;specialist?:string;date:string;time:string;notes?:string;duration_minutes?:number},client:typeof supabase=supabase){
  const eventId=await gcalPostEvent(b)
  if(eventId) await client.from('bookings').update({gcal_event_id:eventId}).eq('id',b.id)
}
// Multi-service bookings get one calendar event PER service (own specialist,
// own real start time, own real duration) instead of a single generic event
// at the booking's nominal time — so each specialist's calendar accurately
// blocks only her own slot. Falls back to the single-event path when there's
// only one row. Event ids are stored comma-separated in gcal_event_id.
async function gcalCreateBreakdown(b:{id:string;name:string;date:string;time:string;notes?:string},rows:{service:string;specialist:string;time?:string;duration?:number}[],client:typeof supabase=supabase){
  if(rows.length<=1){
    const r=rows[0]
    await gcalCreate({id:b.id,name:b.name,service:r?.service||'',specialist:r?.specialist,date:b.date,time:r?.time||b.time,notes:b.notes,duration_minutes:r?.duration},client)
    return
  }
  const ids:string[]=[]
  for(const r of rows){
    const eventId=await gcalPostEvent({id:b.id,name:b.name,service:r.service,specialist:r.specialist,date:b.date,time:r.time||b.time,notes:b.notes,duration_minutes:r.duration})
    if(eventId) ids.push(eventId)
  }
  if(ids.length) await client.from('bookings').update({gcal_event_id:ids.join(',')}).eq('id',b.id)
}
const SALON_PIN='https://maps.app.goo.gl/wKKFq3yQotCPLJ1PA'
const confirmMsg=(b:Booking,isNew:boolean)=>isNew
  ?`¡Hola ${b.name}! Tu cita en ${business.name} está confirmada para el ${fmtDateLong(b.date)} a las ${b.time}.\n\nServicio: ${b.service||'por confirmar'}\n\nGracias por elegir ${business.name}.\n\n${SALON_PIN}\n\n¡Esperamos conocerte pronto!`
  :`¡Hola ${b.name}! Tu cita en ${business.name} está confirmada para el ${fmtDateLong(b.date)} a las ${b.time}.\n\nServicio: ${b.service||'por confirmar'}\n\n${SALON_PIN}\n\n¡Esperamos verte pronto!`
const reschedMsg=(b:Booking)=>`¡Hola ${b.name}! Tu cita en ${business.name} fue reagendada para el ${fmtDateLong(b.date)} a las ${b.time}.\n\nServicio: ${b.service||'por confirmar'}\n\n${SALON_PIN}\n\n¡Te esperamos!`

//  SHEET
function Sheet({onClose,children}:{onClose:()=>void;children:React.ReactNode}){
  const[mounted,setMounted]=useState(false)
  useEffect(()=>{
    setMounted(true)
    const y=window.scrollY
    document.body.style.overflow='hidden'
    document.body.style.touchAction='none'
    return()=>{
      document.body.style.overflow=''
      document.body.style.touchAction=''
      window.scrollTo(0,y)
    }
  },[])
  if(!mounted) return null
  return createPortal(
    <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,zIndex:9000,background:'var(--overlay)',backdropFilter:'blur(6px)',WebkitBackdropFilter:'blur(6px)',display:'flex',alignItems:'flex-start',justifyContent:'center',padding:'40px 16px 60px',overflowY:'auto',WebkitOverflowScrolling:'touch' as any,animation:'kOverlayIn .2s ease both'}} onClick={onClose}>
      <div className="sheet-inner" style={{background:'#fff',borderRadius:22,padding:'24px 20px 32px',width:'100%',maxWidth:480,boxShadow:'0 2px 8px rgba(0,0,0,0.08), 0 24px 64px rgba(0,0,0,0.24)'}} onClick={e=>e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body
  )
}
function SheetHandle({title,onClose}:{title:string;onClose:()=>void}){
  return(
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
      <h3 style={{fontFamily:ffS,fontSize:22,fontWeight:500,color:C.ink,margin:0}}>{title}</h3>
      <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:C.gray,padding:6}}><Ic.X size={20} color={C.gray}/></button>
    </div>
  )
}
function WABtn({href,label='Enviar por WhatsApp'}:{href:string;label?:string}){
  return <a href={href} target="_blank" rel="noreferrer" style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10,padding:'14px',borderRadius:12,background:'#25d366',color:'#fff',fontWeight:700,fontSize:14,textDecoration:'none',fontFamily:ff}}><Ic.WA size={18}/>{label}</a>
}
function CloseBtn({onClose}:{onClose:()=>void}){
  return <button onClick={onClose} style={{padding:'13px',borderRadius:12,background:`color-mix(in srgb, var(--ink) 7%, transparent)`,color:C.gray,fontWeight:600,fontSize:13,border:'none',cursor:'pointer',fontFamily:ff,width:'100%'}}>Cerrar</button>
}
function SuccessIcon({color='var(--green)'}:{color?:string}){
  return <div style={{width:52,height:52,borderRadius:'50%',background:color,opacity:0.9,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px'}}><Ic.Check size={26} color="#fff"/></div>
}

//  CONFIRM SHEET
function ConfirmSheet({booking,onClose,isAdmin=true,isNew=true}:{booking:Booking;onClose:()=>void;isAdmin?:boolean;isNew?:boolean}){
  const depositLink=`${STRIPE_PAYMENT_LINK}?client_reference_id=${booking.id}`
  return(
    <Sheet onClose={onClose}>
      <div style={{textAlign:'center',marginBottom:22}}>
        <SuccessIcon/>
        <h3 style={{fontFamily:ffS,fontSize:22,fontWeight:500,color:C.ink,margin:0}}>Cita confirmada</h3>
        <p style={{fontSize:13,color:C.gray,margin:'6px 0 0'}}>{booking.name} · {fmtDate(booking.date)} · {booking.time}</p>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {isAdmin&&<WABtn href={waUrl(booking.phone,depositMsg(booking,depositLink,isNew))} label="Solicitar Depósito"/>}
        {isAdmin&&<WABtn href={waUrl(booking.phone,confirmMsg(booking,isNew))} label="Enviar Confirmación"/>}
        <CloseBtn onClose={onClose}/>
      </div>
    </Sheet>
  )
}

//  RESCHEDULE SHEET
function RescheduleSheet({booking,onClose,isAdmin=true}:{booking:Booking;onClose:()=>void;isAdmin?:boolean}){
  return(
    <Sheet onClose={onClose}>
      <div style={{textAlign:'center',marginBottom:22}}>
        <SuccessIcon color="var(--gold)"/>
        <h3 style={{fontFamily:ffS,fontSize:22,fontWeight:500,color:C.ink,margin:0}}>Cita reagendada</h3>
        <p style={{fontSize:13,color:C.gray,margin:'6px 0 0'}}>{booking.name} · {fmtDate(booking.date)} · {booking.time}</p>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {/* WABtn hidden for specialists */}
        {isAdmin&&<WABtn href={waUrl(booking.phone,reschedMsg(booking))}/>}
        <CloseBtn onClose={onClose}/>
      </div>
    </Sheet>
  )
}

//  CANCEL MODAL
function CancelModal({booking,onClose,onDone}:{booking:Booking;onClose:()=>void;onDone:()=>void}){
  async function choose(status:'cancelled'|'no_show'){
    await supabaseAdmin.from('bookings').update({status,gcal_event_id:null}).eq('id',booking.id)
    logAction(status==='cancelled'?'cancel_booking':'no_show',`${booking.name} · ${booking.service} · ${booking.date}`)
    gcalDelete(booking.gcal_event_id)
    sendNotify({
      title:status==='cancelled'?'Cita cancelada':'No-show registrado',
      body:`${booking.name} - ${booking.service||'Servicio'} - ${fmtDateLong(booking.date)} a las ${booking.time}`,
      tag:`${status}-${booking.id}`,
      bookingId:booking.id,
      target:booking.specialist?{role:'admin_and_specialist',name:booking.specialist}:{role:'admin'},
      kind:status==='cancelled'?'cancelled':'no_show',refId:booking.id,refDate:booking.date,
    })
    onDone(); onClose()
  }
  return(
    <Sheet onClose={onClose}>
      <div style={{textAlign:'center',marginBottom:22}}>
        <div style={{width:52,height:52,borderRadius:'50%',background:'color-mix(in srgb, var(--red) 15%, transparent)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px'}}><Ic.Warn size={24} color={C.red}/></div>
        <h3 style={{fontFamily:ffS,fontSize:22,fontWeight:500,color:C.ink,margin:0}}>¿Qué pasó?</h3>
        <p style={{fontSize:13,color:C.gray,margin:'6px 0 0'}}>{booking.name} · {fmtDate(booking.date)} · {booking.time}</p>
      </div>
      <div style={{display:'flex',gap:12}}>
        <button onClick={()=>choose('cancelled')} style={{flex:1,padding:'16px 12px',borderRadius:14,background:'color-mix(in srgb, var(--gold) 12%, transparent)',color:C.ink,fontWeight:700,fontSize:13,border:`1.5px solid color-mix(in srgb, var(--gold) 30%, transparent)`,cursor:'pointer',fontFamily:ff,lineHeight:1.3}}>
          El cliente<br/>canceló
        </button>
        <button onClick={()=>choose('no_show')} style={{flex:1,padding:'16px 12px',borderRadius:14,background:'color-mix(in srgb, var(--red) 10%, transparent)',color:C.red,fontWeight:700,fontSize:13,border:`1.5px solid color-mix(in srgb, var(--red) 25%, transparent)`,cursor:'pointer',fontFamily:ff,lineHeight:1.3}}>
          No show
        </button>
      </div>
      <div style={{marginTop:10}}><CloseBtn onClose={onClose}/></div>
    </Sheet>
  )
}

//  DELETE CONFIRM
function DeleteConfirm({msg,onClose,onConfirm}:{msg:string;onClose:()=>void;onConfirm:()=>void}){
  return(
    <Sheet onClose={onClose}>
      <div style={{textAlign:'center',marginBottom:22}}>
        <div style={{width:52,height:52,borderRadius:'50%',background:'color-mix(in srgb, var(--red) 12%, transparent)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px'}}><Ic.Trash size={24} color={C.red}/></div>
        <h3 style={{fontFamily:ffS,fontSize:20,fontWeight:500,color:C.ink,margin:0}}>¿Estás seguro?</h3>
        <p style={{fontSize:13,color:C.gray,margin:'8px 0 0'}}>{msg}</p>
      </div>
      <div style={{display:'flex',gap:10}}>
        <button onClick={onClose} style={{flex:1,padding:'13px',borderRadius:12,background:`color-mix(in srgb, var(--ink) 7%, transparent)`,color:C.gray,fontWeight:600,fontSize:13,border:'none',cursor:'pointer',fontFamily:ff}}>Cancelar</button>
        <button onClick={onConfirm} style={{flex:1,padding:'13px',borderRadius:12,background:C.red,color:'#fff',fontWeight:700,fontSize:13,border:'none',cursor:'pointer',fontFamily:ff}}>Borrar</button>
      </div>
    </Sheet>
  )
}

//  EDIT CITA MODAL
function EditCitaModal({booking,services,onClose,onDone,isAdmin}:{booking:Booking;services:Service[];onClose:()=>void;onDone:(updated?:Booking)=>void;isAdmin:boolean}){
  const [date,setDate]=useState(booking.date)
  const [time,setTime]=useState(booking.time)
  const [service,setService]=useState(booking.service||'')
  const [specialist,setSpecialist]=useState(booking.specialist||booking.business||'')
  const [notes,setNotes]=useState(booking.notes||'')
  const [saving,setSaving]=useState(false)
  const [confirmDel,setConfirmDel]=useState(false)
  const [rows,setRows]=useState<BookingServiceRow[]>([])
  const [specialistsFull,setSpecialistsFull]=useState<SpecialistLite[]>([])
  const [conflictError,setConflictError]=useState('')
  const cats=[...new Set(services.map(s=>s.category_title))]
  const isMulti=rows.length>1

  useEffect(()=>{
    supabaseAdmin.from('booking_services').select('*').eq('booking_id',booking.id).order('sequence_order').then(({data})=>{
      setRows((data??[]) as BookingServiceRow[])
    })
    supabaseAdmin.from('profiles').select('id,full_name').eq('role','specialist').eq('active',true).then(({data})=>{
      setSpecialistsFull((data??[]) as SpecialistLite[])
    })
  },[booking.id])// eslint-disable-line react-hooks/exhaustive-deps

  async function saveChanges(){
    setSaving(true)
    setConflictError('')
    try{
      // If this booking has per-service rows, shift each one's start_time by the
      // same delta as the booking-level time change and verify none of the
      // assigned specialists actually have a conflict at the new date/time —
      // previously reschedule only touched bookings.date/time, leaving
      // booking_services.start_time stale and never checking availability.
      if(rows.length>0){
        const delta=slotToMins(time)-slotToMins(booking.time)
        const shifted=rows.map(r=>({...r,newStartMins:slotToMins(r.start_time)+delta}))

        const[{data:svcRows},{data:legacyRows}]=await Promise.all([
          supabaseAdmin.from('booking_services').select('booking_id,specialist_id,start_time,duration_minutes,bookings!inner(date,status)').eq('bookings.date',date).not('bookings.status','eq','cancelled').neq('booking_id',booking.id),
          supabaseAdmin.from('bookings').select('id,time,service,specialist,status').eq('date',date).not('status','eq','cancelled').neq('id',booking.id),
        ])
        const coveredBookingIds=new Set<string>((svcRows??[]).map((r:any)=>r.booking_id))
        const busy=new Map<string,BusyRange[]>()
        for(const r of svcRows??[]){
          const start=slotToMins((r as any).start_time)
          const end=start+(r as any).duration_minutes
          const id=(r as any).specialist_id as string|null
          if(!id)continue
          busy.set(id,[...(busy.get(id)??[]),{start,end}])
        }
        for(const b of legacyRows??[]){
          if(coveredBookingIds.has(b.id)||!b.specialist)continue
          const sp=specialistsFull.find(s=>s.full_name===b.specialist)
          if(!sp)continue
          const dur=parseDuration(SERVICE_CATEGORIES.find(c=>c.services.some(sv=>sv.name===b.service))?.services.find(sv=>sv.name===b.service)?.duration??60)
          const start=slotToMins(b.time)
          busy.set(sp.id,[...(busy.get(sp.id)??[]),{start,end:start+dur}])
        }

        for(const r of shifted){
          if(!r.specialist_id)continue
          const conflict=(busy.get(r.specialist_id)??[]).some(rg=>r.newStartMins<rg.end&&rg.start<r.newStartMins+r.duration_minutes)
          if(conflict){ setConflictError(`${r.specialist_name} ya tiene otra cita a esa hora en la fecha nueva. Elige otro horario.`); setSaving(false); return }
        }

        const updatePayload:Record<string,any>={date,time,notes,gcal_event_id:null}
        if(!isMulti){ updatePayload.service=service; updatePayload.specialist=specialist }
        const{data,error}=await supabaseAdmin.from('bookings').update(updatePayload).eq('id',booking.id).select().single()
        if(error||!data){console.error('save booking error',error);setSaving(false);return}

        if(isMulti){
          await Promise.all(shifted.map(r=>supabaseAdmin.from('booking_services').update({start_time:minsToSlot(r.newStartMins)}).eq('id',r.id)))
        }else if(rows.length===1){
          const sp=specialistsFull.find(s=>s.full_name===specialist)
          await supabaseAdmin.from('booking_services').update({service_name:service,specialist_name:specialist,specialist_id:sp?.id??null,start_time:time}).eq('id',rows[0].id)
        }

        gcalDelete(booking.gcal_event_id)
        if(data.status==='confirmed'){
          const gcalRows=shifted.map(r=>({service:r.service_name,specialist:r.specialist_name,time:minsToSlot(r.newStartMins),duration:r.duration_minutes}))
          gcalCreateBreakdown(data as Booking,gcalRows,supabaseAdmin)
        }
        sendNotify({
          title:'Cita reagendada',
          body:`${booking.name} - ${(data as Booking).service||'Servicio'} - ${fmtDateLong(date)} a las ${time}`,
          tag:`resched-${booking.id}`,
          bookingId:booking.id,
          target:(data as Booking).specialist?{role:'admin_and_specialist',name:(data as Booking).specialist!}:{role:'admin'},
          kind:'rescheduled',refId:booking.id,refDate:date,
        })
        onDone(data as Booking)
        return
      }

      // Legacy booking with no booking_services rows at all — old simple path.
      const{data,error}=await supabaseAdmin.from('bookings').update({date,time,service,specialist,notes,gcal_event_id:null}).eq('id',booking.id).select().single()
      if(error||!data){console.error('save booking error',error);return}
      gcalDelete(booking.gcal_event_id)
      if(data.status==='confirmed') gcalCreate(data as Booking,supabaseAdmin)
      sendNotify({
        title:'Cita reagendada',
        body:`${booking.name} - ${service||'Servicio'} - ${fmtDateLong(date)} a las ${time}`,
        tag:`resched-${booking.id}`,
        bookingId:booking.id,
        target:specialist?{role:'admin_and_specialist',name:specialist}:{role:'admin'},
        kind:'rescheduled',refId:booking.id,refDate:date,
      })
      onDone(data as Booking)
    }catch(e){console.error('save booking error',e)}finally{setSaving(false)}
  }
  async function deleteBooking(){
    try{
      const{error}=await supabaseAdmin.from('bookings').delete().eq('id',booking.id)
      if(error){console.error('delete booking error',error);return}
      gcalDelete(booking.gcal_event_id)
      onDone()
    }catch(e){console.error('delete booking error',e)}
  }

  if(confirmDel) return <DeleteConfirm msg="Esta acción borrará la cita permanentemente y no se puede deshacer." onClose={()=>setConfirmDel(false)} onConfirm={deleteBooking}/>

  return(
    <Sheet onClose={onClose}>
      <SheetHandle title="Reagendar cita" onClose={onClose}/>
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        <div style={{background:`color-mix(in srgb, var(--gold) 8%, transparent)`,borderRadius:12,padding:'12px 14px'}}>
          <p style={{fontSize:14,fontWeight:600,color:C.ink,margin:0}}>{booking.name}</p>
          {isAdmin&&<p style={{fontSize:12,color:C.gray,margin:'2px 0 0'}}>{booking.phone}</p>}
        </div>
        {isMulti?(
          <div style={{background:`color-mix(in srgb, var(--ink) 5%, transparent)`,borderRadius:12,padding:'10px 12px'}}>
            <p style={{fontSize:11,fontWeight:700,color:C.gray,margin:'0 0 6px',textTransform:'uppercase',letterSpacing:'0.5px'}}>Servicios de esta cita</p>
            {rows.map(r=>(
              <p key={r.id} style={{fontSize:12,color:C.ink,margin:'2px 0'}}>· {r.service_name}{r.specialist_name?` — ${r.specialist_name}`:''}</p>
            ))}
            <p style={{fontSize:11,color:C.gray,margin:'6px 0 0'}}>Cada especialista se mantiene; solo cambia la fecha/hora. Para reasignar un especialista usa el ícono junto a cada servicio en la tarjeta de la cita.</p>
          </div>
        ):!isAdmin?(
          <div style={{background:`color-mix(in srgb, var(--ink) 5%, transparent)`,borderRadius:12,padding:'10px 12px'}}>
            <p style={{fontSize:12,color:C.ink,margin:0}}>{service}{specialist?` — ${specialist}`:''}</p>
          </div>
        ):(
          <>
            <div>
              <label style={lbl}>Servicio</label>
              <select style={inp()} value={service} onChange={e=>setService(e.target.value)}>
                <option value="">Sin servicio</option>
                {cats.map(cat=>(
                  <optgroup key={cat} label={cat}>
                    {services.filter(s=>s.category_title===cat&&s.active).map(s=>(
                      <option key={s.id} value={s.name}>{s.name} · {s.duration}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label style={lbl}>Especialista</label>
              <SpecialistSelect value={specialist} onChange={setSpecialist}/>
            </div>
          </>
        )}
        <div>
          <label style={lbl}>Fecha</label>
          <IconInput icon={<Ic.Calendar size={15} color={C.gray}/>}>
            <input type="date" style={inp({paddingLeft:36})} value={date} onChange={e=>setDate(e.target.value)}/>
          </IconInput>
        </div>
        <div>
          <label style={lbl}>Hora</label>
          <IconInput icon={<Ic.Clock size={15} color={C.gray}/>}>
            <select style={inp({paddingLeft:36})} value={time} onChange={e=>setTime(e.target.value)}>
              {TIMES.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </IconInput>
        </div>
        <div><label style={lbl}>Notas</label><textarea rows={2} style={inp({resize:'none'})} value={notes} onChange={e=>setNotes(e.target.value)}/></div>
        {conflictError&&<p style={{fontSize:12,color:C.red,margin:0,fontWeight:600}}>{conflictError}</p>}
        <button onClick={saveChanges} disabled={saving} style={{padding:'13px',borderRadius:12,background:'#1a0f14',color:'#fff',fontWeight:700,fontSize:14,border:'none',cursor:saving?'not-allowed':'pointer',opacity:saving?0.6:1,fontFamily:ff}}>
          {saving?'Guardando...':'Reagendar'}
        </button>
        {isAdmin&&(
          <button onClick={()=>setConfirmDel(true)} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'13px',borderRadius:12,background:`color-mix(in srgb, var(--red) 10%, transparent)`,color:C.red,fontWeight:700,fontSize:13,border:`1.5px solid color-mix(in srgb, var(--red) 20%, transparent)`,cursor:'pointer',fontFamily:ff}}>
            <Ic.Trash size={15} color={C.red}/> Borrar cita
          </button>
        )}
      </div>
    </Sheet>
  )
}

//  CREAR CITA MODAL
type CreatePlanState =
  | { kind: 'empty' }
  | { kind: 'loading' }
  | { kind: 'awaiting'; assignments: ServiceAssignment[]; pendingService: string; options: { specialist: SpecialistLite; duration: number }[] }
  | { kind: 'done'; assignments: ServiceAssignment[]; note?: string }
  | { kind: 'partial'; fitted: ServiceAssignment[]; leftover: string; suggestionTime: number | null; leftoverAssignment: ServiceAssignment | null }
  | { kind: 'none' }

function CreateModal({services,onClose,onCreated,prefill}:{services:Service[];onClose:()=>void;onCreated:(b:Booking)=>void;prefill?:{name:string;phone:string}}){
  const[step,setStep]=useState<'client'|'details'>(prefill?'details':'client')
  const[clientQuery,setClientQuery]=useState('')
  const[crmClients,setCrmClients]=useState<CrmClient[]>([])
  const[form,setForm]=useState({name:prefill?.name||'',phone:prefill?.phone||business.phone,specialist:'',date:'',time:'',notes:''})
  const[selectedSvcNames,setSelectedSvcNames]=useState<string[]>([])
  const[saving,setSaving]=useState(false)
  const[submitError,setSubmitError]=useState('')
  const[svcSearch,setSvcSearch]=useState('')
  const[specialistsFull,setSpecialistsFull]=useState<SpecialistLite[]>([])
  const[specialistServicesFull,setSpecialistServicesFull]=useState<SpecialistServiceLite[]>([])
  const[planChoices,setPlanChoices]=useState<Record<string,string>>({})
  const[planState,setPlanState]=useState<CreatePlanState>({kind:'empty'})
  const[partialAccept,setPartialAccept]=useState<'yes'|'no'|null>(null)

  useEffect(()=>{
    supabaseAdmin.from('crm_clients').select('id,name,phone').order('name').then(({data})=>{
      setCrmClients((data??[]) as CrmClient[])
    })
    supabaseAdmin.from('profiles').select('id,full_name').eq('role','specialist').eq('active',true).then(({data})=>{
      setSpecialistsFull((data??[]) as SpecialistLite[])
    })
    supabaseAdmin.from('specialist_services').select('specialist_id,service_name,duration_minutes').eq('approved',true).then(({data})=>{
      setSpecialistServicesFull((data??[]) as SpecialistServiceLite[])
    })
  },[])// eslint-disable-line react-hooks/exhaustive-deps

  useEffect(()=>{ setPlanChoices({});setPartialAccept(null) },[form.date,form.time,selectedSvcNames.join(',')])

  // Multi-service specialist resolution — mirrors the public booking flow's
  // engine (src/lib/scheduling.ts): auto-assigns when only one specialist is
  // free at each point in the sequence, asks the admin when more than one
  // is, and falls back to reordering / a partial-fit suggestion if the
  // chosen order doesn't fit consecutively.
  useEffect(()=>{
    if(selectedSvcNames.length<2||!form.date||!form.time){ setPlanState({kind:'empty'}); return }
    let cancelled=false
    setPlanState({kind:'loading'})
    async function load(){
      const[{data:svcRows},{data:legacyRows},{data:avBlocks}]=await Promise.all([
        supabaseAdmin.from('booking_services').select('booking_id,specialist_id,start_time,duration_minutes,bookings!inner(date,status)').eq('bookings.date',form.date).not('bookings.status','eq','cancelled'),
        supabaseAdmin.from('bookings').select('id,time,service,specialist,status').eq('date',form.date).not('status','eq','cancelled'),
        supabaseAdmin.from('availability_blocks').select('specialist_name,all_day,start_time,end_time').eq('date',form.date),
      ])
      if(cancelled)return
      const coveredBookingIds=new Set<string>((svcRows??[]).map((r:any)=>r.booking_id))
      const busy=new Map<string,BusyRange[]>()
      for(const r of svcRows??[]){
        const start=slotToMins((r as any).start_time)
        const end=start+(r as any).duration_minutes
        const id=(r as any).specialist_id as string|null
        if(!id)continue
        busy.set(id,[...(busy.get(id)??[]),{start,end}])
      }
      for(const b of legacyRows??[]){
        if(coveredBookingIds.has(b.id)||!b.specialist)continue
        const sp=specialistsFull.find(s=>s.full_name===b.specialist)
        if(!sp)continue
        const dur=parseDuration(SERVICE_CATEGORIES.find(c=>c.services.some(sv=>sv.name===b.service))?.services.find(sv=>sv.name===b.service)?.duration??60)
        const start=slotToMins(b.time)
        busy.set(sp.id,[...(busy.get(sp.id)??[]),{start,end:start+dur}])
      }
      // A specialist's own blocked time (full-day or specific hours, set from
      // Disponibilidad) also takes her out of contention here.
      for(const blk of avBlocks??[]){
        const sp=specialistsFull.find(s=>s.full_name===(blk as any).specialist_name)
        if(!sp)continue
        if((blk as any).all_day){ busy.set(sp.id,[...(busy.get(sp.id)??[]),{start:0,end:24*60}]); continue }
        if(!(blk as any).start_time||!(blk as any).end_time)continue
        busy.set(sp.id,[...(busy.get(sp.id)??[]),{start:slotToMins((blk as any).start_time),end:slotToMins((blk as any).end_time)}])
      }

      const order=selectedSvcNames
      const start=slotToMins(form.time)
      const assignments:ServiceAssignment[]=[]
      const working=new Map<string,BusyRange[]>()
      for(const[id,ranges] of busy) working.set(id,[...ranges])
      let cursor=start
      let stuckAt=-1
      for(let i=0;i<order.length;i++){
        const svcName=order[i]
        const chosenId=planChoices[svcName]
        if(chosenId){
          const sp=specialistsFull.find(s=>s.id===chosenId)
          const row=specialistServicesFull.find(s=>s.specialist_id===chosenId&&s.service_name===svcName)
          const dur=row?row.duration_minutes:parseDuration(SERVICE_CATEGORIES.find(c=>c.services.some(sv=>sv.name===svcName))?.services.find(sv=>sv.name===svcName)?.duration??60)
          if(sp){
            assignments.push({serviceName:svcName,specialistId:sp.id,specialistName:sp.full_name,start:cursor,duration:dur})
            working.set(sp.id,[...(working.get(sp.id)??[]),{start:cursor,end:cursor+dur}])
            cursor+=dur
            continue
          }
        }
        const res=resolveStep(svcName,cursor,specialistsFull,specialistServicesFull,working)
        if(res.type==='blocked'){ stuckAt=i; break }
        if(res.type==='choice'){
          if(cancelled)return
          setPlanState({kind:'awaiting',assignments,pendingService:svcName,options:res.options})
          return
        }
        assignments.push({serviceName:svcName,specialistId:res.specialist.id,specialistName:res.specialist.full_name,start:cursor,duration:res.duration})
        working.set(res.specialist.id,[...(working.get(res.specialist.id)??[]),{start:cursor,end:cursor+res.duration}])
        cursor+=res.duration
      }
      if(cancelled)return
      if(stuckAt===-1){ setPlanState({kind:'done',assignments}); return }

      const reordered=findWorkingOrder(order,start,specialistsFull,specialistServicesFull,busy)
      if(reordered){ setPlanState({kind:'done',assignments:reordered.assignments,note:'Se ajustó el orden de los servicios para que quepan todos seguidos.'}); return }

      const partial=findPartialFit(order,start,specialistsFull,specialistServicesFull,busy,120)
      if(partial){
        const leftoverAssignment=partial.leftoverSuggestion?partial.leftoverSuggestion.assignments[0]:null
        setPlanState({kind:'partial',fitted:partial.fitted.assignments,leftover:partial.leftover,suggestionTime:leftoverAssignment?leftoverAssignment.start:null,leftoverAssignment})
      }
      else{ setPlanState({kind:'none'}) }
    }
    load()
    return ()=>{cancelled=true}
  },[form.date,form.time,selectedSvcNames.join(','),specialistsFull,specialistServicesFull,planChoices])

  const cats=[...new Set(services.map(s=>s.category_title))]
  const filteredSvcs=svcSearch.trim()
    ? services.filter(s=>s.active&&s.name.toLowerCase().includes(svcSearch.toLowerCase()))
    : null

  const matchedClients=clientQuery.trim().length>0
    ? crmClients.filter(c=>{
        const q=clientQuery.trim().toLowerCase()
        if(/^\d/.test(q)) return (c.phone||'').includes(q)
        return q.split(/\s+/).every(w=>c.name.toLowerCase().includes(w))
      }).slice(0,8)
    : []

  function selectExistingClient(c:CrmClient){
    setForm(f=>({...f,name:c.name,phone:c.phone||business.phone}))
    setStep('details')
  }

  function toggleSvc(name:string){
    setSelectedSvcNames(prev=>prev.includes(name)?prev.filter(n=>n!==name):[...prev,name])
  }

  const isMulti=selectedSvcNames.length>1
  const planResolved=!isMulti||planState.kind==='done'||(planState.kind==='partial'&&(planState.suggestionTime===null||partialAccept!==null))
  // When the plan is "partial", only the fitted subset becomes this booking —
  // the leftover (if accepted) becomes its own separate booking below.
  const serviceLabel=planState.kind==='partial'?planState.fitted.map(a=>a.serviceName).join(' + '):selectedSvcNames.join(' + ')

  async function handleSubmit(e:React.FormEvent){
    e.preventDefault()
    if(isMulti&&!planResolved)return
    setSaving(true);setSubmitError('')
    const multiAssignments=isMulti&&planState.kind==='done'
      ? planState.assignments
      : isMulti&&planState.kind==='partial'
        ? planState.fitted
        : null
    const specLabel=multiAssignments
      ? [...new Set(multiAssignments.map(a=>a.specialistName))].join(', ')
      : form.specialist
    const{data,error}=await supabaseAdmin.from('bookings').insert([{name:form.name,phone:form.phone,specialist:specLabel,service:serviceLabel,date:form.date,time:form.time,notes:form.notes,status:'confirmed',archived:false,business:business.name}]).select().single()
    if(error){setSaving(false);setSubmitError(error.message);return}
    if(data){
      const rows=multiAssignments
        ? multiAssignments.map((a,i)=>({booking_id:data.id,service_name:a.serviceName,specialist_id:a.specialistId,specialist_name:a.specialistName,sequence_order:i+1,start_time:minsToSlot(a.start),duration_minutes:a.duration}))
        : form.specialist
          ? [{booking_id:data.id,service_name:selectedSvcNames[0]||serviceLabel,specialist_id:specialistsFull.find(s=>s.full_name===form.specialist)?.id??null,specialist_name:form.specialist,sequence_order:1,start_time:form.time,duration_minutes:parseDuration(services.find(s=>s.name===selectedSvcNames[0])?.duration)}]
          : []
      if(rows.length) await supabaseAdmin.from('booking_services').insert(rows)
      logAction('create_booking',`${form.name} · ${serviceLabel} · ${form.date} ${form.time}`)
      // Auto-add to CRM if not already there
      supabaseAdmin.from('crm_clients').select('id').eq('phone',form.phone).maybeSingle().then(({data})=>{
        if(!data) supabaseAdmin.from('crm_clients').insert([{name:form.name,phone:form.phone}]).then(()=>{},()=>{})
      },()=>{})
      // Sync to Google Calendar (silent — fails gracefully if not configured)
      const gcalRows=multiAssignments
        ? multiAssignments.map(a=>({service:a.serviceName,specialist:a.specialistName,time:minsToSlot(a.start),duration:a.duration}))
        : [{service:serviceLabel,specialist:specLabel,time:form.time,duration:parseDuration(services.find(s=>s.name===selectedSvcNames[0])?.duration)}]
      gcalCreateBreakdown({id:data.id,name:form.name,date:form.date,time:form.time,notes:form.notes},gcalRows,supabaseAdmin)

      // Leftover service the admin accepted at the suggested alternate time —
      // its own separate booking, so it appears as its own normal appointment.
      if(planState.kind==='partial'&&partialAccept==='yes'&&planState.leftoverAssignment){
        const a=planState.leftoverAssignment
        const leftoverTime=minsToSlot(a.start)
        const{data:leftoverBooking}=await supabaseAdmin.from('bookings').insert([{name:form.name,phone:form.phone,specialist:a.specialistName,service:a.serviceName,date:form.date,time:leftoverTime,notes:form.notes,status:'confirmed',archived:false,business:business.name}]).select().single()
        if(leftoverBooking){
          await supabaseAdmin.from('booking_services').insert([{booking_id:leftoverBooking.id,service_name:a.serviceName,specialist_id:a.specialistId,specialist_name:a.specialistName,sequence_order:1,start_time:leftoverTime,duration_minutes:a.duration}])
          gcalCreateBreakdown({id:leftoverBooking.id,name:form.name,date:form.date,time:leftoverTime,notes:form.notes},[{service:a.serviceName,specialist:a.specialistName,time:leftoverTime,duration:a.duration}],supabaseAdmin)
        }
      }
      setSaving(false)
      onCreated(data as Booking)
    }
  }

  return(
    <Sheet onClose={onClose}>
      <SheetHandle title="Nueva Cita" onClose={onClose}/>
      {step==='client'?(
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <div>
            <label style={lbl}>Cliente existente</label>
            <IconInput icon={<Ic.Search size={14} color={C.gray}/>}>
              <input autoFocus style={inp({paddingLeft:34})} placeholder="Buscar por nombre o teléfono..." value={clientQuery} onChange={e=>setClientQuery(e.target.value)}/>
            </IconInput>
          </div>
          {matchedClients.length>0&&(
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {matchedClients.map(c=>(
                <button key={c.id||c.phone} onClick={()=>selectExistingClient(c)} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',borderRadius:10,background:`color-mix(in srgb, var(--rosa) 8%, transparent)`,border:`1px solid color-mix(in srgb, var(--rosa) 22%, transparent)`,cursor:'pointer',fontFamily:ff,textAlign:'left' as const}}>
                  <span style={{fontSize:13,fontWeight:600,color:C.ink}}>{c.name}</span>
                  <span style={{fontSize:12,color:C.gray}}>{c.phone||''}</span>
                </button>
              ))}
            </div>
          )}
          {clientQuery.trim().length>1&&matchedClients.length===0&&(
            <p style={{fontSize:12,color:C.gray,margin:0,textAlign:'center' as const,padding:'8px 0'}}>Sin resultados</p>
          )}
          <button onClick={()=>setStep('details')} style={{padding:'11px',borderRadius:12,background:'transparent',color:C.gray,fontWeight:600,fontSize:13,border:`1.5px solid color-mix(in srgb, var(--ink) 14%, transparent)`,cursor:'pointer',fontFamily:ff}}>
            Nueva cliente →
          </button>
        </div>
      ):(
        <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:12}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div><label style={lbl}>Nombre</label><input required style={inp()} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
            <div><label style={lbl}>Teléfono</label><input required type="tel" style={inp()} value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></div>
          </div>
          <div>
            <label style={lbl}>Servicio(s) — puedes escoger varios</label>
            <IconInput icon={<Ic.Search size={14} color={C.gray}/>}>
              <input style={inp({paddingLeft:34,marginBottom:6})} placeholder="Buscar servicio..." value={svcSearch} onChange={e=>setSvcSearch(e.target.value)}/>
            </IconInput>
            <div style={{maxHeight:180,overflowY:'auto',border:`1.5px solid ${C.inputBorder}`,borderRadius:10,padding:'6px 8px',display:'flex',flexDirection:'column',gap:2}}>
              {(filteredSvcs??services.filter(s=>s.active)).map(s=>{
                const checked=selectedSvcNames.includes(s.name)
                return(
                  <button key={s.id} type="button" onClick={()=>toggleSvc(s.name)} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 8px',borderRadius:8,background:checked?`color-mix(in srgb, var(--rosa) 12%, transparent)`:'transparent',border:'none',cursor:'pointer',textAlign:'left' as const,fontFamily:ff}}>
                    <span style={{width:16,height:16,borderRadius:4,border:`1.5px solid ${checked?C.gold:C.inputBorder}`,background:checked?C.gold:'transparent',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                      {checked&&<Ic.Check size={11} color="#fff"/>}
                    </span>
                    <span style={{fontSize:12,color:C.ink,flex:1}}>{s.name}</span>
                    <span style={{fontSize:11,color:C.gray,flexShrink:0}}>{s.duration} · {s.price}</span>
                  </button>
                )
              })}
            </div>
            {selectedSvcNames.length>0&&<p style={{fontSize:11,color:C.gray,margin:'4px 0 0'}}>{selectedSvcNames.join(' + ')}</p>}
          </div>
          <div>
            <label style={lbl}>Fecha</label>
            <IconInput icon={<Ic.Calendar size={15} color={C.gray}/>}>
              <input required type="date" style={inp({paddingLeft:36})} value={form.date} min={todayStr()} onChange={e=>setForm({...form,date:e.target.value})}/>
            </IconInput>
          </div>
          <div>
            <label style={lbl}>Hora</label>
            <IconInput icon={<Ic.Clock size={15} color={C.gray}/>}>
              <select required style={inp({paddingLeft:36})} value={form.time} onChange={e=>setForm({...form,time:e.target.value})}>
                <option value="">Hora...</option>
                {TIMES.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </IconInput>
          </div>
          {!isMulti?(
            <div>
              <label style={lbl}>Especialista</label>
              <SpecialistSelect value={form.specialist} onChange={v=>setForm({...form,specialist:v})}/>
            </div>
          ):(
            <div>
              <label style={lbl}>Especialista por servicio</label>
              {planState.kind==='loading'&&<p style={{fontSize:12,color:C.gray,margin:0}}>Verificando disponibilidad...</p>}
              {(planState.kind==='done'||planState.kind==='awaiting')&&(
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {planState.kind==='done'&&planState.note&&<p style={{fontSize:12,color:C.gold,fontStyle:'italic',margin:'0 0 4px'}}>{planState.note}</p>}
                  {planState.assignments.map(a=>(
                    <div key={a.serviceName} style={{display:'flex',justifyContent:'space-between',padding:'8px 10px',borderRadius:8,background:`color-mix(in srgb, var(--rosa) 6%, transparent)`}}>
                      <span style={{fontSize:12,color:C.ink}}>{a.serviceName} · {minsToSlot(a.start)}</span>
                      <span style={{fontSize:12,fontWeight:600,color:C.gold}}>{a.specialistName}</span>
                    </div>
                  ))}
                  {planState.kind==='awaiting'&&(
                    <div style={{padding:'10px 12px',borderRadius:8,border:`1.5px solid ${C.gold}`}}>
                      <p style={{fontSize:12,color:C.ink,margin:'0 0 8px'}}>¿Con quién deseas <strong>{planState.pendingService}</strong>?</p>
                      <div style={{display:'flex',flexDirection:'column',gap:6}}>
                        <button type="button"
                          onClick={()=>setPlanChoices(prev=>({...prev,[planState.kind==='awaiting'?planState.pendingService:'']:planState.kind==='awaiting'?planState.options[0].specialist.id:''}))}
                          style={{padding:'8px 10px',borderRadius:8,border:`1px solid ${C.gold}`,background:`color-mix(in srgb, var(--gold) 10%, transparent)`,cursor:'pointer',textAlign:'left' as const,fontFamily:ff,fontSize:12,fontWeight:600,color:C.gold}}>
                          Primera disponible
                        </button>
                        {planState.options.map(o=>(
                          <button key={o.specialist.id} type="button"
                            onClick={()=>setPlanChoices(prev=>({...prev,[planState.kind==='awaiting'?planState.pendingService:'']:o.specialist.id}))}
                            style={{padding:'8px 10px',borderRadius:8,border:`1px solid ${C.inputBorder}`,background:'#fff',cursor:'pointer',textAlign:'left' as const,fontFamily:ff,fontSize:12,color:C.ink}}>
                            {o.specialist.full_name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {planState.kind==='partial'&&(
                <div style={{padding:'10px 12px',borderRadius:8,background:`color-mix(in srgb, var(--gold) 10%, transparent)`}}>
                  <p style={{fontSize:12,color:C.ink,margin:planState.suggestionTime!==null&&partialAccept===null?'0 0 8px':0}}>
                    Solo podremos hacer {planState.fitted.length} de {selectedSvcNames.length} servicios consecutivamente a las {form.time}.
                    {planState.suggestionTime!==null
                      ? ` Podemos hacer "${planState.leftover}" en la siguiente hora disponible: ${minsToSlot(planState.suggestionTime)}. ¿Deseas tomarlo?`
                      : ` No hay espacio cercano para "${planState.leftover}" — prueba otro horario.`}
                  </p>
                  {planState.suggestionTime!==null&&partialAccept===null&&(
                    <div style={{display:'flex',gap:8}}>
                      <button type="button" onClick={()=>setPartialAccept('yes')} style={{flex:1,padding:'8px 10px',borderRadius:8,background:C.gold,color:'#fff',fontWeight:700,fontSize:12,border:'none',cursor:'pointer',fontFamily:ff}}>Sí, tomarlo</button>
                      <button type="button" onClick={()=>setPartialAccept('no')} style={{flex:1,padding:'8px 10px',borderRadius:8,background:'#fff',color:C.ink,fontWeight:600,fontSize:12,border:'1px solid color-mix(in srgb, var(--ink) 14%, transparent)',cursor:'pointer',fontFamily:ff}}>No, gracias</button>
                    </div>
                  )}
                  {planState.suggestionTime!==null&&partialAccept!==null&&(
                    <p style={{fontSize:12,color:C.gold,fontWeight:600,margin:0}}>
                      {partialAccept==='yes'?`Se agendará "${planState.leftover}" como cita aparte a las ${minsToSlot(planState.suggestionTime)}.`:`"${planState.leftover}" no se incluirá en esta cita.`}
                      {' '}<button type="button" onClick={()=>setPartialAccept(null)} style={{background:'none',border:'none',color:C.gray,textDecoration:'underline',cursor:'pointer',fontFamily:ff,fontSize:12,padding:0}}>Cambiar</button>
                    </p>
                  )}
                </div>
              )}
              {planState.kind==='none'&&(
                <p style={{fontSize:12,color:C.gray,margin:0}}>No hay especialistas disponibles para todos estos servicios a esta hora. Prueba otro horario.</p>
              )}
            </div>
          )}
          <div><label style={lbl}>Notas</label><textarea rows={2} style={inp({resize:'none'})} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
          {submitError&&<p style={{fontSize:12,color:C.red,margin:0,padding:'8px 12px',borderRadius:8,background:`color-mix(in srgb, var(--red) 10%, transparent)`}}>{submitError}</p>}
          <button type="submit" disabled={saving||selectedSvcNames.length===0||!planResolved} style={{padding:'13px',borderRadius:12,background:'#1a0f14',color:'#fff',fontWeight:700,fontSize:14,border:'none',cursor:(saving||selectedSvcNames.length===0||!planResolved)?'not-allowed':'pointer',opacity:(saving||selectedSvcNames.length===0||!planResolved)?0.6:1,fontFamily:ff}}>
            {saving?'Guardando...':'Crear Cita'}
          </button>
        </form>
      )}
    </Sheet>
  )
}

//  DEPOSIT REQUEST SHEET
const STRIPE_PAYMENT_LINK = 'https://book.stripe.com/3cIeVfglu59heBEap9bbG00'
const depositMsg=(_b:Booking,link:string,isNew:boolean=true)=>[
  'Hola!',
  '',
  ...(isNew?[`Gracias por elegir ${business.name}.`,'']:[]),
  'Para confirmar tu cita y reservar el espacio en nuestra agenda, solo falta realizar el deposito correspondiente.',
  '',
  'Puedes realizar el pago mediante cualquiera de estas opciones:',
  '',
  '*Stripe:*',
  link,
  '',
  '*ATH Movil Business:*',
  '/klassysalonpr',
  '',
  'Una vez recibamos el comprobante de pago, tu cita quedara oficialmente confirmada.',
  '',
  SALON_PIN,
  '',
  isNew?'Esperamos conocerte pronto!':'Esperamos verte pronto!',
].join('\n')
function DepositRequestSheet({booking,onClose,onDone,isNew=true}:{booking:Booking;onClose:()=>void;onDone:()=>void;isNew?:boolean}){
  const[saving,setSaving]=useState(false)
  const[done,setDone]=useState<{link:string}|null>(null)
  async function request(){
    setSaving(true)
    await supabaseAdmin.from('deposits').insert([{client_name:booking.name,client_phone:booking.phone,amount:0,concept:'Señal de reserva',status:'solicitado',booking_id:booking.id,stripe_session_id:booking.id.slice(-6).toUpperCase(),notes:`Cita ${fmtDate(booking.date)} ${booking.time}`}])
    const link=`${STRIPE_PAYMENT_LINK}?client_reference_id=${booking.id}`
    setSaving(false);setDone({link})
  }
  if(done) return(
    <Sheet onClose={onClose}>
      <div style={{textAlign:'center',marginBottom:22}}>
        <SuccessIcon color="var(--gold)"/>
        <h3 style={{fontFamily:ffS,fontSize:22,fontWeight:500,color:C.ink,margin:0}}>Depósito solicitado</h3>
        <p style={{fontSize:13,color:C.gray,margin:'6px 0 0'}}>{booking.name}</p>
        <p style={{fontSize:11,color:'#27ae60',margin:'6px 0 0',fontWeight:600}}>✓ Link de Stripe listo</p>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        <WABtn href={waUrl(booking.phone,depositMsg(booking,done.link,isNew))}/>
        <CloseBtn onClose={()=>{onDone();onClose()}}/>
      </div>
    </Sheet>
  )
  return(
    <Sheet onClose={onClose}>
      <SheetHandle title="Solicitar Depósito" onClose={onClose}/>
      <div style={{padding:'12px 14px',borderRadius:12,background:`color-mix(in srgb, var(--gold) 8%, transparent)`,marginBottom:14}}>
        <p style={{fontSize:14,fontWeight:600,color:C.ink,margin:0}}>{booking.name}</p>
        <p style={{fontSize:12,color:C.gray,margin:'2px 0 0'}}>{booking.service||'Servicio'} · {fmtDate(booking.date)} · {booking.time}</p>
      </div>
      <button onClick={request} disabled={saving} style={{padding:'13px',borderRadius:12,background:'#1a0f14',color:'#fff',fontWeight:700,fontSize:14,border:'none',cursor:saving?'not-allowed':'pointer',opacity:saving?0.6:1,fontFamily:ff,width:'100%'}}>
        {saving?'Procesando...':'Generar Link y Enviar por WhatsApp'}
      </button>
    </Sheet>
  )
}

//  BOOKING CARD
function BookingCard({b,allBookings,services,isToday,onRefresh,isAdmin,svcMap,specialistsFull,viewerName,autoOpen,onAutoOpenConsumed}:{b:Booking;allBookings:Booking[];services:Service[];isToday:boolean;onRefresh:()=>void;isAdmin:boolean;svcMap?:Map<string,BookingServiceRow[]>;specialistsFull?:SpecialistLite[];viewerName?:string;autoOpen?:boolean;onAutoOpenConsumed?:()=>void}){
  const fullBreakdown=serviceBreakdown(b,svcMap??new Map())
  // A specialist viewing her own agenda only needs to see her own service(s)
  // in this booking, at her own real time — not everyone else's assignment.
  const breakdown=(!isAdmin&&viewerName)?fullBreakdown.filter(s=>s.specialist===viewerName):fullBreakdown
  const refImage=refImageFromNotes(b.notes)
  const isMultiService=fullBreakdown.length>1
  const today=todayStr()
  const cardRef=useRef<HTMLDivElement>(null)
  const[confirmSheet,setConfirmSheet]=useState(false)
  const[cancelModal,setCancelModal]=useState(false)
  const[editModal,setEditModal]=useState(false)
  const[reschedSheet,setReschedSheet]=useState<Booking|null>(null)
  const[confirming,setConfirming]=useState(false)
  const[depositSheet,setDepositSheet]=useState(false)
  const[assignSpec,setAssignSpec]=useState('')
  const[assignOpen,setAssignOpen]=useState(false)
  const[assignLoading,setAssignLoading]=useState(false)
  const[reassignService,setReassignService]=useState<string|null>(null)
  const[reassignValue,setReassignValue]=useState('')
  const[reassignLoading,setReassignLoading]=useState(false)
  const specNames=useSpecialistNames()
  async function doAssign(){
    if(!assignSpec)return;setAssignLoading(true)
    await supabaseAdmin.from('bookings').update({specialist:assignSpec}).eq('id',b.id)
    logAction('assign_specialist',`${b.name} · ${b.service} → ${assignSpec}`)
    setAssignLoading(false);setAssignOpen(false);onRefresh()
  }
  async function doAssignService(serviceName:string){
    if(!reassignValue)return
    setReassignLoading(true)
    const sp=(specialistsFull??[]).find(s=>s.full_name===reassignValue)
    await supabaseAdmin.from('booking_services').update({specialist_id:sp?.id??null,specialist_name:reassignValue}).eq('booking_id',b.id).eq('service_name',serviceName)
    // Keep the card's summary field in sync for anywhere still reading it directly (gcal, notes, legacy views).
    const updatedBreakdown=breakdown.map(s=>s.service===serviceName?{...s,specialist:reassignValue}:s)
    const summary=[...new Set(updatedBreakdown.map(s=>s.specialist).filter(Boolean))].join(', ')
    await supabaseAdmin.from('bookings').update({specialist:summary||null}).eq('id',b.id)
    logAction('assign_specialist',`${b.name} · ${serviceName} → ${reassignValue}`)
    setReassignLoading(false);setReassignService(null);onRefresh()
  }

  const hist=allBookings.filter(x=>x.phone===b.phone&&x.date<today).sort((a,c)=>c.date.localeCompare(a.date))
  const isNew=hist.length===0
  const last=hist[0]

  // Opened by tapping a push/browser notification for this exact booking.
  useEffect(()=>{
    if(!autoOpen)return
    setEditModal(true)
    cardRef.current?.scrollIntoView({behavior:'smooth',block:'center'})
    onAutoOpenConsumed?.()
  },[autoOpen])

  async function doConfirm(){
    if(confirming)return
    setConfirming(true)
    try{
      await supabaseAdmin.from('bookings').update({status:'confirmed'}).eq('id',b.id)
      logAction('confirm_booking',`${b.name} · ${b.service} · ${b.date}`)
      gcalCreateBreakdown(b,fullBreakdown,supabase)
      setConfirmSheet(true); onRefresh()
    }finally{setConfirming(false)}
  }
  async function doComplete(){
    await supabaseAdmin.from('bookings').update({status:'completed'}).eq('id',b.id)
    logAction('complete_booking',`${b.name} · ${b.service} · ${b.date}`)
    onRefresh()
  }

  const statusColor=b.status==='confirmed'?C.green:b.status==='completed'?C.green:b.status==='pending'?C.gold:C.red
  const statusBg=b.status==='confirmed'?'color-mix(in srgb, var(--green) 12%, transparent)':b.status==='completed'?'color-mix(in srgb, var(--green) 20%, transparent)':b.status==='pending'?'color-mix(in srgb, var(--gold) 12%, transparent)':'color-mix(in srgb, var(--red) 12%, transparent)'

  return(
    <>
      {confirmSheet&&<ConfirmSheet booking={b} onClose={()=>setConfirmSheet(false)} isAdmin={isAdmin} isNew={isNew}/>}
      {cancelModal&&<CancelModal booking={b} onClose={()=>setCancelModal(false)} onDone={onRefresh}/>}
      {reschedSheet&&<RescheduleSheet booking={reschedSheet} onClose={()=>setReschedSheet(null)} isAdmin={isAdmin}/>}
      {editModal&&<EditCitaModal booking={b} services={services} isAdmin={isAdmin} onClose={()=>setEditModal(false)} onDone={(updated)=>{setEditModal(false);if(updated)setReschedSheet(updated);onRefresh()}}/>}
      {depositSheet&&<DepositRequestSheet booking={b} onClose={()=>setDepositSheet(false)} onDone={onRefresh} isNew={isNew}/>}

      <div ref={cardRef} style={glass({padding:'14px 16px',borderRadius:14})}>
        <div style={{display:'flex',alignItems:'flex-start',gap:8}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap' as const}}>
              <span style={{fontSize:14,fontWeight:600,color:C.ink}}>{b.name}</span>
              {b.is_vip&&<span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:99,background:'#1a0f14',color:'#ffd700'}}>✨ VIP</span>}
              <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:99,background:isNew?'color-mix(in srgb, var(--green) 12%, transparent)':'color-mix(in srgb, var(--gold) 12%, transparent)',color:isNew?C.green:C.gold}}>{isNew?'Nueva':'Frecuente'}</span>
              <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:99,background:statusBg,color:statusColor}}>{b.status}</span>
            </div>
            {isMultiService?(
              <div style={{margin:'3px 0 0'}}>
                {breakdown.map((s,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:6}}>
                    <p style={{fontSize:12,color:C.gray,margin:'1px 0 0',flex:1}}>· {s.time||b.time} · {s.service}{s.specialist?` — ${s.specialist}`:<span style={{color:C.gold,fontWeight:600}}> — Primera disponible</span>}</p>
                    {isAdmin&&b.status!=='cancelled'&&b.status!=='completed'&&(
                      <button onClick={()=>{setReassignService(rs=>rs===s.service?null:s.service);setReassignValue(s.specialist||'')}} title="Cambiar especialista de este servicio" style={{background:'none',border:'none',cursor:'pointer',padding:2,flexShrink:0,display:'flex',alignItems:'center',gap:1,color:C.gray}}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                    )}
                  </div>
                ))}
                {reassignService&&(
                  <div style={{display:'flex',gap:8,marginTop:6,alignItems:'center'}}>
                    <select value={reassignValue} onChange={e=>setReassignValue(e.target.value)} style={{...inp(),flex:1,fontSize:12,padding:'8px 10px',borderColor:`color-mix(in srgb, var(--gold) 40%, transparent)`}}>
                      <option value="">Elegir especialista...</option>
                      {specNames.map(n=><option key={n} value={n}>{n}</option>)}
                    </select>
                    <button onClick={()=>doAssignService(reassignService)} disabled={!reassignValue||reassignLoading} style={{flexShrink:0,padding:'8px 14px',borderRadius:10,background:reassignValue?C.gold:'color-mix(in srgb, var(--gold) 20%, transparent)',color:reassignValue?'#fff':C.gray,fontWeight:700,fontSize:12,border:'none',cursor:reassignValue?'pointer':'default',fontFamily:ff,transition:'all .15s'}}>
                      {reassignLoading?'...':'OK'}
                    </button>
                  </div>
                )}
              </div>
            ):(
              <p style={{fontSize:12,color:C.gray,margin:'3px 0 0'}}>{b.time} · {b.service||'Sin servicio'}{b.specialist?` · ${b.specialist}`:<span style={{color:C.gold,fontWeight:600}}> · Primera disponible</span>}</p>
            )}
            {refImage&&<img src={refImage} alt="Foto de inspiración" style={{width:64,height:64,borderRadius:10,objectFit:'cover',marginTop:6,cursor:'pointer'}} onClick={()=>window.open(refImage,'_blank')}/>}
            {!isNew&&last&&<p style={{fontSize:11,color:C.gray,margin:'2px 0 0',opacity:0.75}}>altima visita: {fmtDate(last.date)} · {last.service}</p>}
          </div>
          <div style={{display:'flex',gap:4,flexShrink:0}}>
            {isAdmin&&!isMultiService&&b.status!=='cancelled'&&b.status!=='completed'&&(
              <button onClick={()=>{setAssignOpen(a=>!a);if(!assignOpen)setAssignSpec(b.specialist??'')}} title={b.specialist?'Cambiar especialista':'Asignar especialista'} style={{background:'none',border:'none',cursor:'pointer',padding:6,display:'flex',alignItems:'center',gap:2,color:b.specialist?C.gray:C.gold}}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
            )}
            <button onClick={()=>setEditModal(true)} title="Reagendar" style={{background:'none',border:'none',cursor:'pointer',color:C.gray,padding:6,display:'flex',alignItems:'center',gap:1}}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
          </div>
        </div>

        {/* Assign specialist — inline dropdown, toggled by the icon button (single-service bookings only) */}
        {isAdmin&&!isMultiService&&b.status!=='cancelled'&&b.status!=='completed'&&assignOpen&&(
          <div style={{display:'flex',gap:8,marginTop:10,alignItems:'center'}}>
            <select value={assignSpec} onChange={e=>setAssignSpec(e.target.value)} style={{...inp(),flex:1,fontSize:12,padding:'8px 10px',borderColor:`color-mix(in srgb, var(--gold) 40%, transparent)`}}>
              <option value="">Elegir especialista...</option>
              {specNames.map(n=><option key={n} value={n}>{n}</option>)}
            </select>
            <button onClick={doAssign} disabled={!assignSpec||assignLoading} style={{flexShrink:0,padding:'8px 14px',borderRadius:10,background:assignSpec?C.gold:'color-mix(in srgb, var(--gold) 20%, transparent)',color:assignSpec?'#fff':C.gray,fontWeight:700,fontSize:12,border:'none',cursor:assignSpec?'pointer':'default',fontFamily:ff,transition:'all .15s'}}>
              {assignLoading?'...':'OK'}
            </button>
          </div>
        )}

        {/* Actions — admin only; specialists get read-only cards */}
        {isAdmin&&b.status==='pending'&&(
          <div style={{display:'flex',gap:8,marginTop:10}}>
            <button onClick={doConfirm} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'9px',borderRadius:10,background:C.green,color:'#fff',fontWeight:700,fontSize:12,border:'none',cursor:'pointer',fontFamily:ff}}>
              <Ic.Check size={13} color="#fff"/> Confirmar
            </button>
            <button onClick={()=>setDepositSheet(true)} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:5,padding:'9px 12px',borderRadius:10,background:`color-mix(in srgb, var(--gold) 14%, transparent)`,color:C.gold,fontWeight:700,fontSize:12,border:`1px solid color-mix(in srgb, var(--gold) 30%, transparent)`,cursor:'pointer',fontFamily:ff}}>
              <Ic.Dollar size={13} color={C.gold}/>
            </button>
            <button onClick={()=>setCancelModal(true)} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'9px 12px',borderRadius:10,background:'color-mix(in srgb, var(--red) 12%, transparent)',color:C.red,fontWeight:700,fontSize:12,border:'none',cursor:'pointer',fontFamily:ff}}>
              <Ic.X size={13} color={C.red}/>
            </button>
          </div>
        )}
        {isAdmin&&b.status==='confirmed'&&!isToday&&(
          <div style={{display:'flex',gap:8,marginTop:10}}>
            <button onClick={()=>setDepositSheet(true)} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'8px',borderRadius:10,background:`color-mix(in srgb, var(--gold) 12%, transparent)`,color:C.gold,fontWeight:700,fontSize:12,border:`1px solid color-mix(in srgb, var(--gold) 25%, transparent)`,cursor:'pointer',fontFamily:ff}}>
              <Ic.Dollar size={13} color={C.gold}/> Depósito
            </button>
            <button onClick={()=>setCancelModal(true)} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'8px 12px',borderRadius:10,background:'color-mix(in srgb, var(--red) 12%, transparent)',color:C.red,fontWeight:700,fontSize:12,border:'none',cursor:'pointer',fontFamily:ff}}>
              <Ic.X size={13} color={C.red}/>
            </button>
          </div>
        )}
        {isAdmin&&isToday&&b.status==='confirmed'&&(
          <div style={{display:'flex',gap:8,marginTop:10}}>
            <button onClick={doComplete} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'9px',borderRadius:10,background:C.green,color:'#fff',fontWeight:700,fontSize:12,border:'none',cursor:'pointer',fontFamily:ff}}>
              <Ic.Check size={13} color="#fff"/> Completada
            </button>
            <button onClick={()=>setDepositSheet(true)} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:5,padding:'9px 12px',borderRadius:10,background:`color-mix(in srgb, var(--gold) 14%, transparent)`,color:C.gold,fontWeight:700,fontSize:12,border:`1px solid color-mix(in srgb, var(--gold) 30%, transparent)`,cursor:'pointer',fontFamily:ff}}>
              <Ic.Dollar size={13} color={C.gold}/>
            </button>
            <button onClick={()=>setCancelModal(true)} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'9px 12px',borderRadius:10,background:C.red,color:'#fff',fontWeight:700,fontSize:12,border:'none',cursor:'pointer',fontFamily:ff}}>
              <Ic.X size={13} color="#fff"/>
            </button>
          </div>
        )}
        {b.status==='completed'&&(
          <div style={{marginTop:8,display:'flex',alignItems:'center',gap:8,padding:'7px 10px 7px 12px',borderRadius:10,background:'color-mix(in srgb, var(--green) 15%, transparent)'}}>
            <span style={{flex:1,fontSize:12,fontWeight:700,color:C.green}}>Cita completada</span>
            {isAdmin&&<button onClick={()=>setCancelModal(true)} title="¿Nunca se atendió? Corrige el estado aquí" style={{fontSize:11,fontWeight:700,color:C.gray,background:'none',border:'none',cursor:'pointer',fontFamily:ff,textDecoration:'underline'}}>Corregir</button>}
          </div>
        )}
      </div>
    </>
  )
}

//  DASHBOARD
function parsePriceNum(s:string|number|undefined){if(!s)return 0;const m=String(s).replace(/,/g,'.').match(/[\d.]+/);return m?parseFloat(m[0]):0}
function weekStart(){const d=new Date();d.setDate(d.getDate()-d.getDay());return d.toISOString().slice(0,10)}
function monthStart(){const n=new Date();return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-01'}

// ── STAT DETAIL SHEET ──────────────────────────────────────────────
type StatKey='pending'|'today'|'noshows'|'ingresos'|'cancelaciones'|'nuevas'
type RangeKey='semana'|'mes'|'ytd'|'anual'
const STAT_META:Record<StatKey,{title:string;color:string}>={
  pending:       {title:'Sin Confirmar',   color:'var(--gold)'},
  today:         {title:'Citas Totales',   color:'var(--green)'},
  noshows:       {title:'No Shows',        color:'var(--red)'},
  ingresos:      {title:'Ingresos Est.',   color:'var(--green)'},
  cancelaciones: {title:'Cancelaciones',   color:'var(--red)'},
  nuevas:        {title:'Nuevas Clientas', color:'var(--green)'},
}
const RANGE_LABELS:Record<RangeKey,string>={semana:'esta semana',mes:'este mes',ytd:'este año',anual:'últimos 12 meses'}
const pad2=(n:number)=>String(n).padStart(2,'0')
const dim=(y:number,m:number)=>new Date(y,m+1,0).getDate()

function getBuckets(range:RangeKey):{start:string;end:string;label:string}[]{
  const today=new Date()
  const ds=(d:Date)=>`${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`
  if(range==='semana'){
    const dow=today.getDay()
    const mon=new Date(today);mon.setDate(today.getDate()-(dow===0?6:dow-1))
    return Array.from({length:7},(_,i)=>{
      const d=new Date(mon);d.setDate(mon.getDate()+i);const s=ds(d)
      return{start:s,end:s,label:['L','M','X','J','V','S','D'][i]}
    })
  }
  if(range==='mes'){
    const y=today.getFullYear(),m=today.getMonth(),total=dim(y,m)
    const weeks=[];let day=1
    while(day<=total){const e=Math.min(day+6,total);weeks.push({start:`${y}-${pad2(m+1)}-${pad2(day)}`,end:`${y}-${pad2(m+1)}-${pad2(e)}`,label:`S${weeks.length+1}`});day+=7}
    return weeks
  }
  if(range==='ytd'){
    const y=today.getFullYear()
    return Array.from({length:today.getMonth()+1},(_,m)=>({start:`${y}-${pad2(m+1)}-01`,end:`${y}-${pad2(m+1)}-${pad2(dim(y,m))}`,label:['E','F','M','A','M','J','J','A','S','O','N','D'][m]}))
  }
  return Array.from({length:12},(_,i)=>{
    const d=new Date(today.getFullYear(),today.getMonth()-11+i,1);const y=d.getFullYear(),m=d.getMonth()
    return{start:`${y}-${pad2(m+1)}-01`,end:`${y}-${pad2(m+1)}-${pad2(dim(y,m))}`,label:['E','F','M','A','M','J','J','A','S','O','N','D'][m]}
  })
}

function metricForBucket(bkgs:Booking[],start:string,end:string,metric:StatKey,svcMap:Record<string,number>):number{
  const r=bkgs.filter(b=>b.date>=start&&b.date<=end)
  switch(metric){
    case 'pending':       return r.filter(b=>b.status==='pending').length
    case 'today':         return r.filter(b=>b.status!=='cancelled').length
    case 'noshows':       return r.filter(b=>b.status==='no_show').length
    case 'ingresos':      return r.filter(b=>b.status==='completed').reduce((s,b)=>s+(svcMap[b.service]||0),0)
    case 'cancelaciones': return r.filter(b=>b.status==='cancelled').length
    case 'nuevas':{const before=new Set(bkgs.filter(b=>b.date<start).map(b=>b.phone));return[...new Set(r.map(b=>b.phone))].filter(ph=>!before.has(ph)).length}
  }
}

function getCatForSvc(svcName:string):string{
  for(const cat of SERVICE_CATEGORIES){if(cat.services.some(s=>s.name===svcName))return cat.title}
  return 'Otros'
}

function SLineChart({points,labels,color}:{points:number[];labels:string[];color:string}){
  if(points.length<2)return null
  const W=300,H=100,PL=6,PR=6,PT=18,PB=22
  const iW=W-PL-PR,iH=H-PT-PB
  const max=Math.max(...points,1)
  const xs=points.map((_,i)=>PL+i/(points.length-1)*iW)
  const ys=points.map(p=>PT+(1-p/max)*iH)
  let line=`M${xs[0]},${ys[0]}`
  for(let i=1;i<xs.length;i++){const cx=(xs[i-1]+xs[i])/2;line+=` C${cx},${ys[i-1]},${cx},${ys[i]},${xs[i]},${ys[i]}`}
  const area=`${line} L${xs[xs.length-1]},${H-PB} L${xs[0]},${H-PB} Z`
  const gid='g'+color.replace(/[^a-z0-9]/gi,'')
  return(
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',height:H,overflow:'visible'}}>
      <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.18"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>
      <path d={area} fill={`url(#${gid})`}/>
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      {xs.map((x,i)=>(
        <g key={i}>
          <circle cx={x} cy={ys[i]} r="3.5" fill={color}/>
          {points[i]>0&&<text x={x} y={ys[i]-9} textAnchor="middle" fontSize="9" fill={color} fontWeight="700">{points[i]}</text>}
          <text x={x} y={H-4} textAnchor="middle" fontSize="9" fill="#9a7080">{labels[i]}</text>
        </g>
      ))}
    </svg>
  )
}

function StatDetailSheet({metric,bookings,services,onClose,isAdmin}:{metric:StatKey;bookings:Booking[];services:Service[];onClose:()=>void;isAdmin:boolean}){
  const[specFilter,setSpecFilter]=useState('all')
  const[range,setRange]=useState<RangeKey>('semana')
  const specNames=useSpecialistNames()
  const meta=STAT_META[metric]
  const color=meta.color
  const svcMap=useMemo(()=>Object.fromEntries(services.map(s=>[s.name,parsePriceNum(s.price)])),[services])
  const filtered=useMemo(()=>specFilter==='all'?bookings:bookings.filter(b=>b.specialist===specFilter),[bookings,specFilter])
  const buckets=useMemo(()=>getBuckets(range),[range])
  const points=useMemo(()=>buckets.map(b=>metricForBucket(filtered,b.start,b.end,metric,svcMap)),[filtered,buckets,metric,svcMap])
  const total=points.reduce((s,n)=>s+n,0)
  const isIngresos=metric==='ingresos'

  // Service breakdown for full period
  const pStart=buckets[0]?.start??'',pEnd=buckets[buckets.length-1]?.end??''
  const pBkgs=filtered.filter(b=>b.date>=pStart&&b.date<=pEnd&&(
    metric==='noshows'?b.status==='no_show':
    metric==='cancelaciones'?b.status==='cancelled':
    metric==='ingresos'?b.status==='completed':
    b.status!=='cancelled'
  ))
  const catMap:Record<string,number>={}
  for(const b of pBkgs){const c=getCatForSvc(b.service||'');catMap[c]=(catMap[c]||0)+1}
  const cats=Object.entries(catMap).sort((a,b)=>b[1]-a[1])
  const catTotal=cats.reduce((s,[,n])=>s+n,0)

  return(
    <Sheet onClose={onClose}>
      <SheetHandle title={meta.title} onClose={onClose}/>

      {/* Specialist pills — admin only */}
      {isAdmin&&(
        <div style={{display:'flex',gap:6,overflowX:'auto',paddingBottom:4,marginBottom:14,scrollbarWidth:'none' as any}}>
          {(['all',...specNames]).map(s=>(
            <button key={s} onClick={()=>setSpecFilter(s)} style={{flexShrink:0,padding:'6px 14px',borderRadius:99,border:`1.5px solid ${specFilter===s?color:`color-mix(in srgb, var(--ink) 14%, transparent)`}`,background:specFilter===s?`color-mix(in srgb, ${color} 10%, transparent)`:'transparent',color:specFilter===s?color:C.gray,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:ff,whiteSpace:'nowrap' as const,transition:'all .15s'}}>
              {s==='all'?'Todas':s}
            </button>
          ))}
        </div>
      )}

      {/* Range pills */}
      <div style={{display:'flex',gap:6,marginBottom:20}}>
        {(['semana','mes','ytd','anual'] as RangeKey[]).map(r=>(
          <button key={r} onClick={()=>setRange(r)} style={{flex:1,padding:'7px 4px',borderRadius:8,border:`1px solid ${range===r?color:`color-mix(in srgb, var(--ink) 12%, transparent)`}`,background:range===r?`color-mix(in srgb, ${color} 10%, transparent)`:'transparent',color:range===r?color:C.gray,fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:ff,textTransform:'uppercase' as const,letterSpacing:'0.04em',transition:'all .15s'}}>
            {r}
          </button>
        ))}
      </div>

      {/* Big number */}
      <div style={{marginBottom:20}}>
        <p style={{fontFamily:ffS,fontSize:52,fontWeight:700,color,margin:0,lineHeight:1}}>{isIngresos?'$'+total.toFixed(0):total}</p>
        <p style={{fontSize:12,color:C.gray,margin:'4px 0 0'}}>{RANGE_LABELS[range]}{specFilter!=='all'?` · ${specFilter}`:''}</p>
      </div>

      {/* Line chart */}
      <div style={{padding:'14px 10px 8px',borderRadius:14,background:`color-mix(in srgb, var(--surface) 60%, transparent)`,marginBottom:24}}>
        <SLineChart points={points} labels={buckets.map(b=>b.label)} color={color}/>
      </div>

      {/* Category breakdown */}
      {catTotal>0&&(
        <div>
          <p style={{fontSize:10,fontWeight:700,color:C.gray,textTransform:'uppercase',letterSpacing:'0.1em',margin:'0 0 12px'}}>Por categoría</p>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {cats.map(([cat,n])=>{
              const pct=Math.round(n/catTotal*100)
              return(
                <div key={cat}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                    <span style={{fontSize:13,fontWeight:600,color:C.ink}}>{cat}</span>
                    <span style={{fontSize:12,color:C.gray}}>{n} · <strong style={{color}}>{pct}%</strong></span>
                  </div>
                  <div style={{height:6,borderRadius:99,background:`color-mix(in srgb, var(--ink) 8%, transparent)`}}>
                    <div style={{height:6,borderRadius:99,width:`${pct}%`,background:color,transition:'width .5s ease'}}/>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </Sheet>
  )
}

function Dashboard({bookings,loading,services,onRefresh,isAdmin,svcMap,specialistsFull,viewerName,autoOpenId,onAutoOpenConsumed,onOpenNotifications}:{bookings:Booking[];loading:boolean;services:Service[];onRefresh:()=>void;isAdmin:boolean;svcMap:Map<string,BookingServiceRow[]>;specialistsFull:SpecialistLite[];viewerName?:string;autoOpenId?:string|null;onAutoOpenConsumed?:()=>void;onOpenNotifications?:()=>void}){
  const today=todayStr()
  const[notifCount,setNotifCount]=useState(0)
  useEffect(()=>{
    supabaseAdmin.from('notifications').select('target_role,target_specialist_name').eq('resolved',false).then(({data})=>{
      const count=(data??[]).filter((n:any)=>
        isAdmin ? (n.target_role==='admin'||n.target_role==='admin_and_specialist')
                : (n.target_role!=='admin'&&(!n.target_specialist_name||n.target_specialist_name===viewerName))
      ).length
      setNotifCount(count)
    })
  },[isAdmin,viewerName])
  const[calMonth,setCalMonth]=useState(()=>new Date(new Date().getFullYear(),new Date().getMonth(),1))
  const[selectedDay,setSelectedDay]=useState<string|null>(today)

  // Jump straight to the day of the booking a notification deep-linked to.
  useEffect(()=>{
    if(!autoOpenId||loading)return
    const b=bookings.find(x=>x.id===autoOpenId)
    if(b){setSelectedDay(b.date);setDashRange('day');setCalMonth(new Date(Number(b.date.slice(0,4)),Number(b.date.slice(5,7))-1,1))}
  },[autoOpenId,loading])
  const[showCreate,setShowCreate]=useState(false)
  const[created,setCreated]=useState<Booking|null>(null)
  const[bannerOpen,setBannerOpen]=useState(false)
  const[openStat,setOpenStat]=useState<StatKey|null>(null)
  const[dashSpecFilter,setDashSpecFilter]=useState('all')
  const[dashRange,setDashRange]=useState<'day'|'week'|'month'>('day')
  const[pendingIdx,setPendingIdx]=useState(0)
  const[showAllPending,setShowAllPending]=useState(false)
  const specNames=useSpecialistNames()

  // carousel auto-advance
  useEffect(()=>{
    const cnt=bookings.filter(b=>b.status==='pending').length
    if(pendingIdx>=cnt&&cnt>0) setPendingIdx(0)
  },[bookings,pendingIdx])
  useEffect(()=>{
    const cnt=bookings.filter(b=>b.status==='pending').length
    if(cnt<=1||showAllPending) return
    const t=setInterval(()=>setPendingIdx(i=>(i+1)%cnt),2500)
    return()=>clearInterval(t)
  },[bookings,showAllPending])

  const firstDay=calMonth.getDay()
  const daysInMonth=new Date(calMonth.getFullYear(),calMonth.getMonth()+1,0).getDate()
  const cells:(Date|null)[]=[]
  for(let i=0;i<firstDay;i++) cells.push(null)
  for(let d=1;d<=daysInMonth;d++) cells.push(new Date(calMonth.getFullYear(),calMonth.getMonth(),d))

  const dotDays=new Set(bookings.filter(b=>b.status!=='cancelled').map(b=>b.date))
  const pendingB=bookings.filter(b=>b.status==='pending')
  const todayB=bookings.filter(b=>b.date===today&&b.status!=='cancelled'&&b.status!=='completed')
  // Filtered bookings for selected range
  const specFiltered=dashSpecFilter==='all'?bookings:bookings.filter(b=>serviceBreakdown(b,svcMap).some(s=>s.specialist===dashSpecFilter))
  const rangeBookings=()=>{
    if(dashRange==='week'){const ws2=weekStart();return specFiltered.filter(b=>b.date>=ws2&&b.status!=='cancelled')}
    if(dashRange==='month'){const ms2=monthStart();return specFiltered.filter(b=>b.date>=ms2&&b.status!=='cancelled')}
    return selectedDay?specFiltered.filter(b=>b.date===selectedDay&&b.status!=='cancelled'):[]
  }
  const selectedB=rangeBookings()
  const hour=new Date().getHours()
  const greeting=hour<12?'Buenos días':hour<18?'Buenas tardes':'Buenas noches'

  const ws=weekStart(),ms=monthStart()
  const noShowsSemana=bookings.filter(b=>b.date>=ws&&b.status==='no_show').length
  const cancelSemana=bookings.filter(b=>b.date>=ws&&b.status==='cancelled').length
  const completedMes=bookings.filter(b=>b.date>=ms&&b.status==='completed')
  const priceMap=Object.fromEntries(services.map(s=>[s.name,parsePriceNum(s.price)]))
  const ingresosMes=completedMes.reduce((sum,b)=>sum+serviceBreakdown(b,svcMap).reduce((s2,row)=>s2+(priceMap[row.service]||0),0),0)
  const phonesSemana=new Set(bookings.filter(b=>b.date>=ws).map(b=>b.phone))
  const phonesAntes=new Set(bookings.filter(b=>b.date<ws).map(b=>b.phone))
  const nuevasSemana=[...phonesSemana].filter(ph=>!phonesAntes.has(ph)).length

  return(
    <div style={{padding:'0 16px 24px'}}>
      {showCreate&&<CreateModal services={services} onClose={()=>setShowCreate(false)} onCreated={b=>{setShowCreate(false);setCreated(b);onRefresh()}}/>}
      {created&&<ConfirmSheet booking={created} onClose={()=>setCreated(null)} isAdmin={isAdmin} isNew={!bookings.some(x=>x.phone===created.phone&&x.date<created.date&&x.id!==created.id)}/>}
      {openStat&&<StatDetailSheet metric={openStat} bookings={bookings} services={services} isAdmin={isAdmin} onClose={()=>setOpenStat(null)}/>}

      {/* Header */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:16}}>
        <div>
          <p style={{fontSize:11,color:C.gray,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.12em',margin:0}}>{greeting}</p>
          <h1 style={{fontFamily:ffS,fontSize:28,fontWeight:500,color:C.ink,lineHeight:1.15,margin:'4px 0 0'}}>Agenda</h1>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
          {onOpenNotifications&&(
            <button onClick={onOpenNotifications} title="Notificaciones" style={{position:'relative',width:40,height:40,borderRadius:12,background:`color-mix(in srgb, var(--gold) 10%, transparent)`,border:`1px solid color-mix(in srgb, var(--gold) 25%, transparent)`,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <Ic.Bell size={17} color={C.gold}/>
              {notifCount>0&&(
                <span style={{position:'absolute',top:-4,right:-4,minWidth:18,height:18,borderRadius:99,background:C.red,color:'#fff',fontSize:10,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',padding:'0 4px',fontFamily:ff}}>{notifCount>99?'99+':notifCount}</span>
              )}
            </button>
          )}
          <button onClick={()=>setShowCreate(true)} style={{display:'flex',alignItems:'center',gap:6,padding:'10px 16px',borderRadius:12,background:'#1a0f14',color:'#fff',fontWeight:700,fontSize:13,border:'none',cursor:'pointer',fontFamily:ff}}>
            <Ic.Plus size={15} color="#fff"/> Nueva cita
          </button>
        </div>
      </div>

      {/* Morning banner */}
      {todayB.length>0&&(
        <div style={glass({padding:'14px 16px',borderRadius:14,marginBottom:14,border:`1.5px solid color-mix(in srgb, var(--gold) 30%, transparent)`})}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <Ic.Sun size={18} color={C.gold}/>
              <span style={{fontSize:14,fontWeight:600,color:C.ink}}>Hoy tienes <strong style={{color:C.gold}}>{todayB.length}</strong> cita{todayB.length!==1?'s':''}</span>
            </div>
            <button onClick={()=>setBannerOpen(o=>!o)} style={{background:'none',border:'none',cursor:'pointer',color:C.gray,fontSize:12,fontWeight:600,fontFamily:ff,display:'flex',alignItems:'center',gap:4}}>
              {bannerOpen?'Cerrar':'Ver más'}<Ic.CD size={14} color={C.gray} style={{transform:bannerOpen?'rotate(180deg)':'none',transition:'transform 0.2s'}}/>
            </button>
          </div>
          {bannerOpen&&(
            <div style={{marginTop:10,borderTop:`1px solid ${C.sb}`,paddingTop:10,display:'flex',flexDirection:'column',gap:6}}>
              {todayB.sort((a,b)=>a.time.localeCompare(b.time)).map(b=>(
                <div key={b.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <span style={{fontSize:13,color:C.ink,fontWeight:500}}>{b.name}</span>
                  <span style={{fontSize:12,color:C.gray}}>{b.time} · {b.service||''}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mobile-only quick summary strip */}
      <div className="mob-hero-strip" style={{...glass({padding:'12px 16px',borderRadius:14,marginBottom:12}),alignItems:'center',justifyContent:'space-between',gap:12}}>
        <div>
          <p style={{fontSize:10,fontWeight:600,color:C.gray,margin:0,letterSpacing:'0.04em',textTransform:'uppercase'}}>
            {new Date().toLocaleDateString('es-PR',{weekday:'short',day:'numeric',month:'short'})}
          </p>
          <p style={{fontSize:13,fontWeight:700,color:C.ink,margin:'2px 0 0',fontFamily:ff}}>{greeting}</p>
        </div>
        <div style={{display:'flex',gap:14,alignItems:'center',flexShrink:0}}>
          <div style={{textAlign:'center'}}>
            <p style={{fontSize:22,fontWeight:700,fontFamily:ffS,color:C.gold,margin:0,lineHeight:1}}>{loading?'–':pendingB.length}</p>
            <p style={{fontSize:9,color:C.gray,margin:'2px 0 0',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em'}}>Pendientes</p>
          </div>
          <div style={{width:1,height:30,background:`color-mix(in srgb, var(--rosa) 25%, transparent)`}}/>
          <div style={{textAlign:'center'}}>
            <p style={{fontSize:22,fontWeight:700,fontFamily:ffS,color:C.green,margin:0,lineHeight:1}}>{loading?'–':bookings.filter(b=>b.date===today&&b.status!=='cancelled').length}</p>
            <p style={{fontSize:9,color:C.gray,margin:'2px 0 0',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em'}}>Hoy</p>
          </div>
        </div>
      </div>

      {/* Desktop-only hero welcome strip */}
      <div className="dash-hero">
        <div>
          <p style={{fontSize:11,fontWeight:700,color:C.gray,textTransform:'uppercase',letterSpacing:'0.12em',margin:'0 0 4px'}}>
            {new Date().toLocaleDateString('es-PR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
          </p>
          <h2 style={{fontFamily:ffS,fontSize:22,fontWeight:500,color:C.ink,margin:0,lineHeight:1.2}}>{greeting}</h2>
          <p style={{fontSize:13,color:C.gray,margin:'4px 0 0',fontWeight:400}}>{business.name} · Panel de administración</p>
        </div>
        <div style={{display:'flex',gap:28,alignItems:'center',flexShrink:0}}>
          <div style={{textAlign:'center'}}>
            <p style={{fontSize:36,fontWeight:700,fontFamily:ffS,color:C.gold,margin:0,lineHeight:1}}>{loading?'–':pendingB.length}</p>
            <p style={{fontSize:10,color:C.gray,margin:'4px 0 0',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em'}}>Pendientes</p>
          </div>
          <div style={{width:1,height:48,background:`color-mix(in srgb, var(--rosa) 30%, transparent)`}}/>
          <div style={{textAlign:'center'}}>
            <p style={{fontSize:36,fontWeight:700,fontFamily:ffS,color:C.green,margin:0,lineHeight:1}}>{loading?'–':bookings.filter(b=>b.date===today&&b.status!=='cancelled').length}</p>
            <p style={{fontSize:10,color:C.gray,margin:'4px 0 0',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em'}}>Hoy</p>
          </div>
        </div>
      </div>

      {/* 2-col on desktop, ordered on mobile: pending→cal→stats */}
      <div className="dash-main-grid">
      <div className="dash-cal">
      {/* Calendar */}
      <div style={glass({padding:'16px',marginBottom:14,borderRadius:16})}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
          <button onClick={()=>setCalMonth(new Date(calMonth.getFullYear(),calMonth.getMonth()-1,1))} style={{background:'none',border:'none',cursor:'pointer',color:C.gray,padding:6,borderRadius:8,display:'flex'}}><Ic.CL size={16} color={C.gray}/></button>
          <span style={{fontFamily:ffS,fontSize:16,fontWeight:500,color:C.ink}}>{MONTHS[calMonth.getMonth()]} {calMonth.getFullYear()}</span>
          <button onClick={()=>setCalMonth(new Date(calMonth.getFullYear(),calMonth.getMonth()+1,1))} style={{background:'none',border:'none',cursor:'pointer',color:C.gray,padding:6,borderRadius:8,display:'flex'}}><Ic.CR size={16} color={C.gray}/></button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,marginBottom:2}}>
          {DAYS.map((d,i)=><div key={i} style={{textAlign:'center',fontSize:10,color:C.gray,fontWeight:600,padding:'2px 0'}}>{d}</div>)}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2}}>
          {cells.map((d,i)=>{
            if(!d) return <div key={i}/>
            const ds=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
            const isSel=selectedDay===ds,isT=ds===today,hasDot=dotDays.has(ds)
            return(
              <button key={i} className="cal-day-btn" onClick={()=>setSelectedDay(ds===selectedDay?null:ds)} style={{aspectRatio:'1',borderRadius:8,border:isSel?`2px solid ${isT?C.gold:C.ink}`:'2px solid transparent',cursor:'pointer',background:isT&&!isSel?'color-mix(in srgb, var(--gold) 12%, transparent)':'transparent',color:isT?C.gold:C.ink,fontSize:12,fontWeight:isT?700:isSel?600:400,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:1,padding:0,position:'relative'}}>
                {d.getDate()}
                {hasDot&&<div style={{width:4,height:4,borderRadius:'50%',background:C.gold,position:'absolute',bottom:3}}/>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Filter bar — compact single row */}
      {isAdmin&&(
        <div style={{...glass({padding:'8px 12px',borderRadius:14,marginBottom:12}),display:'flex',alignItems:'center',gap:10,flexWrap:'wrap' as const}}>
          {/* Segmented date range */}
          <div style={{display:'flex',gap:2,background:`color-mix(in srgb, var(--ink) 7%, transparent)`,borderRadius:10,padding:3,flexShrink:0}}>
            {([{id:'day' as const,label:'Día'},{id:'week' as const,label:'Semana'},{id:'month' as const,label:'Mes'}]).map(r=>(
              <button key={r.id} onClick={()=>{setDashRange(r.id);if(r.id==='day'&&!selectedDay)setSelectedDay(today)}} style={{padding:'5px 10px',borderRadius:8,background:dashRange===r.id?C.bg:'transparent',color:dashRange===r.id?C.ink:C.gray,fontWeight:dashRange===r.id?700:500,fontSize:11,border:'none',cursor:'pointer',fontFamily:ff,transition:'all .18s',boxShadow:dashRange===r.id?'0 1px 4px rgba(42,26,32,0.1)':'none',whiteSpace:'nowrap' as const}}>
                {r.label}
              </button>
            ))}
          </div>
          {/* Divider */}
          <div style={{width:1,height:22,background:`color-mix(in srgb, var(--rosa) 30%, transparent)`,flexShrink:0}}/>
          {/* Specialist avatar pills */}
          <div style={{display:'flex',gap:5,overflowX:'auto',scrollbarWidth:'none' as any,flex:1,alignItems:'center'}}>
            {(['all',...specNames]).map(s=>(
              <button key={s} onClick={()=>setDashSpecFilter(s)} title={s==='all'?'Todas':s}
                style={{flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',
                  height:28,borderRadius:s==='all'?8:8,
                  padding:s==='all'?'0 10px':'0 8px',
                  minWidth:s==='all'?'auto':undefined,
                  border:`1.5px solid ${dashSpecFilter===s?C.gold:'transparent'}`,
                  background:dashSpecFilter===s?`color-mix(in srgb, var(--gold) 14%, transparent)`:`color-mix(in srgb, var(--ink) 5%, transparent)`,
                  color:dashSpecFilter===s?C.gold:C.gray,fontSize:11,fontWeight:dashSpecFilter===s?700:500,
                  cursor:'pointer',fontFamily:ff,transition:'all .15s',whiteSpace:'nowrap' as const,gap:5}}>
                {s==='all'?(
                  <>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    Todas
                  </>
                ):(
                  <>
                    <div style={{width:16,height:16,borderRadius:'50%',background:`color-mix(in srgb, var(--rosa) 25%, transparent)`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <span style={{fontSize:9,fontWeight:700,color:C.rosa,fontFamily:ffS}}>{s.charAt(0)}</span>
                    </div>
                    {s.split(' ')[0]}
                  </>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected day / range bookings */}
      {selectedB.length>0&&(
        <div style={{marginBottom:14}}>
          <p style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:C.gray,marginBottom:8}}>
            {dashRange==='week'?'Esta semana':dashRange==='month'?'Este mes':selectedDay?fmtDate(selectedDay):''}
            {dashSpecFilter!=='all'?` · ${dashSpecFilter}`:''}
            <span style={{fontWeight:400,marginLeft:6,color:C.gray}}>({selectedB.length})</span>
          </p>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {selectedB.sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time)).map(b=>(
              <BookingCard key={b.id} b={b} allBookings={bookings} services={services} isToday={b.date===today} onRefresh={onRefresh} isAdmin={isAdmin} svcMap={svcMap} specialistsFull={specialistsFull} viewerName={viewerName} autoOpen={b.id===autoOpenId} onAutoOpenConsumed={onAutoOpenConsumed}/>
            ))}
          </div>
        </div>
      )}
      {selectedB.length===0&&(selectedDay||dashRange!=='day')&&(
        <p style={{textAlign:'center',color:C.gray,fontSize:13,padding:'8px 0 16px'}}>No hay citas para este período</p>
      )}

      </div>{/* end dash-cal */}
      {/* Stats — desktop: right col row 1 | mobile: last */}
      <div className="dash-stats">
      <div className="dash-stats-grid" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
        {([
          {key:'pending'     as StatKey,label:'Sin confirmar',val:loading?'':String(pendingB.length),         sub:'pendientes',  color:C.gold},
          {key:'today'       as StatKey,label:'Hoy',           val:loading?'':String(bookings.filter(b=>b.date===today&&b.status!=='cancelled').length),sub:'citas',color:C.green},
          {key:'noshows'     as StatKey,label:'No shows',      val:loading?'':String(noShowsSemana),           sub:'esta semana', color:C.red},
          ...(isAdmin?[{key:'ingresos' as StatKey,label:'Ingresos est.', val:loading?'':('$'+ingresosMes.toFixed(0)),   sub:'este mes',    color:C.green}]:[]),
          {key:'nuevas'      as StatKey,label:'Nuevas clientas',val:loading?'':String(nuevasSemana),          sub:'esta semana', color:C.green},
          {key:'cancelaciones' as StatKey,label:'Cancelaciones',val:loading?'':String(cancelSemana),          sub:'esta semana', color:C.red},
        ]).map(s=>(
          <button key={s.key} onClick={()=>setOpenStat(s.key)}
            className={`dash-stat-card ${s.color===C.gold?'stat-gold':s.color===C.red?'stat-red':'stat-green'}`}
            style={{...glass({padding:'14px',borderRadius:16}),border:'none',cursor:'pointer',textAlign:'left',display:'block',width:'100%',position:'relative',transition:'transform .12s',fontFamily:ff}}
            onMouseEnter={e=>(e.currentTarget as HTMLElement).style.transform='scale(1.02)'}
            onMouseLeave={e=>(e.currentTarget as HTMLElement).style.transform='scale(1)'}>
            <p style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:C.gray,margin:0}}>{s.label}</p>
            <p className={s.key==='ingresos'?'mob-stat-num-money':'mob-stat-num'} style={{fontSize:s.key==='ingresos'?22:30,fontWeight:700,fontFamily:ffS,color:s.color,margin:'4px 0 2px',lineHeight:1}}>{s.val}</p>
            <p style={{fontSize:11,color:C.gray,margin:0}}>{s.sub}</p>
            <div style={{position:'absolute',top:12,right:12,opacity:0.35}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={s.color} strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          </button>
        ))}
      </div>
      </div>{/* end dash-stats */}
      {/* Pending — desktop: right col row 2 | mobile: first */}
      <div className="dash-pend">
      <div style={{marginTop:4}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <p style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:C.gray,margin:0}}>Pendientes</p>
            {pendingB.length>0&&<span style={{fontSize:11,fontWeight:700,color:C.gold,background:`color-mix(in srgb, var(--gold) 14%, transparent)`,padding:'2px 8px',borderRadius:99}}>{pendingB.length}</span>}
          </div>
          {pendingB.length>0&&(
            <button onClick={()=>setShowAllPending(o=>!o)} style={{fontSize:11,fontWeight:600,color:C.gray,background:'none',border:'none',cursor:'pointer',fontFamily:ff,textDecoration:'underline',opacity:0.7}}>
              {showAllPending?'Cerrar':'Ver todas'}
            </button>
          )}
        </div>

        {pendingB.length===0?(
          /* Empty state */
          <div style={{...glass({padding:'20px 16px',borderRadius:16}),textAlign:'center'}}>
            <div style={{width:40,height:40,borderRadius:'50%',background:`color-mix(in srgb, var(--green) 15%, transparent)`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 10px'}}>
              <Ic.Check size={20} color={C.green}/>
            </div>
            <p style={{fontSize:13,fontWeight:600,color:C.ink,margin:'0 0 2px'}}>Todo al día</p>
            <p style={{fontSize:11,color:C.gray,margin:0}}>No hay citas pendientes de confirmar</p>
          </div>
        ):showAllPending?(
          /* Full list */
          <div style={{display:'flex',flexDirection:'column',gap:8,maxHeight:420,overflowY:'auto',paddingRight:2,scrollbarWidth:'thin' as any}}>
            {pendingB.map(b=>(
              <BookingCard key={b.id} b={b} allBookings={bookings} services={services} isToday={b.date===today} onRefresh={onRefresh} isAdmin={isAdmin} svcMap={svcMap} specialistsFull={specialistsFull} viewerName={viewerName}/>
            ))}
          </div>
        ):(
          /* Carousel */
          <div>
            <div style={{minHeight:120}}>
              <div key={`pc-${pendingIdx}`} style={{animation:'kFadeIn 0.3s ease-out'}}>
                <BookingCard b={pendingB[pendingIdx]??pendingB[0]} allBookings={bookings} services={services} isToday={(pendingB[pendingIdx]??pendingB[0]).date===today} onRefresh={onRefresh} isAdmin={isAdmin} svcMap={svcMap} specialistsFull={specialistsFull} viewerName={viewerName}/>
              </div>
            </div>
            {pendingB.length>1&&(
              <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,marginTop:10}}>
                <button onClick={()=>setPendingIdx(i=>(i-1+pendingB.length)%pendingB.length)} style={{background:'none',border:'none',cursor:'pointer',color:C.gray,fontSize:16,lineHeight:1,padding:'2px 6px'}}>‹</button>
                {pendingB.map((_,i)=>(
                  <button key={i} onClick={()=>setPendingIdx(i)} style={{width:i===pendingIdx?18:6,height:6,borderRadius:99,border:'none',cursor:'pointer',background:i===pendingIdx?C.rosa:`color-mix(in srgb, var(--rosa) 30%, transparent)`,transition:'all .2s',padding:0}}/>
                ))}
                <button onClick={()=>setPendingIdx(i=>(i+1)%pendingB.length)} style={{background:'none',border:'none',cursor:'pointer',color:C.gray,fontSize:16,lineHeight:1,padding:'2px 6px'}}>›</button>
              </div>
            )}
          </div>
        )}
      </div>
      </div>{/* end dash-pend */}
      </div>{/* end dash-main-grid */}
    </div>
  )
}

//  SERVICIOS
function Servicios({services,onRefresh}:{services:Service[];onRefresh:()=>void}){
  const[openCat,setOpenCat]=useState<string|null>(null)
  const[editing,setEditing]=useState<string|null>(null)
  const[editForm,setEditForm]=useState<Partial<Service>>({})
  const[saving,setSaving]=useState(false)
  const[uploading,setUploading]=useState(false)
  const[showNewForm,setShowNewForm]=useState(false)
  const[newForm,setNewForm]=useState({category_title:'',name:'',price:'',duration:'',description:'',subgroup:''})
  const[newCatName,setNewCatName]=useState('')
  const[newSubgroupName,setNewSubgroupName]=useState('')
  const[editNewSubgroupName,setEditNewSubgroupName]=useState('')
  const[confirmDelSvc,setConfirmDelSvc]=useState<Service|null>(null)
  const[svcError,setSvcError]=useState('')
  const fileRef=useRef<HTMLInputElement>(null)
  const cats=[...new Set(services.map(s=>s.category_title))]
  const catIds:Record<string,string>={}
  for(const s of services) if(s.category_id) catIds[s.category_title]=s.category_id

  // Subcategories are per-category (e.g. Cabello has its own "Cortes",
  // "Color & Mechas"...) — kept in their own table since `services` has no
  // dedicated categories table either; category_title is the join key.
  const[subgroups,setSubgroups]=useState<CategorySubgroup[]>([])
  const[manageCat,setManageCat]=useState<string|null>(null)
  const[manageAddName,setManageAddName]=useState('')
  useEffect(()=>{loadSubgroups()},[])
  async function loadSubgroups(){
    const{data}=await supabase.from('category_subgroups').select('*').order('display_order')
    setSubgroups((data??[]) as CategorySubgroup[])
  }
  async function ensureSubgroup(categoryTitle:string,name:string){
    if(!categoryTitle||!name)return
    if(subgroups.some(s=>s.category_title===categoryTitle&&s.name===name))return
    const maxOrder=subgroups.filter(s=>s.category_title===categoryTitle).reduce((m,s)=>Math.max(m,s.display_order),0)
    const{error}=await supabaseAdmin.from('category_subgroups').insert([{category_title:categoryTitle,name,display_order:maxOrder+1}])
    if(!error) loadSubgroups()
  }
  async function deleteSubgroup(sub:CategorySubgroup){
    await supabaseAdmin.from('category_subgroups').delete().eq('id',sub.id)
    setSubgroups(list=>list.filter(s=>s.id!==sub.id))
  }

  // Writes use supabaseAdmin (service_role) — services has RLS enabled with
  // no anon write policy, so the plain anon `supabase` client used to fail
  // these silently (no error shown, row never created) while reads still
  // worked fine, making it look like "nothing happens" when creating/editing.
  async function saveService(){
    if(!editing)return;setSaving(true);setSvcError('')
    const svc=services.find(s=>s.id===editing)
    const subgroup=editForm.subgroup==='__nueva__'?editNewSubgroupName.trim():(editForm.subgroup||null)
    const{error}=await supabaseAdmin.from('services').update({...editForm,subgroup,updated_at:new Date().toISOString()}).eq('id',editing)
    setSaving(false)
    if(error){setSvcError(error.message);return}
    if(subgroup&&svc) ensureSubgroup(svc.category_title,subgroup)
    setEditing(null);setEditNewSubgroupName('');onRefresh()
  }
  async function toggleActive(svc:Service){
    const{error}=await supabaseAdmin.from('services').update({active:!svc.active}).eq('id',svc.id)
    if(error){setSvcError(error.message);return}
    onRefresh()
  }
  async function deleteService(svc:Service){
    const{error}=await supabaseAdmin.from('services').delete().eq('id',svc.id)
    setConfirmDelSvc(null)
    if(error){setSvcError(error.message);return}
    onRefresh()
  }
  async function createService(e:React.FormEvent){
    e.preventDefault();setSaving(true);setSvcError('')
    const categoryTitle=newForm.category_title==='__nueva__'?newCatName.trim():newForm.category_title
    const catId=catIds[categoryTitle]||categoryTitle.toLowerCase().replace(/\s+/g,'-')
    const subgroup=newForm.subgroup==='__nueva__'?newSubgroupName.trim():(newForm.subgroup||null)
    const maxOrder=services.filter(s=>s.category_title===categoryTitle).reduce((m,s)=>Math.max(m,s.display_order),0)
    const{error}=await supabaseAdmin.from('services').insert([{category_id:catId,category_title:categoryTitle,name:newForm.name,price:newForm.price,duration:newForm.duration,description:newForm.description||null,subgroup,cost:0,display_order:maxOrder+1,active:true}])
    setSaving(false)
    if(error){setSvcError(error.message);return}
    if(subgroup) ensureSubgroup(categoryTitle,subgroup)
    setShowNewForm(false);setNewForm({category_title:'',name:'',price:'',duration:'',description:'',subgroup:''});setNewCatName('');setNewSubgroupName('');onRefresh()
  }
  async function uploadPhoto(file:File){
    if(!editing)return;setUploading(true);setSvcError('')
    const ext=file.name.split('.').pop()
    const{error}=await supabaseAdmin.storage.from('services').upload(`${editing}.${ext}`,file,{upsert:true})
    if(error){setSvcError(error.message);setUploading(false);return}
    const{data:u}=supabaseAdmin.storage.from('services').getPublicUrl(`${editing}.${ext}`);const photo_url=u.publicUrl;setEditForm(f=>({...f,photo_url}));await supabaseAdmin.from('services').update({photo_url}).eq('id',editing)
    setUploading(false)
  }
  async function seedServices(){
    const rows=SERVICE_CATEGORIES.flatMap((cat,ci)=>cat.services.map((svc,si)=>({category_id:cat.id,category_title:cat.title,name:svc.name,duration:svc.duration,price:svc.price,cost:0,display_order:ci*100+si,active:true})))
    const{error}=await supabaseAdmin.from('services').insert(rows)
    if(error){setSvcError(error.message);return}
    onRefresh()
  }

  return(
    <div style={{padding:'0 16px 24px'}}>
      {confirmDelSvc&&<DeleteConfirm msg={`¿Eliminar "${confirmDelSvc.name}"? Esta acción no se puede deshacer.`} onClose={()=>setConfirmDelSvc(null)} onConfirm={()=>deleteService(confirmDelSvc)}/>}
      {svcError&&<div style={{padding:'10px 14px',borderRadius:10,background:`color-mix(in srgb, var(--red) 10%, transparent)`,border:`1px solid color-mix(in srgb, var(--red) 25%, transparent)`,marginBottom:14,display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
        <span style={{fontSize:12,color:C.red,fontWeight:600}}>{svcError}</span>
        <button onClick={()=>setSvcError('')} style={{background:'none',border:'none',cursor:'pointer',color:C.red,fontSize:16,lineHeight:1,padding:0}}>×</button>
      </div>}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
        <h2 style={{fontFamily:ffS,fontSize:28,fontWeight:500,color:C.ink,margin:0}}>Servicios</h2>
        <div style={{display:'flex',gap:8}}>
          {services.length===0&&<button onClick={seedServices} style={{fontSize:12,fontWeight:700,padding:'8px 14px',borderRadius:10,background:'#1a0f14',color:'#fff',border:'none',cursor:'pointer',fontFamily:ff}}>Importar</button>}
          <button onClick={()=>setShowNewForm(s=>!s)} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:10,background:showNewForm?'color-mix(in srgb, var(--ink) 10%, transparent)':C.gold,color:showNewForm?C.gray:'#fff',fontWeight:700,fontSize:12,border:'none',cursor:'pointer',fontFamily:ff}}>
            <Ic.Plus size={14} color={showNewForm?C.gray:'#fff'}/> Nuevo
          </button>
        </div>
      </div>

      {showNewForm&&(
        <div style={glass({padding:18,borderRadius:16,marginBottom:16})}>
          <p style={{fontFamily:ffS,fontSize:17,color:C.ink,margin:'0 0 14px'}}>Nuevo Servicio</p>
          <form onSubmit={createService} style={{display:'flex',flexDirection:'column',gap:10}}>
            <div>
              <label style={lbl}>Categoría</label>
              <select required style={inp()} value={newForm.category_title} onChange={e=>setNewForm(f=>({...f,category_title:e.target.value}))}>
                <option value="">Seleccionar categoría...</option>
                {cats.map(c=><option key={c} value={c}>{c}</option>)}
                <option value="__nueva__">+ Nueva categoría</option>
              </select>
            </div>
            {newForm.category_title==='__nueva__'&&(
              <div><label style={lbl}>Nombre de nueva categoría</label><input required style={inp()} placeholder="Ej: Spa" value={newCatName} onChange={e=>setNewCatName(e.target.value)}/></div>
            )}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              <div><label style={lbl}>Nombre del servicio</label><input required style={inp({fontSize:12})} value={newForm.name} onChange={e=>setNewForm(f=>({...f,name:e.target.value}))}/></div>
              <div><label style={lbl}>Precio</label><input required style={inp({fontSize:12})} placeholder="Desde $35" value={newForm.price} onChange={e=>setNewForm(f=>({...f,price:e.target.value}))}/></div>
            </div>
            <div><label style={lbl}>Duración</label><select required style={inp({fontSize:12})} value={newForm.duration} onChange={e=>setNewForm(f=>({...f,duration:e.target.value}))}><option value="">Seleccionar...</option>{DURATIONS.map(d=><option key={d} value={d}>{d}</option>)}</select></div>
            <div><label style={lbl}>Descripción (opcional)</label><textarea rows={2} style={inp({resize:'none',fontSize:12})} value={newForm.description} onChange={e=>setNewForm(f=>({...f,description:e.target.value}))}/></div>
            <div>
              <label style={lbl}>Sección en la página (opcional)</label>
              {(()=>{const categoryTitle=newForm.category_title==='__nueva__'?newCatName.trim():newForm.category_title;const opts=subgroups.filter(s=>s.category_title===categoryTitle);return(
                <select style={inp({fontSize:12})} value={newForm.subgroup} onChange={e=>setNewForm(f=>({...f,subgroup:e.target.value}))}>
                  <option value="">Sin sección (cae en "Otros")</option>
                  {opts.map(s=><option key={s.id} value={s.name}>{s.name}</option>)}
                  <option value="__nueva__">+ Nueva subcategoría</option>
                </select>
              )})()}
              {newForm.subgroup==='__nueva__'&&(
                <input required style={inp({fontSize:12,marginTop:6})} placeholder="Ej: Color & Mechas" value={newSubgroupName} onChange={e=>setNewSubgroupName(e.target.value)}/>
              )}
              <p style={{fontSize:10,color:C.gray,margin:'3px 0 0'}}>Elige una sección existente o crea una nueva — se agrega sola a la página. Déjalo en "Sin sección" para que caiga en "Otros".</p>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button type="submit" disabled={saving} style={{flex:1,padding:'10px',borderRadius:10,background:C.green,color:'#fff',fontWeight:700,fontSize:12,border:'none',cursor:'pointer',fontFamily:ff}}>{saving?'Guardando...':'Crear Servicio'}</button>
              <button type="button" onClick={()=>{setShowNewForm(false);setNewCatName('')}} style={{flex:1,padding:'10px',borderRadius:10,background:`color-mix(in srgb, var(--ink) 8%, transparent)`,color:C.gray,fontWeight:600,fontSize:12,border:'none',cursor:'pointer',fontFamily:ff}}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {services.length===0?(
        <div style={glass({padding:32,textAlign:'center',borderRadius:16})}><p style={{color:C.gray,fontSize:14,margin:0}}>Toca "Importar" para cargar los servicios.</p></div>
      ):(
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {cats.map(cat=>{
            const catSvcs=services.filter(s=>s.category_title===cat)
            const isOpen=openCat===cat
            return(
              <div key={cat} style={glass({borderRadius:16,overflow:'hidden'})}>
                <div style={{width:'100%',display:'flex',alignItems:'center'}}>
                  <button onClick={()=>setOpenCat(isOpen?null:cat)} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 18px',background:'none',border:'none',cursor:'pointer',fontFamily:ff}}>
                    <span style={{fontSize:14,fontWeight:600,color:C.ink}}>{cat} <span style={{fontSize:11,color:C.gray,fontWeight:400}}>({catSvcs.length})</span></span>
                    <Ic.CD color={C.gray} style={{transform:isOpen?'rotate(180deg)':'none',transition:'transform 0.2s'}}/>
                  </button>
                  {isOpen&&<button onClick={()=>{setManageCat(manageCat===cat?null:cat);setManageAddName('')}} title="Gestionar subcategorías" style={{padding:'8px 14px 8px 4px',background:'none',border:'none',cursor:'pointer',fontSize:11,fontWeight:700,color:manageCat===cat?C.gold:C.gray,fontFamily:ff,whiteSpace:'nowrap'}}>Subcategorías</button>}
                </div>
                {isOpen&&manageCat===cat&&(
                  <div style={{padding:'0 16px 14px',borderTop:`1px solid ${C.sb}`,paddingTop:12}}>
                    <div style={{display:'flex',flexWrap:'wrap' as const,gap:6,marginBottom:10}}>
                      {subgroups.filter(s=>s.category_title===cat).map(s=>(
                        <span key={s.id} style={{display:'flex',alignItems:'center',gap:6,padding:'5px 10px',borderRadius:99,background:`color-mix(in srgb, var(--gold) 10%, transparent)`,fontSize:11,color:C.ink}}>
                          {s.name}
                          <button onClick={()=>deleteSubgroup(s)} title="Eliminar subcategoría" style={{background:'none',border:'none',cursor:'pointer',color:C.red,padding:0,fontSize:13,lineHeight:1}}>×</button>
                        </span>
                      ))}
                      {subgroups.filter(s=>s.category_title===cat).length===0&&<span style={{fontSize:11,color:C.gray}}>Sin subcategorías todavía.</span>}
                    </div>
                    <div style={{display:'flex',gap:8}}>
                      <input style={inp({fontSize:12})} placeholder="Nueva subcategoría, ej: Cortes" value={manageAddName} onChange={e=>setManageAddName(e.target.value)}/>
                      <button onClick={()=>{if(manageAddName.trim()){ensureSubgroup(cat,manageAddName.trim());setManageAddName('')}}} style={{padding:'0 16px',borderRadius:10,background:C.gold,color:'#fff',fontWeight:700,fontSize:12,border:'none',cursor:'pointer',fontFamily:ff,flexShrink:0}}>Añadir</button>
                    </div>
                  </div>
                )}
                {isOpen&&catSvcs.map(svc=>(
                  <div key={svc.id} style={{borderTop:`1px solid ${C.sb}`}}>
                    {editing===svc.id?(
                      <div style={{padding:'14px 16px',display:'flex',flexDirection:'column',gap:10}}>
                        <div style={{display:'flex',alignItems:'center',gap:12}}>
                          {editForm.photo_url?<img src={editForm.photo_url} alt="" style={{width:60,height:60,objectFit:'cover',borderRadius:10}}/>:<div style={{width:60,height:60,borderRadius:10,background:`color-mix(in srgb, var(--gold) 10%, transparent)`,display:'flex',alignItems:'center',justifyContent:'center'}}><Ic.Camera size={22} color={C.gold}/></div>}
                          <div>
                            <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>e.target.files?.[0]&&uploadPhoto(e.target.files[0])}/>
                            <button onClick={()=>fileRef.current?.click()} disabled={uploading} style={{fontSize:12,fontWeight:600,padding:'7px 12px',borderRadius:8,background:`color-mix(in srgb, var(--gold) 15%, transparent)`,color:C.gold,border:'none',cursor:'pointer',fontFamily:ff}}>{uploading?'Subiendo...':'Cambiar foto'}</button>
                          </div>
                        </div>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                          <div><label style={lbl}>Nombre</label><input style={inp({fontSize:12})} value={editForm.name||''} onChange={e=>setEditForm(f=>({...f,name:e.target.value}))}/></div>
                          <div><label style={lbl}>Precio</label><input style={inp({fontSize:12})} value={editForm.price||''} onChange={e=>setEditForm(f=>({...f,price:e.target.value}))}/></div>
                          <div><label style={lbl}>Duración</label><select style={inp({fontSize:12})} value={editForm.duration||''} onChange={e=>setEditForm(f=>({...f,duration:e.target.value}))}><option value="">Seleccionar...</option>{DURATIONS.map(d=><option key={d} value={d}>{d}</option>)}</select></div>
                          <div><label style={lbl}>Costo ($)</label><input type="number" style={inp({fontSize:12})} value={editForm.cost||0} onChange={e=>setEditForm(f=>({...f,cost:parseFloat(e.target.value)||0}))}/></div>
                        </div>
                        <div><label style={lbl}>Descripción</label><textarea rows={2} style={inp({resize:'none',fontSize:12})} value={editForm.description||''} onChange={e=>setEditForm(f=>({...f,description:e.target.value}))}/></div>
                        <div>
                          <label style={lbl}>Sección en la página (opcional)</label>
                          <select style={inp({fontSize:12})} value={editForm.subgroup||''} onChange={e=>setEditForm(f=>({...f,subgroup:e.target.value}))}>
                            <option value="">Sin sección (cae en "Otros")</option>
                            {subgroups.filter(s=>s.category_title===svc.category_title).map(s=><option key={s.id} value={s.name}>{s.name}</option>)}
                            <option value="__nueva__">+ Nueva subcategoría</option>
                          </select>
                          {editForm.subgroup==='__nueva__'&&(
                            <input required style={inp({fontSize:12,marginTop:6})} placeholder="Ej: Color & Mechas" value={editNewSubgroupName} onChange={e=>setEditNewSubgroupName(e.target.value)}/>
                          )}
                        </div>
                        <div style={{display:'flex',gap:8}}>
                          <button onClick={saveService} disabled={saving} style={{flex:1,padding:'10px',borderRadius:10,background:C.green,color:'#fff',fontWeight:700,fontSize:12,border:'none',cursor:'pointer',fontFamily:ff}}>{saving?'Guardando...':'Guardar'}</button>
                          <button onClick={()=>setEditing(null)} style={{flex:1,padding:'10px',borderRadius:10,background:`color-mix(in srgb, var(--ink) 8%, transparent)`,color:C.gray,fontWeight:600,fontSize:12,border:'none',cursor:'pointer',fontFamily:ff}}>Cancelar</button>
                        </div>
                        <div style={{display:'flex',gap:8,marginTop:4}}>
                          <button onClick={()=>toggleActive(svc)} style={{flex:1,padding:'9px',borderRadius:10,background:svc.active?`color-mix(in srgb, var(--red) 10%, transparent)`:`color-mix(in srgb, var(--green) 12%, transparent)`,color:svc.active?C.red:C.green,fontWeight:700,fontSize:11,border:'none',cursor:'pointer',fontFamily:ff}}>{svc.active?'Desactivar':'Activar'}</button>
                          <button onClick={()=>setConfirmDelSvc(svc)} style={{padding:'9px 16px',borderRadius:10,background:`color-mix(in srgb, var(--red) 10%, transparent)`,color:C.red,fontWeight:700,fontSize:11,border:'none',cursor:'pointer',fontFamily:ff,display:'flex',alignItems:'center',gap:5}}><Ic.Trash size={12} color={C.red}/> Eliminar</button>
                        </div>
                      </div>
                    ):(
                      <div style={{padding:'12px 16px',display:'flex',alignItems:'center',gap:12,opacity:svc.active?1:0.5}}>
                        {svc.photo_url?<img src={svc.photo_url} alt="" style={{width:44,height:44,objectFit:'cover',borderRadius:8,flexShrink:0}}/>:<div style={{width:44,height:44,borderRadius:8,background:`color-mix(in srgb, var(--gold) 10%, transparent)`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Ic.Camera size={16} color={C.gold}/></div>}
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap' as const}}>
                            <p style={{fontSize:13,fontWeight:600,color:C.ink,margin:0}}>{svc.name}</p>
                            {!svc.active&&<span style={{fontSize:9,fontWeight:700,color:C.red,padding:'2px 6px',borderRadius:99,background:`color-mix(in srgb, var(--red) 12%, transparent)`,textTransform:'uppercase' as const}}>Inactivo</span>}
                          </div>
                          <p style={{fontSize:11,color:C.gray,margin:'2px 0 0'}}>{svc.duration} · <span style={{color:C.gold,fontWeight:600}}>{svc.price}</span></p>
                          {svc.description&&<p style={{fontSize:11,color:C.gray,margin:'2px 0 0',opacity:0.8,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{svc.description}</p>}
                        </div>
                        <div style={{display:'flex',gap:2,flexShrink:0}}>
                          <button onClick={()=>toggleActive(svc)} title={svc.active?'Desactivar':'Activar'} style={{background:'none',border:'none',cursor:'pointer',padding:6}}><Ic.Block size={14} color={svc.active?C.gray:C.green}/></button>
                          <button onClick={()=>{setEditing(svc.id);setEditForm({...svc})}} style={{background:'none',border:'none',cursor:'pointer',color:C.gray,padding:6}}><Ic.Edit size={15} color={C.gray}/></button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

//  CLIENTES
function Clientes({bookings,onRefresh,isAdmin,services}:{bookings:Booking[];onRefresh:()=>void;isAdmin:boolean;services:Service[]}){
  const[search,setSearch]=useState('')
  const[selected,setSelected]=useState<{name:string;phone:string;bookings:Booking[]}|null>(null)
  const[crm,setCrm]=useState<CrmClient|null>(null)
  const[editMode,setEditMode]=useState(false)
  const[showCreateAppt,setShowCreateAppt]=useState(false)
  const[editForm,setEditForm]=useState<CrmClient>({name:'',phone:business.phone})
  const[saving,setSaving]=useState(false)
  const[openVisit,setOpenVisit]=useState<string|null>(null)
  const[confirmDelClient,setConfirmDelClient]=useState(false)
  const[showNewClient,setShowNewClient]=useState(false)
  const[newClientForm,setNewClientForm]=useState({name:'',phone:business.phone,preferences:'',profile_notes:''})
  const[clientDeposits,setClientDeposits]=useState<Deposit[]>([])
  const csvRef=useRef<HTMLInputElement>(null)
  const[crmClients,setCrmClients]=useState<CrmClient[]>([])

  async function loadCrmClients(){
    const{data}=await supabase.from('crm_clients').select('*').order('name')
    setCrmClients((data??[]) as CrmClient[])
  }

  useEffect(()=>{loadCrmClients()},[])// eslint-disable-line react-hooks/exhaustive-deps

  async function importCSV(file:File){
    const text=await file.text()
    const rows=text.split('\n').slice(1).map(l=>l.split(',')).filter(r=>r.length>=2&&r[0]?.trim())
    const inserts=rows.map(r=>({name:r[0].trim().replace(/^"|"$/g,''),phone:(r[1]||'').trim().replace(/^"|"$/g,'')}))
    if(inserts.length===0)return
    await supabaseAdmin.from('crm_clients').upsert(inserts,{onConflict:'phone',ignoreDuplicates:true})
    onRefresh();loadCrmClients()
  }

  // Merge crm_clients with any booking clients not yet in crm_clients
  const crmPhones=new Set(crmClients.map(c=>c.phone||'').filter(Boolean))
  const bookingOnlyClients:CrmClient[]=Object.values(bookings.reduce<Record<string,CrmClient>>((acc,b)=>{
    const k=b.phone||b.name
    if(!acc[k]&&!crmPhones.has(b.phone))acc[k]={name:b.name,phone:b.phone}
    return acc
  },{}))
  const allClients=[...crmClients,...bookingOnlyClients].sort((a,b)=>a.name.localeCompare(b.name,'es'))
  const clients=isAdmin
    ? allClients.filter(c=>{if(!search)return true;const q=search.toLowerCase();return c.name.toLowerCase().includes(q)||(c.phone||'').includes(q)||(c.email||'').toLowerCase().includes(q)})
    : search.trim().length===0
      ? [] // specialists must type to search — no free browse
      : (/^\d/.test(search.trim())
          ? allClients.filter(c=>(c.phone||'')===search.trim()) // exact phone match only
          : allClients.filter(c=>c.name.toLowerCase().includes(search.trim().toLowerCase())))

  async function createNewClient(e:React.FormEvent){
    e.preventDefault();setSaving(true)
    await supabaseAdmin.from('crm_clients').upsert({name:newClientForm.name,phone:newClientForm.phone,preferences:newClientForm.preferences||null,profile_notes:newClientForm.profile_notes||null},{onConflict:'phone',ignoreDuplicates:false})
    setSaving(false);setShowNewClient(false);setNewClientForm({name:'',phone:business.phone,preferences:'',profile_notes:''});onRefresh();loadCrmClients()
  }

  async function selectClient(c:CrmClient){
    const clientBookings=bookings.filter(b=>b.phone===c.phone||b.name===c.name)
    setSelected({name:c.name,phone:c.phone||'',bookings:clientBookings})
    setCrm(c)
    const{data:deps}=await supabase.from('deposits').select('*').eq('client_phone',c.phone).order('created_at',{ascending:false})
    setClientDeposits((deps??[]) as Deposit[])
    setEditForm({name:c.name,phone:c.phone||'',notes:c.notes||'',preferences:c.preferences||'',profile_notes:c.profile_notes||''})
  }

  async function saveCrm(){
    setSaving(true)
    await supabaseAdmin.from('crm_clients').upsert({
      name:editForm.name,phone:editForm.phone,
      notes:editForm.notes||null,preferences:editForm.preferences||null,profile_notes:editForm.profile_notes||null,
      address:editForm.address||null,city:editForm.city||null,allergens:editForm.allergens||null,
      booking_count:editForm.booking_count??null,discount:editForm.discount??null,
      web_communication_agreement:editForm.web_communication_agreement??false,
      processing_consent:editForm.processing_consent??false,
      blacklisted:editForm.blacklisted??false,
    },{onConflict:'phone',ignoreDuplicates:false})
    setCrm({...editForm})
    setSaving(false)
    setEditMode(false)
  }

  async function deleteClient(){
    if(!selected) return
    await Promise.all([
      supabaseAdmin.from('crm_clients').delete().eq('phone',selected.phone),
      supabaseAdmin.from('bookings').delete().eq('phone',selected.phone),
    ])
    setSelected(null); setCrm(null); setEditMode(false); setConfirmDelClient(false)
    onRefresh();loadCrmClients()
  }

  if(selected){
    const visits=[...selected.bookings].sort((a,b)=>b.date.localeCompare(a.date))
    const confirmed=visits.filter(b=>b.status==='confirmed'||b.status==='completed').length
    return(
      <div style={{padding:'0 16px 24px'}}>
        {confirmDelClient&&<DeleteConfirm msg={`Se borrará ${selected.name} del CRM y todas sus citas permanentemente. No se puede deshacer.`} onClose={()=>setConfirmDelClient(false)} onConfirm={deleteClient}/>}
        {showCreateAppt&&<CreateModal services={services} prefill={{name:selected.name,phone:selected.phone}} onClose={()=>setShowCreateAppt(false)} onCreated={()=>{setShowCreateAppt(false);onRefresh()}}/>}
        <button onClick={()=>{setSelected(null);setCrm(null);setEditMode(false)}} style={{background:'none',border:'none',cursor:'pointer',color:C.gray,fontSize:13,fontWeight:600,padding:'0 0 16px',display:'flex',alignItems:'center',gap:6,fontFamily:ff}}>
          <Ic.CL size={16} color={C.gray}/> Clientes
        </button>

        {/* Profile card */}
        <div style={glass({padding:20,marginBottom:14})}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
            <div style={{display:'flex',alignItems:'center',gap:14}}>
              <div style={{width:48,height:48,borderRadius:'50%',background:`color-mix(in srgb, var(--gold) 20%, transparent)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:700,color:C.gold,fontFamily:ffS,flexShrink:0}}>{selected.name.charAt(0)}</div>
              <div>
                <p style={{fontSize:18,fontWeight:600,color:C.ink,fontFamily:ffS,margin:0}}>{selected.name}</p>
                {isAdmin&&<p style={{fontSize:12,color:C.gray,margin:'3px 0 0'}}>{selected.phone||''}</p>}
              </div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>setShowCreateAppt(true)} style={{background:'#1a0f14',border:'none',borderRadius:10,cursor:'pointer',color:'#fff',padding:'6px 12px',fontSize:12,fontWeight:700,fontFamily:ff,display:'flex',alignItems:'center',gap:6}}>
                <Ic.Plus size={13} color="#fff"/> Crear cita
              </button>
              {isAdmin&&<button onClick={()=>setEditMode(e=>!e)} style={{background:'none',border:`1.5px solid color-mix(in srgb, var(--gold) 30%, transparent)`,borderRadius:10,cursor:'pointer',color:C.gold,padding:'6px 12px',fontSize:12,fontWeight:600,fontFamily:ff,display:'flex',alignItems:'center',gap:6}}>
                <Ic.Edit size={13} color={C.gold}/> {editMode?'Cancelar':'Editar'}
              </button>}
              {isAdmin&&<button onClick={()=>setConfirmDelClient(true)} style={{background:'none',border:`1.5px solid color-mix(in srgb, var(--red) 25%, transparent)`,borderRadius:10,cursor:'pointer',color:C.red,padding:'6px 10px',fontSize:12,display:'flex',alignItems:'center'}}>
                <Ic.Trash size={14} color={C.red}/>
              </button>}
            </div>
          </div>

          {/* Stats */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:editMode?14:0}}>
            <div style={{background:`color-mix(in srgb, var(--gold) 10%, transparent)`,borderRadius:12,padding:12,textAlign:'center'}}>
              <p style={{fontSize:28,fontWeight:700,color:C.gold,fontFamily:ffS,margin:0}}>{visits.length}</p>
              <p style={{fontSize:10,color:C.gray,textTransform:'uppercase',letterSpacing:'0.08em',margin:0}}>Visitas</p>
            </div>
            <div style={{background:`color-mix(in srgb, var(--green) 10%, transparent)`,borderRadius:12,padding:12,textAlign:'center'}}>
              <p style={{fontSize:28,fontWeight:700,color:C.green,fontFamily:ffS,margin:0}}>{confirmed}</p>
              <p style={{fontSize:10,color:C.gray,textTransform:'uppercase',letterSpacing:'0.08em',margin:0}}>Completadas</p>
            </div>
          </div>

          {/* Edit form */}
          {editMode&&(
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                <div><label style={lbl}>Nombre</label><input style={inp({fontSize:12})} value={editForm.name} onChange={e=>setEditForm(f=>({...f,name:e.target.value}))}/></div>
                <div><label style={lbl}>Teléfono</label><input style={inp({fontSize:12})} value={editForm.phone} onChange={e=>setEditForm(f=>({...f,phone:e.target.value}))}/></div>
              </div>
              <div><label style={lbl}>Dirección</label><input style={inp({fontSize:12})} value={editForm.address||''} onChange={e=>setEditForm(f=>({...f,address:e.target.value}))} placeholder="Calle, número..."/></div>
              <div><label style={lbl}>Ciudad</label><input style={inp({fontSize:12})} value={editForm.city||''} onChange={e=>setEditForm(f=>({...f,city:e.target.value}))} placeholder="San Juan, Carolina..."/></div>
              <div><label style={lbl}>Alergias</label><input style={inp({fontSize:12})} value={editForm.allergens||''} onChange={e=>setEditForm(f=>({...f,allergens:e.target.value}))} placeholder="Látex, acrílico..."/></div>
              <div><label style={lbl}>Preferencias</label><textarea rows={2} placeholder="Colores favoritos, técnicas que prefiere..." style={inp({resize:'none',fontSize:12})} value={editForm.preferences||''} onChange={e=>setEditForm(f=>({...f,preferences:e.target.value}))}/></div>
              <div><label style={lbl}>Nota</label><textarea rows={2} placeholder="Notas sobre esta cliente..." style={inp({resize:'none',fontSize:12})} value={editForm.notes||''} onChange={e=>setEditForm(f=>({...f,notes:e.target.value}))}/></div>
              <div><label style={lbl}>Perfil (notas internas)</label><textarea rows={2} placeholder="Notas del perfil..." style={inp({resize:'none',fontSize:12})} value={editForm.profile_notes||''} onChange={e=>setEditForm(f=>({...f,profile_notes:e.target.value}))}/></div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                <div><label style={lbl}>Citas realizadas</label><input type="number" style={inp({fontSize:12})} value={editForm.booking_count??''} onChange={e=>setEditForm(f=>({...f,booking_count:Number(e.target.value)||0}))}/></div>
                <div><label style={lbl}>Descuento %</label><input type="number" min="0" max="100" style={inp({fontSize:12})} value={editForm.discount??''} onChange={e=>setEditForm(f=>({...f,discount:Number(e.target.value)||0}))}/></div>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                <label style={{...lbl,display:'flex',alignItems:'center',gap:10,cursor:'pointer'}}>
                  <input type="checkbox" checked={!!editForm.web_communication_agreement} onChange={e=>setEditForm(f=>({...f,web_communication_agreement:e.target.checked}))} style={{width:16,height:16,accentColor:C.gold}}/>
                  <span>Acepta comunicaciones</span>
                </label>
                <label style={{...lbl,display:'flex',alignItems:'center',gap:10,cursor:'pointer'}}>
                  <input type="checkbox" checked={!!editForm.processing_consent} onChange={e=>setEditForm(f=>({...f,processing_consent:e.target.checked}))} style={{width:16,height:16,accentColor:C.gold}}/>
                  <span>Consentimiento de datos</span>
                </label>
                <label style={{...lbl,display:'flex',alignItems:'center',gap:10,cursor:'pointer'}}>
                  <input type="checkbox" checked={!!editForm.blacklisted} onChange={e=>setEditForm(f=>({...f,blacklisted:e.target.checked}))} style={{width:16,height:16,accentColor:C.red}}/>
                  <span style={{color:editForm.blacklisted?C.red:'inherit'}}>Bloqueada ⛔</span>
                </label>
              </div>
              <button onClick={saveCrm} disabled={saving} style={{padding:'11px',borderRadius:10,background:C.green,color:'#fff',fontWeight:700,fontSize:13,border:'none',cursor:saving?'not-allowed':'pointer',fontFamily:ff}}>{saving?'Guardando...':'Guardar'}</button>
            </div>
          )}

          {/* Show saved info when not editing */}
          {!editMode&&crm&&(()=>{
            const F=({label,val}:{label:string;val?:string|number|boolean|null})=>(
              <div style={{borderBottom:`1px solid ${C.sb}`,paddingBottom:8,marginBottom:8}}>
                <p style={{fontSize:10,fontWeight:700,color:C.gray,textTransform:'uppercase',letterSpacing:'0.08em',margin:'0 0 2px'}}>{label}</p>
                <p style={{fontSize:13,color:val!=null&&val!==''&&val!==false?C.ink:C.gray,margin:0,fontStyle:val!=null&&val!==''&&val!==false?'normal':'italic'}}>
                  {val!=null&&val!==''&&val!==false?String(val):'none'}
                </p>
              </div>
            )
            return(
              <div style={{marginTop:14,borderTop:`1px solid ${C.sb}`,paddingTop:14,display:'flex',flexDirection:'column'}}>
                <p style={{fontSize:10,fontWeight:700,color:C.gray,textTransform:'uppercase',letterSpacing:'0.08em',margin:'0 0 10px'}}>Contacto</p>
                {isAdmin&&<F label="Teléfono" val={crm.phone}/>}
                {isAdmin&&<F label="Email" val={crm.email}/>}
                <F label="Dirección" val={[crm.address,crm.city].filter(Boolean).join(', ')||null}/>
                <p style={{fontSize:10,fontWeight:700,color:C.gray,textTransform:'uppercase',letterSpacing:'0.08em',margin:'10px 0 10px'}}>Salud & Preferencias</p>
                <F label="Alergias" val={crm.allergens}/>
                <F label="Preferencias" val={crm.preferences}/>
                <p style={{fontSize:10,fontWeight:700,color:C.gray,textTransform:'uppercase',letterSpacing:'0.08em',margin:'10px 0 10px'}}>Notas internas</p>
                <F label="Nota" val={crm.notes}/>
                <F label="Perfil" val={crm.profile_notes}/>
                <p style={{fontSize:10,fontWeight:700,color:C.gray,textTransform:'uppercase',letterSpacing:'0.08em',margin:'10px 0 10px'}}>Actividad y Consentimiento</p>
                <F label="Citas realizadas" val={crm.booking_count??0}/>
                <F label="Descuento" val={(crm.discount||0)>0?`${crm.discount}%`:null}/>
                <F label="Acepta comunicaciones" val={crm.web_communication_agreement?'Sí':null}/>
                <F label="Consentimiento" val={crm.processing_consent?'Sí':null}/>
                <F label="Bloqueada" val={crm.blacklisted?'⛔ Sí':null}/>
              </div>
            )
          })()}
        </div>

        {/* Visit history accordion */}
        <p style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:C.gray,marginBottom:10}}>Historial de visitas</p>
        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          {visits.map(b=>{
            const isOpen=openVisit===b.id
            const sc=b.status==='confirmed'?C.green:b.status==='completed'?C.green:b.status==='cancelled'?C.red:b.status==='no_show'?C.red:C.gold
            return(
              <div key={b.id} style={glass({borderRadius:14,overflow:'hidden'})}>
                <button onClick={()=>setOpenVisit(isOpen?null:b.id)} style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 14px',background:'none',border:'none',cursor:'pointer',fontFamily:ff}}>
                  <div style={{textAlign:'left'}}>
                    <span style={{fontSize:13,fontWeight:600,color:C.ink}}>{b.service||'Servicio'}</span>
                    <span style={{fontSize:11,color:C.gray,marginLeft:8}}>{fmtDate(b.date)} · {b.time}</span>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:99,background:`color-mix(in srgb, ${sc} 12%, transparent)`,color:sc}}>{b.status}</span>
                    <Ic.CD size={14} color={C.gray} style={{transform:isOpen?'rotate(180deg)':'none',transition:'transform 0.2s'}}/>
                  </div>
                </button>
                {isOpen&&(
                  <div style={{borderTop:`1px solid ${C.sb}`,padding:'10px 14px',display:'flex',flexDirection:'column',gap:6}}>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                      <div><p style={{fontSize:10,color:C.gray,margin:'0 0 2px',textTransform:'uppercase',letterSpacing:'0.06em'}}>Fecha</p><p style={{fontSize:13,color:C.ink,margin:0}}>{fmtDate(b.date)}</p></div>
                      <div><p style={{fontSize:10,color:C.gray,margin:'0 0 2px',textTransform:'uppercase',letterSpacing:'0.06em'}}>Hora</p><p style={{fontSize:13,color:C.ink,margin:0}}>{b.time}</p></div>
                    </div>
                    {b.specialist&&<div><p style={{fontSize:10,color:C.gray,margin:'0 0 2px',textTransform:'uppercase',letterSpacing:'0.06em'}}>Técnica</p><p style={{fontSize:13,color:C.ink,margin:0}}>{b.specialist}</p></div>}
                    {b.notes&&<div><p style={{fontSize:10,color:C.gray,margin:'0 0 2px',textTransform:'uppercase',letterSpacing:'0.06em'}}>Notas</p><p style={{fontSize:13,color:C.ink,margin:0}}>{b.notes}</p></div>}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Deposits history */}
        {clientDeposits.length>0&&(
          <>
            <p style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:C.gray,marginBottom:10,marginTop:20}}>Historial de depósitos</p>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {clientDeposits.map(d=>(
                <div key={d.id} style={glass({padding:'12px 14px',borderRadius:12})}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <span style={{fontSize:14,fontWeight:700,color:C.gold}}>${d.amount.toFixed(2)}</span>
                    <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:99,background:`color-mix(in srgb, ${depositColor(d.status)} 12%, transparent)`,color:depositColor(d.status)}}>{depositLabel(d.status)}</span>
                  </div>
                  <p style={{fontSize:12,color:C.gray,margin:'3px 0 0'}}>{d.concept||'Depósito'}{d.notes?` · ${d.notes}`:''}</p>
                  <p style={{fontSize:11,color:C.gray,margin:'2px 0 0',opacity:0.7}}>{new Date(d.created_at).toLocaleDateString('es-PR')}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  return(
    <div style={{padding:'0 16px 24px'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
        <h2 style={{fontFamily:ffS,fontSize:28,fontWeight:500,color:C.ink,margin:0}}>Clientes</h2>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>setShowNewClient(s=>!s)} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 12px',borderRadius:10,background:showNewClient?'color-mix(in srgb, var(--ink) 10%, transparent)':C.gold,color:showNewClient?C.gray:'#fff',fontWeight:700,fontSize:12,border:'none',cursor:'pointer',fontFamily:ff}}>
            <Ic.Plus size={13} color={showNewClient?C.gray:'#fff'}/> Nueva
          </button>
        </div>
      </div>
      {showNewClient&&(
        <div style={glass({padding:18,borderRadius:16,marginBottom:14})}>
          <p style={{fontFamily:ffS,fontSize:17,color:C.ink,margin:'0 0 14px'}}>Nueva Cliente</p>
          <form onSubmit={createNewClient} style={{display:'flex',flexDirection:'column',gap:10}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              <div><label style={lbl}>Nombre</label><input required style={inp({fontSize:12})} value={newClientForm.name} onChange={e=>setNewClientForm(f=>({...f,name:e.target.value}))}/></div>
              <div><label style={lbl}>Teléfono</label><input required type="tel" style={inp({fontSize:12})} value={newClientForm.phone} onChange={e=>setNewClientForm(f=>({...f,phone:e.target.value}))}/></div>
            </div>
            <div><label style={lbl}>Preferencias</label><textarea rows={2} style={inp({resize:'none',fontSize:12})} value={newClientForm.preferences} onChange={e=>setNewClientForm(f=>({...f,preferences:e.target.value}))}/></div>
            <div><label style={lbl}>Notas internas</label><textarea rows={2} style={inp({resize:'none',fontSize:12})} value={newClientForm.profile_notes} onChange={e=>setNewClientForm(f=>({...f,profile_notes:e.target.value}))}/></div>
            <div style={{display:'flex',gap:8}}>
              <button type="submit" disabled={saving} style={{flex:1,padding:'10px',borderRadius:10,background:C.green,color:'#fff',fontWeight:700,fontSize:12,border:'none',cursor:'pointer',fontFamily:ff}}>{saving?'Guardando...':'Crear Cliente'}</button>
              <button type="button" onClick={()=>setShowNewClient(false)} style={{flex:1,padding:'10px',borderRadius:10,background:`color-mix(in srgb, var(--ink) 8%, transparent)`,color:C.gray,fontWeight:600,fontSize:12,border:'none',cursor:'pointer',fontFamily:ff}}>Cancelar</button>
            </div>
          </form>
        </div>
      )}
      <div style={{position:'relative',marginBottom:16}}>
        <div style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}}><Ic.Search size={15} color={C.gray}/></div>
        <input type="text" placeholder={isAdmin?"Buscar por nombre o teléfono...":"Buscar por nombre o número completo..."} value={search} onChange={e=>setSearch(e.target.value)} style={inp({paddingLeft:38})}/>
      </div>
      {!isAdmin&&search.trim().length===0?(
        <p style={{textAlign:'center',color:C.gray,fontSize:13,padding:'20px 0',lineHeight:1.7}}>Busca por nombre de cliente,<br/>o número completo para encontrarla.</p>
      ):clients.length===0?<p style={{textAlign:'center',color:C.gray,fontSize:13,padding:'20px 0'}}>No se encontraron clientes</p>:(
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {clients.map((c,i)=>(
            <button key={c.id||i} onClick={()=>selectClient(c)} style={{...glass({padding:'14px 18px',borderRadius:14}),display:'flex',alignItems:'center',gap:14,width:'100%',cursor:'pointer',textAlign:'left',fontFamily:ff}}>
              <div style={{width:40,height:40,borderRadius:'50%',background:`color-mix(in srgb, var(--gold) 20%, transparent)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:700,color:C.gold,fontFamily:ffS,flexShrink:0}}>{c.name.charAt(0)}</div>
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontSize:14,fontWeight:600,color:C.ink,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.name}{c.blacklisted&&<span style={{marginLeft:6,fontSize:10,color:C.red,fontWeight:700}}>⛔</span>}</p>
                {isAdmin&&<p style={{fontSize:11,color:C.gray,marginTop:2,marginBottom:0}}>{c.phone||''}{c.email?' · '+c.email:''}</p>}
                <p style={{fontSize:10,color:C.gray,marginTop:1,marginBottom:0,opacity:0.7}}>{c.booking_count||0} cita{(c.booking_count||0)!==1?'s':''} realizada{(c.booking_count||0)!==1?'s':''}{(c.discount||0)>0?' · '+c.discount+'% desc':''}</p>
              </div>
              <Ic.CR size={16} color={C.gray}/>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

//  HISTORIAL
function Historial({bookings}:{bookings:Booking[]}){
  const[search,setSearch]=useState('')
  const[specFilter,setSpecFilter]=useState('all')
  const specNames=useSpecialistNames()
  const today=todayStr()
  const past=bookings.filter(b=>b.date<today||b.status==='cancelled'||b.status==='no_show'||b.status==='completed').sort((a,b)=>b.date.localeCompare(a.date)||b.time.localeCompare(a.time)).filter(b=>{
    if(specFilter!=='all'&&!(b.specialist||'').includes(specFilter))return false
    if(!search)return true
    const q=search.toLowerCase()
    return b.name.toLowerCase().includes(q)||(b.phone||'').includes(q)||(b.service||'').toLowerCase().includes(q)||b.date.includes(q)||(b.notes||'').toLowerCase().includes(q)
  })
  // Group by day, preserving the desc-date/time sort already applied above.
  const days:{date:string;items:Booking[]}[]=[]
  for(const b of past){
    const last=days[days.length-1]
    if(last&&last.date===b.date) last.items.push(b)
    else days.push({date:b.date,items:[b]})
  }
  return(
    <div style={{padding:'0 16px 24px'}}>
      <h2 style={{fontFamily:ffS,fontSize:28,fontWeight:500,color:C.ink,marginBottom:16}}>Historial</h2>
      {/* Specialist pills */}
      <div style={{display:'flex',gap:6,overflowX:'auto',scrollbarWidth:'none' as any,marginBottom:12,paddingBottom:2}}>
        {(['all',...specNames]).map(s=>(
          <button key={s} onClick={()=>setSpecFilter(s)} style={{flexShrink:0,padding:'6px 12px',borderRadius:99,border:`1.5px solid ${specFilter===s?C.gold:'transparent'}`,background:specFilter===s?`color-mix(in srgb, var(--gold) 14%, transparent)`:`color-mix(in srgb, var(--ink) 5%, transparent)`,color:specFilter===s?C.gold:C.gray,fontSize:11,fontWeight:specFilter===s?700:500,cursor:'pointer',fontFamily:ff,whiteSpace:'nowrap' as const}}>
            {s==='all'?'Todas':s}
          </button>
        ))}
      </div>
      <div style={{position:'relative',marginBottom:16}}>
        <div style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}}><Ic.Search size={15} color={C.gray}/></div>
        <input type="text" placeholder="Nombre, servicio, fecha, nota..." value={search} onChange={e=>setSearch(e.target.value)} style={inp({paddingLeft:38})}/>
      </div>
      {days.length===0?<p style={{textAlign:'center',color:C.gray,fontSize:13,padding:'20px 0'}}>{search||specFilter!=='all'?'Sin resultados':'No hay citas pasadas aún'}</p>:(
        <div style={{display:'flex',flexDirection:'column',gap:18}}>
          {days.map(day=>(
            <div key={day.date}>
              <p style={{fontSize:11,fontWeight:700,color:C.gray,textTransform:'uppercase' as const,letterSpacing:'0.06em',margin:'0 0 8px'}}>{fmtDateLong(day.date)} <span style={{fontWeight:400,opacity:0.7}}>({day.items.length})</span></p>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {day.items.map(b=>{
                  const sc=b.status==='confirmed'||b.status==='completed'?C.green:b.status==='cancelled'||b.status==='no_show'?C.red:C.gold
                  return(
                    <div key={b.id} style={glass({padding:'14px 16px',borderRadius:14})}>
                      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:8}}>
                        <div style={{flex:1,minWidth:0}}>
                          <p style={{fontSize:13,fontWeight:600,color:C.ink,margin:0}}>{b.name}</p>
                          <p style={{fontSize:11,color:C.gray,margin:'3px 0 0'}}>{b.time} · {b.service||''}{b.specialist?` · ${b.specialist}`:''}</p>
                          {b.notes&&<p style={{fontSize:11,color:C.gray,margin:'2px 0 0',opacity:0.75,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{b.notes}</p>}
                        </div>
                        <span style={{fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:99,flexShrink:0,background:`color-mix(in srgb, ${sc} 12%, transparent)`,color:sc}}>{b.status}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

//  MAIN//  ESPECIALISTAS PANEL 

const MES=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function SpecialistStats({p,bookings,svcMap,onClose}:{p:Profile;bookings:Booking[];svcMap:Map<string,BookingServiceRow[]>;onClose:()=>void}){
  // Count each service she performed individually — a booking with 3
  // services where she only did 1 counts as 1 for her, not 1 whole visit;
  // a booking where she did 2 of the services counts as 2.
  const mine=bookings.flatMap(b=>serviceBreakdown(b,svcMap).filter(s=>s.specialist===p.full_name).map(()=>({date:b.date,status:b.status})))
  const today=todayStr()
  const thisYear=new Date().getFullYear()
  const yearMine=mine.filter(b=>b.date.startsWith(String(thisYear)))

  const months=Array.from({length:12},(_,i)=>{
    const mm=String(i+1).padStart(2,'0')
    const prefix=`${thisYear}-${mm}`
    const mbs=yearMine.filter(b=>b.date.startsWith(prefix))
    return{
      label:MES[i],
      atendidas:mbs.filter(b=>b.status==='completed').length,
      canceladas:mbs.filter(b=>b.status==='cancelled'||b.status==='no_show').length,
    }
  })

  const totalAtendidas=months.reduce((s,m)=>s+m.atendidas,0)
  const totalCanceladas=months.reduce((s,m)=>s+m.canceladas,0)
  const totalDecididas=totalAtendidas+totalCanceladas
  const pct=totalDecididas>0?Math.round(totalAtendidas/totalDecididas*100):null

  return(
    <Sheet onClose={onClose}>
      <SheetHandle title={p.full_name} onClose={onClose}/>
      <div style={{display:'flex',gap:10,marginBottom:20}}>
        <div style={glass({flex:1,padding:'14px',borderRadius:14,textAlign:'center'})}>
          <p style={{fontSize:28,fontWeight:700,color:C.green,fontFamily:ffS,margin:0}}>{totalAtendidas}</p>
          <p style={{fontSize:10,color:C.gray,textTransform:'uppercase',letterSpacing:'0.08em',margin:'3px 0 0'}}>Atendidas</p>
          <p style={{fontSize:9,color:C.gray,margin:'1px 0 0',opacity:0.7}}>este año</p>
        </div>
        <div style={glass({flex:1,padding:'14px',borderRadius:14,textAlign:'center'})}>
          <p style={{fontSize:28,fontWeight:700,color:C.red,fontFamily:ffS,margin:0}}>{totalCanceladas}</p>
          <p style={{fontSize:10,color:C.gray,textTransform:'uppercase',letterSpacing:'0.08em',margin:'3px 0 0'}}>Canceladas</p>
          <p style={{fontSize:9,color:C.gray,margin:'1px 0 0',opacity:0.7}}>este año</p>
        </div>
        {pct!==null&&(
          <div style={glass({flex:1,padding:'14px',borderRadius:14,textAlign:'center'})}>
            <p style={{fontSize:28,fontWeight:700,color:pct>=80?C.green:pct>=60?C.gold:C.red,fontFamily:ffS,margin:0}}>{pct}%</p>
            <p style={{fontSize:10,color:C.gray,textTransform:'uppercase',letterSpacing:'0.08em',margin:'3px 0 0'}}>Tasa</p>
            <p style={{fontSize:9,color:C.gray,margin:'1px 0 0',opacity:0.7}}>completadas</p>
          </div>
        )}
      </div>
      <p style={{fontSize:10,fontWeight:700,color:C.gray,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:10}}>Desglose mensual {thisYear}</p>
      <div style={{display:'flex',flexDirection:'column',gap:4}}>
        {months.filter(m=>m.atendidas>0||m.canceladas>0).map(m=>(
          <div key={m.label} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',borderRadius:10,background:`color-mix(in srgb, var(--surface) 60%, transparent)`}}>
            <span style={{fontSize:11,fontWeight:600,color:C.gray,width:28}}>{m.label}</span>
            <div style={{flex:1,display:'flex',gap:6,alignItems:'center'}}>
              <span style={{fontSize:12,color:C.green,fontWeight:700}}>{m.atendidas} atend.</span>
              <span style={{fontSize:11,color:C.gray,opacity:0.5}}>/</span>
              <span style={{fontSize:12,color:C.red,fontWeight:600}}>{m.canceladas} canc.</span>
            </div>
            {(m.atendidas+m.canceladas)>0&&(
              <span style={{fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:99,background:`color-mix(in srgb, var(--green) 12%, transparent)`,color:C.green}}>
                {Math.round(m.atendidas/(m.atendidas+m.canceladas)*100)}%
              </span>
            )}
          </div>
        ))}
        {months.every(m=>m.atendidas===0&&m.canceladas===0)&&(
          <p style={{textAlign:'center',color:C.gray,fontSize:13,padding:'12px 0'}}>Sin citas completadas este año</p>
        )}
      </div>
      <div style={{marginTop:16,padding:'12px 14px',borderRadius:12,background:`color-mix(in srgb, var(--gold) 8%, transparent)`,border:`1px solid color-mix(in srgb, var(--gold) 20%, transparent)`}}>
        <p style={{fontSize:10,fontWeight:700,color:C.gray,textTransform:'uppercase',letterSpacing:'0.08em',margin:'0 0 4px'}}>Total este año</p>
        <p style={{fontSize:13,color:C.ink,margin:0}}>{totalAtendidas} atendidas · {totalCanceladas} canceladas{pct!==null?' · '+pct+'% tasa de asistencia':''}</p>
      </div>
    </Sheet>
  )
}

type PendingSvc={id:string;specialist_id:string;service_name:string;duration_minutes:number;specialist_name?:string}

function SpecialistBlocksSheet({p,onClose}:{p:Profile;onClose:()=>void}){
  const[blocks,setBlocks]=useState<AvailBlock[]>([])
  const[loading,setLoading]=useState(true)
  const[showAdd,setShowAdd]=useState(false)
  const[saving,setSaving]=useState(false)
  const[form,setForm]=useState({date:'',all_day:true,start_time:'9:00 AM',end_time:'6:00 PM',reason:''})
  const today=todayStr()

  useEffect(()=>{load()},[p.id])

  async function load(){
    setLoading(true)
    const{data}=await supabase.from('availability_blocks').select('*').eq('specialist_name',p.full_name).gte('date',today).order('date')
    setBlocks((data??[]) as AvailBlock[])
    setLoading(false)
  }

  async function addBlock(e:React.FormEvent){
    e.preventDefault();setSaving(true)
    await supabaseAdmin.from('availability_blocks').insert([{specialist_name:p.full_name,date:form.date,all_day:form.all_day,start_time:form.all_day?null:form.start_time,end_time:form.all_day?null:form.end_time,reason:form.reason||null}])
    setSaving(false);setShowAdd(false);setForm({date:'',all_day:true,start_time:'9:00 AM',end_time:'6:00 PM',reason:''});load()
  }

  async function delBlock(b:AvailBlock){
    await supabaseAdmin.from('availability_blocks').delete().eq('id',b.id);load()
  }

  return(
    <Sheet onClose={onClose}>
      <SheetHandle title={`Cambios de Horario · ${p.full_name}`} onClose={onClose}/>
      <button onClick={()=>setShowAdd(s=>!s)} style={{display:'flex',alignItems:'center',gap:6,padding:'9px 14px',borderRadius:10,background:`color-mix(in srgb, var(--red) 10%, transparent)`,color:C.red,fontWeight:700,fontSize:12,border:`1.5px solid color-mix(in srgb, var(--red) 22%, transparent)`,cursor:'pointer',fontFamily:ff,marginBottom:14}}>
        <Ic.Block size={13} color={C.red}/> Cambiar horario
      </button>
      {showAdd&&(
        <form onSubmit={addBlock} style={{display:'flex',flexDirection:'column',gap:10,padding:'14px',borderRadius:14,background:`color-mix(in srgb, var(--red) 5%, transparent)`,border:`1px solid color-mix(in srgb, var(--red) 15%, transparent)`,marginBottom:14}}>
          <div><label style={lbl}>Fecha</label><input required type="date" style={inp()} value={form.date} min={today} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/></div>
          <div style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',borderRadius:10,background:`color-mix(in srgb, var(--gold) 8%, transparent)`}}>
            <label style={{fontSize:13,fontWeight:600,color:C.ink,flex:1}}>Todo el dia</label>
            <button type="button" onClick={()=>setForm(f=>({...f,all_day:!f.all_day}))} style={{width:44,height:24,borderRadius:99,border:'none',cursor:'pointer',background:form.all_day?C.gold:'color-mix(in srgb, var(--ink) 20%, transparent)',position:'relative',transition:'background 0.2s',flexShrink:0}}>
              <div style={{width:18,height:18,borderRadius:'50%',background:'#fff',position:'absolute',top:3,left:form.all_day?23:3,transition:'left 0.2s'}}/>
            </button>
          </div>
          {!form.all_day&&(
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div><label style={lbl}>Desde</label><select style={inp()} value={form.start_time} onChange={e=>setForm(f=>({...f,start_time:e.target.value}))}>{TIMES.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
              <div><label style={lbl}>Hasta</label><select style={inp()} value={form.end_time} onChange={e=>setForm(f=>({...f,end_time:e.target.value}))}>{TIMES.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
            </div>
          )}
          <div><label style={lbl}>Razón (opcional)</label><input style={inp()} placeholder="Vacaciones, cita médica..." value={form.reason} onChange={e=>setForm(f=>({...f,reason:e.target.value}))}/></div>
          <div style={{display:'flex',gap:8}}>
            <button type="submit" disabled={saving} style={{flex:1,padding:'10px',borderRadius:10,background:C.red,color:'#fff',fontWeight:700,fontSize:12,border:'none',cursor:'pointer',fontFamily:ff}}>{saving?'Guardando...':'Guardar cambio'}</button>
            <button type="button" onClick={()=>setShowAdd(false)} style={{flex:1,padding:'10px',borderRadius:10,background:`color-mix(in srgb, var(--ink) 8%, transparent)`,color:C.gray,fontWeight:600,fontSize:12,border:'none',cursor:'pointer',fontFamily:ff}}>Cancelar</button>
          </div>
        </form>
      )}
      {loading?<p style={{fontSize:13,color:C.gray,textAlign:'center',padding:'12px 0'}}>Cargando...</p>:blocks.length===0?(
        <div style={{textAlign:'center',padding:'24px 0'}}>
          <Ic.Check size={22} color={C.green} style={{margin:'0 auto 8px',display:'block'}}/>
          <p style={{fontSize:13,color:C.gray,margin:0}}>Sin cambios de horario próximos.</p>
        </div>
      ):(
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {blocks.map(b=>(
            <div key={b.id} style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',borderRadius:12,background:`color-mix(in srgb, var(--red) 5%, transparent)`,border:`1px solid color-mix(in srgb, var(--red) 12%, transparent)`}}>
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontSize:13,fontWeight:600,color:C.ink,margin:0}}>{fmtDate(b.date)}</p>
                <p style={{fontSize:11,color:C.gray,margin:'2px 0 0'}}>{b.all_day?'Todo el día':`${b.start_time} – ${b.end_time}`}{b.reason?` · ${b.reason}`:''}</p>
              </div>
              <button onClick={()=>delBlock(b)} style={{background:'none',border:'none',cursor:'pointer',padding:6,flexShrink:0}}><Ic.Trash size={14} color={C.red}/></button>
            </div>
          ))}
        </div>
      )}
    </Sheet>
  )
}

function EditSpecialistSheet({p,services,onClose,onDone}:{p:Profile;services:Service[];onClose:()=>void;onDone:()=>void}){
  const[form,setForm]=useState({full_name:p.full_name,bio:p.bio||'',role_label:p.role_label||'',newEmail:'',newPass:''})
  const[avatarUrl,setAvatarUrl]=useState(p.avatar_url||'')
  const[uploading,setUploading]=useState(false)
  const[saving,setSaving]=useState(false)
  const[specSvcs,setSpecSvcs]=useState<string[]>([])
  const[loadingSvcs,setLoadingSvcs]=useState(true)
  const fileRef=useRef<HTMLInputElement>(null)

  useEffect(()=>{
    supabase.from('specialist_services').select('service_name').eq('specialist_id',p.id).eq('approved',true)
      .then(({data})=>{setSpecSvcs((data??[]).map((s:any)=>s.service_name));setLoadingSvcs(false)})
  },[p.id])

  async function uploadAvatar(file:File){
    setUploading(true)
    const ext=file.name.split('.').pop()??'jpg'
    const path=`avatars/${p.id}.${ext}`
    const{data}=await supabaseAdmin.storage.from('avatars').upload(path,file,{upsert:true})
    if(data){const{data:u}=supabaseAdmin.storage.from('avatars').getPublicUrl(path);setAvatarUrl(u.publicUrl)}
    setUploading(false)
  }

  async function toggleSvc(svcName:string){
    const has=specSvcs.includes(svcName)
    if(has){
      await supabaseAdmin.from('specialist_services').delete().eq('specialist_id',p.id).eq('service_name',svcName)
      setSpecSvcs(prev=>prev.filter(s=>s!==svcName))
    }else{
      await supabaseAdmin.from('specialist_services').upsert({specialist_id:p.id,service_name:svcName,duration_minutes:60,approved:true},{onConflict:'specialist_id,service_name'})
      setSpecSvcs(prev=>[...prev,svcName])
    }
  }

  async function save(e:React.FormEvent){
    e.preventDefault();setSaving(true)
    await supabaseAdmin.from('profiles').update({full_name:form.full_name,bio:form.bio||null,role_label:form.role_label||null,avatar_url:avatarUrl||null}).eq('id',p.id)
    if(form.newEmail.trim()||form.newPass.trim()){
      const upd:Record<string,string>={}
      if(form.newEmail.trim())upd.email=form.newEmail.trim()
      if(form.newPass.trim())upd.password=form.newPass.trim()
      await supabaseAdmin.auth.admin.updateUserById(p.id,upd)
    }
    setSaving(false);onDone();onClose()
  }
  return(
    <Sheet onClose={onClose}>
      <SheetHandle title="Editar Especialista" onClose={onClose}/>
      <form onSubmit={save} style={{display:'flex',flexDirection:'column',gap:14}}>
        {/* Avatar */}
        <div style={{display:'flex',alignItems:'center',gap:16}}>
          <div style={{position:'relative',flexShrink:0}}>
            <div style={{width:72,height:72,borderRadius:'50%',overflow:'hidden',background:`color-mix(in srgb, var(--gold) 15%, transparent)`,display:'flex',alignItems:'center',justifyContent:'center'}}>
              {avatarUrl?<img src={avatarUrl} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span style={{fontFamily:ffS,fontSize:28,color:C.gold}}>{(form.full_name||'?').charAt(0)}</span>}
            </div>
            <button type="button" onClick={()=>fileRef.current?.click()} style={{position:'absolute',bottom:0,right:0,width:24,height:24,borderRadius:'50%',background:C.gold,border:`2px solid ${C.bg}`,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',padding:0}}>
              {uploading?<div style={{width:12,height:12,border:'2px solid #fff',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>:<Ic.Camera size={12} color="#fff"/>}
            </button>
          </div>
          <p style={{fontSize:12,color:C.gray,margin:0,lineHeight:1.6}}>Toca la cámara<br/>para cambiar la foto</p>
        </div>
        <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f)uploadAvatar(f)}}/>

        <div><label style={lbl}>Nombre completo</label><input required style={inp()} value={form.full_name} onChange={e=>setForm(f=>({...f,full_name:e.target.value}))}/></div>
        <div><label style={lbl}>Categoría (ej: Lashista, Esteticista, Manicurista)</label><input style={inp()} placeholder="Técnica especialista" value={form.role_label} onChange={e=>setForm(f=>({...f,role_label:e.target.value}))}/></div>
        <div><label style={lbl}>Presentación (bio)</label><textarea rows={3} style={inp({resize:'none'})} placeholder="Cuéntales a las clientas sobre ella…" value={form.bio} onChange={e=>setForm(f=>({...f,bio:e.target.value}))}/></div>
        <div style={{borderTop:`1px solid ${C.sb}`,paddingTop:14}}>
          <p style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:C.gold,margin:'0 0 10px'}}>Acceso — dejar vacío para no cambiar</p>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            <div><label style={lbl}>Nuevo correo</label><input type="email" style={inp()} value={form.newEmail} onChange={e=>setForm(f=>({...f,newEmail:e.target.value}))} placeholder={p.email||'correo@ejemplo.com'}/></div>
            <div><label style={lbl}>Nueva contraseña</label><input type="password" style={inp()} value={form.newPass} onChange={e=>setForm(f=>({...f,newPass:e.target.value}))} placeholder="Mínimo 6 caracteres"/></div>
          </div>
        </div>

        {/* Services */}
        <div>
          <label style={{...lbl,marginBottom:10}}>Servicios que ofrece</label>
          {loadingSvcs?<p style={{fontSize:12,color:C.gray,margin:0}}>Cargando...</p>:(
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {[...new Set(services.map(s=>s.category_title))].map(catTitle=>(
                <div key={catTitle}>
                  <p style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:C.gray,margin:'0 0 6px'}}>{catTitle}</p>
                  <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                    {services.filter(s=>s.category_title===catTitle).map(svc=>{
                      const on=specSvcs.includes(svc.name)
                      return(
                        <button key={svc.name} type="button" onClick={()=>toggleSvc(svc.name)}
                          style={{padding:'5px 12px',borderRadius:99,border:`1.5px solid ${on?C.gold:C.inputBorder}`,background:on?`color-mix(in srgb, var(--gold) 14%, transparent)`:'transparent',color:on?C.gold:C.gray,fontSize:11,fontWeight:on?700:500,cursor:'pointer',fontFamily:ff,transition:'all .15s'}}>
                          {svc.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button type="submit" disabled={saving} style={{padding:'13px',borderRadius:12,background:'#1a0f14',color:'#fff',fontWeight:700,fontSize:14,border:'none',cursor:saving?'not-allowed':'pointer',opacity:saving?0.6:1,fontFamily:ff}}>{saving?'Guardando...':'Guardar'}</button>
      </form>
    </Sheet>
  )
}

function HorariosSheet({p,onClose}:{p:Profile;onClose:()=>void}){
  const[days,setDays]=useState<{day:number;active:boolean;start:string;end:string}[]>(
    [1,2,3,4,5,6,0].map(d=>({day:d,active:d>=1&&d<=5,start:'9:00 AM',end:'7:00 PM'}))
  )
  const[saving,setSaving]=useState(false)
  const[loaded,setLoaded]=useState(false)

  useEffect(()=>{
    supabase.from('specialist_schedules').select('*').eq('specialist_id',p.id).then(({data})=>{
      if(data&&data.length>0){
        setDays(prev=>prev.map(d=>{
          const found=(data as SpecialistSchedule[]).find(s=>s.day_of_week===d.day)
          if(found)return{day:d.day,active:found.active,start:found.start_time,end:found.end_time}
          return d
        }))
      }
      setLoaded(true)
    })
  },[p.id])

  async function save(){
    setSaving(true)
    await Promise.all(days.map(d=>
      supabaseAdmin.from('specialist_schedules').upsert({specialist_id:p.id,day_of_week:d.day,start_time:d.start,end_time:d.end,active:d.active},{onConflict:'specialist_id,day_of_week'})
    ))
    setSaving(false);onClose()
  }

  return(
    <Sheet onClose={onClose}>
      <SheetHandle title={`Horarios · ${p.full_name}`} onClose={onClose}/>
      {!loaded?<p style={{textAlign:'center',color:C.gray,padding:'20px 0'}}>Cargando...</p>:(
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          <p style={{fontSize:12,color:C.gray,margin:'0 0 4px'}}>Configura qué días y horas trabaja.</p>
          {[1,2,3,4,5,6,0].map(dayNum=>{
            const d=days.find(x=>x.day===dayNum)!
            return(
              <div key={dayNum} style={{padding:'12px 14px',borderRadius:12,background:d.active?`color-mix(in srgb, var(--gold) 7%, transparent)`:`color-mix(in srgb, var(--ink) 4%, transparent)`,border:`1px solid ${d.active?`color-mix(in srgb, var(--gold) 20%, transparent)`:`color-mix(in srgb, var(--ink) 8%, transparent)`}`}}>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:d.active?10:0}}>
                  <button type="button" onClick={()=>setDays(prev=>prev.map(x=>x.day===dayNum?{...x,active:!x.active}:x))}
                    style={{width:22,height:22,borderRadius:6,border:`2px solid ${d.active?C.gold:'color-mix(in srgb, var(--gray) 40%, transparent)'}`,background:d.active?C.gold:'transparent',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0,padding:0}}>
                    {d.active&&<Ic.Check size={12} color="#fff"/>}
                  </button>
                  <span style={{fontSize:13,fontWeight:600,color:d.active?C.ink:C.gray,flex:1}}>{WEEKDAYS_ES[dayNum]}</span>
                  {!d.active&&<span style={{fontSize:11,color:C.gray}}>No trabaja</span>}
                </div>
                {d.active&&(
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                    <div><label style={lbl}>Entrada</label><select style={inp({fontSize:12})} value={d.start} onChange={e=>setDays(prev=>prev.map(x=>x.day===dayNum?{...x,start:e.target.value}:x))}>{WORK_TIMES.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
                    <div><label style={lbl}>Salida</label><select style={inp({fontSize:12})} value={d.end} onChange={e=>setDays(prev=>prev.map(x=>x.day===dayNum?{...x,end:e.target.value}:x))}>{WORK_TIMES.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
                  </div>
                )}
              </div>
            )
          })}
          <button onClick={save} disabled={saving} style={{padding:'13px',borderRadius:12,background:'#1a0f14',color:'#fff',fontWeight:700,fontSize:14,border:'none',cursor:saving?'not-allowed':'pointer',opacity:saving?0.6:1,fontFamily:ff,marginTop:6}}>
            {saving?'Guardando...':'Guardar Horarios'}
          </button>
        </div>
      )}
    </Sheet>
  )
}

// ── ADMIN LOGS ──────────────────────────────────────────────────────────
type AdminLog={id:string;user_id:string;user_name:string;action:string;detail:string|null;device:string|null;created_at:string}

function parseDevice(ua:string):string{
  if(/iPhone|iPad|iPod/i.test(ua)) return '📱 iOS'
  if(/Android/i.test(ua)) return '📱 Android'
  if(/Mac/i.test(ua)) return '💻 Mac'
  if(/Windows/i.test(ua)) return '🖥️ Windows'
  return '🌐 Web'
}

async function writeLog(userId:string,userName:string,action:string,detail?:string){
  try{
    await supabaseAdmin.from('admin_logs').insert([{
      user_id:userId,
      user_name:userName,
      action,
      detail:detail??null,
      device:parseDevice(navigator.userAgent),
    }])
  }catch{}
}

// Quick log using current session (no need to pass uid down the tree)
async function logAction(action:string,detail?:string){
  try{
    const{data}=await supabase.auth.getUser()
    const uid=data?.user?.id
    if(!uid)return
    const{data:prof}=await supabase.from('profiles').select('full_name').eq('id',uid).single()
    await writeLog(uid,(prof as any)?.full_name??'Admin',action,detail)
  }catch{}
}

// ── LOG HISTORIAL (admin only) ──────────────────────────────────────────
type SessionUser={id:string;full_name:string;email:string;last_sign_in_at:string|null;role:string}
function LogHistorial(){
  const[logs,setLogs]=useState<AdminLog[]>([])
  const[sessions,setSessions]=useState<SessionUser[]>([])
  const[loading,setLoading]=useState(true)
  const[filter,setFilter]=useState<'all'|'login'|'booking'>('all')
  const[page,setPage]=useState(1)
  const PAGE=20

  useEffect(()=>{
    async function load(){
      setLoading(true)
      const[{data:logData},{data:profs}]=await Promise.all([
        supabaseAdmin.from('admin_logs').select('*').order('created_at',{ascending:false}).limit(120),
        supabaseAdmin.from('profiles').select('id,full_name,email,role').order('full_name'),
      ])
      setLogs((logData??[]) as AdminLog[])
      const profiles=(profs??[]) as {id:string;full_name:string;email:string;role:string}[]
      const authUsers:SessionUser[]=[]
      for(const p of profiles){
        try{
          const{data:au}=await supabaseAdmin.auth.admin.getUserById(p.id)
          authUsers.push({...p,last_sign_in_at:au?.user?.last_sign_in_at??null})
        }catch{
          authUsers.push({...p,last_sign_in_at:null})
        }
      }
      setSessions(authUsers.filter(u=>u.role==='specialist'||u.role==='admin'))
      setLoading(false)
    }
    load()
  },[])

  function fmtTs(ts:string|null){
    if(!ts) return 'Nunca'
    const d=new Date(ts)
    return d.toLocaleDateString('es-PR',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})
  }
  function fmtRelative(ts:string){
    const diff=Date.now()-new Date(ts).getTime()
    const m=Math.floor(diff/60000)
    if(m<1)return 'ahora'
    if(m<60)return `${m}m`
    if(m<1440)return `${Math.floor(m/60)}h`
    return `${Math.floor(m/1440)}d`
  }

  const actionMeta:Record<string,{label:string;color:string;icon:string}>={
    login:         {label:'Inició sesión',   color:C.green,  icon:'→'},
    logout:        {label:'Cerró sesión',    color:C.gray,   icon:'←'},
    create_booking:{label:'Creó cita',       color:C.gold,   icon:'+'},
    confirm_booking:{label:'Confirmó cita',  color:C.green,  icon:'✓'},
    complete_booking:{label:'Completó cita', color:C.green,  icon:'★'},
    cancel_booking:{label:'Canceló cita',    color:C.red,    icon:'✕'},
    no_show:       {label:'No show',         color:C.red,    icon:'!'},
    assign_specialist:{label:'Asignó especialista',color:C.gold,icon:'♦'},
  }

  const filteredLogs=logs.filter(l=>{
    if(filter==='login') return l.action==='login'||l.action==='logout'
    if(filter==='booking') return l.action!=='login'&&l.action!=='logout'
    return true
  })
  const totalPages=Math.ceil(filteredLogs.length/PAGE)
  const start=(page-1)*PAGE
  const pageLogs=filteredLogs.slice(start,start+PAGE)

  return(
    <div style={{padding:'0 16px 24px'}}>
      <h2 style={{fontFamily:ffS,fontSize:28,fontWeight:500,color:C.ink,margin:'0 0 20px'}}>Historial</h2>

      {/* Last access per user — 2-col on desktop */}
      <div style={glass({padding:16,borderRadius:16,marginBottom:20})}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
          <p className="hist-section-hdr" style={{fontSize:11,fontWeight:700,color:C.gray,textTransform:'uppercase',letterSpacing:'0.1em',margin:0}}>Último acceso por usuario</p>
          <span style={{fontSize:11,fontWeight:600,color:C.rosa,background:`color-mix(in srgb, var(--rosa) 12%, transparent)`,padding:'2px 8px',borderRadius:99}}>{sessions.length}</span>
        </div>
        {loading?(
          <p style={{color:C.gray,fontSize:13}}>Cargando...</p>
        ):(
          <div className="log-sessions-grid" style={{display:'grid',gridTemplateColumns:'1fr',gap:8}}>
            {sessions.map(s=>(
              <div key={s.id} className="hist-session-card" style={{display:'flex',alignItems:'center',gap:12,padding:'10px 12px',borderRadius:10,background:`color-mix(in srgb, var(--surface) 60%, transparent)`}}>
                <div style={{width:34,height:34,borderRadius:'50%',background:`color-mix(in srgb, var(--rosa) 18%, transparent)`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <span style={{fontFamily:ffS,fontSize:14,fontWeight:700,color:C.rosa}}>{(s.full_name||'?').charAt(0)}</span>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontSize:13,fontWeight:600,color:C.ink,margin:0}}>{s.full_name}</p>
                  <p style={{fontSize:11,color:C.gray,margin:'1px 0 0'}}>{s.role==='admin'?'Admin':'Especialista'}</p>
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <p style={{fontSize:12,fontWeight:600,color:s.last_sign_in_at?C.green:C.gray,margin:0}}>{fmtTs(s.last_sign_in_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activity log — 3-col grid on desktop, paginated 20/page */}
      <div style={glass({padding:16,borderRadius:16})}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14,flexWrap:'wrap' as const,gap:10}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <p className="hist-section-hdr" style={{fontSize:11,fontWeight:700,color:C.gray,textTransform:'uppercase',letterSpacing:'0.1em',margin:0}}>Actividad del sistema</p>
            {!loading&&<span style={{fontSize:11,fontWeight:600,color:C.rosa,background:`color-mix(in srgb, var(--rosa) 12%, transparent)`,padding:'2px 8px',borderRadius:99}}>{filteredLogs.length} registros</span>}
          </div>
          <div style={{display:'flex',gap:6}}>
            {(['all','login','booking'] as const).map(f=>(
              <button key={f} onClick={()=>{setFilter(f);setPage(1)}} style={{padding:'5px 12px',borderRadius:20,border:'none',cursor:'pointer',fontSize:11,fontWeight:700,background:filter===f?C.ink:'transparent',color:filter===f?'#fff':C.gray,transition:'all .15s',fontFamily:ff}}>
                {f==='all'?'Todo':f==='login'?'Sesiones':'Acciones'}
              </button>
            ))}
          </div>
        </div>

        {loading?(
          <p style={{color:C.gray,fontSize:13}}>Cargando...</p>
        ):filteredLogs.length===0?(
          <p style={{color:C.gray,fontSize:13,textAlign:'center',padding:'20px 0'}}>Sin actividad registrada</p>
        ):(
          <>
            <div className="log-grid" style={{display:'grid',gridTemplateColumns:'1fr',gap:8}}>
              {pageLogs.map(log=>{
                const meta=actionMeta[log.action]??{label:log.action,color:C.gray,icon:'·'}
                return(
                  <div key={log.id} className="hist-log-card" style={{display:'flex',gap:10,padding:'10px 12px',borderRadius:12,background:`color-mix(in srgb, var(--surface) 50%, transparent)`,border:`1px solid color-mix(in srgb, var(--rosa) 10%, transparent)`,alignItems:'flex-start'}}>
                    <div style={{width:30,height:30,borderRadius:'50%',background:`color-mix(in srgb, ${meta.color} 15%, transparent)`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <span style={{fontSize:12,fontWeight:800,color:meta.color}}>{meta.icon}</span>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',alignItems:'center',gap:5,flexWrap:'wrap' as const}}>
                        <span style={{fontSize:12,fontWeight:700,color:C.ink}}>{log.user_name}</span>
                        <span style={{fontSize:11,color:meta.color,fontWeight:600}}>{meta.label}</span>
                      </div>
                      {log.detail&&<p style={{fontSize:11,color:C.gray,margin:'2px 0 0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{log.detail}</p>}
                      <div style={{display:'flex',gap:6,marginTop:3,alignItems:'center',flexWrap:'wrap' as const}}>
                        {log.device&&<span style={{fontSize:10,color:C.gray,opacity:0.7}}>{log.device}</span>}
                        <span style={{fontSize:10,color:C.gray,opacity:0.6}}>{fmtRelative(log.created_at)}</span>
                        <span style={{fontSize:10,color:C.gray,opacity:0.5}}>· {fmtTs(log.created_at)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Pagination */}
            {totalPages>1&&(
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:20,paddingTop:16,borderTop:`1px solid color-mix(in srgb, var(--rosa) 12%, transparent)`}}>
                <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 18px',borderRadius:12,border:`1.5px solid color-mix(in srgb, var(--ink) ${page===1?'8':'18'}%, transparent)`,background:'transparent',color:page===1?C.gray:C.ink,fontWeight:600,fontSize:12,cursor:page===1?'default':'pointer',fontFamily:ff,opacity:page===1?0.35:1,transition:'all .15s'}}>
                  ← Anterior
                </button>
                <div style={{display:'flex',alignItems:'center',gap:4}}>
                  <span style={{fontSize:11,color:C.gray,marginRight:8,fontWeight:500}}>Página {page} de {totalPages}</span>
                  {Array.from({length:Math.min(totalPages,7)},(_,i)=>{
                    const n=totalPages<=7?i+1:i===0?1:i===6?totalPages:page-2+i
                    if(n<1||n>totalPages) return null
                    return(
                      <button key={n} onClick={()=>setPage(n)} style={{width:32,height:32,borderRadius:10,border:n===page?'none':'1.5px solid transparent',cursor:'pointer',fontFamily:ff,fontSize:12,fontWeight:n===page?700:400,background:n===page?C.ink:'transparent',color:n===page?'#fff':C.gray,transition:'all .15s'}}>
                        {n}
                      </button>
                    )
                  })}
                </div>
                <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 18px',borderRadius:12,border:`1.5px solid color-mix(in srgb, var(--ink) ${page===totalPages?'8':'18'}%, transparent)`,background:'transparent',color:page===totalPages?C.gray:C.ink,fontWeight:600,fontSize:12,cursor:page===totalPages?'default':'pointer',fontFamily:ff,opacity:page===totalPages?0.35:1,transition:'all .15s'}}>
                  Siguiente →
                </button>
              </div>
            )}
          </>
        )}
      </div>
      <style>{`
        @media(min-width:900px){
          .log-grid{grid-template-columns:repeat(auto-fill,minmax(300px,1fr))!important;}
          .log-sessions-grid{grid-template-columns:repeat(2,1fr)!important;}
        }
      `}</style>
    </div>
  )
}

function EspecialistasPanel({bookings,svcMap,services}:{bookings:Booking[];svcMap:Map<string,BookingServiceRow[]>;services:Service[]}){
  const[specialists,setSpecialists]=useState<Profile[]>([])
  const[pendingSvcs,setPendingSvcs]=useState<PendingSvc[]>([])
  const[loading,setLoading]=useState(true)
  const[showForm,setShowForm]=useState(false)
  const[form,setForm]=useState({name:'',email:'',password:'',role:'specialist' as 'specialist'|'agenda'})
  const[saving,setSaving]=useState(false)
  const[formError,setFormError]=useState('')
  const[confirmDel,setConfirmDel]=useState<Profile|null>(null)
  const[confirmArchive,setConfirmArchive]=useState<Profile|null>(null)
  const[viewStats,setViewStats]=useState<Profile|null>(null)
  const[editBlocks,setEditBlocks]=useState<Profile|null>(null)
  const[editHorarios,setEditHorarios]=useState<Profile|null>(null)
  const[editProfile,setEditProfile]=useState<Profile|null>(null)
  const[expandedId,setExpandedId]=useState<string|null>(null)
  const[expandedActivas,setExpandedActivas]=useState<string|null>(null)
  const[specSvcs,setSpecSvcs]=useState<Record<string,{service_name:string;duration_minutes:number}[]>>({})
  const today=todayStr()

  useEffect(()=>{ loadAll() },[])

  async function loadAll(){
    setLoading(true)
    const[{data:specs},{data:svcs}]=await Promise.all([
      supabase.from('profiles').select('*').eq('role','specialist').order('full_name'),
      supabase.from('specialist_services').select('id,specialist_id,service_name,duration_minutes,approved').eq('approved',false),
    ])
    const spList=(specs??[]) as Profile[]
    setSpecialists(spList)
    const pending=(svcs??[]) as PendingSvc[]
    const bySpec:Record<string,PendingSvc&{specialist_name?:string}>={}
    for(const s of pending){
      const sp=spList.find(p=>p.id===s.specialist_id)
      ;(s as any).specialist_name=sp?.full_name??'Desconocida'
    }
    setPendingSvcs(pending)
    setLoading(false)
  }

  async function loadSpecSvcs(specId:string){
    const{data}=await supabase.from('specialist_services').select('service_name,duration_minutes').eq('specialist_id',specId).eq('approved',true).order('service_name')
    setSpecSvcs(prev=>({...prev,[specId]:data??[]}))
  }

  function toggleExpand(id:string){
    const next=expandedId===id?null:id
    setExpandedId(next)
    if(next&&!specSvcs[next]) loadSpecSvcs(next)
  }

  async function addSpecialist(e:React.FormEvent){
    e.preventDefault();setSaving(true);setFormError('')
    const{data:authData,error:authErr}=await supabaseAdmin.auth.admin.createUser({
      email:form.email,password:form.password,email_confirm:true,
      user_metadata:{full_name:form.name},
    })
    if(authErr||!authData.user){
      setFormError(authErr?.message||'Error al crear usuario');setSaving(false);return
    }
    const{error:profErr}=await supabaseAdmin.from('profiles').update({
      full_name:form.name,role:form.role,email:form.email,active:true,
    }).eq('id',authData.user.id)
    if(profErr){setFormError('Usuario creado pero error: '+profErr.message);setSaving(false);return}
    setForm({name:'',email:'',password:'',role:'specialist'});setShowForm(false);setSaving(false)
    loadAll()
  }

  async function archiveSpecialist(p:Profile){
    await supabaseAdmin.from('profiles').update({active:false}).eq('id',p.id)
    setSpecialists(list=>list.map(s=>s.id===p.id?{...s,active:false}:s))
    setConfirmArchive(null)
  }

  async function removeSpecialist(p:Profile){
    try{
      await Promise.all([
        supabaseAdmin.from('specialist_services').delete().eq('specialist_id',p.id),
        supabaseAdmin.from('specialist_schedules').delete().eq('specialist_id',p.id),
        supabaseAdmin.from('admin_logs').delete().eq('user_id',p.id),
      ])
      const{error:profErr}=await supabaseAdmin.from('profiles').delete().eq('id',p.id)
      if(profErr){console.error('profile delete error:',profErr);return}
      // deleteUser may fail if auth user doesn't exist (e.g. imported accounts) — ignore error
      await supabaseAdmin.auth.admin.deleteUser(p.id).catch(()=>{})
      setSpecialists(list=>list.filter(s=>s.id!==p.id))
      setConfirmDel(null)
      loadAll()
    }catch(e){console.error('removeSpecialist error:',e)}
  }

  async function restoreSpecialist(p:Profile){
    await supabaseAdmin.from('profiles').update({active:true}).eq('id',p.id)
    setSpecialists(list=>list.map(s=>s.id===p.id?{...s,active:true}:s))
  }

  async function toggleActive(p:Profile){
    await supabaseAdmin.from('profiles').update({active:!p.active}).eq('id',p.id)
    setSpecialists(list=>list.map(s=>s.id===p.id?{...s,active:!s.active}:s))
  }

  async function approveRequest(svc:PendingSvc){
    await supabaseAdmin.from('specialist_services').update({approved:true}).eq('id',svc.id)
    await supabaseAdmin.from('notifications').update({resolved:true}).eq('ref_id',svc.id).eq('kind','service_request')
    setPendingSvcs(list=>list.filter(s=>s.id!==svc.id))
    setSpecSvcs(prev=>({...prev,[svc.specialist_id]:[...(prev[svc.specialist_id]??[]),{service_name:svc.service_name,duration_minutes:svc.duration_minutes}]}))
    if(svc.specialist_name) sendNotify({
      title:'Servicio aprobado',
      body:`"${svc.service_name}" ya está aprobado y disponible en tu perfil.`,
      tag:`svc-approved-${svc.id}`,
      target:{role:'specialist',name:svc.specialist_name},
      kind:'service_approved',refId:svc.id,
    })
  }

  async function rejectRequest(svc:PendingSvc){
    await supabaseAdmin.from('specialist_services').delete().eq('id',svc.id)
    await supabaseAdmin.from('notifications').update({resolved:true}).eq('ref_id',svc.id).eq('kind','service_request')
    setPendingSvcs(list=>list.filter(s=>s.id!==svc.id))
    if(svc.specialist_name) sendNotify({
      title:'Servicio no aprobado',
      body:`Tu solicitud para "${svc.service_name}" fue rechazada.`,
      tag:`svc-rejected-${svc.id}`,
      target:{role:'specialist',name:svc.specialist_name},
      kind:'service_rejected',refId:svc.id,
    })
  }

  return(
    <div style={{padding:'0 16px 24px'}}>
      {viewStats&&<SpecialistStats p={viewStats} bookings={bookings} svcMap={svcMap} onClose={()=>setViewStats(null)}/>}
      {editBlocks&&<SpecialistBlocksSheet p={editBlocks} onClose={()=>setEditBlocks(null)}/>}
      {editHorarios&&<HorariosSheet p={editHorarios} onClose={()=>setEditHorarios(null)}/>}
      {editProfile&&<EditSpecialistSheet p={editProfile} services={services} onClose={()=>setEditProfile(null)} onDone={loadAll}/>}
      {confirmArchive&&(
        <DeleteConfirm
          msg={`¿Archivar a ${confirmArchive.full_name}? No aparecerá en citas ni en el equipo activo. Puedes restaurarla desde Archivados.`}
          onClose={()=>setConfirmArchive(null)}
          onConfirm={()=>archiveSpecialist(confirmArchive)}
        />
      )}
      {confirmDel&&(
        <DeleteConfirm
          msg={`Eliminar permanentemente a ${confirmDel.full_name}? Se borrará su cuenta y no se puede deshacer.`}
          onClose={()=>setConfirmDel(null)}
          onConfirm={()=>removeSpecialist(confirmDel)}
        />
      )}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
        <h2 style={{fontFamily:ffS,fontSize:28,fontWeight:500,color:C.ink,margin:0}}>Equipo</h2>
        <button onClick={()=>setShowForm(s=>!s)} style={{display:'flex',alignItems:'center',gap:6,padding:'10px 16px',borderRadius:12,background:'#1a0f14',color:'#fff',fontWeight:700,fontSize:13,border:'none',cursor:'pointer',fontFamily:ff}}>
          <Ic.Plus size={15} color="#fff"/> Añadir
        </button>
      </div>

      {/* Pending service requests */}
      {pendingSvcs.length>0&&(
        <div style={glass({padding:16,borderRadius:16,marginBottom:16,border:`1.5px solid color-mix(in srgb, var(--gold) 35%, transparent)`})}>
          <p style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:'uppercase',letterSpacing:'0.08em',margin:'0 0 12px'}}>Solicitudes de servicio nuevo ({pendingSvcs.length})</p>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {pendingSvcs.map(s=>(
              <div key={s.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,background:`color-mix(in srgb, var(--gold) 6%, transparent)`,border:`1px solid color-mix(in srgb, var(--gold) 18%, transparent)`}}>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontSize:13,fontWeight:600,color:C.ink,margin:0}}>{s.service_name}</p>
                  <p style={{fontSize:11,color:C.gray,margin:'2px 0 0'}}>{(s as any).specialist_name} · {s.duration_minutes} min</p>
                </div>
                <div style={{display:'flex',gap:6,flexShrink:0}}>
                  <button onClick={()=>approveRequest(s)} style={{padding:'7px 12px',borderRadius:8,background:`color-mix(in srgb, var(--green) 15%, transparent)`,color:C.green,fontWeight:700,fontSize:11,border:`1px solid color-mix(in srgb, var(--green) 30%, transparent)`,cursor:'pointer',fontFamily:ff}}>Aprobar</button>
                  <button onClick={()=>rejectRequest(s)} style={{padding:'7px 12px',borderRadius:8,background:`color-mix(in srgb, var(--red) 10%, transparent)`,color:C.red,fontWeight:700,fontSize:11,border:`1px solid color-mix(in srgb, var(--red) 20%, transparent)`,cursor:'pointer',fontFamily:ff}}>Rechazar</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showForm&&(
        <div style={glass({padding:20,marginBottom:20,borderRadius:16})}>
          <p style={{fontFamily:ffS,fontSize:18,color:C.ink,margin:'0 0 14px'}}>Nuevo/a Especialista</p>
          <form onSubmit={addSpecialist} style={{display:'flex',flexDirection:'column',gap:10}}>
            <div><label style={lbl}>Nombre completo</label><input required style={inp()} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></div>
            <div><label style={lbl}>Correo</label><input required type="email" style={inp()} value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/></div>
            <div><label style={lbl}>Contraseña inicial</label><input required type="password" minLength={6} style={inp()} value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))}/></div>
            <div>
              <label style={lbl}>Rol</label>
              <select style={inp()} value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value as 'specialist'|'agenda'}))}>
                <option value="specialist">Especialista</option>
                <option value="agenda">Agenda (solo calendario)</option>
              </select>
            </div>
            {formError&&<p style={{fontSize:12,color:C.red,margin:0}}>{formError}</p>}
            <div style={{display:'flex',gap:8}}>
              <button type="submit" disabled={saving} style={{flex:1,padding:'11px',borderRadius:10,background:C.green,color:'#fff',fontWeight:700,fontSize:13,border:'none',cursor:saving?'not-allowed':'pointer',fontFamily:ff}}>{saving?'Creando...':'Crear cuenta'}</button>
              <button type="button" onClick={()=>setShowForm(false)} style={{flex:1,padding:'11px',borderRadius:10,background:`color-mix(in srgb, var(--ink) 8%, transparent)`,color:C.gray,fontWeight:600,fontSize:13,border:'none',cursor:'pointer',fontFamily:ff}}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {loading?(
        <p style={{textAlign:'center',color:C.gray,fontSize:13,padding:'20px 0'}}>Cargando...</p>
      ):specialists.filter(s=>s.active!==false).length===0&&specialists.filter(s=>s.active===false).length===0?(
        <div style={glass({padding:32,textAlign:'center',borderRadius:16})}>
          <p style={{color:C.gray,fontSize:14,margin:0}}>No hay especialistas aun.</p>
        </div>
      ):(
        <>
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {specialists.filter(s=>s.active!==false).map(p=>{
            const mine=bookings.filter(b=>serviceBreakdown(b,svcMap).some(s=>s.specialist===p.full_name))
            const myServices=bookings.flatMap(b=>serviceBreakdown(b,svcMap).filter(s=>s.specialist===p.full_name).map(()=>({date:b.date,status:b.status})))
            const activas=mine.filter(b=>b.date>=today&&(b.status==='confirmed'||b.status==='pending')).length
            const atendidas=myServices.filter(b=>b.status==='completed').length
            const canceladas=myServices.filter(b=>b.status==='cancelled'||b.status==='no_show').length
            const total=atendidas+canceladas
            const pct=total>0?Math.round(atendidas/total*100):null
            const pctColor=pct===null?C.gray:pct>=80?C.green:pct>=60?C.gold:C.red
            const expanded=expandedId===p.id
            return(
              <div key={p.id} style={glass({padding:'16px 18px',borderRadius:16,opacity:p.active===false?0.6:1})}>
                <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:12}}>
                  <div style={{width:44,height:44,borderRadius:'50%',overflow:'hidden',background:`color-mix(in srgb, var(--gold) 20%, transparent)`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    {p.avatar_url?<img src={p.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span style={{fontSize:17,fontWeight:700,color:C.gold,fontFamily:ffS}}>{(p.full_name||'?').charAt(0)}</span>}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <p style={{fontSize:14,fontWeight:600,color:C.ink,margin:0}}>{p.full_name}</p>
                      {p.active===false&&<span style={{fontSize:9,fontWeight:700,color:C.red,padding:'2px 6px',borderRadius:99,background:`color-mix(in srgb, var(--red) 12%, transparent)`,textTransform:'uppercase'}}>Inactiva</span>}
                    </div>
                    <p style={{fontSize:11,color:C.gray,margin:'2px 0 0'}}>{p.email}</p>
                  </div>
                  <div style={{display:'flex',gap:4,flexShrink:0}}>
                    <button onClick={()=>setEditProfile(p)} title="Editar perfil" style={{background:'none',border:'none',cursor:'pointer',padding:6}}><Ic.Edit size={15} color={C.gold}/></button>
                    <button onClick={()=>setEditHorarios(p)} title="Horarios (semanal)" style={{background:'none',border:'none',cursor:'pointer',padding:6}}><Ic.Calendar size={15} color={C.gray}/></button>
                    <button onClick={()=>setEditBlocks(p)} title="Cambios de horario" style={{background:'none',border:'none',cursor:'pointer',padding:6}}><Ic.Block size={15} color={C.red}/></button>
                    <button onClick={()=>setConfirmArchive(p)} title="Archivar" style={{background:'none',border:'none',cursor:'pointer',padding:6}}><Ic.Archive size={15} color={C.red}/></button>
                  </div>
                </div>
                {/* Active bookings — clickeable */}
                {(() => {
                  const activeBkgs=mine.filter(b=>b.date>=today&&(b.status==='confirmed'||b.status==='pending')).sort((a,c)=>a.date.localeCompare(c.date)||a.time.localeCompare(c.time))
                  const showActivas=expandedActivas===p.id
                  return(
                    <>
                      <button onClick={()=>setExpandedActivas(showActivas?null:p.id)} style={{display:'flex',alignItems:'center',justifyContent:'space-between',width:'100%',padding:'10px 14px',borderRadius:12,background:`color-mix(in srgb, var(--gold) 10%, transparent)`,border:`1px solid color-mix(in srgb, var(--gold) 25%, transparent)`,cursor:'pointer',fontFamily:ff,marginBottom:showActivas&&activeBkgs.length>0?0:8}}>
                        <div style={{display:'flex',alignItems:'center',gap:10}}>
                          <span style={{fontSize:24,fontWeight:700,color:C.gold,fontFamily:ffS,lineHeight:1}}>{activas}</span>
                          <span style={{fontSize:9,color:C.gray,textTransform:'uppercase',letterSpacing:'0.06em'}}>Citas activas</span>
                        </div>
                        <Ic.CD size={14} color={C.gray} style={{transform:showActivas?'rotate(180deg)':'none',transition:'transform .2s'}}/>
                      </button>
                      {showActivas&&activeBkgs.length>0&&(
                        <div style={{marginBottom:8,border:`1px solid color-mix(in srgb, var(--gold) 20%, transparent)`,borderTop:'none',borderRadius:'0 0 10px 10px',overflow:'hidden'}}>
                          {activeBkgs.map((bk,i)=>(
                            <div key={bk.id} style={{padding:'10px 14px',background:i%2===0?`color-mix(in srgb, var(--gold) 5%, transparent)`:'transparent',borderTop:i>0?`1px solid color-mix(in srgb, var(--ink) 6%, transparent)`:'none'}}>
                              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                                <span style={{fontSize:13,fontWeight:600,color:C.ink}}>{bk.name}</span>
                                <span style={{fontSize:11,color:C.gray}}>{fmtDate(bk.date)} · {bk.time}</span>
                              </div>
                              <p style={{fontSize:11,color:C.gray,margin:'2px 0 0'}}>{bk.service||'Sin servicio'} · <span style={{color:bk.status==='confirmed'?C.green:C.gold,fontWeight:600}}>{bk.status}</span></p>
                            </div>
                          ))}
                        </div>
                      )}
                      {showActivas&&activeBkgs.length===0&&(
                        <p style={{fontSize:11,color:C.gray,padding:'4px 14px 10px',margin:0}}>Sin citas activas</p>
                      )}
                    </>
                  )
                })()}
                {/* Stats row below activas */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:8}}>
                  <button onClick={()=>setViewStats(p)} style={{padding:'8px 4px',borderRadius:10,background:`color-mix(in srgb, var(--green) 10%, transparent)`,border:`1px solid color-mix(in srgb, var(--green) 22%, transparent)`,cursor:'pointer',textAlign:'center',fontFamily:ff}}>
                    <p style={{fontSize:18,fontWeight:700,color:C.green,fontFamily:ffS,margin:0}}>{atendidas}</p>
                    <p style={{fontSize:9,color:C.gray,textTransform:'uppercase',letterSpacing:'0.05em',margin:'2px 0 0'}}>Atendidas</p>
                  </button>
                  <button onClick={()=>setViewStats(p)} style={{padding:'8px 4px',borderRadius:10,background:`color-mix(in srgb, var(--red) 8%, transparent)`,border:`1px solid color-mix(in srgb, var(--red) 18%, transparent)`,cursor:'pointer',textAlign:'center',fontFamily:ff}}>
                    <p style={{fontSize:18,fontWeight:700,color:C.red,fontFamily:ffS,margin:0}}>{canceladas}</p>
                    <p style={{fontSize:9,color:C.gray,textTransform:'uppercase',letterSpacing:'0.05em',margin:'2px 0 0'}}>Canceladas</p>
                  </button>
                  <div style={{padding:'8px 4px',borderRadius:10,background:`color-mix(in srgb, ${pctColor} 8%, transparent)`,border:`1px solid color-mix(in srgb, ${pctColor} 20%, transparent)`,textAlign:'center'}}>
                    <p style={{fontSize:18,fontWeight:700,color:pctColor,fontFamily:ffS,margin:0}}>{pct!==null?`${pct}%`:'—'}</p>
                    <p style={{fontSize:9,color:C.gray,textTransform:'uppercase',letterSpacing:'0.05em',margin:'2px 0 0'}}>Tasa</p>
                  </div>
                </div>
                {/* Expand to see services */}
                <button onClick={()=>toggleExpand(p.id)} style={{display:'flex',alignItems:'center',justifyContent:'space-between',width:'100%',padding:'8px 10px',borderRadius:10,background:`color-mix(in srgb, var(--ink) 4%, transparent)`,border:`1px solid color-mix(in srgb, var(--ink) 8%, transparent)`,cursor:'pointer',fontFamily:ff}}>
                  <span style={{fontSize:11,fontWeight:700,color:C.gray,textTransform:'uppercase',letterSpacing:'0.06em'}}>Servicios</span>
                  <Ic.CD size={14} color={C.gray} style={{transform:expanded?'rotate(180deg)':'none',transition:'transform .2s'}}/>
                </button>
                {expanded&&(
                  <div style={{marginTop:6,display:'flex',flexDirection:'column',gap:4}}>
                    {!specSvcs[p.id]?(
                      <p style={{fontSize:11,color:C.gray,padding:'6px 0',margin:0}}>Cargando...</p>
                    ):specSvcs[p.id].length===0?(
                      <p style={{fontSize:11,color:C.gray,padding:'6px 0',margin:0}}>Ningún servicio configurado aún.</p>
                    ):specSvcs[p.id].map(s=>(
                      <div key={s.service_name} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 10px',borderRadius:8,background:`color-mix(in srgb, var(--ink) 3%, transparent)`}}>
                        <span style={{fontSize:12,color:C.ink}}>{s.service_name}</span>
                        <span style={{fontSize:11,color:C.gold,fontWeight:600,flexShrink:0}}>{s.duration_minutes} min</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Archived section */}
        {specialists.filter(s=>s.active===false).length>0&&(
          <div style={{marginTop:28}}>
            <p style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.12em',color:C.gray,margin:'0 0 10px',opacity:0.7}}>Archivadas ({specialists.filter(s=>s.active===false).length})</p>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {specialists.filter(s=>s.active===false).map(p=>(
                <div key={p.id} style={glass({padding:'14px 16px',borderRadius:14,opacity:0.65})}>
                  <div style={{display:'flex',alignItems:'center',gap:12}}>
                    <div style={{width:38,height:38,borderRadius:'50%',overflow:'hidden',background:`color-mix(in srgb, var(--gray) 15%, transparent)`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      {p.avatar_url?<img src={p.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span style={{fontSize:15,fontWeight:700,color:C.gray,fontFamily:ffS}}>{(p.full_name||'?').charAt(0)}</span>}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{fontSize:13,fontWeight:600,color:C.gray,margin:0}}>{p.full_name}</p>
                      <p style={{fontSize:11,color:C.gray,margin:'2px 0 0',opacity:0.7}}>{p.email}</p>
                    </div>
                    <div style={{display:'flex',gap:6,flexShrink:0}}>
                      <button onClick={()=>restoreSpecialist(p)} style={{padding:'7px 12px',borderRadius:8,background:`color-mix(in srgb, var(--green) 15%, transparent)`,color:C.green,fontWeight:700,fontSize:11,border:`1px solid color-mix(in srgb, var(--green) 30%, transparent)`,cursor:'pointer',fontFamily:ff}}>Restaurar</button>
                      <button onClick={()=>setConfirmDel(p)} style={{background:'none',border:'none',cursor:'pointer',padding:6}}><Ic.Trash size={14} color={C.red}/></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        </>
      )}
    </div>
  )
}

// ---- DEPOSIT STATUS CONFIG -----------------------------------------------
const DEPOSIT_STATUSES:{val:Deposit['status'];label:string;color:string}[]=[
  {val:'pendiente', label:'Pendiente', color:'var(--gold)'},
  {val:'solicitado',label:'Solicitado',color:'#6c8ebf'},
  {val:'recibido',  label:'Recibido',  color:'var(--green)'},
  {val:'utilizado', label:'Utilizado', color:'var(--gray)'},
  {val:'retenido',  label:'Retenido',  color:'var(--red)'},
]
function depositColor(s:string){return DEPOSIT_STATUSES.find(d=>d.val===s)?.color??C.gray}
function depositLabel(s:string){return DEPOSIT_STATUSES.find(d=>d.val===s)?.label??s}

// ---- DEPOSITOS PANEL -------------------------------------------------------
function Depositos(){
  const[deposits,setDeposits]=useState<Deposit[]>([])
  const[loading,setLoading]=useState(true)
  const[filter,setFilter]=useState<Deposit['status']|'all'>('all')
  const[showCreate,setShowCreate]=useState(false)
  const[editDep,setEditDep]=useState<Deposit|null>(null)
  const[form,setForm]=useState({client_name:'',client_phone:business.phone,amount:'',concept:'',status:'pendiente' as Deposit['status'],notes:''})
  const[saving,setSaving]=useState(false)
  const[confirmDel,setConfirmDel]=useState<Deposit|null>(null)
  const[stripeSummary,setStripeSummary]=useState<{total:number;count:number;currentBalance:number;pending:number}|null>(null)
  const[stripeLoading,setStripeLoading]=useState(true)

  useEffect(()=>{loadDeposits()},[])
  useEffect(()=>{
    fetch('/api/stripe-summary').then(r=>r.json()).then(d=>{
      if(typeof d.total==='number') setStripeSummary({total:d.total,count:d.count,currentBalance:d.currentBalance??d.total,pending:d.pending??0})
    }).catch(()=>{}).finally(()=>setStripeLoading(false))
  },[])

  async function loadDeposits(){
    setLoading(true)
    const{data}=await supabase.from('deposits').select('*').order('created_at',{ascending:false})
    setDeposits((data??[]) as Deposit[])
    setLoading(false)
  }

  async function saveDeposit(e:React.FormEvent){
    e.preventDefault();setSaving(true)
    if(editDep){
      await supabaseAdmin.from('deposits').update({client_name:form.client_name,client_phone:form.client_phone,amount:parseFloat(form.amount)||0,concept:form.concept,status:form.status,notes:form.notes||null}).eq('id',editDep.id)
    } else {
      await supabaseAdmin.from('deposits').insert([{client_name:form.client_name,client_phone:form.client_phone,amount:parseFloat(form.amount)||0,concept:form.concept,status:form.status,notes:form.notes||null}])
    }
    setSaving(false);setShowCreate(false);setEditDep(null);setForm({client_name:'',client_phone:business.phone,amount:'',concept:'',status:'pendiente',notes:''});loadDeposits()
  }

  async function updateStatus(dep:Deposit,status:Deposit['status']){
    await supabaseAdmin.from('deposits').update({status}).eq('id',dep.id)
    setDeposits(ds=>ds.map(d=>d.id===dep.id?{...d,status}:d))
  }

  async function deleteDeposit(dep:Deposit){
    await supabaseAdmin.from('deposits').delete().eq('id',dep.id)
    setConfirmDel(null);loadDeposits()
  }

  function openEdit(dep:Deposit){
    setEditDep(dep)
    setForm({client_name:dep.client_name,client_phone:dep.client_phone,amount:String(dep.amount),concept:dep.concept||'',status:dep.status,notes:dep.notes||''})
    setShowCreate(true)
  }

  const filtered=filter==='all'?deposits:deposits.filter(d=>d.status===filter)
  const totalRecibido=deposits.filter(d=>d.status==='recibido').reduce((s,d)=>s+d.amount,0)
  const totalPendiente=deposits.filter(d=>d.status==='pendiente'||d.status==='solicitado').reduce((s,d)=>s+d.amount,0)

  return(
    <div style={{padding:'0 16px 24px'}}>
      {confirmDel&&<DeleteConfirm msg={`Borrar depósito de ${confirmDel.client_name}? Esta acción no se puede deshacer.`} onClose={()=>setConfirmDel(null)} onConfirm={()=>deleteDeposit(confirmDel)}/>}

      {showCreate&&(
        <Sheet onClose={()=>{setShowCreate(false);setEditDep(null);setForm({client_name:'',client_phone:business.phone,amount:'',concept:'',status:'pendiente',notes:''})}}>
          <SheetHandle title={editDep?'Editar Depósito':'Nuevo Depósito'} onClose={()=>{setShowCreate(false);setEditDep(null)}}/>
          <form onSubmit={saveDeposit} style={{display:'flex',flexDirection:'column',gap:12}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div><label style={lbl}>Cliente</label><input required style={inp()} value={form.client_name} onChange={e=>setForm(f=>({...f,client_name:e.target.value}))}/></div>
              <div><label style={lbl}>Teléfono</label><input style={inp()} value={form.client_phone} onChange={e=>setForm(f=>({...f,client_phone:e.target.value}))}/></div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div><label style={lbl}>Monto ($)</label><input required type="number" step="0.01" min="0" style={inp()} value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))}/></div>
              <div>
                <label style={lbl}>Estado</label>
                <select style={inp()} value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value as Deposit['status']}))}>
                  {DEPOSIT_STATUSES.map(s=><option key={s.val} value={s.val}>{s.label}</option>)}
                </select>
              </div>
            </div>
            <div><label style={lbl}>Concepto</label><input style={inp()} placeholder="Reserva, señal, servicio..." value={form.concept} onChange={e=>setForm(f=>({...f,concept:e.target.value}))}/></div>
            <div><label style={lbl}>Notas internas</label><textarea rows={2} style={inp({resize:'none'})} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></div>
            <button type="submit" disabled={saving} style={{padding:'13px',borderRadius:12,background:'#1a0f14',color:'#fff',fontWeight:700,fontSize:14,border:'none',cursor:saving?'not-allowed':'pointer',opacity:saving?0.6:1,fontFamily:ff}}>
              {saving?'Guardando...':editDep?'Actualizar':'Crear Depósito'}
            </button>
          </form>
        </Sheet>
      )}

      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
        <h2 style={{fontFamily:ffS,fontSize:28,fontWeight:500,color:C.ink,margin:0}}>Depósitos</h2>
        <button onClick={()=>setShowCreate(true)} style={{display:'flex',alignItems:'center',gap:6,padding:'10px 16px',borderRadius:12,background:'#1a0f14',color:'#fff',fontWeight:700,fontSize:13,border:'none',cursor:'pointer',fontFamily:ff}}>
          <Ic.Plus size={15} color="#fff"/> Nuevo
        </button>
      </div>

      {/* Summary cards */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
        <div style={glass({padding:'14px',borderRadius:14})}>
          <p style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:C.gray,margin:0}}>Recibido (app)</p>
          <p style={{fontSize:28,fontWeight:700,fontFamily:ffS,color:C.green,margin:'6px 0 2px',lineHeight:1}}>${totalRecibido.toFixed(0)}</p>
          <p style={{fontSize:11,color:C.gray,margin:0}}>{deposits.filter(d=>d.status==='recibido').length} depósito{deposits.filter(d=>d.status==='recibido').length!==1?'s':''}</p>
        </div>
        <div style={glass({padding:'14px',borderRadius:14})}>
          <p style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:C.gray,margin:0}}>Pendiente</p>
          <p style={{fontSize:28,fontWeight:700,fontFamily:ffS,color:C.gold,margin:'6px 0 2px',lineHeight:1}}>${totalPendiente.toFixed(0)}</p>
          <p style={{fontSize:11,color:C.gray,margin:0}}>{deposits.filter(d=>d.status==='pendiente'||d.status==='solicitado').length} depósito{deposits.filter(d=>d.status==='pendiente'||d.status==='solicitado').length!==1?'s':''}</p>
        </div>
      </div>
      <div style={glass({padding:'14px',borderRadius:14,marginBottom:16})}>
        <p style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:C.gray,margin:0}}>Balance actual en Stripe</p>
        {stripeLoading?(
          <p style={{fontSize:13,color:C.gray,margin:'8px 0 0'}}>Consultando Stripe...</p>
        ):stripeSummary?(
          <>
            <p style={{fontSize:28,fontWeight:700,fontFamily:ffS,color:'#635bff',margin:'6px 0 2px',lineHeight:1}}>${stripeSummary.currentBalance.toFixed(2)}</p>
            <p style={{fontSize:11,color:C.gray,margin:0}}>
              Lo que hay disponible/en camino ahora mismo (ya descuenta los retiros automáticos al banco)
              {stripeSummary.pending>0?` · $${stripeSummary.pending.toFixed(2)} pendiente de liquidar`:''}
            </p>
            <p style={{fontSize:11,color:C.gray,margin:'6px 0 0',paddingTop:6,borderTop:`1px solid ${C.sb}`}}>Histórico: ${stripeSummary.total.toFixed(2)} en {stripeSummary.count} pago{stripeSummary.count!==1?'s':''} desde siempre (incluye lo ya retirado al banco)</p>
          </>
        ):(
          <p style={{fontSize:13,color:C.red,margin:'8px 0 0'}}>No se pudo consultar Stripe</p>
        )}
      </div>

      {/* Status filter */}
      <div style={{display:'flex',gap:6,overflowX:'auto',paddingBottom:4,marginBottom:14}}>
        {['all',...DEPOSIT_STATUSES.map(s=>s.val)].map(s=>(
          <button key={s} onClick={()=>setFilter(s as typeof filter)} style={{flexShrink:0,padding:'6px 14px',borderRadius:99,fontSize:11,fontWeight:700,border:'none',cursor:'pointer',fontFamily:ff,background:filter===s?C.gold:'color-mix(in srgb, var(--ink) 8%, transparent)',color:filter===s?'#fff':C.gray}}>
            {s==='all'?'Todos':depositLabel(s)}
          </button>
        ))}
      </div>

      {loading?<p style={{textAlign:'center',color:C.gray,fontSize:13,padding:'20px 0'}}>Cargando...</p>:
      filtered.length===0?<div style={glass({padding:32,textAlign:'center',borderRadius:16})}><p style={{color:C.gray,fontSize:14,margin:0}}>No hay depósitos en esta categoría.</p></div>:(
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {filtered.map(dep=>(
            <div key={dep.id} style={glass({padding:'14px 16px',borderRadius:14})}>
              <div style={{display:'flex',alignItems:'flex-start',gap:8}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap' as const}}>
                    <span style={{fontSize:14,fontWeight:600,color:C.ink}}>{dep.client_name}</span>
                    <span style={{fontSize:11,fontWeight:700,color:depositColor(dep.status),padding:'2px 8px',borderRadius:99,background:`color-mix(in srgb, ${depositColor(dep.status)} 12%, transparent)`}}>{depositLabel(dep.status)}</span>
                  </div>
                  <p style={{fontSize:13,color:C.gold,fontWeight:700,margin:'4px 0 0'}}>${dep.amount.toFixed(2)}{dep.concept?<span style={{fontWeight:400,color:C.gray}}> · {dep.concept}</span>:null}</p>
                  {dep.client_phone&&<p style={{fontSize:11,color:C.gray,margin:'2px 0 0'}}>{dep.client_phone}</p>}
                  {dep.notes&&<p style={{fontSize:11,color:C.gray,margin:'2px 0 0',opacity:0.75}}>{dep.notes}</p>}
                </div>
                <div style={{display:'flex',gap:4,flexShrink:0}}>
                  <button onClick={()=>openEdit(dep)} style={{background:'none',border:'none',cursor:'pointer',padding:6}}><Ic.Edit size={15} color={C.gray}/></button>
                  <button onClick={()=>setConfirmDel(dep)} style={{background:'none',border:'none',cursor:'pointer',padding:6}}><Ic.Trash size={15} color={C.red}/></button>
                </div>
              </div>
              {/* Quick status change */}
              <div style={{display:'flex',gap:6,marginTop:10,flexWrap:'wrap' as const}}>
                {DEPOSIT_STATUSES.filter(s=>s.val!==dep.status).map(s=>(
                  <button key={s.val} onClick={()=>updateStatus(dep,s.val)} style={{padding:'5px 10px',borderRadius:8,fontSize:10,fontWeight:700,border:'none',cursor:'pointer',fontFamily:ff,background:`color-mix(in srgb, ${s.color} 12%, transparent)`,color:s.color}}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---- MI PERFIL (specialist self-setup) -------------------------------------
type SpecSvc={id?:string;specialist_id:string;service_name:string;duration_minutes:number;approved:boolean}

function MiPerfil(){
  const[userId,setUserId]=useState('')
  const[profile,setProfile]=useState<Profile|null>(null)
  const[bio,setBio]=useState('')
  const[avatarUrl,setAvatarUrl]=useState('')
  const[saving,setSaving]=useState(false)
  const[savMsg,setSavMsg]=useState('')
  const[specSvcs,setSpecSvcs]=useState<SpecSvc[]>([])
  const[pendingSvcs,setPendingSvcs]=useState<SpecSvc[]>([])
  const[newSvcName,setNewSvcName]=useState('')
  const[newSvcDur,setNewSvcDur]=useState(60)
  const[requestMsg,setRequestMsg]=useState('')
  const[catalog,setCatalog]=useState<Service[]>([])
  const imgRef=useRef<HTMLInputElement>(null)
  const allSvcNames=catalog.map(s=>s.name)

  useEffect(()=>{
    supabase.auth.getSession().then(async({data})=>{
      if(!data.session)return
      const uid=data.session.user.id
      setUserId(uid)
      const{data:prof}=await supabase.from('profiles').select('*').eq('id',uid).single()
      if(prof){setProfile(prof as Profile);setBio((prof as Profile).bio||'');setAvatarUrl((prof as Profile).avatar_url||'')}
      loadSvcs(uid)
    })
    supabase.from('services').select('*').eq('active',true).order('display_order',{ascending:true})
      .then(({data})=>setCatalog((data??[]) as Service[]))
  },[])

  async function loadSvcs(uid:string){
    const{data}=await supabase.from('specialist_services').select('*').eq('specialist_id',uid)
    const approved=(data??[]).filter((s:SpecSvc)=>s.approved)
    const pending=(data??[]).filter((s:SpecSvc)=>!s.approved)
    setSpecSvcs(approved)
    setPendingSvcs(pending)
  }

  async function saveProfile(){
    setSaving(true);setSavMsg('')
    await supabaseAdmin.from('profiles').update({bio,avatar_url:avatarUrl}).eq('id',userId)
    setSaving(false);setSavMsg('Guardado ✓')
    setTimeout(()=>setSavMsg(''),2500)
  }

  async function uploadAvatar(file:File){
    const ext=file.name.split('.').pop()??'jpg'
    const path=`avatars/${userId}.${ext}`
    const{data}=await supabaseAdmin.storage.from('avatars').upload(path,file,{upsert:true})
    if(data){
      const{data:u}=supabaseAdmin.storage.from('avatars').getPublicUrl(path)
      setAvatarUrl(u.publicUrl)
    }
  }

  async function toggleService(svcName:string,dur:number,current:boolean){
    if(current){
      // remove
      await supabaseAdmin.from('specialist_services').delete().eq('specialist_id',userId).eq('service_name',svcName)
    } else {
      // add as approved (specialist choosing from existing catalog)
      await supabaseAdmin.from('specialist_services').upsert({specialist_id:userId,service_name:svcName,duration_minutes:dur,approved:true},{onConflict:'specialist_id,service_name'})
    }
    loadSvcs(userId)
  }

  async function updateDuration(svcName:string,dur:number){
    await supabaseAdmin.from('specialist_services').update({duration_minutes:dur}).eq('specialist_id',userId).eq('service_name',svcName)
    loadSvcs(userId)
  }

  async function requestNewService(){
    if(!newSvcName.trim())return
    const{data,error}=await supabaseAdmin.from('specialist_services').upsert({specialist_id:userId,service_name:newSvcName.trim(),duration_minutes:newSvcDur,approved:false},{onConflict:'specialist_id,service_name'}).select().single()
    if(!error){
      setRequestMsg('Solicitud enviada. El admin la revisará pronto.')
      sendNotify({
        title:'Solicitud de servicio nuevo',
        body:`${profile?.full_name??'Una especialista'} quiere ofrecer "${newSvcName.trim()}"`,
        tag:`svc-request-${data?.id}`,
        target:{role:'admin'},
        kind:'service_request',refId:data?.id,requiresAction:true,
      })
      setNewSvcName('');setNewSvcDur(60)
    }
    else setRequestMsg('Error: '+error.message)
    loadSvcs(userId)
  }

  const activeNames=new Set(specSvcs.map(s=>s.service_name))
  const pendingNames=new Set(pendingSvcs.map(s=>s.service_name))
  const bookingLink=(typeof window!=='undefined'?window.location.origin:'')+`/?tech=${userId}#agendar`

  return(
    <div style={{padding:'0 16px 80px'}}>
      <h2 style={{fontFamily:ffS,fontSize:28,fontWeight:500,color:C.ink,marginBottom:20}}>Mi Perfil</h2>

      {/* Photo + bio */}
      <div style={glass({padding:20,borderRadius:16,marginBottom:16})}>
        <p style={{fontFamily:ffS,fontSize:18,color:C.ink,margin:'0 0 16px'}}>Foto y presentación</p>
        <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:16}}>
          <div style={{position:'relative',flexShrink:0}}>
            <div style={{width:72,height:72,borderRadius:'50%',overflow:'hidden',background:`color-mix(in srgb, var(--gold) 15%, transparent)`,display:'flex',alignItems:'center',justifyContent:'center'}}>
              {avatarUrl?<img src={avatarUrl} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span style={{fontFamily:ffS,fontSize:28,color:C.gold}}>{(profile?.full_name||'?').charAt(0)}</span>}
            </div>
            <button onClick={()=>imgRef.current?.click()} style={{position:'absolute',bottom:0,right:0,width:24,height:24,borderRadius:'50%',background:C.gold,border:'2px solid var(--bg)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
              <Ic.Camera size={12} color="#fff"/>
            </button>
            <input ref={imgRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f)uploadAvatar(f)}}/>
          </div>
          <div style={{flex:1}}>
            <p style={{fontWeight:600,color:C.ink,fontSize:15,margin:'0 0 2px'}}>{profile?.full_name}</p>
            <p style={{fontSize:11,color:C.gray,margin:0}}>Especialista</p>
          </div>
        </div>
        <div style={{marginBottom:12}}>
          <label style={lbl}>Presentación breve (aparece en "Sobre Nosotros")</label>
          <textarea rows={3} value={bio} onChange={e=>setBio(e.target.value)} style={{...inp(),resize:'none',height:'auto'}} placeholder="Cuéntales a las clientas sobre ti…"/>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <button onClick={saveProfile} disabled={saving} style={{padding:'10px 20px',borderRadius:10,background:'#1a0f14',color:'#fff',fontWeight:700,fontSize:13,border:'none',cursor:'pointer',fontFamily:ff}}>{saving?'Guardando…':'Guardar'}</button>
          {savMsg&&<span style={{fontSize:12,color:C.green}}>{savMsg}</span>}
        </div>
      </div>


      {/* Services selection */}
      <div style={glass({padding:20,borderRadius:16,marginBottom:16})}>
        <p style={{fontFamily:ffS,fontSize:18,color:C.ink,margin:'0 0 6px'}}>Mis servicios</p>
        <p style={{fontSize:11,color:C.gray,margin:'0 0 16px'}}>Marca los servicios que ofreces y ajusta el tiempo que te toma cada uno.</p>
        {[...new Set(catalog.map(s=>s.category_title))].map(catTitle=>(
          <div key={catTitle} style={{marginBottom:16}}>
            <p style={{fontSize:10,fontWeight:700,color:C.gold,textTransform:'uppercase',letterSpacing:'0.08em',margin:'0 0 8px'}}>{catTitle}</p>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {catalog.filter(s=>s.category_title===catTitle).map(svc=>{
                const on=activeNames.has(svc.name)
                const pending=pendingNames.has(svc.name)
                const ss=specSvcs.find(s=>s.service_name===svc.name)
                return(
                  <div key={svc.name} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,background:on?`color-mix(in srgb, var(--gold) 8%, transparent)`:'transparent',border:`1px solid ${on?`color-mix(in srgb, var(--gold) 25%, transparent)`:'color-mix(in srgb, var(--gray) 15%, transparent)'}`,transition:'background .15s'}}>
                    <button onClick={()=>toggleService(svc.name,ss?.duration_minutes??60,on)} style={{width:22,height:22,borderRadius:6,border:`2px solid ${on?C.gold:'color-mix(in srgb, var(--gray) 40%, transparent)'}`,background:on?C.gold:'transparent',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0,padding:0}}>
                      {on&&<Ic.Check size={12} color="#fff"/>}
                    </button>
                    <span style={{flex:1,fontSize:12,color:on?C.ink:C.gray,fontWeight:on?500:400}}>{svc.name}</span>
                    {on&&(
                      <div style={{display:'flex',alignItems:'center',gap:4,flexShrink:0}}>
                        <Ic.Clock size={12} color={C.gold}/>
                        <select value={ss?.duration_minutes??60}
                          onChange={e=>updateDuration(svc.name,parseInt(e.target.value))}
                          style={{padding:'3px 6px',borderRadius:6,border:`1px solid color-mix(in srgb, var(--gold) 30%, transparent)`,background:'var(--input-bg)',color:C.ink,fontFamily:ff,cursor:'pointer'}}>
                          {DUR_MINS.map(d=><option key={d} value={d}>{fmtDur(d)}</option>)}
                        </select>
                      </div>
                    )}
                    {pending&&!on&&<span style={{fontSize:10,color:'#6c8ebf',flexShrink:0}}>Pendiente ✓</span>}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Request new service */}
      <div style={glass({padding:20,borderRadius:16})}>
        <p style={{fontFamily:ffS,fontSize:18,color:C.ink,margin:'0 0 6px'}}>Solicitar servicio nuevo</p>
        <p style={{fontSize:11,color:C.gray,margin:'0 0 16px'}}>¿Ofreces un servicio que no está en la lista? Solicítalo al admin.</p>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          <div><label style={lbl}>Nombre del servicio</label><input value={newSvcName} onChange={e=>setNewSvcName(e.target.value)} style={inp()} placeholder="Ej: Nail Art Personalizado"/></div>
          <div><label style={lbl}>Duración estimada</label>
            <select value={newSvcDur} onChange={e=>setNewSvcDur(parseInt(e.target.value))} style={inp()}>
              {DUR_MINS.map(d=><option key={d} value={d}>{fmtDur(d)}</option>)}
            </select>
          </div>
          {requestMsg&&<p style={{fontSize:12,color:requestMsg.startsWith('Error')?C.red:C.green,margin:0}}>{requestMsg}</p>}
          <button onClick={requestNewService} disabled={!newSvcName.trim()} style={{padding:'11px',borderRadius:10,background:`color-mix(in srgb, var(--gold) 15%, transparent)`,color:C.gold,fontWeight:700,fontSize:13,border:`1px solid color-mix(in srgb, var(--gold) 30%, transparent)`,cursor:newSvcName.trim()?'pointer':'not-allowed',fontFamily:ff}}>Enviar solicitud</button>
        </div>
      </div>
    </div>
  )
}

// ---- NOTIFICACIONES PANEL ---------------------------------------------------
type AppNotif={id:string;title:string;body:string;kind:string;target_role:string;target_specialist_name?:string|null;ref_id?:string|null;ref_date?:string|null;requires_action:boolean;resolved:boolean;created_at:string}

function timeAgo(iso:string){
  const mins=Math.floor((Date.now()-new Date(iso).getTime())/60000)
  if(mins<1)return'ahora'
  if(mins<60)return`hace ${mins} min`
  const hrs=Math.floor(mins/60)
  if(hrs<24)return`hace ${hrs}h`
  return`hace ${Math.floor(hrs/24)}d`
}

function Notificaciones({isAdmin,userFullName,onNavigateBooking,onNavigatePanel}:{isAdmin:boolean;userFullName:string;onNavigateBooking:(id:string)=>void;onNavigatePanel:(p:'disponibilidad'|'especialistas')=>void}){
  const[items,setItems]=useState<AppNotif[]>([])
  const[loading,setLoading]=useState(true)
  const[busyId,setBusyId]=useState<string|null>(null)
  const[vipBookings,setVipBookings]=useState<Record<string,Booking>>({})
  const[vipMode,setVipMode]=useState<Record<string,'approve'|'propose'|undefined>>({})
  const[vipSurcharge,setVipSurcharge]=useState('')
  const[vipNewDate,setVipNewDate]=useState('')
  const[vipNewTime,setVipNewTime]=useState('')

  async function load(){
    setLoading(true)
    const{data}=await supabaseAdmin.from('notifications').select('*').eq('resolved',false).order('created_at',{ascending:false}).limit(150)
    const list=(data??[]) as AppNotif[]
    setItems(list)
    const vipIds=list.filter(n=>n.kind==='vip_request'&&n.ref_id).map(n=>n.ref_id as string)
    if(vipIds.length){
      const{data:bks}=await supabaseAdmin.from('bookings').select('*').in('id',vipIds)
      setVipBookings(Object.fromEntries(((bks??[]) as Booking[]).map(b=>[b.id,b])))
    }
    setLoading(false)
  }
  useEffect(()=>{load()},[])

  const yesterday=(()=>{const d=new Date();d.setDate(d.getDate()-1);return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`})()

  const visible=items.filter(n=>{
    if(isAdmin){ if(n.target_role!=='admin'&&n.target_role!=='admin_and_specialist')return false }
    else{ if(n.target_role==='admin')return false; if(n.target_specialist_name&&n.target_specialist_name!==userFullName)return false }
    // Informational items age out one day after the appointment they're about.
    if(!n.requires_action&&n.ref_date&&n.ref_date<yesterday)return false
    return true
  })

  async function approveBlockHere(n:AppNotif){
    if(!n.ref_id)return
    setBusyId(n.id)
    await supabaseAdmin.from('availability_blocks').update({status:'approved'}).eq('id',n.ref_id)
    await supabaseAdmin.from('notifications').update({resolved:true}).eq('id',n.id)
    const{data:b}=await supabaseAdmin.from('availability_blocks').select('*').eq('id',n.ref_id).single()
    if(b) sendNotify({title:'Cambio de horario aprobado',body:`${fmtDateLong((b as AvailBlock).date)}${(b as AvailBlock).all_day?' - Todo el día':` - ${(b as AvailBlock).start_time} - ${(b as AvailBlock).end_time}`}`,tag:`block-approved-${n.ref_id}`,target:{role:'specialist',name:(b as AvailBlock).specialist_name},kind:'block_approved',refId:n.ref_id,refDate:(b as AvailBlock).date})
    setBusyId(null);load()
  }
  async function rejectBlockHere(n:AppNotif){
    if(!n.ref_id)return
    setBusyId(n.id)
    const{data:b}=await supabaseAdmin.from('availability_blocks').select('*').eq('id',n.ref_id).single()
    await supabaseAdmin.from('availability_blocks').delete().eq('id',n.ref_id)
    await supabaseAdmin.from('notifications').update({resolved:true}).eq('id',n.id)
    if(b) sendNotify({title:'Cambio de horario rechazado',body:`${fmtDateLong((b as AvailBlock).date)}${(b as AvailBlock).all_day?' - Todo el día':` - ${(b as AvailBlock).start_time} - ${(b as AvailBlock).end_time}`}`,tag:`block-rejected-${n.ref_id}`,target:{role:'specialist',name:(b as AvailBlock).specialist_name},kind:'block_rejected',refId:n.ref_id,refDate:(b as AvailBlock).date})
    setBusyId(null);load()
  }
  async function approveServiceHere(n:AppNotif){
    if(!n.ref_id)return
    setBusyId(n.id)
    const{data:svc}=await supabaseAdmin.from('specialist_services').select('*').eq('id',n.ref_id).single()
    await supabaseAdmin.from('specialist_services').update({approved:true}).eq('id',n.ref_id)
    await supabaseAdmin.from('notifications').update({resolved:true}).eq('id',n.id)
    if(svc){
      const{data:prof}=await supabaseAdmin.from('profiles').select('full_name').eq('id',(svc as any).specialist_id).single()
      if(prof) sendNotify({title:'Servicio aprobado',body:`"${(svc as any).service_name}" ya está aprobado y disponible en tu perfil.`,tag:`svc-approved-${n.ref_id}`,target:{role:'specialist',name:(prof as any).full_name},kind:'service_approved',refId:n.ref_id})
    }
    setBusyId(null);load()
  }
  async function rejectServiceHere(n:AppNotif){
    if(!n.ref_id)return
    setBusyId(n.id)
    const{data:svc}=await supabaseAdmin.from('specialist_services').select('*').eq('id',n.ref_id).single()
    await supabaseAdmin.from('specialist_services').delete().eq('id',n.ref_id)
    await supabaseAdmin.from('notifications').update({resolved:true}).eq('id',n.id)
    if(svc){
      const{data:prof}=await supabaseAdmin.from('profiles').select('full_name').eq('id',(svc as any).specialist_id).single()
      if(prof) sendNotify({title:'Servicio no aprobado',body:`Tu solicitud para "${(svc as any).service_name}" fue rechazada.`,tag:`svc-rejected-${n.ref_id}`,target:{role:'specialist',name:(prof as any).full_name},kind:'service_rejected',refId:n.ref_id})
    }
    setBusyId(null);load()
  }

  // Horario VIP — approving hands off into the normal pending→confirm→depósito
  // flow (status becomes 'pending', same as any other booking) with is_vip
  // kept true so it stays flagged everywhere (BookingCard, Disponibilidad).
  async function approveVipHere(n:AppNotif){
    if(!n.ref_id)return
    const b=vipBookings[n.ref_id]; if(!b)return
    setBusyId(n.id)
    const surcharge=parseFloat(vipSurcharge)||0
    await supabaseAdmin.from('bookings').update({status:'pending',is_vip:true,vip_surcharge:surcharge}).eq('id',n.ref_id)
    await supabaseAdmin.from('notifications').update({resolved:true}).eq('id',n.id)
    setBusyId(null);setVipMode(m=>({...m,[n.id]:undefined}));setVipSurcharge('');load()
    const msg=`¡Hola ${b.name}! Tu solicitud de Horario VIP fue aprobada ✨\n\nFecha: ${fmtDateLong(b.date)}\nHora: ${b.time}\n${b.specialist?`Profesional: ${b.specialist}\n`:''}Servicio(s): ${b.service}\nCargo adicional Horario VIP: $${surcharge.toFixed(2)}\n\nPara reservar tu cita necesitamos confirmar con un depósito — en breve te enviamos el enlace. ¡Gracias por tu paciencia!`
    window.open(waUrl(b.phone,msg),'_blank')
  }
  async function rejectVipHere(n:AppNotif){
    if(!n.ref_id)return
    const b=vipBookings[n.ref_id]; if(!b)return
    setBusyId(n.id)
    await supabaseAdmin.from('bookings').update({status:'cancelled'}).eq('id',n.ref_id)
    await supabaseAdmin.from('notifications').update({resolved:true}).eq('id',n.id)
    setBusyId(null);load()
    const msg=`Hola ${b.name}, gracias por tu interés en nuestro Horario VIP. Lamentablemente no tenemos disponibilidad para el ${fmtDateLong(b.date)} a las ${b.time}. ¡Esperamos poder atenderte en un horario regular!`
    window.open(waUrl(b.phone,msg),'_blank')
  }
  async function proposeVipHere(n:AppNotif){
    if(!n.ref_id||!vipNewDate||!vipNewTime)return
    const b=vipBookings[n.ref_id]; if(!b)return
    setBusyId(n.id)
    await supabaseAdmin.from('bookings').update({date:vipNewDate,time:vipNewTime}).eq('id',n.ref_id)
    setBusyId(null);setVipMode(m=>({...m,[n.id]:undefined}));setVipNewDate('');setVipNewTime('');load()
    const msg=`Hola ${b.name}, sobre tu solicitud de Horario VIP: no tenemos disponibilidad exactamente para el ${fmtDateLong(b.date)} a las ${b.time}, pero podemos ofrecerte el ${fmtDateLong(vipNewDate)} a las ${vipNewTime}. ¿Te funciona ese horario?`
    window.open(waUrl(b.phone,msg),'_blank')
  }

  async function dismiss(n:AppNotif,e:React.MouseEvent){
    e.stopPropagation()
    setItems(prev=>prev.filter(x=>x.id!==n.id))
    await supabaseAdmin.from('notifications').update({resolved:true}).eq('id',n.id)
  }

  function handleClick(n:AppNotif){
    if(n.requires_action)return
    if(n.kind==='block_request')onNavigatePanel('disponibilidad')
    else if(n.kind==='service_request')onNavigatePanel('especialistas')
    else if(n.ref_id)onNavigateBooking(n.ref_id)
  }

  const KIND_META:Record<string,{icon:string;color:string}>={
    new_booking:{icon:'📅',color:C.gold}, cancelled:{icon:'✕',color:C.red}, no_show:{icon:'!',color:C.red},
    rescheduled:{icon:'↻',color:C.gold}, block_request:{icon:'🔒',color:'#6c8ebf'}, block_approved:{icon:'✓',color:C.green},
    block_rejected:{icon:'✕',color:C.red}, service_request:{icon:'★',color:'#6c8ebf'}, service_approved:{icon:'✓',color:C.green},
    service_rejected:{icon:'✕',color:C.red}, auto_completed:{icon:'✓',color:C.green},
    vip_request:{icon:'✨',color:C.gold},
  }

  return(
    <div style={{padding:'0 16px 24px'}}>
      <h2 style={{fontFamily:ffS,fontSize:28,fontWeight:500,color:C.ink,margin:'0 0 4px'}}>Notificaciones</h2>
      <p style={{fontSize:11,color:C.gray,margin:'0 0 16px'}}>Las solicitudes desaparecen al aprobar o rechazar. Los avisos se quedan un día después de la cita.</p>
      {loading?(
        <p style={{fontSize:13,color:C.gray}}>Cargando...</p>
      ):visible.length===0?(
        <div style={glass({padding:32,textAlign:'center',borderRadius:16})}>
          <Ic.Check size={22} color={C.green} style={{margin:'0 auto 8px',display:'block'}}/>
          <p style={{fontSize:14,color:C.gray,margin:0}}>Todo al día, no hay notificaciones pendientes.</p>
        </div>
      ):(
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {visible.map(n=>{
            const meta=KIND_META[n.kind]??{icon:'•',color:C.gray}
            const busy=busyId===n.id
            return(
              <div key={n.id} style={glass({padding:'12px 14px',borderRadius:14})}>
                <div onClick={()=>handleClick(n)} style={{display:'flex',gap:10,alignItems:'flex-start',cursor:n.requires_action?'default':'pointer'}}>
                  <div style={{width:30,height:30,borderRadius:9,background:`color-mix(in srgb, ${meta.color} 14%, transparent)`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:14}}>{meta.icon}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontSize:13,fontWeight:600,color:C.ink,margin:0}}>{n.title}</p>
                    <p style={{fontSize:12,color:C.gray,margin:'2px 0 0'}}>{n.body}</p>
                    <p style={{fontSize:10,color:C.gray,margin:'3px 0 0',opacity:0.7}}>{timeAgo(n.created_at)}</p>
                  </div>
                  <button onClick={e=>dismiss(n,e)} title="Marcar como visto" style={{flexShrink:0,width:26,height:26,borderRadius:8,border:`1.5px solid color-mix(in srgb, var(--green) 30%, transparent)`,background:`color-mix(in srgb, var(--green) 10%, transparent)`,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0}}>
                    <Ic.Check size={13} color={C.green}/>
                  </button>
                </div>
                {n.requires_action&&n.kind==='block_request'&&(
                  <div style={{display:'flex',gap:8,marginTop:10}}>
                    <button disabled={busy} onClick={()=>approveBlockHere(n)} style={{flex:1,padding:'8px',borderRadius:8,background:C.green,color:'#fff',fontWeight:700,fontSize:12,border:'none',cursor:'pointer',fontFamily:ff}}>Aprobar</button>
                    <button disabled={busy} onClick={()=>rejectBlockHere(n)} style={{flex:1,padding:'8px',borderRadius:8,background:`color-mix(in srgb, var(--red) 10%, transparent)`,color:C.red,fontWeight:700,fontSize:12,border:'none',cursor:'pointer',fontFamily:ff}}>Rechazar</button>
                  </div>
                )}
                {n.requires_action&&n.kind==='service_request'&&(
                  <div style={{display:'flex',gap:8,marginTop:10}}>
                    <button disabled={busy} onClick={()=>approveServiceHere(n)} style={{flex:1,padding:'8px',borderRadius:8,background:C.green,color:'#fff',fontWeight:700,fontSize:12,border:'none',cursor:'pointer',fontFamily:ff}}>Aprobar</button>
                    <button disabled={busy} onClick={()=>rejectServiceHere(n)} style={{flex:1,padding:'8px',borderRadius:8,background:`color-mix(in srgb, var(--red) 10%, transparent)`,color:C.red,fontWeight:700,fontSize:12,border:'none',cursor:'pointer',fontFamily:ff}}>Rechazar</button>
                  </div>
                )}
                {n.requires_action&&n.kind==='vip_request'&&vipBookings[n.ref_id||'']&&(()=>{
                  const b=vipBookings[n.ref_id as string]
                  const mode=vipMode[n.id]
                  return(
                    <div style={{marginTop:10}}>
                      <div style={{padding:'10px 12px',borderRadius:10,background:`color-mix(in srgb, var(--gold) 8%, transparent)`,marginBottom:10}}>
                        <p style={{fontSize:12,color:C.ink,margin:0}}><strong>{b.name}</strong> · {b.phone}</p>
                        <p style={{fontSize:12,color:C.ink,margin:'2px 0 0'}}>{fmtDateLong(b.date)} · {b.time}</p>
                        <p style={{fontSize:12,color:C.gray,margin:'2px 0 0'}}>{b.service}{b.specialist?` · Prefiere: ${b.specialist}`:''}</p>
                        {b.notes&&<p style={{fontSize:11,color:C.gray,margin:'4px 0 0',fontStyle:'italic'}}>"{b.notes}"</p>}
                      </div>
                      {mode==='approve'?(
                        <div style={{display:'flex',gap:8,alignItems:'center'}}>
                          <input type="number" min="0" step="1" placeholder="Cargo VIP $" value={vipSurcharge} onChange={e=>setVipSurcharge(e.target.value)} style={{...inp({fontSize:12}),flex:1}}/>
                          <button disabled={busy} onClick={()=>approveVipHere(n)} style={{padding:'8px 14px',borderRadius:8,background:C.green,color:'#fff',fontWeight:700,fontSize:12,border:'none',cursor:'pointer',fontFamily:ff,flexShrink:0}}>Confirmar</button>
                          <button onClick={()=>setVipMode(m=>({...m,[n.id]:undefined}))} style={{padding:'8px 10px',borderRadius:8,background:'none',color:C.gray,fontWeight:600,fontSize:12,border:'none',cursor:'pointer',fontFamily:ff,flexShrink:0}}>×</button>
                        </div>
                      ):mode==='propose'?(
                        <div style={{display:'flex',flexDirection:'column',gap:8}}>
                          <div style={{display:'flex',gap:8}}>
                            <input type="date" value={vipNewDate} onChange={e=>setVipNewDate(e.target.value)} style={{...inp({fontSize:12}),flex:1}}/>
                            <input type="time" value={vipNewTime} onChange={e=>setVipNewTime(e.target.value)} style={{...inp({fontSize:12}),flex:1}}/>
                          </div>
                          <div style={{display:'flex',gap:8}}>
                            <button disabled={busy||!vipNewDate||!vipNewTime} onClick={()=>proposeVipHere(n)} style={{flex:1,padding:'8px',borderRadius:8,background:C.gold,color:'#fff',fontWeight:700,fontSize:12,border:'none',cursor:'pointer',fontFamily:ff}}>Enviar propuesta</button>
                            <button onClick={()=>setVipMode(m=>({...m,[n.id]:undefined}))} style={{padding:'8px 10px',borderRadius:8,background:'none',color:C.gray,fontWeight:600,fontSize:12,border:'none',cursor:'pointer',fontFamily:ff}}>Cancelar</button>
                          </div>
                        </div>
                      ):(
                        <div style={{display:'flex',gap:8}}>
                          <button disabled={busy} onClick={()=>setVipMode(m=>({...m,[n.id]:'approve'}))} style={{flex:1,padding:'8px',borderRadius:8,background:C.green,color:'#fff',fontWeight:700,fontSize:12,border:'none',cursor:'pointer',fontFamily:ff}}>Aprobar</button>
                          <button disabled={busy} onClick={()=>setVipMode(m=>({...m,[n.id]:'propose'}))} style={{flex:1,padding:'8px',borderRadius:8,background:`color-mix(in srgb, var(--gold) 12%, transparent)`,color:C.gold,fontWeight:700,fontSize:12,border:'none',cursor:'pointer',fontFamily:ff}}>Proponer otro</button>
                          <button disabled={busy} onClick={()=>rejectVipHere(n)} style={{flex:1,padding:'8px',borderRadius:8,background:`color-mix(in srgb, var(--red) 10%, transparent)`,color:C.red,fontWeight:700,fontSize:12,border:'none',cursor:'pointer',fontFamily:ff}}>Rechazar</button>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---- AGENDA-ONLY PAGE (restricted role: calendar + arrivals/no-show) ------
// Deliberately its own tiny page instead of reusing the admin nav tree —
// `isAdmin` already gates ~60 spots in this file; adding a third permission
// level there would touch most of it for one narrow use case.
function AgendaOnlyPage({userFullName,onLogout,dark,toggleDark}:{userFullName:string;onLogout:()=>void;dark:boolean;toggleDark:()=>void}){
  const now=new Date()
  const[yr,setYr]=useState(now.getFullYear())
  const[mo,setMo]=useState(now.getMonth())
  const[bookings,setBookings]=useState<Booking[]>([])
  const[services,setServices]=useState<Service[]>([])
  const[loading,setLoading]=useState(true)
  const[selDate,setSelDate]=useState<string|null>(null)
  const[showCreate,setShowCreate]=useState(false)
  const[cancelBooking,setCancelBooking]=useState<Booking|null>(null)
  const todayS=now.toISOString().slice(0,10)

  useEffect(()=>{load()},[])
  async function load(){
    setLoading(true)
    const[bRes,sRes]=await Promise.all([
      supabase.from('bookings').select('*').order('date',{ascending:true}).order('time',{ascending:true}),
      supabase.from('services').select('*'),
    ])
    setBookings((bRes.data??[]) as Booking[])
    setServices((sRes.data??[]) as Service[])
    setLoading(false)
  }

  async function markArrived(b:Booking){
    await supabaseAdmin.from('bookings').update({status:'completed'}).eq('id',b.id)
    setBookings(list=>list.map(x=>x.id===b.id?{...x,status:'completed'}:x))
  }

  function dayStr(y:number,m:number,d:number){return`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`}
  const firstDay=new Date(yr,mo,1).getDay()
  const daysInMonth=new Date(yr,mo+1,0).getDate()
  const selDateBookings=selDate?bookings.filter(b=>b.date===selDate&&b.status!=='cancelled'&&b.status!=='no_show'):[]

  return(
    <>
      <style>{THEME}</style>
      <div data-dark={String(dark)} style={{minHeight:'100vh',background:'var(--bg)'}}>
        {showCreate&&<CreateModal services={services} onClose={()=>setShowCreate(false)} onCreated={()=>{setShowCreate(false);load()}}/>}
        {cancelBooking&&<CancelModal booking={cancelBooking} onClose={()=>setCancelBooking(null)} onDone={load}/>}
        {selDate&&(
          <Sheet onClose={()=>setSelDate(null)}>
            <SheetHandle title={fmtDate(selDate)} onClose={()=>setSelDate(null)}/>
            {selDateBookings.length===0?(
              <p style={{textAlign:'center',color:C.gray,fontSize:13,padding:'20px 0'}}>Sin citas este día.</p>
            ):(
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {selDateBookings.map(b=>(
                  <div key={b.id} style={{padding:'12px 14px',borderRadius:12,background:`color-mix(in srgb, var(--gold) 8%, transparent)`,border:`1px solid color-mix(in srgb, var(--gold) 20%, transparent)`}}>
                    <p style={{fontSize:13,fontWeight:600,color:C.ink,margin:0}}>{b.time} · {b.name}</p>
                    <p style={{fontSize:11,color:C.gray,margin:'2px 0 8px'}}>{b.service}{b.specialist?` · ${b.specialist}`:''} · {b.status}</p>
                    {b.status==='confirmed'&&(
                      <div style={{display:'flex',gap:8}}>
                        <button onClick={()=>markArrived(b)} style={{flex:1,padding:'8px',borderRadius:8,background:C.green,color:'#fff',fontWeight:700,fontSize:12,border:'none',cursor:'pointer',fontFamily:ff}}>Llegó</button>
                        <button onClick={()=>setCancelBooking(b)} style={{flex:1,padding:'8px',borderRadius:8,background:`color-mix(in srgb, var(--red) 10%, transparent)`,color:C.red,fontWeight:700,fontSize:12,border:'none',cursor:'pointer',fontFamily:ff}}>No Show</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Sheet>
        )}

        <header style={{position:'sticky',top:0,zIndex:100,background:'var(--header-bg)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',borderBottom:`1px solid color-mix(in srgb, var(--rosa) 22%, transparent)`,padding:`calc(env(safe-area-inset-top,0px) + 12px) 20px 12px`}}>
          <div style={{maxWidth:680,margin:'0 auto',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div style={{display:'flex',flexDirection:'column',lineHeight:1}}>
              <span style={{fontFamily:ffS,fontSize:20,fontWeight:500,color:C.ink}}>{business.shortName} <span style={{color:C.rosa,fontStyle:'italic'}}>{business.tagline}</span></span>
              <span style={{fontSize:10,color:C.gray,fontWeight:600,marginTop:2}}>{userFullName} · Agenda</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <button onClick={toggleDark} style={{background:'none',border:'none',cursor:'pointer',padding:7,display:'flex',borderRadius:8}}>
                {dark?<Ic.Sun size={18} color={C.gold}/>:<Ic.Moon size={18} color={C.gray}/>}
              </button>
              <button onClick={onLogout} style={{display:'flex',alignItems:'center',gap:5,fontSize:11,fontWeight:700,color:C.gray,background:'none',border:`1.5px solid color-mix(in srgb, var(--gray) 35%, transparent)`,borderRadius:99,padding:'5px 10px',cursor:'pointer',fontFamily:ff}}>
                <Ic.Logout size={13} color={C.gray}/> Salir
              </button>
            </div>
          </div>
        </header>

        <div style={{maxWidth:680,margin:'0 auto',padding:'20px 16px 80px'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
            <h2 style={{fontFamily:ffS,fontSize:24,fontWeight:500,color:C.ink,margin:0}}>Agenda</h2>
            <button onClick={()=>setShowCreate(true)} style={{display:'flex',alignItems:'center',gap:6,padding:'10px 16px',borderRadius:12,background:'#1a0f14',color:'#fff',fontWeight:700,fontSize:13,border:'none',cursor:'pointer',fontFamily:ff}}>
              <Ic.Plus size={15} color="#fff"/> Nueva cita
            </button>
          </div>

          {loading?<p style={{textAlign:'center',color:C.gray,fontSize:13}}>Cargando...</p>:(
            <>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                <button onClick={()=>{if(mo===0){setMo(11);setYr(y=>y-1)}else setMo(m=>m-1)}} style={{background:'none',border:'none',cursor:'pointer',padding:8}}><Ic.CL size={18} color={C.ink}/></button>
                <span style={{fontFamily:ffS,fontSize:18,color:C.ink,fontWeight:500}}>{MONTHS[mo]} {yr}</span>
                <button onClick={()=>{if(mo===11){setMo(0);setYr(y=>y+1)}else setMo(m=>m+1)}} style={{background:'none',border:'none',cursor:'pointer',padding:8}}><Ic.CR size={18} color={C.ink}/></button>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:4,marginBottom:6}}>
                {['D','L','M','M','J','V','S'].map((d,i)=><div key={i} style={{textAlign:'center',fontSize:10,fontWeight:700,color:C.gray}}>{d}</div>)}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:4}}>
                {Array.from({length:firstDay}).map((_,i)=><div key={'e'+i}/>)}
                {Array.from({length:daysInMonth}).map((_,i)=>{
                  const d=i+1
                  const ds=dayStr(yr,mo,d)
                  const dayBookings=bookings.filter(b=>b.date===ds&&b.status!=='cancelled'&&b.status!=='no_show')
                  const isPast=ds<todayS
                  const hasBookings=dayBookings.length>0
                  const bg=isPast?`color-mix(in srgb, var(--ink) 3%, transparent)`:hasBookings?`color-mix(in srgb, var(--gold) 12%, transparent)`:`color-mix(in srgb, var(--green) 8%, transparent)`
                  const fg=isPast?C.gray:hasBookings?C.gold:C.green
                  return(
                    <button key={d} onClick={()=>setSelDate(ds)} style={{aspectRatio:'1',borderRadius:10,border:'none',background:bg,cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',fontFamily:ff,gap:2}}>
                      <span style={{fontSize:13,fontWeight:600,color:C.ink}}>{d}</span>
                      {hasBookings&&<span style={{fontSize:9,fontWeight:700,color:fg}}>{dayBookings.length}</span>}
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

// ---- DISPONIBILIDAD PANEL --------------------------------------------------
function Disponibilidad({isAdmin,userFullName,bookings}:{isAdmin:boolean;userFullName:string;bookings:Booking[]}){
  const now=new Date()
  const[yr,setYr]=useState(now.getFullYear())
  const[mo,setMo]=useState(now.getMonth())
  const[blocks,setBlocks]=useState<AvailBlock[]>([])
  const[loading,setLoading]=useState(true)
  const[selDate,setSelDate]=useState<string|null>(null)
  const[specFilter,setSpecFilter]=useState('')
  const[showBlockForm,setShowBlockForm]=useState(false)
  const[blockForm,setBlockForm]=useState({specialist_name:userFullName,date:'',all_day:true,start_time:'9:00 AM',end_time:'6:00 PM',reason:''})
  const[saving,setSaving]=useState(false)
  const specNames=useSpecialistNames()
  const effectiveName=isAdmin?specFilter:userFullName
  const todayS=todayStr()

  useEffect(()=>{loadBlocks()},[effectiveName])

  async function loadBlocks(){
    setLoading(true)
    let q=supabase.from('availability_blocks').select('*')
    if(effectiveName) q=q.eq('specialist_name',effectiveName)
    const{data}=await q
    setBlocks((data??[]) as AvailBlock[])
    setLoading(false)
  }

  async function addBlock(e:React.FormEvent){
    e.preventDefault();setSaving(true)
    const spec=isAdmin?(blockForm.specialist_name||effectiveName||userFullName):userFullName
    // Admin blocks apply immediately; a specialist's own block is just a
    // request until the admin approves it from the pending queue below.
    const status=isAdmin?'approved':'pending'
    const{data,error}=await supabaseAdmin.from('availability_blocks').insert([{specialist_name:spec,date:blockForm.date,all_day:blockForm.all_day,start_time:blockForm.all_day?null:blockForm.start_time,end_time:blockForm.all_day?null:blockForm.end_time,reason:blockForm.reason||null,status}]).select().single()
    // A specialist's own request must reach the admin immediately — without
    // this, the pending queue only surfaces once the admin happens to open
    // Disponibilidad, which is exactly what went wrong today.
    if(!error&&status==='pending') sendNotify({
      title:'Solicitud de cambio de horario',
      body:`${spec} - ${fmtDateLong(blockForm.date)}${blockForm.all_day?' - Todo el día':` - ${blockForm.start_time} - ${blockForm.end_time}`}`,
      tag:`block-request-${data?.id}`,
      target:{role:'admin'},
      kind:'block_request',refId:data?.id,refDate:blockForm.date,requiresAction:true,
    })
    setSaving(false);setShowBlockForm(false)
    setBlockForm({specialist_name:userFullName,date:'',all_day:true,start_time:'9:00 AM',end_time:'6:00 PM',reason:''})
    loadBlocks()
  }

  async function deleteBlock(b:AvailBlock){
    await supabaseAdmin.from('availability_blocks').delete().eq('id',b.id);loadBlocks()
  }

  async function approveBlock(b:AvailBlock){
    await supabaseAdmin.from('availability_blocks').update({status:'approved'}).eq('id',b.id)
    await supabaseAdmin.from('notifications').update({resolved:true}).eq('ref_id',b.id).eq('kind','block_request')
    sendNotify({
      title:'Cambio de horario aprobado',
      body:`${fmtDateLong(b.date)}${b.all_day?' - Todo el día':` - ${b.start_time} - ${b.end_time}`}`,
      tag:`block-approved-${b.id}`,
      target:{role:'specialist',name:b.specialist_name},
      kind:'block_approved',refId:b.id,refDate:b.date,
    })
    loadBlocks()
  }

  async function rejectBlock(b:AvailBlock){
    const wasPending=b.status==='pending'
    await supabaseAdmin.from('availability_blocks').delete().eq('id',b.id)
    if(wasPending){
      await supabaseAdmin.from('notifications').update({resolved:true}).eq('ref_id',b.id).eq('kind','block_request')
      sendNotify({
        title:'Cambio de horario rechazado',
        body:`${fmtDateLong(b.date)}${b.all_day?' - Todo el día':` - ${b.start_time} - ${b.end_time}`}`,
        tag:`block-rejected-${b.id}`,
        target:{role:'specialist',name:b.specialist_name},
        kind:'block_rejected',refId:b.id,refDate:b.date,
      })
    }
    loadBlocks()
  }

  function dayStr(y:number,m:number,d:number){return`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`}

  const myBookings=effectiveName?bookings.filter(b=>b.specialist===effectiveName):bookings

  // Legacy blocks (created before the status column existed) have no status
  // set — treat those as already-approved so nothing that used to work breaks.
  const isApproved=(b:AvailBlock)=>b.status!=='pending'&&b.status!=='rejected'
  const pendingBlocks=blocks.filter(b=>b.status==='pending')

  function getDayStatus(d:number):{status:'blocked'|'partial'|'pending'|'busy'|'free'|'past'}{
    const ds=dayStr(yr,mo,d)
    const dayBlocks=blocks.filter(b=>b.date===ds)
    const hasFullBlock=dayBlocks.some(b=>b.all_day&&isApproved(b))
    const hasPartialBlock=dayBlocks.some(b=>!b.all_day&&isApproved(b))
    const hasPending=dayBlocks.some(b=>b.status==='pending')
    const hasBookings=myBookings.some(b=>b.date===ds&&b.status!=='cancelled'&&b.status!=='no_show')
    // Approved changes stay visible on past days too, so an admin scrolling
    // back a month can still spot "algo pasó aquí" instead of a blank past
    // cell — pending/free/busy states don't matter once the date is history.
    if(ds<todayS){
      if(hasFullBlock) return{status:'blocked'}
      if(hasPartialBlock) return{status:'partial'}
      return{status:'past'}
    }
    if(hasFullBlock) return{status:'blocked'}
    if(hasPartialBlock) return{status:'partial'}
    if(hasPending) return{status:'pending'}
    if(hasBookings) return{status:'busy'}
    return{status:'free'}
  }

  const STATUS_COLOR={blocked:C.red,partial:`color-mix(in srgb, var(--red) 55%, var(--gold) 45%)`,pending:'#6c8ebf',busy:C.gold,free:C.green,past:'transparent'}
  const STATUS_BG={
    blocked:`color-mix(in srgb, var(--red) 14%, transparent)`,
    partial:`color-mix(in srgb, var(--red) 7%, transparent)`,
    pending:`color-mix(in srgb, #6c8ebf 14%, transparent)`,
    busy:`color-mix(in srgb, var(--gold) 12%, transparent)`,
    free:`color-mix(in srgb, var(--green) 8%, transparent)`,
    past:`color-mix(in srgb, var(--ink) 3%, transparent)`,
  }

  const firstDay=new Date(yr,mo,1).getDay()
  const daysInMonth=new Date(yr,mo+1,0).getDate()

  const selDateBookings=selDate?myBookings.filter(b=>b.date===selDate&&b.status!=='cancelled'&&b.status!=='no_show'):[]
  const selDateBlocks=selDate?blocks.filter(b=>b.date===selDate):[]

  return(
    <div style={{padding:'0 16px 24px'}}>
      {/* Day detail sheet */}
      {selDate&&(
        <Sheet onClose={()=>setSelDate(null)}>
          <SheetHandle title={fmtDate(selDate)} onClose={()=>setSelDate(null)}/>
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            {selDateBlocks.length>0&&(
              <div>
                <p style={{fontSize:11,fontWeight:700,color:C.red,textTransform:'uppercase' as const,letterSpacing:'0.08em',margin:'0 0 8px'}}>Cambios de horario</p>
                {selDateBlocks.map(b=>(
                  <div key={b.id} style={{display:'flex',alignItems:'center',gap:8,padding:'10px 12px',borderRadius:10,background:b.status==='pending'?`color-mix(in srgb, #6c8ebf 10%, transparent)`:`color-mix(in srgb, var(--red) 8%, transparent)`,border:`1px solid ${b.status==='pending'?'color-mix(in srgb, #6c8ebf 25%, transparent)':'color-mix(in srgb, var(--red) 18%, transparent)'}`,marginBottom:6}}>
                    <div style={{flex:1}}>
                      <div style={{display:'flex',alignItems:'center',gap:6}}>
                        <p style={{fontSize:12,fontWeight:600,color:C.ink,margin:0}}>{b.all_day?'Todo el día':`${b.start_time} – ${b.end_time}`}</p>
                        {b.status==='pending'&&<span style={{fontSize:9,fontWeight:700,color:'#6c8ebf',padding:'2px 6px',borderRadius:99,background:'color-mix(in srgb, #6c8ebf 16%, transparent)',textTransform:'uppercase' as const}}>Pendiente</span>}
                      </div>
                      {isAdmin&&<p style={{fontSize:11,color:C.gray,margin:'2px 0 0'}}>{b.specialist_name}</p>}
                      {b.reason&&<p style={{fontSize:11,color:C.gray,margin:'2px 0 0'}}>{b.reason}</p>}
                    </div>
                    {isAdmin&&b.status==='pending'&&(
                      <button onClick={()=>approveBlock(b)} style={{background:'none',border:'none',cursor:'pointer',padding:6,flexShrink:0}} title="Aprobar"><Ic.Check size={16} color={C.green}/></button>
                    )}
                    <button onClick={()=>deleteBlock(b)} style={{background:'none',border:'none',cursor:'pointer',padding:6,flexShrink:0}} title={b.status==='pending'?'Rechazar':'Eliminar'}><Ic.Trash size={14} color={C.red}/></button>
                  </div>
                ))}
              </div>
            )}
            {selDateBookings.length>0&&(
              <div>
                <p style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:'uppercase' as const,letterSpacing:'0.08em',margin:'0 0 8px'}}>Citas ({selDateBookings.length})</p>
                {selDateBookings.map(b=>(
                  <div key={b.id} style={{padding:'10px 12px',borderRadius:10,background:`color-mix(in srgb, var(--gold) 8%, transparent)`,border:`1px solid color-mix(in srgb, var(--gold) 20%, transparent)`,marginBottom:6}}>
                    <p style={{fontSize:13,fontWeight:600,color:C.ink,margin:0}}>{b.time} · {b.name}</p>
                    <p style={{fontSize:11,color:C.gray,margin:'2px 0 0'}}>{b.service}{isAdmin&&b.specialist?` · ${b.specialist}`:''}</p>
                  </div>
                ))}
              </div>
            )}
            {selDateBlocks.length===0&&selDateBookings.length===0&&(
              <div style={{textAlign:'center',padding:'24px 0'}}>
                <Ic.Check size={22} color={C.green} style={{margin:'0 auto 8px',display:'block'}}/>
                <p style={{fontSize:13,color:C.gray,margin:0}}>Sin citas ni cambios de horario este día.</p>
              </div>
            )}
            <button onClick={()=>{setBlockForm(f=>({...f,date:selDate!,specialist_name:effectiveName||userFullName}));setSelDate(null);setShowBlockForm(true)}}
              style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'11px',borderRadius:12,background:`color-mix(in srgb, var(--red) 10%, transparent)`,color:C.red,fontWeight:700,fontSize:13,border:`1.5px solid color-mix(in srgb, var(--red) 25%, transparent)`,cursor:'pointer',fontFamily:ff}}>
              <Ic.Block size={14} color={C.red}/> Cambiar horario este día
            </button>
          </div>
        </Sheet>
      )}

      {/* Block form sheet */}
      {showBlockForm&&(
        <Sheet onClose={()=>setShowBlockForm(false)}>
          <SheetHandle title={isAdmin?'Cambiar Horario':'Solicitar Cambio de Horario'} onClose={()=>setShowBlockForm(false)}/>
          {!isAdmin&&<p style={{fontSize:11,color:C.gray,margin:'-6px 0 12px'}}>Esto queda como solicitud hasta que el admin la apruebe.</p>}
          <form onSubmit={addBlock} style={{display:'flex',flexDirection:'column',gap:12}}>
            {isAdmin&&(
              <div><label style={lbl}>Especialista</label>
                <SpecialistSelect value={blockForm.specialist_name} onChange={v=>setBlockForm(f=>({...f,specialist_name:v}))}/>
              </div>
            )}
            <div><label style={lbl}>Fecha</label>
              <input required type="date" style={inp()} value={blockForm.date} min={todayS} onChange={e=>setBlockForm(f=>({...f,date:e.target.value}))}/>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',borderRadius:10,background:`color-mix(in srgb, var(--gold) 8%, transparent)`}}>
              <label style={{fontSize:13,fontWeight:600,color:C.ink,flex:1}}>Todo el día</label>
              <button type="button" onClick={()=>setBlockForm(f=>({...f,all_day:!f.all_day}))} style={{width:44,height:24,borderRadius:99,border:'none',cursor:'pointer',background:blockForm.all_day?C.gold:'color-mix(in srgb, var(--ink) 20%, transparent)',position:'relative',transition:'background 0.2s',flexShrink:0}}>
                <div style={{width:18,height:18,borderRadius:'50%',background:'#fff',position:'absolute',top:3,left:blockForm.all_day?23:3,transition:'left 0.2s'}}/>
              </button>
            </div>
            {!blockForm.all_day&&(
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <div><label style={lbl}>Desde</label><select style={inp()} value={blockForm.start_time} onChange={e=>setBlockForm(f=>({...f,start_time:e.target.value}))}>{TIMES.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
                <div><label style={lbl}>Hasta</label><select style={inp()} value={blockForm.end_time} onChange={e=>setBlockForm(f=>({...f,end_time:e.target.value}))}>{TIMES.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
              </div>
            )}
            <div><label style={lbl}>Razón (opcional)</label><input style={inp()} placeholder="Vacaciones, cita médica..." value={blockForm.reason} onChange={e=>setBlockForm(f=>({...f,reason:e.target.value}))}/></div>
            <button type="submit" disabled={saving} style={{padding:'13px',borderRadius:12,background:C.red,color:'#fff',fontWeight:700,fontSize:14,border:'none',cursor:saving?'not-allowed':'pointer',opacity:saving?0.6:1,fontFamily:ff}}>
              {saving?'Guardando...':isAdmin?'Cambiar horario':'Enviar Solicitud'}
            </button>
          </form>
        </Sheet>
      )}

      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
        <div>
          <h2 style={{fontFamily:ffS,fontSize:28,fontWeight:500,color:C.ink,margin:0}}>Disponibilidad</h2>
          <p style={{fontSize:11,color:C.gray,margin:'3px 0 0'}}>{isAdmin?'Toca un día para ver citas y cambios de horario':'Tu calendario de disponibilidad'}</p>
        </div>
        <button onClick={()=>{setBlockForm(f=>({...f,date:''}));setShowBlockForm(true)}} style={{display:'flex',alignItems:'center',gap:6,padding:'10px 14px',borderRadius:12,background:`color-mix(in srgb, var(--red) 12%, transparent)`,color:C.red,fontWeight:700,fontSize:12,border:`1.5px solid color-mix(in srgb, var(--red) 25%, transparent)`,cursor:'pointer',fontFamily:ff,flexShrink:0}}>
          <Ic.Block size={14} color={C.red}/> {isAdmin?'Cambiar horario':'Solicitar cambio'}
        </button>
      </div>

      {/* Pending block requests — admin approval queue */}
      {isAdmin&&pendingBlocks.length>0&&(
        <div style={{marginBottom:14}}>
          <p style={{fontSize:11,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.08em',color:'#6c8ebf',margin:'0 0 8px'}}>Solicitudes de cambio de horario ({pendingBlocks.length})</p>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {pendingBlocks.map(b=>(
              <div key={b.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,background:'color-mix(in srgb, #6c8ebf 10%, transparent)',border:'1px solid color-mix(in srgb, #6c8ebf 25%, transparent)'}}>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontSize:12,fontWeight:600,color:C.ink,margin:0}}>{b.specialist_name} · {fmtDate(b.date)}</p>
                  <p style={{fontSize:11,color:C.gray,margin:'2px 0 0'}}>{b.all_day?'Todo el día':`${b.start_time} – ${b.end_time}`}{b.reason?` · ${b.reason}`:''}</p>
                </div>
                <button onClick={()=>approveBlock(b)} style={{padding:'6px 12px',borderRadius:8,background:C.green,color:'#fff',fontWeight:700,fontSize:11,border:'none',cursor:'pointer',fontFamily:ff,flexShrink:0}}>Aprobar</button>
                <button onClick={()=>rejectBlock(b)} style={{padding:'6px 12px',borderRadius:8,background:'color-mix(in srgb, var(--red) 10%, transparent)',color:C.red,fontWeight:700,fontSize:11,border:'none',cursor:'pointer',fontFamily:ff,flexShrink:0}}>Rechazar</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Specialist filter for admin */}
      {isAdmin&&(
        <div style={{marginBottom:12}}>
          <select style={inp()} value={specFilter} onChange={e=>setSpecFilter(e.target.value)}>
            <option value="">Todas las especialistas</option>
            {specNames.map(n=><option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      )}

      {/* Month nav */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
        <button onClick={()=>{if(mo===0){setMo(11);setYr(y=>y-1)}else setMo(m=>m-1)}} style={{background:'none',border:'none',cursor:'pointer',padding:8}}><Ic.CL size={18} color={C.ink}/></button>
        <span style={{fontFamily:ffS,fontSize:18,color:C.ink,fontWeight:500}}>{MONTHS[mo]} {yr}</span>
        <button onClick={()=>{if(mo===11){setMo(0);setYr(y=>y+1)}else setMo(m=>m+1)}} style={{background:'none',border:'none',cursor:'pointer',padding:8}}><Ic.CR size={18} color={C.ink}/></button>
      </div>

      {/* Day-of-week headers */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3,marginBottom:3}}>
        {['D','L','M','M','J','V','S'].map((d,i)=>(
          <div key={i} style={{textAlign:'center',fontSize:10,fontWeight:700,color:C.gray,padding:'4px 0'}}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      {loading?<p style={{textAlign:'center',color:C.gray,fontSize:13,padding:'20px 0'}}>Cargando...</p>:(
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3}}>
          {Array.from({length:firstDay},(_,i)=><div key={`e${i}`}/>)}
          {Array.from({length:daysInMonth},(_,i)=>{
            const d=i+1
            const ds=dayStr(yr,mo,d)
            const{status}=getDayStatus(d)
            const isToday=ds===todayS
            const isPast=status==='past'
            return(
              <button key={d} onClick={()=>!isPast&&setSelDate(ds)}
                style={{aspectRatio:'1',borderRadius:10,border:`2px solid ${isToday?C.gold:'transparent'}`,background:STATUS_BG[status],cursor:isPast?'default':'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:2,fontFamily:ff,outline:'none'}}>
                <span style={{fontSize:13,fontWeight:isToday?700:400,color:isPast?C.gray:C.ink,lineHeight:1}}>{d}</span>
                {!isPast&&status!=='free'&&(
                  <div style={{width:5,height:5,borderRadius:'50%',background:STATUS_COLOR[status]}}/>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Legend */}
      <div style={{display:'flex',gap:14,marginTop:14,flexWrap:'wrap' as const}}>
        {[{color:C.green,label:'Disponible'},{color:C.gold,label:'Con citas'},{color:C.red,label:'Día bloqueado'},{color:`color-mix(in srgb, var(--red) 55%, var(--gold) 45%)`,label:'Cambio parcial'},{color:'#6c8ebf',label:'Solicitud pendiente'}].map(({color,label})=>(
          <div key={label} style={{display:'flex',alignItems:'center',gap:5}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:color}}/>
            <span style={{fontSize:10,color:C.gray}}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---- PRODUCTOS PANEL -------------------------------------------------------
function Productos(){
  const[products,setProducts]=useState<Product[]>([])
  const[loading,setLoading]=useState(true)
  const[showCreate,setShowCreate]=useState(false)
  const[editProd,setEditProd]=useState<Product|null>(null)
  const[form,setForm]=useState({name:'',price:'',cost:'',description:'',stock:'0',photo_url:'',category:''})
  const[newCatName,setNewCatName]=useState('')
  const[saving,setSaving]=useState(false)
  const[uploading,setUploading]=useState(false)
  const[confirmDel,setConfirmDel]=useState<Product|null>(null)
  const[openCat,setOpenCat]=useState<string|null>(null)
  const imgRef=useRef<HTMLInputElement>(null)
  const categories=[...new Set(products.map(p=>p.category).filter((c):c is string=>!!c))]

  useEffect(()=>{loadProducts()},[])

  async function loadProducts(){
    setLoading(true)
    const{data}=await supabase.from('products').select('*').order('name')
    setProducts((data??[]) as Product[])
    setLoading(false)
  }

  async function uploadPhoto(file:File,prodId?:string){
    setUploading(true)
    const ext=file.name.split('.').pop()??'jpg'
    const path=`products/${prodId||`draft-${Date.now()}`}.${ext}`
    const{data}=await supabaseAdmin.storage.from('products').upload(path,file,{upsert:true})
    if(data){
      const{data:u}=supabaseAdmin.storage.from('products').getPublicUrl(path)
      setForm(f=>({...f,photo_url:u.publicUrl}))
    }
    setUploading(false)
  }

  async function saveProduct(e:React.FormEvent){
    e.preventDefault();setSaving(true)
    // Resolved only at submit time, same as Servicios' category fix — the
    // "__nueva__" sentinel and the real value live in separate state so
    // typing the new name never collides with what controls the input's
    // own visibility.
    const category=form.category==='__nueva__'?newCatName.trim()||null:form.category||null
    const row={name:form.name,price:parseFloat(form.price)||0,cost:parseFloat(form.cost)||0,description:form.description||null,stock:parseInt(form.stock)||0,active:true,photo_url:form.photo_url||null,category}
    if(editProd){
      await supabaseAdmin.from('products').update(row).eq('id',editProd.id)
    }else{
      await supabaseAdmin.from('products').insert([row])
    }
    setSaving(false);closeForm();loadProducts()
  }

  async function toggleProduct(p:Product){await supabaseAdmin.from('products').update({active:!p.active}).eq('id',p.id);loadProducts()}
  async function deleteProduct(p:Product){await supabaseAdmin.from('products').delete().eq('id',p.id);setConfirmDel(null);loadProducts()}
  function openEdit(p:Product){setEditProd(p);setForm({name:p.name,price:String(p.price),cost:String(p.cost),description:p.description||'',stock:String(p.stock),photo_url:p.photo_url||'',category:p.category||''});setNewCatName('');setShowCreate(true)}
  function closeForm(){setShowCreate(false);setEditProd(null);setForm({name:'',price:'',cost:'',description:'',stock:'0',photo_url:'',category:''});setNewCatName('')}

  return(
    <div style={{padding:'0 16px 24px'}}>
      {confirmDel&&<DeleteConfirm msg={`¿Eliminar "${confirmDel.name}"?`} onClose={()=>setConfirmDel(null)} onConfirm={()=>deleteProduct(confirmDel)}/>}
      {showCreate&&(
        <Sheet onClose={closeForm}>
          <SheetHandle title={editProd?'Editar Producto':'Nuevo Producto'} onClose={closeForm}/>
          <form onSubmit={saveProduct} style={{display:'flex',flexDirection:'column',gap:12}}>
            {/* Photo upload */}
            <div>
              <label style={lbl}>Foto del producto</label>
              <div style={{display:'flex',gap:12,alignItems:'center'}}>
                <button type="button" onClick={()=>imgRef.current?.click()}
                  style={{width:72,height:72,borderRadius:12,border:`2px dashed color-mix(in srgb, var(--gold) 40%, transparent)`,background:`color-mix(in srgb, var(--gold) 6%, transparent)`,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',flexShrink:0,padding:0}}>
                  {form.photo_url?<img src={form.photo_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:uploading?<span style={{fontSize:10,color:C.gray}}>...</span>:<Ic.Camera size={22} color={C.gold}/>}
                </button>
                <div style={{flex:1}}>
                  <p style={{fontSize:11,color:C.gray,margin:0}}>Toca para subir foto. Aparecerá en la tienda en línea.</p>
                  {form.photo_url&&<button type="button" onClick={()=>setForm(f=>({...f,photo_url:''}))} style={{fontSize:10,color:C.red,background:'none',border:'none',cursor:'pointer',padding:'4px 0',fontFamily:ff}}>Quitar foto</button>}
                </div>
              </div>
              <input ref={imgRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f)uploadPhoto(f,editProd?.id)}}/>
            </div>
            <div><label style={lbl}>Nombre</label><input required style={inp()} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div><label style={lbl}>Precio ($)</label><input required type="number" step="0.01" min="0" style={inp()} value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))}/></div>
              <div><label style={lbl}>Costo ($)</label><input type="number" step="0.01" min="0" style={inp()} value={form.cost} onChange={e=>setForm(f=>({...f,cost:e.target.value}))}/></div>
            </div>
            <div><label style={lbl}>Stock</label><input type="number" min="0" style={inp()} value={form.stock} onChange={e=>setForm(f=>({...f,stock:e.target.value}))}/></div>
            <div>
              <label style={lbl}>Categoría (opcional)</label>
              <select style={inp()} value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
                <option value="">Sin categoría</option>
                {categories.map(c=><option key={c} value={c}>{c}</option>)}
                <option value="__nueva__">+ Nueva categoría</option>
              </select>
            </div>
            {form.category==='__nueva__'&&(
              <div><label style={lbl}>Nombre de nueva categoría</label><input required style={inp()} placeholder="Ej: Cuidado capilar" value={newCatName} onChange={e=>setNewCatName(e.target.value)}/></div>
            )}
            <div><label style={lbl}>Descripción (opcional)</label><textarea rows={2} style={inp({resize:'none'})} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/></div>
            <button type="submit" disabled={saving||uploading} style={{padding:'13px',borderRadius:12,background:'#1a0f14',color:'#fff',fontWeight:700,fontSize:14,border:'none',cursor:(saving||uploading)?'not-allowed':'pointer',opacity:(saving||uploading)?0.6:1,fontFamily:ff}}>{saving?'Guardando...':editProd?'Actualizar':'Crear Producto'}</button>
          </form>
        </Sheet>
      )}

      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
        <h2 style={{fontFamily:ffS,fontSize:28,fontWeight:500,color:C.ink,margin:0}}>Productos</h2>
        <button onClick={()=>setShowCreate(true)} style={{display:'flex',alignItems:'center',gap:6,padding:'10px 16px',borderRadius:12,background:'#1a0f14',color:'#fff',fontWeight:700,fontSize:13,border:'none',cursor:'pointer',fontFamily:ff}}>
          <Ic.Plus size={15} color="#fff"/> Nuevo
        </button>
      </div>

      {loading?<p style={{textAlign:'center',color:C.gray,fontSize:13,padding:'20px 0'}}>Cargando...</p>:
      products.length===0?<div style={glass({padding:32,textAlign:'center',borderRadius:16})}><p style={{color:C.gray,fontSize:14,margin:0}}>Sin productos aún. Toca "Nuevo" para agregar.</p></div>:(
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {[...categories,'Otros'].map(cat=>{
            const catProds=products.filter(p=>cat==='Otros'?!p.category:p.category===cat)
            if(catProds.length===0)return null
            const isOpen=openCat===cat||categories.length===0
            return(
              <div key={cat} style={glass({borderRadius:16,overflow:'hidden'})}>
                {categories.length>0&&(
                  <button onClick={()=>setOpenCat(isOpen?null:cat)} style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 18px',background:'none',border:'none',cursor:'pointer',fontFamily:ff}}>
                    <span style={{fontSize:14,fontWeight:600,color:C.ink}}>{cat} <span style={{fontSize:11,color:C.gray,fontWeight:400}}>({catProds.length})</span></span>
                    <Ic.CD color={C.gray} style={{transform:isOpen?'rotate(180deg)':'none',transition:'transform 0.2s'}}/>
                  </button>
                )}
                {isOpen&&(
                  <div style={{display:'flex',flexDirection:'column',gap:8,padding:categories.length>0?'0 10px 10px':0}}>
                    {catProds.map(p=>(
                      <div key={p.id} style={glass({padding:'14px 16px',borderRadius:14,opacity:p.active?1:0.55})}>
                        <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
                          {p.photo_url?(
                            <img src={p.photo_url} alt={p.name} style={{width:52,height:52,borderRadius:10,objectFit:'cover',flexShrink:0}}/>
                          ):(
                            <div style={{width:52,height:52,borderRadius:10,background:`color-mix(in srgb, var(--gold) 10%, transparent)`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                              <Ic.Camera size={18} color={C.gold}/>
                            </div>
                          )}
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap' as const}}>
                              <span style={{fontSize:14,fontWeight:600,color:C.ink}}>{p.name}</span>
                              {!p.active&&<span style={{fontSize:9,fontWeight:700,color:C.red,padding:'2px 6px',borderRadius:99,background:`color-mix(in srgb, var(--red) 12%, transparent)`,textTransform:'uppercase' as const}}>Inactivo</span>}
                            </div>
                            <p style={{fontSize:13,fontWeight:700,color:C.gold,margin:'4px 0 0'}}>${p.price.toFixed(2)}<span style={{fontSize:11,fontWeight:400,color:C.gray}}> · costo ${p.cost.toFixed(2)}</span></p>
                            <p style={{fontSize:11,color:p.stock<=2?C.red:C.gray,margin:'2px 0 0',fontWeight:p.stock<=2?700:400}}>Stock: {p.stock}{p.stock<=2?' ⚠️':''}</p>
                            {p.description&&<p style={{fontSize:11,color:C.gray,margin:'2px 0 0'}}>{p.description}</p>}
                          </div>
                          <div style={{display:'flex',gap:4,flexShrink:0}}>
                            <button onClick={()=>toggleProduct(p)} title={p.active?'Desactivar':'Activar'} style={{background:'none',border:'none',cursor:'pointer',padding:6}}><Ic.Block size={15} color={p.active?C.gray:C.green}/></button>
                            <button onClick={()=>openEdit(p)} style={{background:'none',border:'none',cursor:'pointer',padding:6}}><Ic.Edit size={15} color={C.gray}/></button>
                            <button onClick={()=>setConfirmDel(p)} style={{background:'none',border:'none',cursor:'pointer',padding:6}}><Ic.Trash size={15} color={C.red}/></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---- PROMOCIONES PANEL -----------------------------------------------------
// ── INCOMPLETAS (draft bookings) ──────────────────────────────────────────────
function Incompletas(){
  const[drafts,setDrafts]=useState<Booking[]>([])
  const[loading,setLoading]=useState(true)
  const[confirmDel,setConfirmDel]=useState<string|null>(null)

  async function loadDrafts(){
    setLoading(true)
    const{data}=await supabaseAdmin.from('bookings').select('*').eq('status','draft').order('created_at',{ascending:false})
    setDrafts((data??[]) as Booking[])
    setLoading(false)
  }
  useEffect(()=>{loadDrafts()},[])// eslint-disable-line react-hooks/exhaustive-deps

  async function deleteDraft(id:string){
    await supabaseAdmin.from('bookings').delete().eq('id',id)
    setDrafts(d=>d.filter(b=>b.id!==id))
    setConfirmDel(null)
  }

  async function promoteDraft(b:Booking){
    await supabaseAdmin.from('bookings').update({status:'confirmed'}).eq('id',b.id)
    loadDrafts()
  }

  function stepsLabel(b:Booking){
    if(b.time&&b.date) return 'Seleccionó fecha y hora'
    if(b.date) return 'Seleccionó fecha'
    if(b.service) return 'Seleccionó servicio'
    return 'Datos básicos'
  }

  return(
    <div style={{padding:'0 16px 24px'}}>
      {confirmDel&&<DeleteConfirm msg="¿Eliminar este borrador de reserva?" onClose={()=>setConfirmDel(null)} onConfirm={()=>deleteDraft(confirmDel)}/>}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
        <div>
          <h2 style={{fontFamily:ffS,fontSize:28,fontWeight:500,color:C.ink,margin:0}}>Incompletas</h2>
          <p style={{fontSize:11,color:C.gray,margin:'4px 0 0'}}>Reservas iniciadas que no llegaron a confirmarse</p>
        </div>
        <button onClick={loadDrafts} style={{background:'none',border:`1.5px solid color-mix(in srgb, var(--ink) 14%, transparent)`,borderRadius:10,cursor:'pointer',color:C.gray,padding:'7px 12px',fontSize:12,fontWeight:600,fontFamily:ff}}>Actualizar</button>
      </div>
      {loading?<p style={{textAlign:'center',color:C.gray,fontSize:13,padding:'20px 0'}}>Cargando...</p>
      :drafts.length===0?(
        <div style={glass({padding:40,textAlign:'center',borderRadius:16})}>
          <p style={{fontSize:14,color:C.gray,margin:0}}>Sin reservas incompletas ✓</p>
        </div>
      ):(
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {drafts.map(b=>{
            const timeAgo=(()=>{
              const diff=Date.now()-new Date(b.created_at).getTime()
              const m=Math.floor(diff/60000)
              if(m<1)return 'ahora'
              if(m<60)return `${m}m`
              if(m<1440)return `${Math.floor(m/60)}h`
              return `${Math.floor(m/1440)}d`
            })()
            return(
              <div key={b.id} style={glass({padding:'14px 16px',borderRadius:14})}>
                <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap' as const,marginBottom:3}}>
                      <span style={{fontSize:14,fontWeight:600,color:C.ink}}>{b.name||'Sin nombre'}</span>
                      <span style={{fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:99,background:`color-mix(in srgb, var(--gold) 12%, transparent)`,color:C.gold,textTransform:'uppercase' as const,letterSpacing:'0.06em'}}>{stepsLabel(b)}</span>
                      <span style={{fontSize:11,color:C.gray,marginLeft:'auto'}}>{timeAgo}</span>
                    </div>
                    <p style={{fontSize:12,color:C.gray,margin:'0 0 1px'}}>{b.phone||'Sin teléfono'}</p>
                    {b.service&&<p style={{fontSize:12,color:C.gray,margin:'0 0 1px'}}>{b.service}</p>}
                    {b.date&&<p style={{fontSize:12,color:C.gray,margin:0}}>{fmtDate(b.date)}{b.time?` · ${b.time}`:''}{b.specialist?` · ${b.specialist}`:''}</p>}
                  </div>
                  <div style={{display:'flex',gap:4,flexShrink:0}}>
                    <button onClick={()=>promoteDraft(b)} title="Confirmar reserva" style={{background:'none',border:'none',cursor:'pointer',padding:6}}><Ic.Check size={16} color={C.green}/></button>
                    <button onClick={()=>setConfirmDel(b.id)} title="Eliminar" style={{background:'none',border:'none',cursor:'pointer',padding:6}}><Ic.Trash size={15} color={C.red}/></button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Promociones(){
  const[tab,setTab]=useState<'descuentos'|'diaspromo'>('descuentos')
  const[promos,setPromos]=useState<Promotion[]>([])
  const[loading,setLoading]=useState(true)
  const[showCreate,setShowCreate]=useState(false)
  const[editPromo,setEditPromo]=useState<Promotion|null>(null)
  const[form,setForm]=useState({title:'',description:'',discount_type:'percent' as 'percent'|'fixed',discount_value:'',service_name:'',specialist_name:'',starts_at:'',ends_at:''})
  const[saving,setSaving]=useState(false)
  const[confirmDel,setConfirmDel]=useState<Promotion|null>(null)

  // Días Promo state
  const[promoDays,setPromoDays]=useState<PromoDay[]>([])
  const[pdLoading,setPdLoading]=useState(false)
  const[showPdCreate,setShowPdCreate]=useState(false)
  const[pdForm,setPdForm]=useState({date:'',discount_type:'percent' as 'percent'|'fixed',discount_value:'',specialist_name:'random',service_name:'',note:''})
  const[pdSaving,setPdSaving]=useState(false)
  const[pdError,setPdError]=useState('')
  const[pdConfirmDel,setPdConfirmDel]=useState<PromoDay|null>(null)

  const specNames=useSpecialistNames()
  const allSvcNames=SERVICE_CATEGORIES.flatMap(c=>c.services.map(s=>s.name))

  useEffect(()=>{loadPromos();loadPromoDays()},[])// eslint-disable-line react-hooks/exhaustive-deps

  async function loadPromos(){
    setLoading(true)
    const{data}=await supabase.from('promotions').select('*').order('created_at',{ascending:false})
    setPromos((data??[]) as Promotion[])
    setLoading(false)
  }

  async function loadPromoDays(){
    setPdLoading(true)
    const{data,error}=await supabase.from('promo_days').select('*').order('date')
    if(error)console.error('loadPromoDays error:',error)
    setPromoDays((data??[]) as PromoDay[])
    setPdLoading(false)
  }

  async function savePromoDayForm(e:React.FormEvent){
    e.preventDefault();setPdSaving(true)
    try{
      const{error}=await supabaseAdmin.from('promo_days').insert([{date:pdForm.date,discount_type:pdForm.discount_type,discount_value:parseFloat(pdForm.discount_value)||0,specialist_name:pdForm.specialist_name||'random',service_name:pdForm.service_name||null,note:pdForm.note||null,active:true}])
      if(error){console.error('savePromoDayForm error:',error);setPdError(error.message);return}
      setShowPdCreate(false);setPdForm({date:'',discount_type:'percent',discount_value:'',specialist_name:'random',service_name:'',note:''});setPdError('')
      loadPromoDays()
    }finally{setPdSaving(false)}
  }

  async function deletePromoDay(p:PromoDay){
    const{error}=await supabaseAdmin.from('promo_days').delete().eq('id',p.id)
    if(error){console.error('deletePromoDay error:',error);return}
    setPdConfirmDel(null);loadPromoDays()
  }

  async function togglePromoDay(p:PromoDay){
    const{error}=await supabaseAdmin.from('promo_days').update({active:!p.active}).eq('id',p.id)
    if(error){console.error('togglePromoDay error:',error);return}
    loadPromoDays()
  }

  async function savePromo(e:React.FormEvent){
    e.preventDefault();setSaving(true)
    const row={title:form.title,description:form.description||null,discount_type:form.discount_type,discount_value:parseFloat(form.discount_value)||0,service_name:form.service_name||null,specialist_name:form.specialist_name||null,active:true,starts_at:form.starts_at||null,ends_at:form.ends_at||null}
    if(editPromo) await supabaseAdmin.from('promotions').update(row).eq('id',editPromo.id)
    else await supabaseAdmin.from('promotions').insert([row])
    setSaving(false);closeForm();loadPromos()
  }

  async function togglePromo(p:Promotion){await supabaseAdmin.from('promotions').update({active:!p.active}).eq('id',p.id);loadPromos()}
  async function deletePromo(p:Promotion){await supabaseAdmin.from('promotions').delete().eq('id',p.id);setConfirmDel(null);loadPromos()}
  function openEdit(p:Promotion){setEditPromo(p);setForm({title:p.title,description:p.description||'',discount_type:p.discount_type,discount_value:String(p.discount_value),service_name:p.service_name||'',specialist_name:p.specialist_name||'',starts_at:p.starts_at?.slice(0,10)||'',ends_at:p.ends_at?.slice(0,10)||''});setShowCreate(true)}
  function closeForm(){setShowCreate(false);setEditPromo(null);setForm({title:'',description:'',discount_type:'percent',discount_value:'',service_name:'',specialist_name:'',starts_at:'',ends_at:''})}

  const isActive=(p:Promotion)=>{
    if(!p.active) return false
    const now=new Date().toISOString().slice(0,10)
    if(p.starts_at&&now<p.starts_at) return false
    if(p.ends_at&&now>p.ends_at) return false
    return true
  }

  return(
    <div style={{padding:'0 16px 24px'}}>
      {confirmDel&&<DeleteConfirm msg={`¿Eliminar la promoción "${confirmDel.title}"?`} onClose={()=>setConfirmDel(null)} onConfirm={()=>deletePromo(confirmDel)}/>}
      {pdConfirmDel&&<DeleteConfirm msg={`¿Eliminar el día promocional ${fmtDate(pdConfirmDel.date)}?`} onClose={()=>setPdConfirmDel(null)} onConfirm={()=>deletePromoDay(pdConfirmDel)}/>}
      {showCreate&&(
        <Sheet onClose={closeForm}>
          <SheetHandle title={editPromo?'Editar Promoción':'Nueva Promoción'} onClose={closeForm}/>
          <form onSubmit={savePromo} style={{display:'flex',flexDirection:'column',gap:12}}>
            <div><label style={lbl}>Título</label><input required style={inp()} value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}/></div>
            <div><label style={lbl}>Descripción (opcional)</label><textarea rows={2} style={inp({resize:'none'})} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div>
                <label style={lbl}>Tipo de descuento</label>
                <select style={inp()} value={form.discount_type} onChange={e=>setForm(f=>({...f,discount_type:e.target.value as 'percent'|'fixed'}))}>
                  <option value="percent">Porcentaje (%)</option>
                  <option value="fixed">Monto fijo ($)</option>
                </select>
              </div>
              <div><label style={lbl}>Valor del descuento</label><input required type="number" step="0.01" min="0" style={inp()} placeholder={form.discount_type==='percent'?'15':'10.00'} value={form.discount_value} onChange={e=>setForm(f=>({...f,discount_value:e.target.value}))}/></div>
            </div>
            <div>
              <label style={lbl}>Servicio específico (opcional)</label>
              <select style={inp()} value={form.service_name} onChange={e=>setForm(f=>({...f,service_name:e.target.value}))}>
                <option value="">Todos los servicios</option>
                {allSvcNames.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Especialista específica (opcional)</label>
              <select style={inp()} value={form.specialist_name} onChange={e=>setForm(f=>({...f,specialist_name:e.target.value}))}>
                <option value="">Todas las especialistas</option>
                {specNames.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div><label style={lbl}>Fecha inicio (opcional)</label><input type="date" style={inp()} value={form.starts_at} onChange={e=>setForm(f=>({...f,starts_at:e.target.value}))}/></div>
              <div><label style={lbl}>Fecha fin (opcional)</label><input type="date" style={inp()} value={form.ends_at} onChange={e=>setForm(f=>({...f,ends_at:e.target.value}))}/></div>
            </div>
            <button type="submit" disabled={saving} style={{padding:'13px',borderRadius:12,background:'#1a0f14',color:'#fff',fontWeight:700,fontSize:14,border:'none',cursor:saving?'not-allowed':'pointer',opacity:saving?0.6:1,fontFamily:ff}}>{saving?'Guardando...':editPromo?'Actualizar':'Crear Promoción'}</button>
          </form>
        </Sheet>
      )}
      {showPdCreate&&(
        <Sheet onClose={()=>setShowPdCreate(false)}>
          <SheetHandle title="Nuevo Día Promocional" onClose={()=>setShowPdCreate(false)}/>
          <form onSubmit={savePromoDayForm} style={{display:'flex',flexDirection:'column',gap:12}}>
            <div><label style={lbl}>Fecha</label><input required type="date" style={inp()} value={pdForm.date} onChange={e=>setPdForm(f=>({...f,date:e.target.value}))}/></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div>
                <label style={lbl}>Tipo de descuento</label>
                <select style={inp()} value={pdForm.discount_type} onChange={e=>setPdForm(f=>({...f,discount_type:e.target.value as 'percent'|'fixed'}))}>
                  <option value="percent">Porcentaje (%)</option>
                  <option value="fixed">Monto fijo ($)</option>
                </select>
              </div>
              <div><label style={lbl}>Descuento</label><input required type="number" step="0.01" min="0" style={inp()} placeholder={pdForm.discount_type==='percent'?'15':'10.00'} value={pdForm.discount_value} onChange={e=>setPdForm(f=>({...f,discount_value:e.target.value}))}/></div>
            </div>
            <div>
              <label style={lbl}>Servicio (opcional — vacío = todos)</label>
              <select style={inp()} value={pdForm.service_name} onChange={e=>setPdForm(f=>({...f,service_name:e.target.value}))}>
                <option value="">Todos los servicios</option>
                {allSvcNames.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Especialista</label>
              <select style={inp()} value={pdForm.specialist_name} onChange={e=>setPdForm(f=>({...f,specialist_name:e.target.value}))}>
                <option value="random">Random (cualquier disponible)</option>
                {specNames.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Nota para la cliente (opcional)</label><input style={inp()} placeholder="Ej: ¡Martes especial! 20% en todos los servicios" value={pdForm.note} onChange={e=>setPdForm(f=>({...f,note:e.target.value}))}/></div>
            {pdError&&<p style={{fontSize:12,color:C.red,margin:0}}>{pdError}</p>}
            <button type="submit" disabled={pdSaving} style={{padding:'13px',borderRadius:12,background:'#1a0f14',color:'#fff',fontWeight:700,fontSize:14,border:'none',cursor:pdSaving?'not-allowed':'pointer',opacity:pdSaving?0.6:1,fontFamily:ff}}>{pdSaving?'Guardando...':'Crear Día Promo'}</button>
          </form>
        </Sheet>
      )}

      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
        <h2 style={{fontFamily:ffS,fontSize:28,fontWeight:500,color:C.ink,margin:0}}>Promociones</h2>
        <button onClick={()=>tab==='descuentos'?setShowCreate(true):setShowPdCreate(true)} style={{display:'flex',alignItems:'center',gap:6,padding:'10px 16px',borderRadius:12,background:'#1a0f14',color:'#fff',fontWeight:700,fontSize:13,border:'none',cursor:'pointer',fontFamily:ff}}>
          <Ic.Plus size={15} color="#fff"/> Nueva
        </button>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:0,borderBottom:`1.5px solid color-mix(in srgb, var(--rosa) 20%, transparent)`,marginBottom:20}}>
        {([['descuentos','Descuentos'],['diaspromo','Días Promo']] as const).map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={{padding:'8px 20px',background:'none',border:'none',cursor:'pointer',fontFamily:ff,fontSize:12,fontWeight:700,letterSpacing:'0.04em',color:tab===id?C.rosa:C.gray,borderBottom:`2px solid ${tab===id?C.rosa:'transparent'}`,transition:'all .15s',textTransform:'uppercase' as const}}>
            {label}
          </button>
        ))}
      </div>

      {tab==='descuentos'&&(loading?<p style={{textAlign:'center',color:C.gray,fontSize:13,padding:'20px 0'}}>Cargando...</p>:
      promos.length===0?<div style={glass({padding:32,textAlign:'center',borderRadius:16})}><p style={{color:C.gray,fontSize:14,margin:0}}>Sin promociones. Toca "Nueva" para crear una.</p></div>:(
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {promos.map(p=>{
            const active=isActive(p)
            return(
              <div key={p.id} style={glass({padding:'14px 16px',borderRadius:14,opacity:active?1:0.6})}>
                <div style={{display:'flex',alignItems:'flex-start',gap:8}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap' as const}}>
                      <span style={{fontSize:14,fontWeight:600,color:C.ink}}>{p.title}</span>
                      <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:99,background:active?`color-mix(in srgb, var(--green) 12%, transparent)`:`color-mix(in srgb, var(--gray) 12%, transparent)`,color:active?C.green:C.gray}}>{active?'Activa':'Inactiva'}</span>
                    </div>
                    <p style={{fontSize:13,fontWeight:700,color:C.gold,margin:'4px 0 0'}}>{p.discount_type==='percent'?`${p.discount_value}% descuento`:`$${p.discount_value.toFixed(2)} descuento`}</p>
                    {p.service_name&&<p style={{fontSize:11,color:C.gray,margin:'2px 0 0'}}>Servicio: {p.service_name}</p>}
                    {p.specialist_name&&<p style={{fontSize:11,color:C.gray,margin:'2px 0 0'}}>Especialista: {p.specialist_name}</p>}
                    {(p.starts_at||p.ends_at)&&<p style={{fontSize:11,color:C.gray,margin:'2px 0 0'}}>{p.starts_at?`Desde: ${fmtDate(p.starts_at.slice(0,10))}`:''}{p.ends_at?` Hasta: ${fmtDate(p.ends_at.slice(0,10))}`:''}</p>}
                    {p.description&&<p style={{fontSize:11,color:C.gray,margin:'3px 0 0',opacity:0.8}}>{p.description}</p>}
                  </div>
                  <div style={{display:'flex',gap:4,flexShrink:0}}>
                    <button onClick={()=>togglePromo(p)} title={p.active?'Desactivar':'Activar'} style={{background:'none',border:'none',cursor:'pointer',padding:6}}><Ic.Block size={15} color={p.active?C.gray:C.green}/></button>
                    <button onClick={()=>openEdit(p)} style={{background:'none',border:'none',cursor:'pointer',padding:6}}><Ic.Edit size={15} color={C.gray}/></button>
                    <button onClick={()=>setConfirmDel(p)} style={{background:'none',border:'none',cursor:'pointer',padding:6}}><Ic.Trash size={15} color={C.red}/></button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ))}

      {tab==='diaspromo'&&(pdLoading?<p style={{textAlign:'center',color:C.gray,fontSize:13,padding:'20px 0'}}>Cargando...</p>:
      promoDays.length===0?<div style={glass({padding:32,textAlign:'center',borderRadius:16})}><p style={{color:C.gray,fontSize:14,margin:0}}>Sin días promocionales. Toca "Nueva" para crear uno.</p></div>:(
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {promoDays.map(p=>{
            const isPast=p.date<new Date().toISOString().slice(0,10)
            return(
              <div key={p.id} style={glass({padding:'14px 16px',borderRadius:14,opacity:p.active&&!isPast?1:0.55})}>
                <div style={{display:'flex',alignItems:'flex-start',gap:8}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap' as const}}>
                      <span style={{fontSize:14,fontWeight:700,color:C.ink,fontFamily:ffS}}>{fmtDate(p.date)}</span>
                      <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:99,background:p.active&&!isPast?`color-mix(in srgb, var(--green) 12%, transparent)`:`color-mix(in srgb, var(--gray) 12%, transparent)`,color:p.active&&!isPast?C.green:C.gray}}>{isPast?'Pasado':p.active?'Activo':'Inactivo'}</span>
                    </div>
                    <p style={{fontSize:13,fontWeight:700,color:C.gold,margin:'4px 0 0'}}>{p.discount_type==='percent'?`${p.discount_value}% descuento`:`$${p.discount_value.toFixed(2)} descuento`}</p>
                    {p.service_name&&<p style={{fontSize:11,color:C.gray,margin:'2px 0 0'}}>Servicio: {p.service_name}</p>}
                    <p style={{fontSize:11,color:C.gray,margin:'2px 0 0'}}>Especialista: {p.specialist_name==='random'?'Random (cualquier disponible)':p.specialist_name}</p>
                    {p.note&&<p style={{fontSize:11,color:C.gray,margin:'2px 0 0',fontStyle:'italic'}}>{p.note}</p>}
                  </div>
                  <div style={{display:'flex',gap:4,flexShrink:0}}>
                    {!isPast&&<button onClick={()=>togglePromoDay(p)} title={p.active?'Desactivar':'Activar'} style={{background:'none',border:'none',cursor:'pointer',padding:6}}><Ic.Block size={15} color={p.active?C.gray:C.green}/></button>}
                    <button onClick={()=>setPdConfirmDel(p)} style={{background:'none',border:'none',cursor:'pointer',padding:6}}><Ic.Trash size={15} color={C.red}/></button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ---- SETUP FORM (first login) -----------------------------------------------
function SetupForm({userId,userRole,onDone}:{userId:string;userRole:'admin'|'specialist'|'agenda';onDone:(fullName:string)=>void}){
  const[nombre,setNombre]=useState('')
  const[apellido,setApellido]=useState('')
  const[correo,setCorreo]=useState('')
  const[correo2,setCorreo2]=useState('')
  const[pass,setPass]=useState('')
  const[pass2,setPass2]=useState('')
  const[servicios,setServicios]=useState<string[]>([])
  const[schedule,setSchedule]=useState<{day:number;active:boolean;start:string;end:string}[]>(
    [1,2,3,4,5,6,0].map(d=>({day:d,active:d>=1&&d<=5,start:'9:00 AM',end:'7:00 PM'}))
  )
  const[saving,setSaving]=useState(false)
  const[errs,setErrs]=useState<Record<string,string>>({})
  const greeting=(()=>{const h=new Date().getHours();return h<12?'Buenos días':'Buenos '+(h<19?'tardes':'noches')})()

  function validate(){
    const e:Record<string,string>={}
    if(!nombre.trim())e.nombre='Requerido'
    if(!apellido.trim())e.apellido='Requerido'
    if(!correo.trim())e.correo='Requerido'
    else if(correo!==correo2)e.correo2='Los correos no coinciden'
    if(!pass)e.pass='Requerido'
    else if(pass.length<6)e.pass='Mínimo 6 caracteres'
    else if(pass!==pass2)e.pass2='Las contraseñas no coinciden'
    setErrs(e);return Object.keys(e).length===0
  }

  async function submit(e:React.FormEvent){
    e.preventDefault();if(!validate())return;setSaving(true)
    const fullName=(nombre.trim()+' '+apellido.trim()).trim()
    await Promise.all([
      supabase.auth.updateUser({email:correo,password:pass}),
      supabaseAdmin.from('profiles').update({full_name:fullName}).eq('id',userId),
    ])
    if(userRole==='specialist'){
      if(servicios.length>0){
        await Promise.all(servicios.map(s=>
          supabaseAdmin.from('specialist_services').upsert({specialist_id:userId,service_name:s,duration_minutes:60,approved:true},{onConflict:'specialist_id,service_name'})
        ))
      }
      await Promise.all(schedule.map(d=>
        supabaseAdmin.from('specialist_schedules').upsert({specialist_id:userId,day_of_week:d.day,start_time:d.start,end_time:d.end,active:d.active},{onConflict:'specialist_id,day_of_week'})
      ))
    }
    setSaving(false);onDone(fullName)
  }

  function toggleSvc(name:string){setServicios(prev=>prev.includes(name)?prev.filter(s=>s!==name):[...prev,name])}
  const errStyle=(k:string):React.CSSProperties=>errs[k]?{borderColor:C.red}:{}

  return(
    <div style={{minHeight:'100vh',background:'var(--bg)',display:'flex',alignItems:'flex-start',justifyContent:'center',padding:'24px 16px 80px',overflowY:'auto'}}>
      <div style={{width:'100%',maxWidth:480}}>
        <div style={{textAlign:'center',marginBottom:28,paddingTop:16}}>
          <div style={{fontFamily:ffS,fontSize:11,letterSpacing:'4px',color:C.gold,textTransform:'uppercase',opacity:0.8,marginBottom:10}}>{business.name}</div>
          <h1 style={{fontFamily:ffS,fontSize:'clamp(22px,5vw,30px)',fontWeight:400,color:C.ink,margin:'0 0 8px',lineHeight:1.3}}>{greeting}</h1>
          <p style={{fontFamily:ff,fontSize:13,color:C.gray,margin:0,lineHeight:1.7}}>Por favor contesta las siguientes preguntas<br/>para configurar tu perfil.</p>
        </div>

        <form onSubmit={submit} style={{display:'flex',flexDirection:'column',gap:12}}>
          {/* Nombre + Apellido */}
          <div style={glass({padding:18,borderRadius:16})}>
            <p style={{fontFamily:ff,fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:C.gold,margin:'0 0 12px'}}>Tu información</p>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div>
                <label style={lbl}>Nombre</label>
                <input style={inp(errStyle('nombre'))} value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="María"/>
                {errs.nombre&&<p style={{fontSize:10,color:C.red,margin:'2px 0 0'}}>{errs.nombre}</p>}
              </div>
              <div>
                <label style={lbl}>Apellido</label>
                <input style={inp(errStyle('apellido'))} value={apellido} onChange={e=>setApellido(e.target.value)} placeholder="García"/>
                {errs.apellido&&<p style={{fontSize:10,color:C.red,margin:'2px 0 0'}}>{errs.apellido}</p>}
              </div>
            </div>
          </div>

          {/* Correo */}
          <div style={glass({padding:18,borderRadius:16})}>
            <p style={{fontFamily:ff,fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:C.gold,margin:'0 0 12px'}}>Correo electrónico</p>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              <div>
                <label style={lbl}>Correo nuevo</label>
                <input type="email" style={inp(errStyle('correo'))} value={correo} onChange={e=>setCorreo(e.target.value)} placeholder="tu@correo.com"/>
                {errs.correo&&<p style={{fontSize:10,color:C.red,margin:'2px 0 0'}}>{errs.correo}</p>}
              </div>
              <div>
                <label style={lbl}>Confirmar correo</label>
                <input type="email" style={inp(errStyle('correo2'))} value={correo2} onChange={e=>setCorreo2(e.target.value)} placeholder="tu@correo.com"/>
                {errs.correo2&&<p style={{fontSize:10,color:C.red,margin:'2px 0 0'}}>{errs.correo2}</p>}
              </div>
            </div>
          </div>

          {/* Password */}
          <div style={glass({padding:18,borderRadius:16})}>
            <p style={{fontFamily:ff,fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:C.gold,margin:'0 0 12px'}}>Contraseña</p>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              <div>
                <label style={lbl}>Contraseña nueva</label>
                <input type="password" style={inp(errStyle('pass'))} value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••••"/>
                {errs.pass&&<p style={{fontSize:10,color:C.red,margin:'2px 0 0'}}>{errs.pass}</p>}
              </div>
              <div>
                <label style={lbl}>Confirmar contraseña</label>
                <input type="password" style={inp(errStyle('pass2'))} value={pass2} onChange={e=>setPass2(e.target.value)} placeholder="••••••••"/>
                {errs.pass2&&<p style={{fontSize:10,color:C.red,margin:'2px 0 0'}}>{errs.pass2}</p>}
              </div>
            </div>
          </div>

          {/* Servicios — specialist only, optional */}
          {userRole==='specialist'&&(
            <div style={glass({padding:18,borderRadius:16})}>
              <p style={{fontFamily:ff,fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:C.gold,margin:'0 0 4px'}}>Servicios que provees</p>
              <p style={{fontSize:11,color:C.gray,margin:'0 0 12px'}}>Opcional — puedes ajustarlos después</p>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {SERVICE_CATEGORIES.map(cat=>(
                  <div key={cat.id}>
                    <p style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:C.gray,margin:'0 0 6px'}}>{cat.title}</p>
                    <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                      {cat.services.map(svc=>{
                        const on=servicios.includes(svc.name)
                        return(
                          <button key={svc.name} type="button" onClick={()=>toggleSvc(svc.name)}
                            style={{padding:'5px 12px',borderRadius:99,border:`1.5px solid ${on?C.gold:C.inputBorder}`,background:on?`color-mix(in srgb, var(--gold) 14%, transparent)`:'transparent',color:on?C.gold:C.gray,fontSize:11,fontWeight:on?700:500,cursor:'pointer',fontFamily:ff,transition:'all .15s'}}>
                            {svc.name}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Horas disponibles — specialist only */}
          {userRole==='specialist'&&(
            <div style={glass({padding:18,borderRadius:16})}>
              <p style={{fontFamily:ff,fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:C.gold,margin:'0 0 12px'}}>Horas disponibles</p>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {[1,2,3,4,5,6,0].map(dayNum=>{
                  const d=schedule.find(x=>x.day===dayNum)!
                  return(
                    <div key={dayNum} style={{padding:'10px 12px',borderRadius:12,background:d.active?`color-mix(in srgb, var(--gold) 7%, transparent)`:`color-mix(in srgb, var(--ink) 4%, transparent)`,border:`1px solid ${d.active?`color-mix(in srgb, var(--gold) 20%, transparent)`:`color-mix(in srgb, var(--ink) 8%, transparent)`}`}}>
                      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:d.active?8:0}}>
                        <button type="button" onClick={()=>setSchedule(prev=>prev.map(x=>x.day===dayNum?{...x,active:!x.active}:x))}
                          style={{width:20,height:20,borderRadius:5,border:`2px solid ${d.active?C.gold:'color-mix(in srgb, var(--gray) 40%, transparent)'}`,background:d.active?C.gold:'transparent',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0,padding:0}}>
                          {d.active&&<Ic.Check size={11} color="#fff"/>}
                        </button>
                        <span style={{fontSize:13,fontWeight:600,color:d.active?C.ink:C.gray,flex:1}}>{WEEKDAYS_ES[dayNum]}</span>
                        {!d.active&&<span style={{fontSize:11,color:C.gray}}>No disponible</span>}
                      </div>
                      {d.active&&(
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                          <div><label style={{...lbl,fontSize:9}}>Entrada</label><select style={inp({fontSize:12})} value={d.start} onChange={e=>setSchedule(prev=>prev.map(x=>x.day===dayNum?{...x,start:e.target.value}:x))}>{WORK_TIMES.map(t=><option key={t}>{t}</option>)}</select></div>
                          <div><label style={{...lbl,fontSize:9}}>Salida</label><select style={inp({fontSize:12})} value={d.end} onChange={e=>setSchedule(prev=>prev.map(x=>x.day===dayNum?{...x,end:e.target.value}:x))}>{WORK_TIMES.map(t=><option key={t}>{t}</option>)}</select></div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <button type="submit" disabled={saving} style={{padding:'15px',borderRadius:14,background:'#1a0f14',color:'#fff',fontWeight:700,fontSize:14,border:'none',cursor:saving?'not-allowed':'pointer',opacity:saving?0.6:1,fontFamily:ff,marginTop:4}}>
            {saving?'Guardando...':'Continuar →'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ---- ONBOARDING TOUR -------------------------------------------------------
function OnboardingTour({role,onDone}:{role:'admin'|'specialist'|'agenda';onDone:()=>void}){
  const[step,setStep]=useState(0)
  const steps=role==='admin'?[
    {title:'¡Bienvenido/a!',body:`Este es el panel de control de ${business.name}. Te guiaremos por las secciones principales en segundos.`,icon:'✨'},
    {title:'Inicio — Tu tablero',body:'Aquí ves todas las citas del día, las pendientes de confirmar, ingresos estimados y actividad reciente.',icon:'📅'},
    {title:'Depósitos',body:'Administra todos los depósitos: pendientes, solicitados, recibidos, utilizados y retenidos. Todo en un lugar.',icon:'💳'},
    {title:'Clientes',body:'Accede al historial completo de cada cliente/a — citas, notas, preferencias y depósitos anteriores.',icon:'👥'},
    {title:'Equipo',body:'Administra tus especialistas: horarios, servicios, fotos, cambios de horario y solicitudes nuevas.',icon:'💅'},
    {title:'Ver más — Otros módulos',body:'Desde "•••" accedes a Servicios, Productos, Promociones y Configuración del salón.',icon:'⚙️'},
  ]:[
    {title:'¡Bienvenido/a!',body:`Este es tu panel de especialista en ${business.name}. Desde aquí manejas todo lo de tu día a día.`,icon:'✨'},
    {title:'Inicio — Tus citas',body:'Ve tus citas del día y las próximas. Puedes confirmarlas, completarlas o cancelarlas.',icon:'📅'},
    {title:'Clientes',body:'Historial de tus clientas: visitas y notas. Los datos de contacto son privados por seguridad.',icon:'👥'},
    {title:'Mi Perfil y Disponibilidad',body:'Actualiza tu foto, bio y servicios que ofreces. Bloquea días que no estarás disponible.',icon:'🗓️'},
  ]
  const cur=steps[step]
  const isLast=step===steps.length-1
  return(
    <div style={{position:'fixed',inset:0,zIndex:9000,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(26,15,20,0.72)',backdropFilter:'blur(8px)',WebkitBackdropFilter:'blur(8px)',padding:24}}>
      <div style={{background:'var(--bg)',borderRadius:24,padding:'32px 28px',maxWidth:360,width:'100%',boxShadow:'0 24px 80px rgba(0,0,0,0.28)',animation:'kFadeIn 0.25s ease-out both'}}>
        <div style={{display:'flex',gap:6,justifyContent:'center',marginBottom:24}}>
          {steps.map((_,i)=>(
            <div key={i} style={{width:i===step?20:6,height:6,borderRadius:99,background:i===step?'var(--gold)':'color-mix(in srgb, var(--gray) 30%, transparent)',transition:'all .25s'}}/>
          ))}
        </div>
        <div style={{textAlign:'center',marginBottom:24}}>
          <div style={{fontSize:40,marginBottom:16}}>{cur.icon}</div>
          <h3 style={{fontFamily:ffS,fontSize:22,fontWeight:400,color:'var(--ink)',margin:'0 0 12px'}}>{cur.title}</h3>
          <p style={{fontFamily:ff,fontSize:13,color:'var(--gray)',lineHeight:1.7,margin:0}}>{cur.body}</p>
        </div>
        <div style={{display:'flex',gap:10}}>
          {step>0&&<button onClick={()=>setStep(s=>s-1)} style={{flex:1,padding:'12px',borderRadius:12,background:'transparent',border:`1.5px solid color-mix(in srgb, var(--gray) 30%, transparent)`,color:'var(--gray)',fontWeight:600,fontSize:13,cursor:'pointer',fontFamily:ff}}>Atrás</button>}
          <button onClick={()=>isLast?onDone():setStep(s=>s+1)} style={{flex:2,padding:'12px',borderRadius:12,background:'#1a0f14',color:'#fff',fontWeight:700,fontSize:13,border:'none',cursor:'pointer',fontFamily:ff}}>
            {isLast?'¡Empezar! →':'Siguiente →'}
          </button>
        </div>
        <button onClick={onDone} style={{width:'100%',marginTop:12,background:'none',border:'none',color:'var(--gray)',fontSize:11,cursor:'pointer',fontFamily:ff,padding:'8px 0'}}>Saltar tutorial</button>
      </div>
    </div>
  )
}

// ---- CONFIGURACION PANEL ---------------------------------------------------
const DEFAULT_HOURS:DayHours[]=[
  {day:0,open:'8:00 AM',close:'5:30 PM',closed:true},  // Domingo
  {day:1,open:'8:00 AM',close:'5:30 PM',closed:true},  // Lunes
  {day:2,open:'8:00 AM',close:'5:30 PM',closed:false}, // Martes
  {day:3,open:'8:00 AM',close:'5:30 PM',closed:false}, // Miércoles
  {day:4,open:'8:00 AM',close:'5:30 PM',closed:false}, // Jueves
  {day:5,open:'8:00 AM',close:'5:30 PM',closed:false}, // Viernes
  {day:6,open:'8:00 AM',close:'4:30 PM',closed:false}, // Sábado
]
const DEFAULT_SETTINGS:SalonSettings={salon_name:business.name,address:business.address,phone:business.phone,email:business.email,whatsapp:business.whatsapp,instagram_url:business.instagramUrl,facebook_url:business.facebookUrl,schedule_notes:formatHours(DEFAULT_HOURS),payment_methods:'Efectivo, Tarjeta de crédito/débito, ATH Móvil',policies_text:'Se requiere depósito para servicios de $100 o más. Cancelaciones con menos de 24 horas de anticipación perderán el depósito. No shows perderán el 100% del pago.',hours:DEFAULT_HOURS}

function Configuracion(){
  const[settings,setSettings]=useState<SalonSettings>(DEFAULT_SETTINGS)
  const[hours,setHours]=useState<DayHours[]>(DEFAULT_HOURS)
  const[loading,setLoading]=useState(true)
  const[saving,setSaving]=useState(false)
  const[savedMsg,setSavedMsg]=useState('')

  useEffect(()=>{
    supabase.from('salon_settings').select('*').limit(1).maybeSingle().then(({data})=>{
      if(data) setSettings({...DEFAULT_SETTINGS,...data})
      if(data?.hours&&Array.isArray(data.hours)&&data.hours.length===7) setHours(data.hours)
      setLoading(false)
    })
  },[])

  function setDayHours(day:number,patch:Partial<DayHours>){
    setHours(list=>list.map(h=>h.day===day?{...h,...patch}:h))
  }

  async function save(e:React.FormEvent){
    e.preventDefault();setSaving(true)
    const toSave={...settings,hours,schedule_notes:formatHours(hours)}
    // upsert by checking if row exists
    const{data:existing}=await supabase.from('salon_settings').select('id').limit(1).maybeSingle()
    if(existing?.id){
      await supabaseAdmin.from('salon_settings').update(toSave).eq('id',existing.id)
    } else {
      await supabaseAdmin.from('salon_settings').insert([toSave])
    }
    setSettings(toSave)
    setSaving(false);setSavedMsg('Guardado ✓');setTimeout(()=>setSavedMsg(''),2500)
  }

  function Field({label,name,multiline,rows=3}:{label:string;name:Exclude<keyof SalonSettings,'hours'>;multiline?:boolean;rows?:number}){
    if(multiline) return(
      <div>
        <label style={lbl}>{label}</label>
        <textarea rows={rows} style={inp({resize:'none'})} value={settings[name]} onChange={e=>setSettings(s=>({...s,[name]:e.target.value}))}/>
      </div>
    )
    return(
      <div>
        <label style={lbl}>{label}</label>
        <input style={inp()} value={settings[name]} onChange={e=>setSettings(s=>({...s,[name]:e.target.value}))}/>
      </div>
    )
  }

  return(
    <div style={{padding:'0 16px 24px'}}>
      <h2 style={{fontFamily:ffS,fontSize:28,fontWeight:500,color:C.ink,marginBottom:20}}>Configuración</h2>
      {loading?<p style={{textAlign:'center',color:C.gray,fontSize:13}}>Cargando...</p>:(
        <form onSubmit={save} style={{display:'flex',flexDirection:'column',gap:14}}>
          <div style={glass({padding:18,borderRadius:16})}>
            <p style={{fontFamily:ffS,fontSize:17,color:C.gold,margin:'0 0 14px'}}>Información del Salón</p>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              <Field label="Nombre del salón" name="salon_name"/>
              <Field label="Dirección" name="address"/>
              <Field label="Teléfono" name="phone"/>
              <Field label="Correo electrónico" name="email"/>
            </div>
          </div>
          <div style={glass({padding:18,borderRadius:16})}>
            <p style={{fontFamily:ffS,fontSize:17,color:C.gold,margin:'0 0 14px'}}>Redes Sociales</p>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              <Field label="Instagram URL" name="instagram_url"/>
              <Field label="Facebook URL" name="facebook_url"/>
              <Field label="WhatsApp (número)" name="whatsapp"/>
            </div>
          </div>
          <div style={glass({padding:18,borderRadius:16})}>
            <p style={{fontFamily:ffS,fontSize:17,color:C.gold,margin:'0 0 14px'}}>Horarios y Operación</p>
            <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:14}}>
              {hours.map(h=>(
                <div key={h.day} style={{display:'flex',alignItems:'center',gap:8}}>
                  <span style={{width:78,flexShrink:0,fontSize:12,fontWeight:600,color:C.ink}}>{DAY_NAMES_SHORT[h.day]}</span>
                  {h.closed?(
                    <span style={{flex:1,fontSize:12,color:C.gray}}>Cerrado</span>
                  ):(
                    <>
                      <select style={{...inp({fontSize:12}),flex:1}} value={h.open} onChange={e=>setDayHours(h.day,{open:e.target.value})}>
                        {SCHEDULE_TIMES.map(t=><option key={t} value={t}>{t}</option>)}
                      </select>
                      <span style={{color:C.gray,fontSize:12}}>–</span>
                      <select style={{...inp({fontSize:12}),flex:1}} value={h.close} onChange={e=>setDayHours(h.day,{close:e.target.value})}>
                        {SCHEDULE_TIMES.map(t=><option key={t} value={t}>{t}</option>)}
                      </select>
                    </>
                  )}
                  <button type="button" onClick={()=>setDayHours(h.day,{closed:!h.closed})} title="Cerrado" style={{width:40,height:22,borderRadius:99,border:'none',cursor:'pointer',background:h.closed?C.red:'color-mix(in srgb, var(--ink) 20%, transparent)',position:'relative',transition:'background 0.2s',flexShrink:0}}>
                    <div style={{width:16,height:16,borderRadius:'50%',background:'#fff',position:'absolute',top:3,left:h.closed?21:3,transition:'left 0.2s'}}/>
                  </button>
                </div>
              ))}
              <p style={{fontSize:10,color:C.gray,margin:0}}>El interruptor rojo marca el día como cerrado. Esto es lo que ven los clientes en la página.</p>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              <Field label="Métodos de pago aceptados" name="payment_methods"/>
            </div>
          </div>
          <div style={glass({padding:18,borderRadius:16})}>
            <p style={{fontFamily:ffS,fontSize:17,color:C.gold,margin:'0 0 14px'}}>Políticas</p>
            <Field label="Texto de políticas (visible al agendar)" name="policies_text" multiline rows={5}/>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <button type="submit" disabled={saving} style={{padding:'13px 24px',borderRadius:12,background:'#1a0f14',color:'#fff',fontWeight:700,fontSize:14,border:'none',cursor:saving?'not-allowed':'pointer',opacity:saving?0.6:1,fontFamily:ff}}>{saving?'Guardando...':'Guardar cambios'}</button>
            {savedMsg&&<span style={{fontSize:13,color:C.green,fontWeight:600}}>{savedMsg}</span>}
          </div>
        </form>
      )}
    </div>
  )
}

export default function AdminPage(){
  const navigate=useNavigate()

  // Swap manifest so "Add to Home Screen" from /admin opens /admin directly
  useEffect(()=>{
    const el=document.querySelector('link[rel="manifest"]') as HTMLLinkElement|null
    if(el) el.href='/admin-manifest.json'
    return ()=>{ if(el) el.href='/manifest.json' }
  },[])

  const[panel,setPanel]=useState<'inicio'|'depositos'|'servicios'|'clientes'|'historial'|'disponibilidad'|'especialistas'|'perfil'|'productos'|'promociones'|'config'|'incompletas'|'notificaciones'>('inicio')
  const[moreOpen,setMoreOpen]=useState(false)
  // Deep link from a push/browser notification: /admin?b=<bookingId> opens that booking's detail directly.
  const[deepLinkId,setDeepLinkId]=useState<string|null>(()=>{
    if(typeof window==='undefined')return null
    try{return new URLSearchParams(window.location.search).get('b')}catch{return null}
  })
  const[bookings,setBookings]=useState<Booking[]>([])
  const[bookingServices,setBookingServices]=useState<BookingServiceRow[]>([])
  const[specialistsFull,setSpecialistsFull]=useState<SpecialistLite[]>([])
  const svcMap=useMemo(()=>{
    const m=new Map<string,BookingServiceRow[]>()
    for(const r of bookingServices){ m.set(r.booking_id,[...(m.get(r.booking_id)??[]),r]) }
    return m
  },[bookingServices])
  const[services,setServices]=useState<Service[]>([])
  const[loading,setLoading]=useState(true)
  const[refreshing,setRefreshing]=useState(false)
  const[authChecked,setAuthChecked]=useState(false)
  const[dark,setDark]=useState(()=>{try{return localStorage.getItem('suitcase-admin-dark')==='true'}catch{return false}})
  const[notifPerm,setNotifPerm]=useState<NotificationPermission>('default')
  const[newBookingBanner,setNewBookingBanner]=useState<Booking|null>(null)
  // Profile / role
  const[userRole,setUserRole]=useState<'admin'|'specialist'|'agenda'>('specialist')
  const[userFullName,setUserFullName]=useState('')
  const[userId,setUserId]=useState('')

  useEffect(()=>{
    supabase.auth.getSession().then(async ({data})=>{
      if(!data.session){navigate({to:'/login'});return}
      const uid=data.session.user.id
      setUserId(uid)
      const{data:prof}=await supabase.from('profiles').select('*').eq('id',uid).single()
      if(prof){
        // Archived specialists/agenda accounts cannot access the panel
        if((prof as Profile).role!=='admin'&&(prof as Profile).active===false){
          await supabase.auth.signOut();navigate({to:'/login'});return
        }
        setUserRole((prof as Profile).role)
        setUserFullName((prof as Profile).full_name ?? '')
        writeLog(uid,(prof as Profile).full_name??'','login',(prof as Profile).role==='admin'?'Admin':(prof as Profile).role==='agenda'?'Agenda':'Especialista')
      }
      setAuthChecked(true);loadAll()
    })
  },[])

  useEffect(()=>{
    if(!authChecked)return
    if('Notification' in window) setNotifPerm(Notification.permission)

    function notify(b:Booking){
      if(!('Notification' in window)||Notification.permission!=='granted')return
      const n=new Notification(`Nueva cita — ${business.name}`,{
        body:`${b.name} · ${b.service||'Sin servicio'}\n${fmtDateLong(b.date)} a las ${b.time}`,
        icon:'/favicon.ico',
        badge:'/favicon.ico',
        tag:`booking-${b.id}`,
        requireInteraction:true,
      })
      n.onclick=()=>{window.focus();n.close()}
    }

    function onNewBooking(b:Booking){
      // Same routing rule as the push webhook: admin sees every booking,
      // a specialist only sees it once it's actually assigned to her.
      const relevant=userRole==='admin'||(!!b.specialist&&b.specialist.includes(userFullName))
      if(relevant){notify(b);setNewBookingBanner(b)}
      loadAll()
    }

    let ch=supabase.channel('admin-bookings')
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'bookings'},payload=>{
        onNewBooking(payload.new as Booking)
      })
      .subscribe((status)=>{
        if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'){
          supabase.removeChannel(ch)
          ch=supabase.channel('admin-bookings-retry')
            .on('postgres_changes',{event:'INSERT',schema:'public',table:'bookings'},payload=>{
              onNewBooking(payload.new as Booking)
            }).subscribe()
        }
      })
    return()=>{supabase.removeChannel(ch)}
  },[authChecked])

  async function loadAll(){
    setRefreshing(true)
    const[bRes,sRes,bsRes,spRes]=await Promise.all([
      supabase.from('bookings').select('*').order('date',{ascending:true}).order('time',{ascending:true}),
      supabase.from('services').select('*').order('display_order',{ascending:true}),
      supabase.from('booking_services').select('*'),
      supabase.from('profiles').select('id,full_name').eq('role','specialist').eq('active',true),
    ])
    setBookings(bRes.data??[])
    setServices(sRes.data??[])
    setBookingServices(bsRes.data??[])
    setSpecialistsFull((spRes.data??[]) as SpecialistLite[])
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(()=>{
    document.documentElement.dataset.dark=String(dark)
  },[dark])

  async function requestNotif(){
    if(!('Notification' in window))return
    if(Notification.permission==='denied'){alert('Las notificaciones están bloqueadas. Ve a Configuración del navegador   Notificaciones y permítelas para este sitio.');return}
    const p=await Notification.requestPermission()
    setNotifPerm(p)
    if(p!=='granted')return
    // Register service worker and subscribe to push
    try{
      const reg=await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      // Check if already subscribed
      let sub=await reg.pushManager.getSubscription()
      if(!sub){
        sub=await reg.pushManager.subscribe({
          userVisibleOnly:true,
          applicationServerKey:import.meta.env.VITE_VAPID_PUBLIC,
        })
      }
      const json=sub.toJSON()
      const{data:authData}=await supabase.auth.getUser()
      await supabaseAdmin.from('push_subscriptions').upsert({
        endpoint:json.endpoint!,
        p256dh:(json.keys as Record<string,string>).p256dh,
        auth:(json.keys as Record<string,string>).auth,
        user_id:authData?.user?.id??null,
      },{onConflict:'endpoint',ignoreDuplicates:false})
    }catch(e){console.error('SW/push error',e)}
  }
  function toggleDark(){setDark(d=>{const n=!d;try{localStorage.setItem('suitcase-admin-dark',String(n))}catch{};return n})}
  async function handleLogout(){await supabase.auth.signOut();navigate({to:'/login'})}

  const[showSetup,setShowSetup]=useState(false)
  const[showTour,setShowTour]=useState(false)
  useEffect(()=>{
    if(!authChecked||!userId)return
    if(!userFullName){
      setShowSetup(true)
      return
    }
    // Show tour if this user hasn't dismissed it yet (tracked per-user in localStorage) —
    // skipped for 'agenda' since its copy is written for admin/specialist workflows.
    const tourKey='suitcase-admin-tour-seen-'+userId
    if(userRole!=='agenda'&&!localStorage.getItem(tourKey)){
      setShowTour(true)
    }
  },[authChecked,userId,userFullName,userRole])

  function onSetupDone(fullName:string){
    setUserFullName(fullName)
    setShowSetup(false)
    setShowTour(true)
  }
  function dismissTour(){
    try{localStorage.setItem('suitcase-admin-tour-seen-'+userId,'1')}catch{}
    setShowTour(false)
  }

  if(!authChecked) return(
    <div style={{minHeight:'100vh',background:dark?'#1e1015':'#feeff2',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <style>{THEME}</style>
      <p style={{fontFamily:ffS,fontSize:20,color:dark?'#ffa8c6':'#8C6E63'}}>Verificando...</p>
    </div>
  )

  if(showSetup) return(
    <>
      <style>{THEME}</style>
      <div data-dark={String(dark)}>
        <SetupForm userId={userId} userRole={userRole} onDone={onSetupDone}/>
      </div>
    </>
  )

  if(userRole==='agenda') return <AgendaOnlyPage userFullName={userFullName} onLogout={handleLogout} dark={dark} toggleDark={toggleDark}/>

  const isAdmin=userRole==='admin'
  const visibleBookings=isAdmin?bookings:bookings.filter(b=>serviceBreakdown(b,svcMap).some(s=>s.specialist===userFullName))

  const nav=isAdmin?[
    {id:'inicio' as const,        label:'Inicio',      icon:<Ic.Calendar size={20}/>},
    {id:'notificaciones' as const,label:'Notis',       icon:<Ic.Bell size={20}/>},
    {id:'depositos' as const,     label:'Depósitos',   icon:<Ic.Dollar size={20}/>},
    {id:'clientes' as const,      label:'Clientes',    icon:<Ic.Users size={20}/>},
    {id:'especialistas' as const, label:'Equipo',      icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>},
    {id:'servicios' as const,     label:'Servicios',   icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>},
    {id:'historial' as const,     label:'Historial',   icon:<Ic.Archive size={20}/>},
    {id:'productos' as const,     label:'Productos',   icon:<Ic.Package size={20}/>},
    {id:'promociones' as const,   label:'Promos',      icon:<Ic.Tag size={20}/>},
    {id:'incompletas' as const,   label:'Incompletas', icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 8 12 12 14 14"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>},
    {id:'config' as const,        label:'Config',      icon:<Ic.Settings size={20}/>},
  ]:[
    {id:'inicio' as const,        label:'Inicio',      icon:<Ic.Calendar size={20}/>},
    {id:'notificaciones' as const,label:'Notis',       icon:<Ic.Bell size={20}/>},
    {id:'clientes' as const,      label:'Clientes',    icon:<Ic.Users size={20}/>},
    {id:'historial' as const,     label:'Historial',   icon:<Ic.Archive size={20}/>},
    {id:'perfil' as const,label:'Mi Perfil',icon:<svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'><path d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'/><circle cx='12' cy='7' r='4'/></svg>},
    {id:'disponibilidad' as const,label:'Disponib.',   icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>},
  ]

  return(
    <>
      <style>{THEME}</style>
      {showTour&&<OnboardingTour role={userRole} onDone={dismissTour}/>}
      <div data-dark={String(dark)} style={{minHeight:'100vh',background:`linear-gradient(145deg, var(--bg) 0%, var(--bg2) 100%)`,fontFamily:ff,paddingBottom:100}}>

        {newBookingBanner&&(
          <div onClick={()=>setNewBookingBanner(null)} style={{position:'fixed',top:16,left:'50%',transform:'translateX(-50%)',zIndex:9999,background:'#1a0f14',color:'#fff',borderRadius:14,padding:'14px 20px',boxShadow:'0 8px 32px rgba(0,0,0,0.25)',cursor:'pointer',maxWidth:340,width:'calc(100% - 32px)',display:'flex',gap:12,alignItems:'flex-start'}}>
            <Ic.Bell size={20} style={{flexShrink:0}} color="#fff"/>
            <div style={{flex:1}}>
              <p style={{margin:0,fontWeight:700,fontSize:14,fontFamily:ffS}}>Nueva cita</p>
              <p style={{margin:'2px 0 0',fontSize:13,opacity:0.85}}>{newBookingBanner.name} · {newBookingBanner.service||'Sin servicio'}</p>
              <p style={{margin:'1px 0 0',fontSize:12,opacity:0.7}}>{fmtDateLong(newBookingBanner.date)} a las {newBookingBanner.time}</p>
            </div>
            <Ic.X size={16} color="#2E1B14" style={{opacity:0.6,flexShrink:0}}/>
          </div>
        )}

        {/* ── Desktop Sidebar ── */}
        <aside className="admin-sidebar" style={{background:C.navBg,backdropFilter:'blur(28px)',WebkitBackdropFilter:'blur(28px)',borderRight:`1px solid color-mix(in srgb, var(--rosa) 16%, transparent)`}}>
          {/* Brand */}
          <div style={{padding:'24px 12px 20px',borderBottom:`1px solid color-mix(in srgb, var(--rosa) 12%, transparent)`}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:36,height:36,borderRadius:10,background:`color-mix(in srgb, var(--rosa) 18%, transparent)`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <Ic.Scissors size={18} color={C.rosa}/>
              </div>
              <div>
                <span style={{fontFamily:ffS,fontSize:17,fontWeight:500,color:C.ink,display:'block',lineHeight:1}}>{business.shortName} <span style={{color:C.rosa}}>{business.tagline}</span></span>
                <span style={{fontSize:10,color:C.gray,fontWeight:500,marginTop:2,display:'block'}}>Panel de administración</span>
              </div>
            </div>
            {userFullName&&(
              <div style={{marginTop:14,padding:'10px 12px',borderRadius:10,background:`color-mix(in srgb, var(--gold) 8%, transparent)`,display:'flex',alignItems:'center',gap:8}}>
                <div style={{width:28,height:28,borderRadius:'50%',background:`color-mix(in srgb, var(--gold) 22%, transparent)`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontFamily:ffS,fontSize:13,fontWeight:700,color:C.gold}}>{userFullName.charAt(0)}</div>
                <div style={{minWidth:0}}>
                  <p style={{fontSize:12,fontWeight:600,color:C.ink,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{userFullName}</p>
                  <p style={{fontSize:10,color:C.gray,margin:0}}>{isAdmin?'Administrador/a':'Especialista'}</p>
                </div>
              </div>
            )}
          </div>
          {/* Nav items */}
          <div style={{flex:1,display:'flex',flexDirection:'column',gap:1,padding:'12px 0'}}>
            {/* Group label for admin — first 4 are main, rest are secondary */}
            {isAdmin&&<p style={{fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.12em',color:C.gray,padding:'4px 12px 6px',margin:0,opacity:0.7}}>Principal</p>}
            {nav.slice(0,4).map(({id,label,icon})=>{
              const active=panel===id
              return(
                <button key={id} onClick={()=>{setPanel(id);setMoreOpen(false)}} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 12px',borderRadius:10,border:'none',cursor:'pointer',fontFamily:ff,background:active?`color-mix(in srgb, var(--rosa) 13%, transparent)`:'transparent',color:active?C.rosa:C.gray,transition:'all .15s',textAlign:'left',width:'100%',position:'relative'}}>
                  {active&&<span style={{position:'absolute',left:0,top:'20%',bottom:'20%',width:3,borderRadius:99,background:C.rosa}}/>}
                  <span style={{display:'flex',flexShrink:0,color:'inherit',opacity:active?1:0.8}}>{icon}</span>
                  <span style={{fontSize:13,fontWeight:active?700:400,letterSpacing:'0.01em'}}>{label}</span>
                </button>
              )
            })}
            {isAdmin&&nav.length>4&&(
              <>
                <p style={{fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.12em',color:C.gray,padding:'14px 12px 6px',margin:0,opacity:0.7}}>Gestión</p>
                {nav.slice(4).map(({id,label,icon})=>{
                  const active=panel===id
                  return(
                    <button key={id} onClick={()=>{setPanel(id);setMoreOpen(false)}} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 12px',borderRadius:10,border:'none',cursor:'pointer',fontFamily:ff,background:active?`color-mix(in srgb, var(--rosa) 13%, transparent)`:'transparent',color:active?C.rosa:C.gray,transition:'all .15s',textAlign:'left',width:'100%',position:'relative'}}>
                      {active&&<span style={{position:'absolute',left:0,top:'20%',bottom:'20%',width:3,borderRadius:99,background:C.rosa}}/>}
                      <span style={{display:'flex',flexShrink:0,color:'inherit',opacity:active?1:0.8}}>{icon}</span>
                      <span style={{fontSize:13,fontWeight:active?700:400,letterSpacing:'0.01em'}}>{label}</span>
                    </button>
                  )
                })}
              </>
            )}
            {/* Specialist nav (all items) */}
            {!isAdmin&&nav.slice(4).map(({id,label,icon})=>{
              const active=panel===id
              return(
                <button key={id} onClick={()=>{setPanel(id);setMoreOpen(false)}} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 12px',borderRadius:10,border:'none',cursor:'pointer',fontFamily:ff,background:active?`color-mix(in srgb, var(--rosa) 13%, transparent)`:'transparent',color:active?C.rosa:C.gray,transition:'all .15s',textAlign:'left',width:'100%',position:'relative'}}>
                  {active&&<span style={{position:'absolute',left:0,top:'20%',bottom:'20%',width:3,borderRadius:99,background:C.rosa}}/>}
                  <span style={{display:'flex',flexShrink:0,color:'inherit',opacity:active?1:0.8}}>{icon}</span>
                  <span style={{fontSize:13,fontWeight:active?700:400,letterSpacing:'0.01em'}}>{label}</span>
                </button>
              )
            })}
          </div>
        </aside>

        <header className="admin-header-wrap" style={{position:'sticky',top:0,zIndex:100,background:C.headerBg,backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',borderBottom:`1px solid color-mix(in srgb, var(--rosa) 22%, transparent)`,padding:`calc(env(safe-area-inset-top,0px) + 12px) 20px 12px`}}>
          <div className="admin-header-inner" style={{maxWidth:680,margin:'0 auto',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div className="admin-header-logo" style={{display:'flex',flexDirection:'column',lineHeight:1}}>
              <span style={{fontFamily:ffS,fontSize:20,fontWeight:500,color:C.ink}}>{business.shortName} <span style={{color:C.rosa,fontStyle:'italic'}}>{business.tagline}</span></span>
              {userFullName&&<span style={{fontSize:10,color:C.gray,fontWeight:600,marginTop:2}}>{userFullName}  {isAdmin?'Administrador/a':'Especialista'}</span>}
            </div>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <button onClick={requestNotif} title={notifPerm==='granted'?'Notificaciones activas':notifPerm==='denied'?'Notificaciones bloqueadas  toca para instrucciones':'Activar notificaciones'} style={{position:'relative',background:'none',border:'none',cursor:'pointer',padding:7,display:'flex',borderRadius:8}}>
                <Ic.Bell size={18} color={notifPerm==='granted'?C.gold:C.gray}/>
                {notifPerm!=='granted'&&<span style={{position:'absolute',top:5,right:5,width:7,height:7,borderRadius:'50%',background:notifPerm==='denied'?C.red:C.gold,border:`1.5px solid ${C.bg}`}}/>}
              </button>
              <button onClick={toggleDark} style={{background:'none',border:'none',cursor:'pointer',padding:7,display:'flex',borderRadius:8}}>
                {dark?<Ic.Sun size={18} color={C.gold}/>:<Ic.Moon size={18} color={C.gray}/>}
              </button>
              <button onClick={loadAll} style={{background:'none',border:'none',cursor:'pointer',padding:7,display:'flex',borderRadius:8}}>
                <Ic.Refresh size={17} color={C.gray} style={{animation:refreshing?'spin 0.8s linear infinite':undefined}}/>
              </button>
              <button onClick={handleLogout} className="mob-hide" style={{display:'flex',alignItems:'center',gap:5,fontSize:11,fontWeight:700,color:C.gray,background:'none',border:`1.5px solid color-mix(in srgb, var(--gray) 35%, transparent)`,borderRadius:99,padding:'5px 10px',cursor:'pointer',fontFamily:ff}}>
                <Ic.Logout size={13} color={C.gray}/> Salir
              </button>
            </div>
          </div>
        </header>

        <div className="admin-body-wrap">
        <div key={panel} className="admin-content" style={{maxWidth:680,margin:'0 auto',paddingTop:20,animation:'kFadeIn 0.18s ease-out both'}}>
          {panel==='inicio'         &&<Dashboard bookings={visibleBookings} loading={loading} services={services} isAdmin={isAdmin} onRefresh={loadAll} svcMap={svcMap} specialistsFull={specialistsFull} viewerName={userFullName} autoOpenId={deepLinkId} onAutoOpenConsumed={()=>{setDeepLinkId(null);try{window.history.replaceState(null,'','/admin')}catch{}}} onOpenNotifications={()=>setPanel('notificaciones')}/>}
          {panel==='notificaciones' &&<Notificaciones isAdmin={isAdmin} userFullName={userFullName} onNavigateBooking={(id)=>{setDeepLinkId(id);setPanel('inicio')}} onNavigatePanel={(p)=>setPanel(p)}/>}
          {panel==='historial'      &&isAdmin&&<LogHistorial/>}
          {panel==='depositos'      &&isAdmin&&<Depositos/>}
          {panel==='servicios'      &&isAdmin&&<Servicios services={services} onRefresh={loadAll}/>}
          {panel==='clientes'       &&<Clientes bookings={visibleBookings} onRefresh={loadAll} isAdmin={isAdmin} services={services}/>}
          {panel==='historial'      &&<Historial bookings={visibleBookings}/>}
          {panel==='disponibilidad' &&<Disponibilidad isAdmin={isAdmin} userFullName={userFullName} bookings={bookings}/>}
          {panel==='perfil'         &&!isAdmin&&<MiPerfil/>}
          {panel==='especialistas'  &&isAdmin&&<EspecialistasPanel bookings={bookings} svcMap={svcMap} services={services}/>}
          {panel==='productos'      &&isAdmin&&<Productos/>}
          {panel==='promociones'    &&isAdmin&&<Promociones/>}
          {panel==='incompletas'    &&isAdmin&&<Incompletas/>}
          {panel==='config'         &&isAdmin&&<Configuracion/>}
        </div>
        </div>

        {/* "Ver más" upward drawer */}
        {moreOpen&&(
          <div className="admin-more-drawer">
            <div onClick={()=>setMoreOpen(false)} style={{position:'fixed',inset:0,zIndex:198,background:'rgba(42,26,32,0.28)',backdropFilter:'blur(2px)',WebkitBackdropFilter:'blur(2px)'}}/>
            <div style={{
              position:'fixed',bottom:'calc(env(safe-area-inset-bottom,0px) + 88px)',left:'50%',transform:'translateX(-50%)',
              zIndex:199,
              background:dark?'rgba(30,16,21,0.92)':'rgba(254,239,242,0.92)',
              backdropFilter:'blur(40px) saturate(200%)',WebkitBackdropFilter:'blur(40px) saturate(200%)',
              border:`1px solid ${dark?'rgba(255,168,198,0.18)':'rgba(255,255,255,0.7)'}`,
              borderRadius:20,
              padding:'8px 6px',
              boxShadow:'0 -4px 32px rgba(42,26,32,0.18), inset 0 1px 0 rgba(255,255,255,0.6)',
              display:'flex',flexDirection:'column',gap:2,
              minWidth:180,
              animation:'kMoreIn 0.18s ease-out both',
            }}>
              {nav.filter((_,i)=>i>=4).map(({id,label,icon})=>{
                const active=panel===id
                return(
                  <button key={id} onClick={()=>{setPanel(id);setMoreOpen(false)}} style={{
                    display:'flex',alignItems:'center',gap:12,
                    padding:'12px 16px',borderRadius:14,border:'none',cursor:'pointer',fontFamily:ff,
                    background:active?(dark?'rgba(255,168,198,0.15)':'rgba(255,168,198,0.18)'):'transparent',
                    color:active?C.rosa:(dark?'rgba(245,238,240,0.75)':'rgba(42,26,32,0.7)'),
                    transition:'background .15s, color .15s',
                    textAlign:'left',
                  }}>
                    <span style={{display:'flex',color:'inherit',opacity:active?1:0.7}}>{icon}</span>
                    <span style={{fontSize:13,fontWeight:active?700:500,letterSpacing:'0.02em'}}>{label}</span>
                  </button>
                )
              })}
              <div style={{height:1,background:dark?'rgba(255,168,198,0.15)':'rgba(42,26,32,0.08)',margin:'4px 8px'}}/>
              <button onClick={()=>{setMoreOpen(false);handleLogout()}} style={{
                display:'flex',alignItems:'center',gap:12,
                padding:'12px 16px',borderRadius:14,border:'none',cursor:'pointer',fontFamily:ff,
                background:'transparent',color:C.red,
                textAlign:'left',
              }}>
                <span style={{display:'flex',color:'inherit',opacity:0.85}}><Ic.Logout size={17} color={C.red}/></span>
                <span style={{fontSize:13,fontWeight:500,letterSpacing:'0.02em'}}>Salir</span>
              </button>
            </div>
          </div>
        )}

        {/* Floating pill nav */}
        <nav className="admin-pill-nav" style={{
          position:'fixed',
          bottom:`calc(env(safe-area-inset-bottom,0px) + 16px)`,
          left:'50%',transform:'translateX(-50%)',
          zIndex:200,
          display:'flex',alignItems:'center',
          gap:2,
          padding:'6px 8px',
          borderRadius:32,
          background:dark?'rgba(30,16,21,0.75)':'rgba(255,245,250,0.22)',
          backdropFilter:'blur(48px) saturate(220%) brightness(1.04)',
          WebkitBackdropFilter:'blur(48px) saturate(220%) brightness(1.04)',
          border:dark?'1px solid rgba(255,168,198,0.20)':'1px solid rgba(255,255,255,0.60)',
          boxShadow:[
            dark?'0 2px 24px rgba(0,0,0,0.30)':'0 2px 24px rgba(42,26,32,0.10)',
            'inset 0 1.5px 0 rgba(255,255,255,0.70)',
            'inset 0 -1px 0 rgba(0,0,0,0.04)',
          ].join(','),
        }}>
          {nav.slice(0,4).map(({id,label,icon})=>{
            const active=panel===id
            return(
              <button key={id} onClick={()=>{setPanel(id);setMoreOpen(false)}} className="mob-pill-btn" style={{
                display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                gap:3,border:'none',cursor:'pointer',padding:'7px 12px',
                borderRadius:24,fontFamily:ff,
                background:active?(dark?'rgba(255,168,198,0.22)':'rgba(42,26,32,0.84)'):'transparent',
                boxShadow:active?'0 1px 4px rgba(0,0,0,0.18),inset 0 1px 0 rgba(255,255,255,0.12)':'none',
                color:active?(dark?C.rosa:'#fff'):(dark?'rgba(245,238,240,0.50)':'rgba(42,26,32,0.50)'),
                transition:'background .20s,color .20s,box-shadow .20s',
                minWidth:52,
              }}>
                <span style={{display:'flex',color:'inherit'}}>{icon}</span>
                <span className="mob-nav-lbl" style={{fontSize:9,fontWeight:active?700:500,letterSpacing:'0.04em',whiteSpace:'nowrap'}}>{label}</span>
              </button>
            )
          })}

          {/* Ver más */}
          {nav.length>4&&(
            <button onClick={()=>setMoreOpen(v=>!v)} className="mob-pill-btn" style={{
              display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
              gap:3,border:'none',cursor:'pointer',padding:'7px 12px',
              borderRadius:24,fontFamily:ff,
              background:moreOpen?(dark?'rgba(255,168,198,0.22)':'rgba(42,26,32,0.84)'):'transparent',
              color:moreOpen?(dark?C.rosa:'#fff'):(dark?'rgba(245,238,240,0.50)':'rgba(42,26,32,0.50)'),
              transition:'background .20s,color .20s',
              minWidth:52,
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none"/>
                <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>
                <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none"/>
              </svg>
              <span className="mob-nav-lbl" style={{fontSize:9,fontWeight:500,letterSpacing:'0.04em',whiteSpace:'nowrap'}}>Ver más</span>
            </button>
          )}
        </nav>
      </div>
    </>
  )
}