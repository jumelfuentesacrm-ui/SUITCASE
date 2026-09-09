// Contenido por defecto / "seed" para primera carga (fila vacia en site_content,
// o sin conexion a Supabase todavia). Esto NO es el mecanismo de rebrand de MK2
// -- ese es el panel /admin, que edita la fila real en la base de datos. Este
// objeto solo evita una pantalla en blanco antes de que exista esa fila, y sirve
// como valor inicial al insertar la fila la primera vez (ver supabase/schema.sql).
//
// Placeholder generico a proposito ("Tu Negocio Aqui") -- no hay datos de ningun
// cliente real aqui.

export interface ServiceBlurb {
  title: string;
  description: string;
}

export interface SiteContent {
  business_name: string;
  tagline: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  logo_url: string;
  hero_image_url: string;
  hero_headline: string;
  hero_subtext: string;
  about_text: string;
  services: ServiceBlurb[];
  gallery: string[];
  footer_note: string;
}

export const DEFAULT_CONTENT: SiteContent = {
  business_name: "Tu Negocio Aqui",
  tagline: "Calidad y confianza en cada servicio",
  phone: "+52 55 0000 0000",
  whatsapp: "+52 55 0000 0000",
  email: "contacto@tunegocio.com",
  address: "Tu ciudad, Mexico",
  logo_url: "",
  hero_image_url: "",
  hero_headline: "Bienvenido a Tu Negocio Aqui",
  hero_subtext:
    "Reemplaza este texto desde el panel de administracion con la propuesta de valor real del negocio.",
  about_text:
    "Cuenta aqui la historia del negocio: quienes son, desde cuando operan, que los hace diferentes. Este texto se edita desde /admin.",
  services: [
    {
      title: "Servicio uno",
      description: "Descripcion breve del servicio uno. Edita esto desde el panel de administracion.",
    },
    {
      title: "Servicio dos",
      description: "Descripcion breve del servicio dos. Edita esto desde el panel de administracion.",
    },
    {
      title: "Servicio tres",
      description: "Descripcion breve del servicio tres. Edita esto desde el panel de administracion.",
    },
  ],
  gallery: [],
  footer_note: "Todos los derechos reservados.",
};
