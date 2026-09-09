// Runs once a day via Vercel Cron (see vercel.json) — does two jobs back to
// back to stay within the Hobby plan's serverless-function/cron limits:
// 1. Marks past confirmed bookings as completed (formerly its own function,
//    api/auto-complete-bookings.ts — merged in here after that extra
//    function pushed the project over Vercel's function-count limit and
//    silently broke every deploy for 3 days).
// 2. Sends the admin a morning digest of pending/today/block-request counts.
// Vercel calls this automatically with `Authorization: Bearer <CRON_SECRET>`
// when CRON_SECRET is set as an env var — no manual trigger needed.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

webpush.setVapidDetails(
  "mailto:" + (process.env.OWNER_NOTIFICATION_EMAIL || "admin@example.com"),
  process.env.VAPID_PUBLIC!,
  process.env.VAPID_PRIVATE!
);

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

function timeToMins(t: string): number {
  const m = t.match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (!m) return 0;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ap = m[3]?.toUpperCase();
  if (ap === "PM" && h !== 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return h * 60 + min;
}

async function sendAdminPush(title: string, body: string, tag: string) {
  const { data: allSubs } = await supabase.from("push_subscriptions").select("*");
  if (!allSubs || allSubs.length === 0) return;
  const userIds = [...new Set(allSubs.map((s) => s.user_id).filter(Boolean))];
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, role").in("id", userIds)
    : { data: [] as { id: string; role: string }[] };
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const subs = allSubs.filter((s) => {
    const profile = s.user_id ? profileById.get(s.user_id) : undefined;
    return !profile || profile.role === "admin";
  });
  if (subs.length === 0) return;

  const payload = JSON.stringify({ title, body, tag });
  const results = await Promise.allSettled(
    subs.map((s: { endpoint: string; p256dh: string; auth: string }) =>
      webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload)
    )
  );
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "rejected" && (r.reason as any)?.statusCode === 410) {
      await supabase.from("push_subscriptions").delete().eq("endpoint", subs[i].endpoint);
    }
  }
}

async function autoCompleteBookings(todayStr: string, nowMins: number) {
  const { data: candidates } = await supabase
    .from("bookings")
    .select("id, name, service, date, time")
    .eq("status", "confirmed")
    .lte("date", todayStr);

  const due = (candidates ?? []).filter((b) => b.date < todayStr || timeToMins(b.time) <= nowMins);
  if (due.length === 0) return;

  await supabase.from("bookings").update({ status: "completed" }).in("id", due.map((b) => b.id));

  const names = due.slice(0, 5).map((b) => b.name).join(", ") + (due.length > 5 ? ` +${due.length - 5} más` : "");
  const title = "Citas completadas automáticamente";
  const bodyText = `${due.length} cita${due.length === 1 ? "" : "s"}: ${names}`;

  await supabase.from("notifications").insert([{
    title,
    body: bodyText,
    kind: "auto_completed",
    target_role: "admin",
    ref_date: todayStr,
  }]);

  await sendAdminPush(title, bodyText, `auto-completed-${todayStr}`);
}

async function dailyDigest(todayStr: string) {
  const [{ count: pendingCount }, { count: todayCount }, { data: pendingBlocks }] = await Promise.all([
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("date", todayStr).neq("status", "cancelled"),
    supabase.from("availability_blocks").select("id").eq("status", "pending"),
  ]);

  const pending = pendingCount ?? 0;
  const todays = todayCount ?? 0;
  const blockRequests = pendingBlocks?.length ?? 0;
  if (pending === 0 && todays === 0 && blockRequests === 0) return;

  const parts: string[] = [];
  if (pending > 0) parts.push(`Citas nuevas: ${pending}`);
  if (todays > 0) parts.push(`Hoy: ${todays}`);
  if (blockRequests > 0) parts.push(`Bloqueos: ${blockRequests}`);

  await sendAdminPush("Resumen del día", parts.join(" - "), `daily-summary-${todayStr}`);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers["authorization"] || "";
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && !authHeader.includes(cronSecret)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Puerto Rico is UTC-4 year-round (no DST).
  const astNow = new Date(Date.now() - 4 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const todayStr = `${astNow.getUTCFullYear()}-${pad(astNow.getUTCMonth() + 1)}-${pad(astNow.getUTCDate())}`;
  const nowMins = astNow.getUTCHours() * 60 + astNow.getUTCMinutes();

  await autoCompleteBookings(todayStr, nowMins);
  await dailyDigest(todayStr);

  return res.status(200).json({ ok: true });
}
