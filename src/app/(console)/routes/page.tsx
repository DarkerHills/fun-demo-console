import type { Metadata } from "next";
import { RoutesView } from "@/features/routes/routes-view";

export const metadata: Metadata = { title: "Payment routes" };

export default function Page() {
  return <RoutesView />;
}
