import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/useAuth";
import { supabase } from "../lib/supabase";
import { useSiteContent, saveSiteContent } from "../lib/useSiteContent";
import { DEFAULT_CONTENT, type SiteContent, type ServiceBlurb } from "../config/content";
import ImageUploadField from "../components/ImageUploadField";
import { LogOutIcon, PlusIcon, TrashIcon } from "../components/icons";

export default function Admin() {
  const navigate = useNavigate();
  const { isLoggedIn, loading: authLoading } = useAuth();
  const { content: loaded, loading: contentLoading } = useSiteContent();
  const [form, setForm] = useState<SiteContent>(DEFAULT_CONTENT);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!contentLoading) setForm(loaded);
  }, [contentLoading, loaded]);

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      navigate("/login", { replace: true });
    }
  }, [authLoading, isLoggedIn, navigate]);

  if (authLoading || contentLoading || !isLoggedIn) {
    return <div className="loading-shell">Cargando...</div>;
  }

  function update<K extends keyof SiteContent>(key: K, value: SiteContent[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function updateService(index: number, field: keyof ServiceBlurb, value: string) {
    setForm((f) => {
      const services = [...f.services];
      services[index] = { ...services[index], [field]: value };
      return { ...f, services };
    });
  }

  function addService() {
    setForm((f) => ({ ...f, services: [...f.services, { title: "", description: "" }] }));
  }

  function removeService(index: number) {
    setForm((f) => ({ ...f, services: f.services.filter((_, i) => i !== index) }));
  }

  function addGalleryUrl(url: string) {
    setForm((f) => ({ ...f, gallery: [...f.gallery, url] }));
  }

  function removeGalleryImage(index: number) {
    setForm((f) => ({ ...f, gallery: f.gallery.filter((_, i) => i !== index) }));
  }

  async function handleSave() {
    setStatus("saving");
    setErrorMsg(null);
    try {
      await saveSiteContent(form);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } catch (e) {
      setStatus("error");
      setErrorMsg(e instanceof Error ? e.message : "Error al guardar");
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  }

  return (
    <div className="admin-shell">
      <div className="admin-header">
        <strong>Panel de administracion</strong>
        <button className="btn btn--ghost" onClick={handleLogout}>
          <LogOutIcon /> Salir
        </button>
      </div>

      <div className="admin-body">
        <section className="admin-section">
          <h2>Datos del negocio</h2>
          <div className="admin-grid-2">
            <div className="field">
              <label>Nombre del negocio</label>
              <input value={form.business_name} onChange={(e) => update("business_name", e.target.value)} />
            </div>
            <div className="field">
              <label>Tagline</label>
              <input value={form.tagline} onChange={(e) => update("tagline", e.target.value)} />
            </div>
            <div className="field">
              <label>Telefono</label>
              <input value={form.phone} onChange={(e) => update("phone", e.target.value)} />
            </div>
            <div className="field">
              <label>WhatsApp</label>
              <input value={form.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} />
            </div>
            <div className="field">
              <label>Correo</label>
              <input value={form.email} onChange={(e) => update("email", e.target.value)} />
            </div>
            <div className="field">
              <label>Direccion</label>
              <input value={form.address} onChange={(e) => update("address", e.target.value)} />
            </div>
          </div>
          <ImageUploadField label="Logo" value={form.logo_url} onChange={(url) => update("logo_url", url)} folder="logo" />
        </section>

        <section className="admin-section">
          <h2>Portada (hero)</h2>
          <ImageUploadField
            label="Foto de portada"
            value={form.hero_image_url}
            onChange={(url) => update("hero_image_url", url)}
            folder="hero"
          />
          <div className="field">
            <label>Titulo principal</label>
            <input value={form.hero_headline} onChange={(e) => update("hero_headline", e.target.value)} />
          </div>
          <div className="field">
            <label>Subtitulo</label>
            <textarea value={form.hero_subtext} onChange={(e) => update("hero_subtext", e.target.value)} />
          </div>
        </section>

        <section className="admin-section">
          <h2>Sobre nosotros</h2>
          <div className="field">
            <label>Texto</label>
            <textarea value={form.about_text} onChange={(e) => update("about_text", e.target.value)} />
          </div>
        </section>

        <section className="admin-section">
          <h2>Servicios</h2>
          {form.services.map((s, i) => (
            <div className="service-row" key={i}>
              <div>
                <input
                  placeholder="Nombre del servicio"
                  value={s.title}
                  onChange={(e) => updateService(i, "title", e.target.value)}
                  style={{ marginBottom: 8 }}
                />
                <textarea
                  placeholder="Descripcion"
                  value={s.description}
                  onChange={(e) => updateService(i, "description", e.target.value)}
                />
              </div>
              <button className="icon-btn" onClick={() => removeService(i)} title="Eliminar servicio">
                <TrashIcon />
              </button>
            </div>
          ))}
          <button className="btn btn--ghost" onClick={addService}>
            <PlusIcon /> Agregar servicio
          </button>
        </section>

        <section className="admin-section">
          <h2>Galeria</h2>
          <div className="gallery-grid" style={{ marginBottom: 16 }}>
            {form.gallery.map((url, i) => (
              <div key={i} style={{ position: "relative" }}>
                <img src={url} alt="" />
                <button
                  className="icon-btn"
                  onClick={() => removeGalleryImage(i)}
                  title="Eliminar foto"
                  style={{ position: "absolute", top: 6, right: 6, background: "#fff" }}
                >
                  <TrashIcon />
                </button>
              </div>
            ))}
          </div>
          <ImageUploadField label="Agregar foto a la galeria" value="" onChange={addGalleryUrl} folder="gallery" />
        </section>

        <section className="admin-section">
          <h2>Pie de pagina</h2>
          <div className="field">
            <label>Nota del footer</label>
            <input value={form.footer_note} onChange={(e) => update("footer_note", e.target.value)} />
          </div>
        </section>

        <div className="save-bar">
          {status === "error" && <span className="error-text">{errorMsg}</span>}
          {status === "saved" && <span className="save-status">Guardado.</span>}
          <button className="btn" onClick={handleSave} disabled={status === "saving"}>
            {status === "saving" ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
