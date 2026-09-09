import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const config = { api: { bodyParser: false } };

async function getRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const key = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!key || !webhookSecret) return res.status(503).json({ error: "Stripe not configured" });

  const stripe = new Stripe(key);

  let rawBody: Buffer;
  try {
    rawBody = await getRawBody(req);
  } catch {
    return res.status(400).json({ error: "Could not read body" });
  }

  const sig = req.headers["stripe-signature"] as string;
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch {
    return res.status(400).json({ error: "Invalid signature" });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      console.error("[stripe-webhook] Missing Supabase env vars");
      return res.status(503).json({ error: "DB not configured" });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // client_reference_id = booking.id (set via ?client_reference_id= on Payment Link URL)
    const bookingId = session.client_reference_id || session.metadata?.booking_id;
    if (bookingId) {
      const amountPaid = session.amount_total ? session.amount_total / 100 : 0;
      const { error } = await supabase
        .from("deposits")
        .update({
          status: "recibido",
          stripe_session_id: session.id,
          amount: amountPaid,
        })
        .eq("booking_id", bookingId)
        .eq("status", "solicitado"); // idempotency: second fire finds no solicitado row → no-op

      if (error) {
        console.error("[stripe-webhook] DB update failed:", error);
        // Return 500 so Stripe retries the webhook
        return res.status(500).json({ error: "DB update failed" });
      }
    }
  }

  return res.status(200).json({ received: true });
}
