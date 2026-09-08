import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return res.status(503).json({ error: "Stripe not configured" });

  const stripe = new Stripe(key);
  const { amount, concept, client_name, client_phone, booking_id, deposit_id } = req.body;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: Math.round(Number(amount) * 100),
          product_data: {
            name: concept || `Depósito ${process.env.BUSINESS_NAME || "Negocio"}`,
            description: `Reserva para ${client_name}`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: { deposit_id, booking_id, client_name, client_phone },
    success_url: `${process.env.SITE_URL || "https://example.com"}/pago-exitoso`,
    cancel_url: `${process.env.SITE_URL || "https://example.com"}/pago-cancelado`,
  });

  return res.status(200).json({ url: session.url });
}
