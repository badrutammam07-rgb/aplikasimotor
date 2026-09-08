import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy } from "react";

const MotorkuApp = lazy(() => import("../App"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MOTORKU — Data Motor, DRU & Portal PECEL" },
      {
        name: "description",
        content:
          "Sistem informasi data motor MOTORKU: tabel data unit, manajemen DRU, dan portal PECEL dengan sinkronisasi real-time.",
      },
      { property: "og:title", content: "MOTORKU — Data Motor, DRU & Portal PECEL" },
      {
        property: "og:description",
        content:
          "Sistem informasi data motor MOTORKU: tabel data unit, manajemen DRU, dan portal PECEL dengan sinkronisasi real-time.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <ClientOnly
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
          Memuat MOTORKU…
        </div>
      }
    >
      <MotorkuApp />
    </ClientOnly>
  );
}
