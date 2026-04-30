import { dark } from "@clerk/themes";

/** Clerk UI that tracks app light/dark (root `html.dark` / theme store). */
export function getClerkAppearance(isDark: boolean) {
  return {
    baseTheme: isDark ? dark : undefined,
    variables: {
      colorPrimary: "hsl(var(--primary))",
      colorBackground: "hsl(var(--card))",
      colorInputBackground: "hsl(var(--background))",
      colorText: "hsl(var(--foreground))",
      colorTextSecondary: "hsl(var(--muted-foreground))",
      colorDanger: "hsl(var(--destructive))",
      borderRadius: "0.75rem",
    },
    elements: {
      rootBox: "w-full flex justify-center",
      card: "shadow-xl border-[2px] border-border bg-card text-foreground",
      navbar: "bg-card border-border",
      navbarButton: "text-foreground",
    },
  };
}
