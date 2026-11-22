import * as DM from "@radix-ui/react-dropdown-menu";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronsUpDown,
  KeyRound,
  LogOut,
  Menu,
  Moon,
  Search,
  ShieldAlert,
  Sun,
  X,
} from "lucide-react";
import { useEffect } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Wordmark } from "@/components/ui/logo";
import { Tip } from "@/components/ui/misc";
import { env } from "@/lib/env";
import { cn, initials } from "@/lib/utils";
import { useAuth } from "@/store/auth";
import { useData } from "@/store/data";
import { useUi } from "@/store/ui";
import { CommandPalette } from "./CommandPalette";
import { NAV } from "./nav";


function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const content = useData((s) => s.content);
  const toShoot = content.filter((c) => c.status === "to_shoot").length;
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-4 pt-5">
        <Wordmark />
      </div>
      <nav className="flex-1 space-y-0.5 px-3">
        <div className="label px-2 pb-2 pt-3">Workspace</div>
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                isActive ? "text-fg" : "text-muted hover:bg-elevated/70 hover:text-fg",
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-xl border border-border bg-elevated"
                    transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                  />
                )}
                <Icon className={cn("relative z-10 size-4", isActive && "text-brand")} />
                <span className="relative z-10 flex-1">{label}</span>
                {to === "/pipeline" && toShoot > 0 && (
                  <span className="relative z-10 rounded-md bg-brand/15 px-1.5 text-[10px] font-semibold text-brand">{toShoot}</span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      {env.authMode === "demo" && (
        <div className="mx-3 mb-3 rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
          <div className="flex items-center gap-1.5 font-semibold">
            <ShieldAlert className="size-3.5" /> Demo režim
          </div>
          <p className="mt-1 text-warning/80">Data jsou jen v tomto prohlížeči. Pro ostrý provoz připojte Supabase.</p>
        </div>
      )}
      <UserMenu />
    </div>
  );
}

function UserMenu() {
  const user = useAuth((s) => s.user);
  const signOut = useAuth((s) => s.signOut);
  const { theme, toggleTheme } = useUi();
  const navigate = useNavigate();
  if (!user) return null;
  return (
    <DM.Root>
      <DM.Trigger className="m-3 flex items-center gap-3 rounded-xl border border-border bg-elevated/50 p-2.5 text-left transition-colors hover:bg-elevated">
        <div className="grid size-9 place-items-center rounded-lg bg-gradient-to-br from-brand to-rose-500 text-sm font-bold text-black">
          {initials(user.fullName)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{user.fullName}</div>
          <div className="truncate text-xs text-subtle">
            {user.email} · {user.role}
          </div>
        </div>
        <ChevronsUpDown className="size-4 text-subtle" />
      </DM.Trigger>
      <DM.Portal>
        <DM.Content
          side="top"
          align="start"
          sideOffset={8}
          className="z-50 w-60 rounded-xl border border-border bg-surface p-1.5 shadow-2xl"
        >
          <DM.Item
            onSelect={() => navigate("/settings")}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-elevated"
          >
            <KeyRound className="size-4 text-subtle" /> API klíče & integrace
          </DM.Item>
          <DM.Item
            onSelect={toggleTheme}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-elevated"
          >
            {theme === "dark" ? <Sun className="size-4 text-subtle" /> : <Moon className="size-4 text-subtle" />}
            {theme === "dark" ? "Světlý režim" : "Tmavý režim"}
          </DM.Item>
          <DM.Separator className="my-1 h-px bg-border" />
          <DM.Item
            onSelect={async () => {
              await signOut();
              toast.success("Byli jste odhlášeni");
              navigate("/login", { replace: true });
            }}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-danger outline-none data-[highlighted]:bg-danger/10"
          >
            <LogOut className="size-4" /> Odhlásit se
          </DM.Item>
        </DM.Content>
      </DM.Portal>
    </DM.Root>
  );
}

export function AppShell() {
  const { sidebarOpen, setSidebar, setCommand, theme, toggleTheme } = useUi();
  const signOut = useAuth((s) => s.signOut);
  const user = useAuth((s) => s.user);
  const location = useLocation();
  const navigate = useNavigate();
  const error = useData((s) => s.error);
  const current = NAV.find((n) => (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommand(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setCommand]);

  useEffect(() => {
    if (error) toast.error(`Načtení dat selhalo: ${error}`);
  }, [error]);

  return (
    <div className="relative flex min-h-screen">
      <div className="ember-glow pointer-events-none fixed inset-x-0 top-0 h-[420px]" />

      {/* Desktop sidebar */}
      <aside className="glass sticky top-0 z-30 hidden h-screen w-64 shrink-0 border-y-0 border-l-0 lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/60 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebar(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 w-72 border-r border-border bg-surface lg:hidden"
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", bounce: 0, duration: 0.35 }}
            >
              <button className="absolute right-3 top-5 rounded-lg p-1.5 text-subtle hover:bg-elevated" onClick={() => setSidebar(false)} aria-label="Zavřít menu">
                <X className="size-4" />
              </button>
              <SidebarContent onNavigate={() => setSidebar(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header className="glass sticky top-0 z-20 flex h-14 items-center gap-3 border-x-0 border-t-0 px-4 md:px-6">
          <button className="rounded-lg p-2 text-muted hover:bg-elevated lg:hidden" onClick={() => setSidebar(true)} aria-label="Otevřít menu">
            <Menu className="size-5" />
          </button>
          <div className="flex items-center gap-2 text-sm">
            <span className="hidden text-subtle sm:inline">Creator Studio</span>
            <span className="hidden text-subtle sm:inline">/</span>
            <span className="font-medium">{current?.label ?? "Dashboard"}</span>
          </div>
          <button
            onClick={() => setCommand(true)}
            className="ml-auto hidden h-9 w-72 items-center gap-2 rounded-xl border border-border bg-elevated/60 px-3 text-sm text-subtle transition-colors hover:border-brand/40 md:flex"
          >
            <Search className="size-4" /> Hledat nebo spustit akci…
            <kbd className="ml-auto rounded-md border border-border px-1.5 text-[10px]">Ctrl K</kbd>
          </button>
          <div className="ml-auto flex items-center gap-1 md:ml-0">
            <Tip content={theme === "dark" ? "Světlý režim" : "Tmavý režim"}>
              <button onClick={toggleTheme} className="rounded-lg p-2 text-muted hover:bg-elevated hover:text-fg" aria-label="Přepnout motiv">
                {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </button>
            </Tip>
            <Tip content="API klíče & integrace">
              <button onClick={() => navigate("/settings")} className="rounded-lg p-2 text-muted hover:bg-elevated hover:text-fg" aria-label="API klíče">
                <KeyRound className="size-4" />
              </button>
            </Tip>
            <Tip content={`Odhlásit (${user?.email ?? ""})`}>
              <button
                onClick={async () => {
                  await signOut();
                  toast.success("Byli jste odhlášeni");
                  navigate("/login", { replace: true });
                }}
                className="rounded-lg p-2 text-muted hover:bg-danger/10 hover:text-danger"
                aria-label="Odhlásit"
              >
                <LogOut className="size-4" />
              </button>
            </Tip>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 md:px-8 md:py-8">
          <motion.div key={location.pathname} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
            <Outlet />
          </motion.div>
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
