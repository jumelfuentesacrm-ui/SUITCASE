import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type Specialist = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  active: boolean;
};

export type SpecialistService = {
  specialist_id: string;
  service_name: string;
  duration_minutes: number;
};

export function useSpecialists() {
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [specialistServices, setSpecialistServices] = useState<SpecialistService[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [{ data: specs }, { data: svcs }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, avatar_url, bio, active").eq("role", "specialist").eq("active", true).order("full_name"),
        supabase.from("specialist_services").select("specialist_id, service_name, duration_minutes").eq("approved", true),
      ]);
      setSpecialists(specs ?? []);
      setSpecialistServices(svcs ?? []);
      setLoading(false);
    }
    load();
  }, []);

  return { specialists, specialistServices, loading };
}
