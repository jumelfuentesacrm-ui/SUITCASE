import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

function icsDate(date: string, time: string): string {
  // date: "2026-07-14", time: "9:00 AM" -> "20260714T090000"
  const [y, m, d] = date.split("-");
  const match = time.match(/(\d+):(\d+)\s*(AM|PM)?/i);
  let hour = match ? parseInt(match[1], 10) : 0;
  const min = match ? match[2] : "00";
  const ampm = match?.[3]?.toUpperCase();
  if (ampm === "PM" && hour !== 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;
  return `${y}${m}${d}T${String(hour).padStart(2, "0")}${min}00`;
}

function escapeIcs(text: string): string {
  return text.replace(/[\\,;]/g, (c) => "\\" + c).replace(/\n/g, "\\n");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = (req.query.id as string) || "";
  if (!id) return res.status(400).send("Missing id");

  const { data: booking, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !booking) return res.status(404).send("Booking not found");

  const start = icsDate(booking.date, booking.time);
  const startDate = new Date(
    Number(booking.date.slice(0, 4)),
    Number(booking.date.slice(5, 7)) - 1,
    Number(booking.date.slice(8, 10)),
    Number(start.slice(9, 11)),
    Number(start.slice(11, 13))
  );
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
  const end = `${start.slice(0, 8)}T${String(endDate.getHours()).padStart(2, "0")}${String(endDate.getMinutes()).padStart(2, "0")}00`;

  const summary = escapeIcs(`${booking.name} — ${booking.service || "Cita"}`);
  const description = escapeIcs(
    `Cliente: ${booking.name}\\nTeléfono: ${booking.phone}\\nServicio: ${booking.service || "Sin servicio"}${booking.specialist ? `\\nEspecialista: ${booking.specialist}` : ""}`
  );

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${process.env.BUSINESS_NAME || "Negocio"}//Bookings//ES`,
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${booking.id}@example.com`,
    `DTSTAMP:${start}Z`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${(process.env.BUSINESS_NAME || "Negocio")}\\, ${(process.env.BUSINESS_CITY || "Ciudad, PR")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="cita.ics"`);
  return res.status(200).send(ics);
}
