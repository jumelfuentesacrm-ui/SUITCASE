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
// Estos paths apuntan a /public/brand/*. Ver public/README-ASSETS.txt para
// la lista de archivos que un cliente nuevo debe suministrar. Las imágenes
// de portafolio en /public/klassy/* se dejaron como demo visual; reemplázalas
// o quítalas y actualiza PORTFOLIO con los nuevos nombres de archivo.
export const LOGO_URL = business.logoUrl;
export const HERO_PHOTO = business.heroImageUrl;
export const PORTFOLIO = [
  "/klassy/port-nails-butterfly.jpg",
  "/klassy/port-nails-french-red.jpg",
  "/klassy/port-nails-papaya.jpg",
  "/klassy/port-hair-blonde-curls.jpg",
  "/klassy/port-hair-dark-waves.jpg",
  "/klassy/port-hair-blonde-straight.jpg",
  "/klassy/port-nails-pink-orange.jpg",
  "/klassy/port-nails-colorblock.jpg",
];

export const INSTAGRAM_URL = business.instagramUrl;
export const BOOKSY_URL = business.booksyUrl;
export const PHONE = business.phone;
export const ADDRESS = business.address;
export const ADDRESS_SHORT = business.addressShort;
