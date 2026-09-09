// Generic push endpoint for admin.tsx actions that aren't a brand-new
// booking (cancelación, reagendada, aprobación/rechazo de bloqueo o de
// servicio nuevo). Called directly from the browser with the service_role
// key as Bearer token — same key admin.tsx already uses for supabaseAdmin,
// so no new secret exposure beyond what already exists in this app.
//
// POST body:
// {
//   title: string, body: string, tag?: string, bookingId?: string,
//   target: { role: "admin" }
//         | { role: "specialist", name: string }
//         | { role: "admin_and_specialist", name: string }
// }

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

type Target =
  | { role: "admin" }
  | { role: "specialist"; name: string }
  | { role: "admin_and_specialist"; name: string };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const authHeader = req.headers["authorization"] || "";
  const expected = process.env.SUPABASE_SERVICE_KEY;
  if (!expected || !authHeader.includes(expected)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { title, body, tag, bookingId, target } = req.body as {
    title?: string;
    body?: string;
    tag?: string;
    bookingId?: string;
    target?: Target;
  };
  if (!title || !body || !target) return res.status(400).json({ error: "Missing title/body/target" });

  const { data: allSubs } = await supabase.from("push_subscriptions").select("*");
  if (!allSubs || allSubs.length === 0) return res.status(200).json({ sent: 0 });

  const userIds = [...new Set(allSubs.map((s) => s.user_id).filter(Boolean))];
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, role, full_name").in("id", userIds)
    : { data: [] as { id: string; role: string; full_name: string }[] };
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  // Subscriptions with no linked profile (saved before user_id was tracked,
  // or the specialist just never got matched) fall back to "eligible for
  // admin-targeted pushes" — same convention as send-push.ts — but never
  // for a specialist-only target, since we can't tell who they belong to.
  const subs = allSubs.filter((s) => {
    const profile = s.user_id ? profileById.get(s.user_id) : undefined;
    if (target.role === "admin") return !profile || profile.role === "admin";
    if (target.role === "specialist") return !!profile && profile.role === "specialist" && profile.full_name === target.name;
    return !profile || profile.role === "admin" || (profile.role === "specialist" && profile.full_name === target.name);
  });
  if (subs.length === 0) return res.status(200).json({ sent: 0 });

  const payload = JSON.stringify({ title, body, tag: tag ?? `notify-${Date.now()}`, bookingId });

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

  return res.status(200).json({ sent: results.filter((r) => r.status === "fulfilled").length, attempted: results.length });
}
