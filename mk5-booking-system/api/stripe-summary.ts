import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return res.status(503).json({ error: "Stripe not configured" });

  const stripe = new Stripe(key);

  try {
    let totalCents = 0;
    let count = 0;
    let startingAfter: string | undefined;
    const recent: { id: string; amount: number; created: number; customer_email?: string | null; reference?: string | null }[] = [];

    // Paginate through all successful checkout sessions (Payment Link + any other checkout flow)
    for (let page = 0; page < 20; page++) {
      const sessions = await stripe.checkout.sessions.list({
        limit: 100,
        starting_after: startingAfter,
        status: "complete",
      });
      for (const s of sessions.data) {
        if (s.payment_status === "paid") {
          totalCents += s.amount_total || 0;
          count++;
          if (recent.length < 20) {
            recent.push({
              id: s.id,
              amount: (s.amount_total || 0) / 100,
              created: s.created,
              customer_email: s.customer_details?.email,
              reference: s.client_reference_id,
            });
          }
        }
      }
      if (!sessions.has_more) break;
      startingAfter = sessions.data[sessions.data.length - 1]?.id;
    }

    recent.sort((a, b) => b.created - a.created);

    // Stripe's actual balance already accounts for payouts already sent to
    // the bank — this is "what's really there right now", vs. totalCents
    // above which is a lifetime sum of all payments ever received and never
    // goes down when Stripe auto-withdraws to the bank account.
    const balance = await stripe.balance.retrieve();
    const sumByCurrency = (arr: { amount: number }[]) =>
      arr.reduce((sum, b) => sum + b.amount, 0);
    const availableCents = sumByCurrency(balance.available);
    const pendingCents = sumByCurrency(balance.pending);

    return res.status(200).json({
      total: totalCents / 100,
      count,
      recent: recent.slice(0, 20),
      available: availableCents / 100,
      pending: pendingCents / 100,
      currentBalance: (availableCents + pendingCents) / 100,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || String(err) });
  }
}
