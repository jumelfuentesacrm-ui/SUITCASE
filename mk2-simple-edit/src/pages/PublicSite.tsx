import { Link } from "react-router-dom";
import { useSiteContent } from "../lib/useSiteContent";
import { PhoneIcon, MailIcon, PinIcon, WhatsAppIcon } from "../components/icons";

function waLink(whatsapp: string) {
  const digits = whatsapp.replace(/[^\d+]/g, "");
  return `https://wa.me/${digits.replace("+", "")}`;
}

export default function PublicSite() {
  const { content, loading } = useSiteContent();

  if (loading) {
    return <div className="loading-shell">Cargando...</div>;
  }

  const heroStyle = content.hero_image_url
    ? { backgroundImage: `url(${content.hero_image_url})` }
    : undefined;

  return (
    <>
      <nav className="navbar">
        <div className="navbar__brand">
          {content.logo_url && <img className="navbar__logo" src={content.logo_url} alt={content.business_name} />}
          <span>{content.business_name}</span>
        </div>
        <div className="navbar__cta">
          <a className="btn btn--ghost" href={`tel:${content.phone}`}>
            <PhoneIcon /> Llamar
          </a>
          <a className="btn" href={waLink(content.whatsapp)} target="_blank" rel="noreferrer">
            <WhatsAppIcon /> WhatsApp
          </a>
        </div>
      </nav>

      <header className={`hero ${heroStyle ? "" : "hero--plain"}`} style={heroStyle}>
        {heroStyle && <div className="hero__overlay" />}
        <div className="container hero__content">
          <h1>{content.hero_headline}</h1>
          <p>{content.hero_subtext}</p>
          <a className="btn" href={waLink(content.whatsapp)} target="_blank" rel="noreferrer">
            <WhatsAppIcon /> Escribenos
          </a>
        </div>
      </header>

      <section id="nosotros">
        <div className="container">
          <h2>Sobre nosotros</h2>
          <p className="section__intro">{content.about_text}</p>
        </div>
      </section>

      {content.services.length > 0 && (
        <section className="section--alt" id="servicios">
          <div className="container">
            <h2>Servicios</h2>
            <p className="section__intro">Lo que ofrecemos.</p>
            <div className="services-grid">
              {content.services.map((s, i) => (
                <div className="service-card" key={i}>
                  <h3>{s.title}</h3>
                  <p>{s.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {content.gallery.length > 0 && (
        <section id="galeria">
          <div className="container">
            <h2>Galeria</h2>
            <div className="gallery-grid">
              {content.gallery.map((url, i) => (
                <img src={url} alt={`${content.business_name} ${i + 1}`} key={i} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section--alt" id="contacto">
        <div className="container">
          <h2>Contacto</h2>
          <div className="contact-grid">
            <div className="contact-item">
              <PhoneIcon />
              <a href={`tel:${content.phone}`}>{content.phone}</a>
            </div>
            <div className="contact-item">
              <MailIcon />
              <a href={`mailto:${content.email}`}>{content.email}</a>
            </div>
            <div className="contact-item">
              <PinIcon />
              <span>{content.address}</span>
            </div>
          </div>
        </div>
      </section>

      <footer>
        <div className="container">
          {content.business_name} &middot; {content.footer_note}
          {" "}
          <Link to="/login" style={{ opacity: 0.4, marginLeft: 8, fontSize: "0.75rem" }}>
            admin
          </Link>
        </div>
      </footer>
    </>
  );
}
