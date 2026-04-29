import { createFileRoute, Outlet, useRouter } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — MCkew" },
      { name: "description", content: "Your personal dashboard." },
    ],
  }),
  component: DashboardLayout,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-xl font-bold">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="px-4 py-2 rounded-full bg-primary text-primary-foreground font-bold text-sm"
        >
          Retry
        </button>
      </div>
    );
  },
});

function DashboardLayout() {
  return <Outlet />;
}
