"use client";

import { useEffect } from "react";
import "@/styles/AuthHomeTheme.css";

export default function AuthPopupPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status") === "success" ? "success" : "error";
    const message = params.get("message") || undefined;
    const result = { type: "climbup:oauth", status, message };
    document.cookie =
      "climbup_oauth_popup=; Path=/; Max-Age=0; SameSite=Lax";

    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel("climbup-auth");
      channel.postMessage(result);
      channel.close();
    }

    window.localStorage.setItem(
      "climbup:oauth:result",
      JSON.stringify({ ...result, timestamp: Date.now() })
    );

    if (window.opener) {
      window.opener.postMessage(result, window.location.origin);
    }

    window.close();
    const closeRetry = window.setTimeout(() => window.close(), 150);
    return () => window.clearTimeout(closeRetry);
  }, []);

  return (
    <main className="oauth-popup-status">
      <div className="oauth-popup-mark" aria-hidden>✓</div>
      <h1>Google sign-in complete</h1>
      <p>Returning to ClimbUP. You can safely close this window if it remains open.</p>
      <button type="button" onClick={() => window.close()}>Close window</button>
    </main>
  );
}
