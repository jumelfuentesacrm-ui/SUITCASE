import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @ts-ignore
import webpush from "https://esm.sh/web-push@3.6.7";

const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC")!;
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const OWNER_NOTIFICATION_EMAIL = Deno.env.get("OWNER_NOTIFICATION_EMAIL") || "admin@example.com";
webpush.setVapidDetails(`mailto:${OWNER_NOTIFICATION_EMAIL}`, VAPID_PUBLIC, VAPID_PRIVATE);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }

  try {
    const body = await req.json();
    const record = body.record ?? body;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: subs, error } = await supabase.from("push_subscriptions").select("*");

    if (error) return new Response(`DB error: ${error.message}`, { status: 500 });
    if (!subs || subs.length === 0) return new Response("no subscriptions", { status: 200 });

    const payload = JSON.stringify({
      title: "Nueva cita — Kyomu 🔔",
      body: `${record.name} · ${record.service || "Sin servicio"}\n${record.date} a las ${record.time}`,
      tag: `booking-${record.id}`,
    });

    const results = await Promise.allSettled(
      subs.map((s: { endpoint: string; p256dh: string; auth: string }) =>
        webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload
        )
      )
    );

    // Remove stale subscriptions (410 Gone)
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === "rejected" && r.reason?.statusCode === 410) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", subs[i].endpoint);
      }
    }

    return new Response(JSON.stringify({ sent: results.length }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(String(e), { status: 500 });
  }
});
