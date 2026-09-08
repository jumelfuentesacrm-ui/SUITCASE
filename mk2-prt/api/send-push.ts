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

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
function fmtDateLong(d: string): string {
  const [y, m, day] = d.split("-").map(Number);
  return `${DIAS[new Date(y, m - 1, day).getDay()]} ${day} de ${MESES[m - 1]} ${y}`;
}

// Best-effort WhatsApp admin notification — a no-op until WHATSAPP_* env vars
// exist (see SETUP.md section 5). Never throws.
async function notifyAdminWhatsApp(record: { name: string; service?: string; date: string; time: string }) {
  try {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const token = process.env.WHATSAPP_TOKEN;
    const adminPhone = process.env.WHATSAPP_ADMIN_PHONE;
    if (!phoneNumberId || !token || !adminPhone) return;
    const templateName = process.env.WHATSAPP_TEMPLATE_ADMIN_NEW_BOOKING || "nueva_cita_admin";
    await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: adminPhone,
        type: "template",
        template: {
          name: templateName,
          language: { code: "es" },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: record.name },
                { type: "text", text: record.service || "Sin servicio" },
                { type: "text", text: fmtDateLong(record.date) },
                { type: "text", text: record.time },
              ],
            },
          ],
        },
      }),
    });
  } catch {}
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  // Verify it's from Supabase webhook
  const authHeader = req.headers["authorization"] || "";
  const expected = process.env.SUPABASE_SERVICE_KEY;
  if (!expected || !authHeader.includes(expected)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const body = req.body;
  const record = body.record ?? body;

  notifyAdminWhatsApp(record).catch(() => {});

  const { data: allSubs, error } = await supabase.from("push_subscriptions").select("*");
  if (error) return res.status(500).json({ error: error.message });
  if (!allSubs || allSubs.length === 0) return res.status(200).json({ sent: 0 });

  // Admin gets notified of every booking; a specialist only gets notified
  // when the booking is actually assigned to her. Subscriptions with no
  // matching profile (saved before user_id was tracked) fall back to
  // "notify anyway" so nobody silently stops getting pushes.
  const userIds = [...new Set(allSubs.map((s) => s.user_id).filter(Boolean))];
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, role, full_name").in("id", userIds)
    : { data: [] as { id: string; role: string; full_name: string }[] };
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const bookingSpecialists: string = record.specialist || "";
  const subs = allSubs.filter((s) => {
    if (!s.user_id) return true;
    const profile = profileById.get(s.user_id);
    if (!profile) return true;
    if (profile.role === "admin") return true;
    return bookingSpecialists.includes(profile.full_name);
  });
  if (subs.length === 0) return res.status(200).json({ sent: 0 });

  const isVipRequest = record.status === "vip_pending";
  const title = isVipRequest ? "Solicitud de Horario VIP" : "Cita nueva";
  const bodyText = isVipRequest
    ? `${record.name} - ${record.service || "Sin servicio"} - ${fmtDateLong(record.date)} a las ${record.time} (fuera de horario regular)`
    : `${record.name} - ${record.service || "Sin servicio"} - ${fmtDateLong(record.date)} a las ${record.time}`;
  const payload = JSON.stringify({
    title,
    body: bodyText,
    tag: `booking-${record.id}`,
    bookingId: record.id,
  });

  // A VIP request is only ever relevant to admin (it hasn't been assigned/
  // confirmed yet) and requires an approve/reject action, unlike a normal
  // new-booking notification which is purely informational.
  supabase
    .from("notifications")
    .insert([isVipRequest ? {
      title,
      body: bodyText,
      kind: "vip_request",
      target_role: "admin",
      ref_id: record.id,
      ref_date: record.date,
      requires_action: true,
    } : {
      title,
      body: bodyText,
      kind: "new_booking",
      target_role: bookingSpecialists ? "admin_and_specialist" : "admin",
      target_specialist_name: bookingSpecialists || null,
      ref_id: record.id,
      ref_date: record.date,
    }])
    .then(() => {}, () => {});

  if (isVipRequest) {
    const adminSubs = subs.filter((s) => {
      if (!s.user_id) return true;
      const profile = profileById.get(s.user_id);
      return !profile || profile.role === "admin";
    });
    const results = await Promise.allSettled(
      adminSubs.map((s: { endpoint: string; p256dh: string; auth: string }) =>
        webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload)
      )
    );
    return res.status(200).json({ sent: results.filter((r) => r.status === "fulfilled").length, attempted: results.length });
  }

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
