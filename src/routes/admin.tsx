import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { LuShieldAlert, LuArrowLeft, LuLayoutDashboard } from "react-icons/lu";
import Navbar from "@/components/Navbar";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin · Paper Builder" },
      { name: "description", content: "Build, edit and publish past papers." },
      { property: "og:title", content: "Admin · Paper Builder" },
      { property: "og:description", content: "Build, edit and publish past papers." },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-5">
          <Link
            to="/admin/editor"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-card border border-border hover:border-primary/40 hover:bg-primary/5 hover:text-primary text-muted-foreground transition-colors"
          >
            <LuLayoutDashboard size={13} /> Editor home
          </Link>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-400/40 text-[11px] font-bold shadow-sm">
            <LuShieldAlert size={11} /> Local-only · saved to your browser
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
