"use client";

import { useEffect } from "react";

export function HomeDebugProbe() {
  useEffect(() => {
    // #region agent log
    fetch("/api/debug/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "b0b5df",
        runId: "pre-fix",
        hypothesisId: "H1",
        location: "src/app/HomeDebugProbe.tsx:12",
        message: "Home probe mounted",
        data: {},
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    fetch("/images/metro.jpg", { method: "GET" })
      .then(async (r) => {
        // #region agent log
        fetch("/api/debug/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: "b0b5df",
            runId: "pre-fix",
            hypothesisId: "H1",
            location: "src/app/HomeDebugProbe.tsx:29",
            message: "GET /images/metro.jpg result",
            data: { ok: r.ok, status: r.status, contentType: r.headers.get("content-type") },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion

        // Consume body to avoid browser warnings; do not log it.
        await r.arrayBuffer().catch(() => null);
      })
      .catch(() => {
        // #region agent log
        fetch("/api/debug/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: "b0b5df",
            runId: "pre-fix",
            hypothesisId: "H1",
            location: "src/app/HomeDebugProbe.tsx:49",
            message: "GET /images/metro.jpg threw",
            data: {},
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
      });

    const el = document.getElementById("home-hero-bg");
    if (el) {
      const bg = window.getComputedStyle(el).backgroundImage;
      // #region agent log
      fetch("/api/debug/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: "b0b5df",
          runId: "pre-fix",
          hypothesisId: "H2",
          location: "src/app/HomeDebugProbe.tsx:67",
          message: "Computed home hero background-image",
          data: { backgroundImage: bg },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
    } else {
      // #region agent log
      fetch("/api/debug/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: "b0b5df",
          runId: "pre-fix",
          hypothesisId: "H2",
          location: "src/app/HomeDebugProbe.tsx:83",
          message: "home-hero-bg element not found",
          data: {},
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
    }
  }, []);

  return null;
}

