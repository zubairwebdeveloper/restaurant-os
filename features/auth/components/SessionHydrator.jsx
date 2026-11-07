"use client";

import { useEffect } from "react";

export default function SessionHydrator({ session }) {
  useEffect(() => {
    if (!session) return;

    // Connect your existing auth/session context here.
  }, [session]);

  return null;
}
