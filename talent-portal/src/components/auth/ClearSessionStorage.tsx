"use client";

import { useEffect } from "react";

// Legacy cleanup only: the tour now counts views in localStorage ("manager_tour_count") and must survive logins.
export default function ClearSessionStorage() {
  useEffect(() => {
    window.sessionStorage.removeItem("manager_tour_seen");
  }, []);

  return null;
}
