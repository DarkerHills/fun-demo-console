"use client";

import { useRouter } from "next/navigation";
import { FlaskConical, Menu as MenuIcon, Monitor, Moon, Play, Search, Settings, Sun } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { useTheme, type ThemePref } from "@/lib/hooks/use-theme";
import { useDemo } from "@/lib/store/demo-store";
import { toast } from "@/lib/store/toast-store";
import { Button } from "@/components/ui/button";
import { Segmented, Switch } from "@/components/ui/controls";
import { Kbd } from "@/components/ui/field";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/overlays";
import { inputBase } from "@/components/ui/field";
import { cn } from "@/lib/utils";

function GlobalSearch() {
  const router = useRouter();
  const ref = React.useRef<HTMLInputElement>(null);
  const [value, setValue] = React.useState("");

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        ref.current?.focus();
        ref.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <form
      role="search"
      className="relative w-full max-w-[380px]"
      onSubmit={(e) => {
        e.preventDefault();
        const q = value.trim();
        router.push(q ? `/transactions?q=${encodeURIComponent(q)}` : "/transactions");
        ref.current?.blur();
      }}
    >
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-soft" aria-hidden />
      <input
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label="Search payments by ID or customer email"
        placeholder="Search payments by ID or email"
        className={cn(inputBase, "h-8 bg-surface pr-12 pl-9 shadow-none")}
      />
      <span className="pointer-events-none absolute top-1/2 right-2 hidden -translate-y-1/2 items-center gap-0.5 sm:flex">
        <Kbd>⌘</Kbd>
        <Kbd>K</Kbd>
      </span>
    </form>
  );
}

function EnvSwitch() {
  const env = useDemo((s) => s.env);
  const setEnv = useDemo((s) => s.setEnv);
  return (
    <Segmented
      aria-label="Environment"
      value={env}
      onValueChange={(v) => {
        setEnv(v);
        toast.info(v === "sandbox" ? "Switched to Sandbox" : "Switched to Production view", {
          description: v === "sandbox" ? "Showing test payments." : "Showing simulated production data — no real funds move.",
          duration: 3000,
        });
      }}
      options={[
        {
          value: "sandbox",
          label: (
            <>
              <span className="size-1.5 rounded-full bg-warning-base" aria-hidden />
              Sandbox
            </>
          ),
        },
        {
          value: "production",
          label: (
            <>
              <span className="size-1.5 rounded-full bg-info-base" aria-hidden />
              Production
            </>
          ),
        },
      ]}
    />
  );
}

function DemoControls() {
  const demo = useDemo((s) => s.demo);
  const setDemo = useDemo((s) => s.setDemo);
  const preview = useDemo((s) => s.integrationPreview);
  const setPreview = useDemo((s) => s.setIntegrationPreview);
  const active = demo.slow || demo.error || preview === "error";
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Demo controls" className="relative">
          <FlaskConical />
          {active && <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-warning-base" aria-hidden />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0">
        <div className="border-b border-stroke-soft px-3 py-2.5">
          <p className="text-sm font-medium text-strong">Demo controls</p>
          <p className="text-xs text-sub">Show system states on demand. Not part of the product UI.</p>
        </div>
        <div className="space-y-3 p-3">
          <div className="flex items-start justify-between gap-3">
            <label htmlFor="demo-slow" className="cursor-pointer">
              <span className="block text-sm text-strong">Slow network</span>
              <span className="block text-xs text-sub">Pages show loading skeletons</span>
            </label>
            <Switch id="demo-slow" checked={demo.slow} onCheckedChange={(v) => setDemo({ slow: v })} />
          </div>
          <div className="flex items-start justify-between gap-3">
            <label htmlFor="demo-error" className="cursor-pointer">
              <span className="block text-sm text-strong">Data service error</span>
              <span className="block text-xs text-sub">Pages show their error state</span>
            </label>
            <Switch id="demo-error" checked={demo.error} onCheckedChange={(v) => setDemo({ error: v })} />
          </div>
          <div className="flex items-start justify-between gap-3">
            <label htmlFor="demo-webhook" className="cursor-pointer">
              <span className="block text-sm text-strong">Failing webhook endpoint</span>
              <span className="block text-xs text-sub">New events fail delivery with HTTP 500</span>
            </label>
            <Switch id="demo-webhook" checked={preview === "error"} onCheckedChange={(v) => setPreview(v ? "error" : "auto")} />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function UserMenu() {
  const { theme, setTheme } = useTheme();
  return (
    <Menu>
      <MenuTrigger asChild>
        <button
          type="button"
          aria-label="Account menu"
          className="grid size-8 place-items-center rounded-full bg-primary-mute text-xs font-semibold text-primary-dark ring-1 ring-stroke-soft hover:ring-stroke-strong"
        >
          DW
        </button>
      </MenuTrigger>
      <MenuContent className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium text-strong">Dana Whitfield</p>
          <p className="text-xs text-sub">dana@novamarkets.example · Owner</p>
        </div>
        <MenuSeparator />
        <MenuLabel>Theme</MenuLabel>
        <MenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as ThemePref)}>
          <MenuRadioItem value="light">
            <Sun className="size-4 text-sub" aria-hidden /> Light
          </MenuRadioItem>
          <MenuRadioItem value="dark">
            <Moon className="size-4 text-sub" aria-hidden /> Dark
          </MenuRadioItem>
          <MenuRadioItem value="system">
            <Monitor className="size-4 text-sub" aria-hidden /> System
          </MenuRadioItem>
        </MenuRadioGroup>
        <MenuSeparator />
        <MenuItem asChild>
          <Link href="/settings">
            <Settings /> Settings
          </Link>
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const openPreview = useDemo((s) => s.openPreview);
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-stroke-soft bg-default/90 px-4 backdrop-blur-md sm:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation" onClick={onMenu}>
        <MenuIcon />
      </Button>
      <div className="hidden min-w-0 flex-1 sm:block">
        <GlobalSearch />
      </div>
      <div className="flex flex-1 items-center justify-end gap-1.5 sm:flex-none sm:gap-2">
        <EnvSwitch />
        <Button variant="secondary" size="sm" className="hidden md:inline-flex" onClick={() => openPreview("overview")}>
          <Play className="text-primary-base" /> Test checkout
        </Button>
        <DemoControls />
        <UserMenu />
      </div>
    </header>
  );
}
