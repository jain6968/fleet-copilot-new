// LangflowChat.tsx
import { useEffect, useRef } from "react";

export default function LangflowChatPanel() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only add the script if it hasn't been added yet
    if (!document.getElementById("langflow-chat-script")) {
      const script = document.createElement("script");
      script.id = "langflow-chat-script";
      script.src = "https://cdn.jsdelivr.net/gh/logspace-ai/langflow-embedded-chat@v1.0.7/dist/build/static/js/bundle.min.js";
      script.async = true;
      document.body.appendChild(script);
    }

    // Add the custom element after the script loads
    const interval = setInterval(() => {
      if (window.customElements && window.customElements.get("langflow-chat")) {
        if (ref.current && !ref.current.querySelector("langflow-chat")) {
          const chat = document.createElement("langflow-chat");
          chat.setAttribute("window_title", "Simple Agent");
          chat.setAttribute("flow_id", "a5827591-b2bc-4416-914d-90c87cc59314");
          chat.setAttribute("host_url", "https://astra.datastax.com");
          ref.current.appendChild(chat);
        }
        clearInterval(interval);
      }
    }, 200);

    return () => clearInterval(interval);
  }, []);

  return <div ref={ref} />;
}