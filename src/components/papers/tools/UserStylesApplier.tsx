import { useEffect } from "react";
import { useToolsStore } from "./useToolsStore";

/** Applies user style overrides to the document <html>/<body>. */
export function UserStylesApplier() {
  const styles = useToolsStore((s) => s.styles);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    body.style.fontSize = `${styles.fontSize}px`;
    body.style.fontFamily = styles.fontFamily || "";
    body.style.color = styles.fontColor || "";
    body.style.background = styles.bgColor || "";

    html.classList.toggle("user-high-contrast", styles.highContrast);
    html.classList.toggle("user-inverted", styles.inverted);

    return () => {
      body.style.fontSize = "";
      body.style.fontFamily = "";
      body.style.color = "";
      body.style.background = "";
      html.classList.remove("user-high-contrast", "user-inverted");
    };
  }, [styles]);

  return null;
}
