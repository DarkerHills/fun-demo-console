import type { Metadata } from "next";
import { WebhooksView } from "@/features/webhooks/webhooks-view";

export const metadata: Metadata = { title: "Webhooks" };

export default function Page() {
  return <WebhooksView />;
}
