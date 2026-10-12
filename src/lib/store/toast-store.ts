"use client";

import { create } from "zustand";
import { randomId } from "../utils";

export type ToastTone = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
  action?: { label: string; href?: string; onClick?: () => void };
  duration: number;
}

interface ToastState {
  toasts: Toast[];
  push: (t: Omit<Toast, "id" | "duration"> & { duration?: number }) => string;
  dismiss: (id: string) => void;
}

export const useToasts = create<ToastState>()((set) => ({
  toasts: [],
  push: (t) => {
    const id = randomId("t_", 8);
    set((s) => ({ toasts: [...s.toasts.slice(-3), { duration: 5000, ...t, id }] }));
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Imperative helper usable outside React components. */
export const toast = {
  success: (title: string, opts?: Partial<Omit<Toast, "id" | "title" | "tone">>) =>
    useToasts.getState().push({ title, tone: "success", ...opts }),
  error: (title: string, opts?: Partial<Omit<Toast, "id" | "title" | "tone">>) =>
    useToasts.getState().push({ title, tone: "error", ...opts }),
  info: (title: string, opts?: Partial<Omit<Toast, "id" | "title" | "tone">>) =>
    useToasts.getState().push({ title, tone: "info", ...opts }),
  warning: (title: string, opts?: Partial<Omit<Toast, "id" | "title" | "tone">>) =>
    useToasts.getState().push({ title, tone: "warning", ...opts }),
};
