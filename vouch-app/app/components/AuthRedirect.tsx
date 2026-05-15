"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function AuthRedirect() {
  const router = useRouter();

  useEffect(() => {
    const hasHash = typeof window !== 'undefined' && window.location.hash.includes('access_token');
    
    if (hasHash) {
      // Use onAuthStateChange to wait for Supabase to parse the hash
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
          router.push("/dashboard");
        }
      });

      return () => subscription.unsubscribe();
    }
  }, [router]);

  return null;
}
