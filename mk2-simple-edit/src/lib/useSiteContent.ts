import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { DEFAULT_CONTENT, type SiteContent } from "../config/content";

const ROW_ID = 1;

// Single-row read. There is exactly one site per deployment, so there is
// exactly one row in `site_content` (id = 1) -- no site-selection logic needed.
export function useSiteContent() {
  const [content, setContent] = useState<SiteContent>(DEFAULT_CONTENT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data, error: err } = await supabase
        .from("site_content")
        .select("*")
        .eq("id", ROW_ID)
        .maybeSingle();

      if (cancelled) return;

      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }

      if (data) {
        setContent({ ...DEFAULT_CONTENT, ...(data as Partial<SiteContent>) });
      }
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { content, loading, error };
}

export async function saveSiteContent(content: SiteContent) {
  const { error } = await supabase
    .from("site_content")
    .upsert({ id: ROW_ID, ...content, updated_at: new Date().toISOString() });
  if (error) throw error;
}
