import { useEffect } from "react";

const CRISP_WEBSITE_ID = "503be729-26c5-4d0a-ba03-d274f4063494";

declare global {
  interface Window {
    $crisp?: unknown[];
    CRISP_WEBSITE_ID?: string;
  }
}

export function CrispChat() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (document.getElementById("crisp-script")) return;

    window.$crisp = window.$crisp || [];
    window.CRISP_WEBSITE_ID = CRISP_WEBSITE_ID;

    const script = document.createElement("script");
    script.id = "crisp-script";
    script.src = "https://client.crisp.chat/l.js";
    script.async = true;
    document.head.appendChild(script);
  }, []);

  return null;
}
