"use client";

import { useEffect } from "react";

export default function ClearSessionStorage() {
  useEffect(() => {
    if (typeof window !== "undefined" && window.sessionStorage) {
      window.sessionStorage.removeItem("manager_tour_seen");
    }
  }, []);

  return null;
}
