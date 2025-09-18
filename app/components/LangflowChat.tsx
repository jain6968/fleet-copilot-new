"use client";
import { useEffect, useRef } from "react";

export default function LangflowChatPanel() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Guard: only run in browser
    if (typeof window === "undefined") return;
    if (!hostRef.current) return;

    // Inject the script once
    let added = document.getElementById("langflow-chat-script") as HTMLScriptElement | null;
    if (!added) {
      added = document.createElement("script");
      added.id = "langflow-chat-script";
      added.src = "https://cdn.jsdelivr.net/gh/logspace-ai/langflow-embedded-chat@v1.0.7/dist/build/static/js/bundle.min.js";
      added.async = true;
      document.body.appendChild(added);
    }

    // After the script loads, create the custom element
    const onReady = () => {
      if (!hostRef.current) return;
      if (hostRef.current.querySelector("langflow-chat")) return;

      const chat = document.createElement("langflow-chat");
      chat.setAttribute("window_title", "Fleet CoPilot Agent");
      chat.setAttribute("flow_id", "a5827591-b2bc-4416-914d-90c87cc59314");
      // IMPORTANT: use Langflow API host (not astra.datastax.com)
      chat.setAttribute("host_url", "https://api.langflow.astra.datastax.com");

      // DO NOT set authorization in the browser in prod.
      // If you must test, uncomment (but remove in production):
      // chat.setAttribute("authorization", "Bearer <APP_TOKEN>");

      hostRef.current.appendChild(chat);
    };

    // If custom element is already defined, attach immediately; otherwise, wait for script load
    if ((window as any).customElements?.get?.("langflow-chat")) {
      onReady();
    } else {
      added!.addEventListener("load", onReady, { once: true });
    }

    return () => {
      // optional cleanup: remove the inserted widget
      if (hostRef.current) hostRef.current.innerHTML = "";
      added?.removeEventListener("load", onReady);
    };
  }, []);

  // This empty div will be hydrated client-side; no SSR output changes
  return <div ref={hostRef} suppressHydrationWarning />;
}
