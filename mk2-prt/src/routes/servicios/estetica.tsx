import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/servicios/estetica")({
  beforeLoad: () => {
    throw redirect({ to: "/servicios/cabinas" });
  },
});
