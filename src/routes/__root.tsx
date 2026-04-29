import { lazy, Suspense } from "react";
import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster as HotToaster } from "react-hot-toast";
import { ClerkProvider } from "@clerk/clerk-react";
import { CLERK_PUBLISHABLE_KEY } from "@/lib/clerkConfig";
import { AccountProvider } from "@/integrations/account/AccountProvider";
import { CloudSyncProvider } from "@/integrations/account/CloudSyncProvider";
import { ProSyncProvider } from "@/integrations/account/ProSyncProvider";
import { PageTransition } from "@/components/PageTransition";
import MouseParticles from "react-mouse-particles"; // Defer heavy / non-critical root-level widgets so the first route paints
// before we evaluate them. They're all idle/background concerns (streak floater,
// onboarding modal, goal watcher, selection popovers, drop overlay, etc.).
const GifPageReactions = lazy(() =>
  import("@/components/GifPageReactions").then((m) => ({ default: m.GifPageReactions })),
);
const StreakWidget = lazy(() =>
  import("@/components/StreakWidget").then((m) => ({ default: m.StreakWidget })),
);
const OnboardingWizard = lazy(() =>
  import("@/components/onboarding/OnboardingWizard").then((m) => ({ default: m.OnboardingWizard })),
);
const DailyGoalsWatcher = lazy(() =>
  import("@/components/goals/DailyGoalsWatcher").then((m) => ({ default: m.DailyGoalsWatcher })),
);
const GoalCongratsModal = lazy(() =>
  import("@/components/goals/GoalCongratsModal").then((m) => ({ default: m.GoalCongratsModal })),
);
const SelectionPopover = lazy(() =>
  import("@/components/annotations/SelectionPopover").then((m) => ({
    default: m.SelectionPopover,
  })),
);
const BlurRevealHandler = lazy(() =>
  import("@/components/annotations/BlurRevealHandler").then((m) => ({
    default: m.BlurRevealHandler,
  })),
);
const ImageSearchDropOverlay = lazy(() =>
  import("@/components/ImageSearchDropOverlay").then((m) => ({
    default: m.ImageSearchDropOverlay,
  })),
);
const PlannerTasksHydrator = lazy(() =>
  import("@/lib/plannerTasksStore").then((m) => ({ default: m.PlannerTasksHydrator })),
);
const AdminStoreHydrator = lazy(() =>
  import("@/admin/AdminStoreHydrator").then((m) => ({ default: m.AdminStoreHydrator })),
);

import appCss from "../styles.css?url";
import { MouseParticlesClient } from "@/components/ClientOnlyMP";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "MCkew | IGCSE MCQ Paper-2 Solver" },
      {
        name: "description",
        content:
          "MCkew is an IGCSE MCQ Paper-2 solving website by Salah, designed to help students practice smarter and solve faster.",
      },
      { name: "author", content: "Salah" },
      { name: "theme-color", content: "#e76586" },
      { property: "og:title", content: "MCkew | IGCSE MCQ Paper-2 Solver" },
      {
        property: "og:description",
        content:
          "MCkew is an IGCSE MCQ Paper-2 solving website by Salah, designed to help students practice smarter and solve faster.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "MCkew" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "MCkew | IGCSE MCQ Paper-2 Solver" },
      {
        name: "twitter:description",
        content:
          "MCkew is an IGCSE MCQ Paper-2 solving website by Salah, designed to help students practice smarter and solve faster.",
      },
      {
        property: "og:image",
        content: "/favicons/android-chrome-512x512.png",
      },
      {
        name: "twitter:image",
        content: "/favicons/android-chrome-512x512.png",
      },
    ],
    links: [
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicons/favicon-16x16.png" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicons/favicon-32x32.png" },
      { rel: "icon", type: "image/x-icon", href: "/favicons/favicon.ico" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/favicons/apple-touch-icon.png" },
      { rel: "manifest", href: "/favicons/site.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fredoka:wght@300..700&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "stylesheet",
        href: "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css",
        integrity: "sha384-n8MVd4RsNIU0tAv4ct0nTaAbDJwPJzDEaqSD1odI+WdtXRGWt2kTvGFasHpSy3SV",
        crossOrigin: "anonymous",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} afterSignOutUrl="/">
      <AccountProvider>
        <CloudSyncProvider>
          <ProSyncProvider>
            <Outlet />
            <PageTransition />
            <Suspense fallback={null}>
              <GifPageReactions />
              <MouseParticlesClient />
              <StreakWidget />
              <DailyGoalsWatcher />
              <OnboardingWizard />
              <GoalCongratsModal />
              <SelectionPopover />
              <BlurRevealHandler />
              <ImageSearchDropOverlay />
              <PlannerTasksHydrator />
              <AdminStoreHydrator />
            </Suspense>
            <HotToaster
              position="top-center"
              toastOptions={{
                className: "!rounded-2xl !font-bold",
                style: {
                  background: "hsl(var(--card))",
                  color: "hsl(var(--foreground))",
                  border: "2px solid hsl(var(--border))",
                },
              }}
            />
          </ProSyncProvider>
        </CloudSyncProvider>
      </AccountProvider>
    </ClerkProvider>
  );
}
