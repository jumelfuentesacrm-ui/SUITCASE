// Datos derivados de src/config/business.config.ts — NO agregar datos de
// negocio hardcodeados aquí. Este archivo solo re-exporta con los mismos
// nombres que ya usan los componentes, para mantener el resto del código
// sin cambios cuando se hace rebrand (ver business.config.ts).
import { business } from "@/config/business.config";

export type Service = {
  name: string;
  duration: string;
  price: string;
  description?: string;
};

export type ServiceCategory = {
  id: string;
  icon: string;
  title: string;
  services: Service[];
};

export const SERVICE_CATEGORIES: ServiceCategory[] = business.serviceCategories;

export const STAFF = business.staff;

// ---- Assets de ejemplo ----
// Estos paths apuntan a /public/brand/*, que se dejó vacío de fotos reales
// a propósito. Ver public/README-ASSETS.txt para la lista completa de
// archivos (nombre + dimensiones) que un cliente nuevo debe suministrar,
// o actualiza PORTFOLIO con los nombres de archivo reales del cliente.
export const LOGO_URL = business.logoUrl;
export const HERO_PHOTO = business.heroImageUrl;
export const PORTFOLIO = [
  "/brand/portfolio-1.jpg",
  "/brand/portfolio-2.jpg",
  "/brand/portfolio-3.jpg",
  "/brand/portfolio-4.jpg",
  "/brand/portfolio-5.jpg",
  "/brand/portfolio-6.jpg",
  "/brand/portfolio-7.jpg",
  "/brand/portfolio-8.jpg",
];

export const INSTAGRAM_URL = business.instagramUrl;
export const BOOKSY_URL = business.booksyUrl;
export const PHONE = business.phone;
export const ADDRESS = business.address;
export const ADDRESS_SHORT = business.addressShort;
