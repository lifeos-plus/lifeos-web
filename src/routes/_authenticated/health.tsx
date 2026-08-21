import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/health")({
  component: lazyRouteComponent(() => import("@/pages/HealthPage")),
});
