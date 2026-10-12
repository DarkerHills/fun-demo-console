# Fun Demo Console — Nova Markets

A clickable, frontend-only prototype of a merchant console for Fun's payment infrastructure. A fictional crypto trading app, **Nova Markets**, uses it to configure checkout, watch payments move, inspect routes, and debug webhooks.

> Everything is simulated. No wallets, chains, payment providers, or Fun APIs are connected, and no real funds move. Dashboard details, SDK snippets, and webhook payloads are prototype assumptions, not Fun's documented product.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. `npm run build` produces a fully static build.

## The demo story (about 2 minutes)

1. **Checkout** — toggle a payment source, change the accent color, then **Save changes**.
2. **Test checkout** (top bar) — pay as a customer. Use *Simulation controls* to make it succeed or fail.
3. **Open in Transactions** — the payment appears live; the drawer shows its route timeline, fees, and hashes.
4. **Webhooks** — `payment.created → processing → completed/failed` events, payloads, responses, and **Retry delivery**.
5. **Overview → Success rate** — jumps to failed payments; open one, close it, and the filters are still there.

The Overview "Walk through the demo story" card tracks these steps.

**Demo controls** (flask icon in the top bar) switch on slow loading, a data-service error, or a failing webhook endpoint, so you can show loading, error, and retry states on demand. **Reset demo data** sits at the bottom of the sidebar.

## Screens

| Route | What it covers |
| --- | --- |
| `/overview` | Volume, success rate, completion time, method mix, recent payments, and failed/delayed payments that need attention |
| `/transactions` | Search, status tabs, method/asset/network/date filters, sorting, pagination, CSV export, and the payment drawer |
| `/checkout` | Checkout configuration (React Hook Form + Zod) with a live, payable customer preview |
| `/routes` | Route visualisation, step details, and alternative routes (fastest / lowest fee), or quote a custom route |
| `/analytics` | Volume, success/failure share, source and network mix, completion time, and failure reasons; every bar and row links to the matching payments |
| `/integrations` | SDK setup steps (TS/JS, sandbox/production), credentials, integration state, and a go-live checklist |
| `/webhooks` | Endpoint health, an event log with filters, payload and response viewer, and retry delivery |
| `/api-keys` | Placeholder keys with reveal, copy, create, and revoke (with confirmation) |
| `/settings` | Workspace, team, notifications, branding, and security forms with validation |

## Architecture

```
src/
  app/(console)/…        Thin route files; each renders a feature view
  features/<screen>/      Screen views and screen-specific components
  components/ui/          KernUI-based design-system primitives
  components/route/       Route trace (horizontal, compact, and timeline)
  components/charts/      Recharts wrappers + HTML bar lists
  components/shell/       Sidebar, top bar, environment band, skeletons
  lib/data/               Types, catalog, seed generator, route planner, metrics, filters, CSV
  lib/store/              Zustand store (persisted), toasts, payment simulator
  lib/hooks/              Data access, URL state, copy, theme
```

- **One data model.** Seeded payments and webhook events are generated deterministically (60 in Sandbox, 360 in Production) and laid against the time the console loads, so recent ranges always have activity. Payments created by the test checkout, webhook retries, keys, and settings live in a persisted Zustand store (`localStorage`). Every screen reads through `useTransactions()` / `useEvents()`.
- **Simulator.** `lib/store/simulator.ts` advances a test payment step by step, updating the store and emitting webhook events as it goes, so Transactions, the drawer, Webhooks, and the checkout preview all update live. Test payments always record in Sandbox.
- **URL state.** Filters, sorting, pagination, selected tabs, and the open payment (`?txn=`) live in the URL via shallow History API updates, so views are shareable and the back-to-table flow keeps filters.
- **Browser-only console.** State lives in `localStorage`, so the console layout renders in the browser (`use(browser())`) behind a static skeleton. Pages are still prerendered; client navigations are instant.

## Design system

Built on the **KernUI** design system (Figma › Color & Semantics, Badges & Tags). `src/app/globals.css` maps KernUI tokens 1:1. That includes background, text, and stroke tokens, the primary, info, warning, error, success, feature, verified, and highlight scales, both light and dark modes, the 8/12/16 radii, and `shadow-xs`. Type is Inter, with KernUI's tracking. IBM Plex Mono is used for IDs, hashes, and code.

Deliberate deviations, for accessibility:

- **Status badges** use KernUI's `*-mute` fill with `*-dark` text. KernUI's Light badge style uses `*-base` text, which falls below 3:1 contrast.
- **`text-soft`** (#A3A3A3) is used only for placeholders and icons. Secondary text uses `text-sub`.

The chart palette is drawn from KernUI ramps and checked for colorblind separation in both themes.

The signature element is the **route trace**: money drawn as a line from the customer's source to the treasury, with traveled, active, and failed segments. Diagonal hatching marks anything simulated: the environment band, demo tags, and presenter controls.
