let crispLoaded = false;

export function loadCrisp() {
  if (typeof window === "undefined") return;
  if (crispLoaded) return;

  crispLoaded = true;

  (window as any).$crisp = [];
  (window as any).CRISP_WEBSITE_ID = "2f1af039-34e8-459c-9bb5-9fb571fa8fd0";

  const script = document.createElement("script");
  script.src = "https://client.crisp.chat/l.js";
  script.async = true;

  document.head.appendChild(script);
}
