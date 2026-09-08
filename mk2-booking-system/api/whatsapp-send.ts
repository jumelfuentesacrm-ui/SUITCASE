// Combined WhatsApp endpoint: outbound template sends (client-facing
// confirmación/recordatorio/reagendada/cancelada — not wired in anywhere
// yet, pending Meta template approval, see SETUP.md
// section 5) + the Meta webhook verification/event receiver (merged in
// from api/whatsapp-webhook.ts, which was its own function until that
// extra function pushed the project over Vercel's function-count limit
// and silently broke every deploy for 3 days).
//
// IMPORTANT: if you already registered a webhook in Meta pointing at
// /api/whatsapp-webhook, update it in WhatsApp Manager to point at
// /api/whatsapp-send instead (same Callback URL field) and re-verify with
// the same WHATSAPP_VERIFY_TOKEN — that old path no longer exists.
//
// Outbound send — POST body: { to: "17876905963", template: "cita_confirmada", params: [...] }
// Auth: Bearer <SUPABASE_SERVICE_KEY> — only server-side/admin code should call this.

import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") return res.status(200).end();

  // Meta's webhook verification handshake.
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send("Forbidden");
  }

  if (req.method !== "POST") return res.status(405).end();

  const body = req.body ?? {};

  // Meta's inbound webhook events (delivery receipts, incoming messages)
  // look like { object: "whatsapp_business_account", entry: [...] } and
  // carry no bearer auth of ours — just acknowledge, no handling yet.
  if (body.object && body.entry) {
    return res.status(200).json({ received: true });
  }

  // Everything else is our own outbound send request.
  const authHeader = req.headers["authorization"] || "";
  const expected = process.env.SUPABASE_SERVICE_KEY;
  if (!expected || !authHeader.includes(expected)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_TOKEN;
  if (!phoneNumberId || !token) {
    return res.status(503).json({ error: "WhatsApp not configured yet" });
  }

  const { to, template, params } = body as { to: string; template: string; params?: string[] };
  if (!to || !template) return res.status(400).json({ error: "Missing to/template" });

  const graphRes = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: template,
        language: { code: "es" },
        components: (params ?? []).length
          ? [{ type: "body", parameters: (params ?? []).map((text) => ({ type: "text", text })) }]
          : [],
      },
    }),
  });
  const data = await graphRes.json().catch(() => ({}));
  return res.status(graphRes.status).json(data);
}
