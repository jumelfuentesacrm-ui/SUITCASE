import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

// MK2 has exactly one admin user per deployed site. Auth here only answers
// "is someone logged in" to gate /admin -- there is no roles table, no
// permission levels, no invite flow. See supabase/schema.sql for the RLS
// policy that backs this up server-side (client-side gating alone is not
// security).
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, loading, isLoggedIn: !!session };
}
