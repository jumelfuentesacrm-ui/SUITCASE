const GIFT_CARDS = [
  { amount: "$25", desc: "Perfecta para detalles pequeños" },
  { amount: "$50", desc: "El regalo más popular" },
  { amount: "$100", desc: "Para una experiencia completa" },
  { amount: "$150", desc: "Día de spa total" },
];

import { PHONE } from "./data";
import { business } from "@/config/business.config";

const PRODUCTS = [
  {
    name: `Cuticle Oil ${business.shortName}`,
    desc: "Aceite nutritivo para cutículas con vitamina E y esencia de flor de cerezo.",
    price: "$12",
    tag: "Bestseller",
  },
  {
    name: "Kit Nail Care",
    desc: "Lima, buffer, aceite y crema de manos. Todo lo que necesitas en casa.",
    price: "$28",
    tag: "Kit",
  },
  {
    name: "Hand Cream Luxe",
    desc: "Crema hidratante de larga duración con colágeno y manteca de karité.",
    price: "$18",
    tag: "Nuevo",
  },
];

export function Tienda() {
  function waMsg(msg: string) {
    return "https://wa.me/" + business.whatsapp + "?text=" + encodeURIComponent(msg);
  }

  return (
    <section id="tienda" className="py-16 lg:py-24 bg-ivory">
      <div className="max-w-5xl mx-auto px-6">
        <div className="mb-12">
          <p className="text-[10px] font-semibold tracking-[0.32em] uppercase text-taupe mb-3">Tienda</p>
          <h2 className="font-serif text-4xl md:text-5xl text-espresso">Gift Cards & Productos</h2>
          <p className="mt-3 text-[14px] text-espresso/55 max-w-md">
            Regala una experiencia o lleva el cuidado profesional a casa.
          </p>
        </div>

        {/* Gift Cards */}
        <div className="mb-14">
          <h3 className="font-serif text-2xl text-espresso mb-6">Gift Cards</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {GIFT_CARDS.map(gc => (
              <a
                key={gc.amount}
                href={waMsg("Hola, me interesa una gift card de " + gc.amount + " de " + business.name + ".")}
                target="_blank" rel="noreferrer"
                className="group border border-border/60 bg-white p-5 hover:border-gold/60 hover:shadow-sm transition-all flex flex-col">
                <div className="font-serif text-3xl text-gold mb-2">{gc.amount}</div>
                <p className="text-[12px] text-taupe flex-1">{gc.desc}</p>
                <span className="mt-4 text-[11px] font-semibold text-espresso/60 group-hover:text-gold transition-colors uppercase tracking-wide">
                  Solicitar →
                </span>
              </a>
            ))}
          </div>
          <p className="mt-4 text-[12px] text-taupe/70">* Las gift cards se coordinan por WhatsApp y son válidas por 12 meses.</p>
        </div>

        {/* Products */}
        <div>
          <h3 className="font-serif text-2xl text-espresso mb-6">Productos para el hogar</h3>
          <div className="grid md:grid-cols-3 gap-4">
            {PRODUCTS.map(p => (
              <div key={p.name} className="border border-border/60 bg-white p-5 flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-gold bg-gold/10 px-2 py-1">{p.tag}</span>
                  <span className="font-serif text-xl text-espresso">{p.price}</span>
                </div>
                <h4 className="font-serif text-lg text-espresso mb-2">{p.name}</h4>
                <p className="text-[13px] text-taupe flex-1 mb-4">{p.desc}</p>
                <a
                  href={waMsg("Hola, me interesa el producto \"" + p.name + "\" (" + p.price + ") de " + business.name + ".")}
                  target="_blank" rel="noreferrer"
                  className="btn-k w-full justify-center text-[12px]">
                  Preguntar disponibilidad
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
