import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createSign } from "crypto";

function base64url(input: Buffer | string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function getAccessToken(email: string, privateKey: string) {
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64url(
    JSON.stringify({
      iss: email,
      scope: "https://www.googleapis.com/auth/calendar",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    })
  );
  const unsigned = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = base64url(signer.sign(privateKey));
  const jwt = `${unsigned}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Token error: ${JSON.stringify(data)}`);
  return data.access_token as string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const calendarId = process.env.GOOGLE_CALENDAR_ID;

  if (!email || !key || !calendarId) {
    return res.status(503).json({ error: "Google Calendar not configured" });
  }

  const { eventId } = req.body;
  if (!eventId) return res.status(200).json({ skipped: true, reason: "no eventId provided" });

  try {
    const accessToken = await getAccessToken(email, key.replace(/\\n/g, "\n"));
    const delRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } }
    );
    // 404/410 means it's already gone — treat as success (idempotent delete)
    if (!delRes.ok && delRes.status !== 404 && delRes.status !== 410) {
      const body = await delRes.json().catch(() => null);
      return res.status(delRes.status).json({ error: body });
    }
    return res.status(200).json({ deleted: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || String(err) });
  }
}
