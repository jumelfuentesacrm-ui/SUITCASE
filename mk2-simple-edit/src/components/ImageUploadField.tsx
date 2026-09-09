import { useRef, useState, type ChangeEvent } from "react";
import { supabase } from "../lib/supabase";

const BUCKET = "site-media";

interface Props {
  label: string;
  value: string;
  onChange: (url: string) => void;
  folder: string;
}

// Simple upload flow: pick a file, push it to the public `site-media` bucket
// under a folder (logo | hero | gallery), store the public URL on the
// content row. No cropping/resizing UI -- keep it to what a small business
// site actually needs.
export default function ImageUploadField({ label, value, onChange, folder }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);

    const path = `${folder}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    onChange(data.publicUrl);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="field">
      <label>{label}</label>
      <div className="image-field">
        {value ? <img src={value} alt="" /> : null}
        <div>
          <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} disabled={uploading} />
          {uploading && <p className="save-status">Subiendo...</p>}
          {error && <p className="error-text">{error}</p>}
        </div>
      </div>
    </div>
  );
}
