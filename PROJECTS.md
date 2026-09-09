# Projects — historical reference only

This file is the **one place** past-client history is allowed to live in
this repo. It exists for style/precedent lookup only ("what did we do last
time a client needed X") — nothing here should ever be copied back into
`mk1-html-template/` or `mk5-booking-system/`. Those two folders must stay
100% free of any past-client name, asset, or content; if you're rebranding
a new client and find yourself pasting anything from this file into either
MK folder, stop — start from the generic placeholder in the template
instead.

Stack tier is only recorded where it's actually known from working in this
repo; everything else is marked unconfirmed rather than guessed.

## Klassy (salon booking system)

Beauty salon (nails, hair, spa) in Carolina, Puerto Rico. This is the
origin of MK5 — the full booking system in `mk5-booking-system/` began as
Klassy's real production site (React 19 + TanStack Start + Supabase +
Vercel) and was genericized into the current template. Reference for:
the whole MK5 engine's architecture (bookings, specialists, admin panel,
Stripe/Google Calendar/WhatsApp/push integrations), and for salon-specific
UX patterns (service category pages, cabinas/independent-renter pages,
photo galleries per service).

## IM Hair Studio → Tatiana Salon (rebrand)

Hair salon that rebranded from "IM Hair Studio" to "Tatiana Salon".
Stack: unknown/unconfirmed. Reference for: how to carry an existing
client through a full rebrand (name, identity, copy) without starting the
underlying site over — useful precedent if a current client renames or
repositions their business.

## RainProof Roofing

Roofing contractor. Stack: unknown/unconfirmed. Reference for: trade/home
-services site patterns (quote requests, service-area messaging) as
opposed to the appointment-booking focus of the salon-derived templates.

## Road Pizza

Restaurant/food business. Stack: unknown/unconfirmed. Reference for: menu
-driven, food-service site patterns — different information architecture
than salon or trade sites (menu browsing, hours, location emphasis).

## Monarca de Azúcar (rebrand of A+ CRM)

Rebrand of the "A+ CRM" project under the name "Monarca de Azúcar". Stack:
unknown/unconfirmed. Reference for: rebrand precedent alongside IM Hair
Studio → Tatiana Salon — two examples of an existing build getting a full
new identity rather than a from-scratch rebuild.

## A+ CRM

Original project later rebranded as Monarca de Azúcar (see above). Stack:
unknown/unconfirmed — the "A+" in the name suggests a more evolved/custom
build than a straight MK1 site, but that isn't confirmed here.

## Cataño / Spirit of Puerto Rico

Project associated with Cataño, PR / branded "Spirit of Puerto Rico".
Stack: unknown/unconfirmed. Reference for: tourism/local-culture branding
angle, distinct from the service-booking focus of most other projects
listed here.

## Phenix Salon Suites

Salon-suites business (independent stylists renting suites within one
location) — conceptually close to MK5's "cabinas" (independent renters)
pattern. Stack: unknown/unconfirmed. Reference for: multi-tenant salon
suite structure and copy — e.g. Gallery/portfolio section framing ("Your
Personal Canvas"-style editorial language) if a client needs a similar
independent-stylist model.
