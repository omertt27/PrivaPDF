"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("[PrivaPDF] Offline ready — SW registered", reg.scope);
        })
        .catch((err) => {
          console.warn("[PrivaPDF] SW registration failed:", err);
        });
    }
  }, []);

  return null; // renders nothing
}
