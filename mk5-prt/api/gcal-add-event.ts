import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createSign } from "crypto";

function base64url(input: Buffer | string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Google Calendar's fixed color palette (colorId 1-11).
// Assigned colors per specialist; unknown names fall back to a stable hash.
const GCAL_COLOR_IDS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"];
// Optional pinning keyed to the generic placeholder staff names in this
// template's src/config/business.config.ts (staff[].gcalColorId). Real
// rebrand: read staff[].gcalColorId from business.config.ts once this
// endpoint is bundled with access to it — unknown names already fall back
// to a stable hash below, so this map is not required.
const SPECIALIST_COLORS: Record<string, string> = {
  "especialista 1": "4", // Flamingo — rosita
  "especialista 2": "7", // Peacock — azul
};
function colorForSpecialist(name: string): string {
  if (!name) return "8"; // graphite — "sin asignar"
  const key = Object.keys(SPECIALIST_COLORS).find((k) => name.toLowerCase().includes(k));
  if (key) return SPECIALIST_COLORS[key];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  const idx = Math.abs(hash) % GCAL_COLOR_IDS.length;
  return GCAL_COLOR_IDS[idx];
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

  try {
    const { client_name, service, specialist, date, time, notes, duration_minutes = 60 } = req.body;

    const [timePart, ampm] = time.split(" ");
    const [hStr, mStr] = timePart.split(":");
    let h = parseInt(hStr);
    const m = parseInt(mStr);
    if (ampm === "PM" && h !== 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;

    const [year, month, day] = date.split("-").map(Number);
    const start = new Date(year, month - 1, day, h, m);
    const end = new Date(start.getTime() + duration_minutes * 60000);

    const pad = (n: number) => String(n).padStart(2, "0");
    const toISO = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;

    const accessToken = await getAccessToken(email, key.replace(/\\n/g, "\n"));

    const eventRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: `${specialist ? `[${specialist}] ` : ""}${service} — ${client_name}`,
          description: [
            `Cliente: ${client_name}`,
            `Servicio: ${service}`,
            `Especialista: ${specialist || "Sin asignar"}`,
            notes ? `Notas: ${notes}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
          start: { dateTime: toISO(start), timeZone: "America/Puerto_Rico" },
          end: { dateTime: toISO(end), timeZone: "America/Puerto_Rico" },
          colorId: colorForSpecialist(specialist),
        }),
      }
    );
    const event = await eventRes.json();
    if (!eventRes.ok) return res.status(eventRes.status).json({ error: event });

    return res.status(200).json({ eventId: event.id, link: event.htmlLink });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || String(err) });
  }
}
