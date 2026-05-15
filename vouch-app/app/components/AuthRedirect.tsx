"use client";

import { useEffect } from "react";

export default function AuthRedirect() {
  useEffect(() => {
    const hasHash = typeof window !== 'undefined' && window.location.hash.includes('access_token');
    
    if (hasHash) {
      // Forward the hash to the dashboard page where it can be processed
      window.location.href = "/dashboard" + window.location.hash;
    }
  }, []);

  return null;
}
