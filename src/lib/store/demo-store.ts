"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  ApiKey,
  ApiKeyType,
  CheckoutConfig,
  DeliveryAttempt,
  DeliveryStatus,
  Env,
  IntegrationState,
  NotificationSettings,
  Role,
  SecuritySettings,
  TeamMember,
  Transaction,
  WebhookEvent,
  WorkspaceSettings,
} from "../data/types";
import { randomId } from "../utils";

export const DEFAULT_CHECKOUT: CheckoutConfig = {
  name: "Nova Markets deposit",
  reference: "nova-deposit-v2",
  sources: { wallet: true, transfer: true, card: true, exchange: false },
  assets: ["USDC", "USDT", "ETH", "SOL"],
  networks: ["ethereum", "base", "arbitrum", "solana"],
  destAsset: "USDC",
  destNetwork: "base",
  theme: "light",
  accent: "#7d52f4",
  brandName: "Nova Markets",
  logo: null,
  defaultAmount: 250,
  minAmount: 20,
};

export const DEFAULT_WORKSPACE: WorkspaceSettings = {
  name: "Nova Markets",
  legalName: "Nova Markets Ltd.",
  supportEmail: "support@novamarkets.example",
  website: "https://novamarkets.example",
  timezone: "America/New_York",
  currency: "USD",
};

export const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  failedPayments: true,
  failedThreshold: 5,
  delayedPayments: true,
  webhookFailures: true,
  dailySummary: true,
  summaryTime: "09:00",
  weeklyReport: false,
  channel: "email",
  recipients: "ops@novamarkets.example",
};

export const DEFAULT_SECURITY: SecuritySettings = {
  require2fa: true,
  sessionTimeout: "60",
  ipAllowlist: "",
  prodKeyApproval: true,
};

const MIN = 60_000;
const DAY = 86_400_000;

function keyValue(type: ApiKeyType, env: Env) {
  return `fun_${type === "secret" ? "sk" : "pk"}_${env === "sandbox" ? "sbx" : "prd"}_demo_${randomId("", 24)}`;
}

function defaultKeys(now: number): ApiKey[] {
  return [
    { id: "key_sbx_secret", name: "Checkout backend", type: "secret", env: "sandbox", value: keyValue("secret", "sandbox"), createdAt: now - 21 * DAY, lastUsedAt: now - 4 * MIN, revokedAt: null },
    { id: "key_sbx_pub", name: "Web checkout", type: "publishable", env: "sandbox", value: keyValue("publishable", "sandbox"), createdAt: now - 21 * DAY, lastUsedAt: now - 1 * MIN, revokedAt: null },
    { id: "key_prd_secret", name: "Production server", type: "secret", env: "production", value: keyValue("secret", "production"), createdAt: now - 6 * DAY, lastUsedAt: now - 2 * 60 * MIN, revokedAt: null },
    { id: "key_prd_pub", name: "Web checkout", type: "publishable", env: "production", value: keyValue("publishable", "production"), createdAt: now - 6 * DAY, lastUsedAt: now - 9 * MIN, revokedAt: null },
    { id: "key_sbx_old", name: "Staging (old)", type: "secret", env: "sandbox", value: keyValue("secret", "sandbox"), createdAt: now - 48 * DAY, lastUsedAt: now - 12 * DAY, revokedAt: now - 9 * DAY },
  ];
}

function defaultTeam(now: number): TeamMember[] {
  return [
    { id: "mem_1", name: "Dana Whitfield", email: "dana@novamarkets.example", role: "Owner", status: "active", lastActiveAt: now },
    { id: "mem_2", name: "Kenji Oduya", email: "kenji@novamarkets.example", role: "Admin", status: "active", lastActiveAt: now - 3 * 60 * MIN },
    { id: "mem_3", name: "Priya Shah", email: "priya@novamarkets.example", role: "Developer", status: "active", lastActiveAt: now - 25 * MIN },
    { id: "mem_4", name: "Luis Romero", email: "luis@novamarkets.example", role: "Analyst", status: "active", lastActiveAt: now - 2 * DAY },
    { id: "mem_5", name: "", email: "sam@novamarkets.example", role: "Viewer", status: "invited", lastActiveAt: null },
  ];
}

export interface DeliveryOverride {
  deliveryStatus: DeliveryStatus;
  attempts: DeliveryAttempt[];
}

export interface GuideState {
  dismissed: boolean;
  openedDemoTxn: boolean;
  viewedWebhook: boolean;
}

export interface DemoState {
  env: Env;
  createdTxns: Transaction[];
  createdEvents: WebhookEvent[];
  deliveryOverrides: Record<string, DeliveryOverride>;
  checkout: CheckoutConfig;
  checkoutSavedAt: number | null;
  apiKeys: ApiKey[];
  workspace: WorkspaceSettings;
  team: TeamMember[];
  notifications: NotificationSettings;
  security: SecuritySettings;
  integrationPreview: IntegrationState | "auto";
  guide: GuideState;
  // transient
  demo: { slow: boolean; error: boolean };
  preview: { open: boolean; origin: "checkout" | "integrations" | "overview" | null; config: CheckoutConfig | null };

  setEnv: (env: Env) => void;
  addTxn: (t: Transaction) => void;
  updateTxn: (id: string, patch: Partial<Transaction>) => void;
  addEvent: (e: WebhookEvent) => void;
  updateEvent: (id: string, patch: Partial<WebhookEvent>) => void;
  setDeliveryOverride: (id: string, o: DeliveryOverride) => void;
  saveCheckout: (c: CheckoutConfig) => void;
  createKey: (input: { name: string; type: ApiKeyType; env: Env }) => ApiKey;
  revokeKey: (id: string) => void;
  touchKey: (id: string) => void;
  saveWorkspace: (w: WorkspaceSettings) => void;
  inviteMember: (email: string, role: Role) => void;
  updateRole: (id: string, role: Role) => void;
  removeMember: (id: string) => void;
  saveNotifications: (n: NotificationSettings) => void;
  saveSecurity: (s: SecuritySettings) => void;
  setIntegrationPreview: (s: IntegrationState | "auto") => void;
  markGuide: (patch: Partial<GuideState>) => void;
  setDemo: (patch: Partial<DemoState["demo"]>) => void;
  openPreview: (origin: NonNullable<DemoState["preview"]["origin"]>, config?: CheckoutConfig) => void;
  closePreview: () => void;
  resetDemo: () => void;
}

function initialData() {
  const now = Date.now();
  return {
    env: "sandbox" as Env,
    createdTxns: [] as Transaction[],
    createdEvents: [] as WebhookEvent[],
    deliveryOverrides: {} as Record<string, DeliveryOverride>,
    checkout: DEFAULT_CHECKOUT,
    checkoutSavedAt: null as number | null,
    apiKeys: defaultKeys(now),
    workspace: DEFAULT_WORKSPACE,
    team: defaultTeam(now),
    notifications: DEFAULT_NOTIFICATIONS,
    security: DEFAULT_SECURITY,
    integrationPreview: "auto" as IntegrationState | "auto",
    guide: { dismissed: false, openedDemoTxn: false, viewedWebhook: false },
  };
}

export const useDemo = create<DemoState>()(
  persist(
    (set, get) => ({
      ...initialData(),
      demo: { slow: false, error: false },
      preview: { open: false, origin: null, config: null },

      setEnv: (env) => set({ env }),
      addTxn: (t) => set((s) => ({ createdTxns: [t, ...s.createdTxns] })),
      updateTxn: (id, patch) =>
        set((s) => ({ createdTxns: s.createdTxns.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      addEvent: (e) => set((s) => ({ createdEvents: [e, ...s.createdEvents] })),
      updateEvent: (id, patch) =>
        set((s) => ({ createdEvents: s.createdEvents.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
      setDeliveryOverride: (id, o) => set((s) => ({ deliveryOverrides: { ...s.deliveryOverrides, [id]: o } })),
      saveCheckout: (c) => set({ checkout: c, checkoutSavedAt: Date.now() }),
      createKey: ({ name, type, env }) => {
        const key: ApiKey = {
          id: randomId("key_", 10),
          name,
          type,
          env,
          value: keyValue(type, env),
          createdAt: Date.now(),
          lastUsedAt: null,
          revokedAt: null,
        };
        set((s) => ({ apiKeys: [key, ...s.apiKeys] }));
        return key;
      },
      revokeKey: (id) =>
        set((s) => ({ apiKeys: s.apiKeys.map((k) => (k.id === id ? { ...k, revokedAt: Date.now() } : k)) })),
      touchKey: (id) =>
        set((s) => ({ apiKeys: s.apiKeys.map((k) => (k.id === id ? { ...k, lastUsedAt: Date.now() } : k)) })),
      saveWorkspace: (workspace) => set({ workspace }),
      inviteMember: (email, role) =>
        set((s) => ({
          team: [...s.team, { id: randomId("mem_", 8), name: "", email, role, status: "invited", lastActiveAt: null }],
        })),
      updateRole: (id, role) => set((s) => ({ team: s.team.map((m) => (m.id === id ? { ...m, role } : m)) })),
      removeMember: (id) => set((s) => ({ team: s.team.filter((m) => m.id !== id) })),
      saveNotifications: (notifications) => set({ notifications }),
      saveSecurity: (security) => set({ security }),
      setIntegrationPreview: (integrationPreview) => set({ integrationPreview }),
      markGuide: (patch) => {
        const g = get().guide;
        if (Object.entries(patch).every(([k, v]) => g[k as keyof GuideState] === v)) return;
        set({ guide: { ...g, ...patch } });
      },
      setDemo: (patch) => set((s) => ({ demo: { ...s.demo, ...patch } })),
      openPreview: (origin, config) => set({ preview: { open: true, origin, config: config ?? null } }),
      closePreview: () => set((s) => ({ preview: { ...s.preview, open: false } })),
      resetDemo: () => set({ ...initialData(), demo: { slow: false, error: false } }),
    }),
    {
      name: "fun-demo-console",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        env: s.env,
        createdTxns: s.createdTxns.slice(0, 200),
        createdEvents: s.createdEvents.slice(0, 600),
        deliveryOverrides: s.deliveryOverrides,
        checkout: s.checkout,
        checkoutSavedAt: s.checkoutSavedAt,
        apiKeys: s.apiKeys,
        workspace: s.workspace,
        team: s.team,
        notifications: s.notifications,
        security: s.security,
        integrationPreview: s.integrationPreview,
        guide: s.guide,
      }),
    },
  ),
);
