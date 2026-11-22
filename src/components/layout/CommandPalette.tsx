import * as D from "@radix-ui/react-dialog";
import { CornerDownLeft, Link2, LogOut, Moon, Search, Sparkles, Wand2 } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/store/auth";
import { useData } from "@/store/data";
import { useUi } from "@/store/ui";
import { NAV } from "./nav";

interface Cmd {
  id: string;
  label: string;
  hint?: string;
  icon: ReactNode;
  run: () => void;
}

export function CommandPalette() {
  const { commandOpen, setCommand, toggleTheme } = useUi();
  const navigate = useNavigate();
  const signOut = useAuth((s) => s.signOut);
  const posts = useData((s) => s.posts);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);

  const commands = useMemo<Cmd[]>(() => {
    const go = (to: string) => () => navigate(to);
    const base: Cmd[] = [
      ...NAV.map((n) => ({ id: n.to, label: n.label, hint: "Přejít", icon: <n.icon />, run: go(n.to) })),
      { id: "new-reel", label: "Nový scénář pro Reel", hint: "Studio", icon: <Sparkles />, run: go("/studio?format=reel") },
      { id: "new-carousel", label: "Nový karusel", hint: "Studio", icon: <Wand2 />, run: go("/studio?format=carousel") },
      { id: "analyze", label: "Analyzovat odkaz na virální post", hint: "Radar", icon: <Link2 />, run: go("/radar?analyze=1") },
      { id: "theme", label: "Přepnout světlý / tmavý režim", icon: <Moon />, run: toggleTheme },
      {
        id: "logout",
        label: "Odhlásit se",
        icon: <LogOut />,
        run: async () => {
          await signOut();
          navigate("/login", { replace: true });
        },
      },
    ];
    const remix: Cmd[] = posts
      .slice()
      .sort((a, b) => b.viralScore - a.viralScore)
      .slice(0, 30)
      .map((p) => ({
        id: `remix-${p.id}`,
        label: `Remix: ${p.title}`,
        hint: `Score ${p.viralScore}`,
        icon: <Sparkles />,
        run: go(`/studio?ref=${encodeURIComponent(p.id)}`),
      }));
    return [...base, ...remix];
  }, [navigate, posts, signOut, toggleTheme]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = term ? commands.filter((c) => c.label.toLowerCase().includes(term)) : commands.slice(0, 11);
    return list.slice(0, 12);
  }, [commands, q]);

  useEffect(() => setActive(0), [q, commandOpen]);
  useEffect(() => {
    if (!commandOpen) setQ("");
  }, [commandOpen]);

  const exec = (c?: Cmd) => {
    if (!c) return;
    setCommand(false);
    c.run();
  };

  return (
    <D.Root open={commandOpen} onOpenChange={setCommand}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
        <D.Content className="fixed left-1/2 top-[15vh] z-50 w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
          <D.Title className="sr-only">Příkazová paleta</D.Title>
          <D.Description className="sr-only">Vyhledejte stránku nebo akci</D.Description>
          <div className="flex items-center gap-3 border-b border-border px-4">
            <Search className="size-4 text-subtle" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive((a) => Math.min(a + 1, filtered.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((a) => Math.max(a - 1, 0));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  exec(filtered[active]);
                }
              }}
              placeholder="Kam chcete jít? Co chcete vytvořit?"
              className="h-14 flex-1 bg-transparent text-sm outline-none placeholder:text-subtle"
            />
          </div>
          <ul className="max-h-[50vh] overflow-y-auto p-2">
            {filtered.length === 0 && <li className="px-3 py-6 text-center text-sm text-subtle">Nic nenalezeno</li>}
            {filtered.map((c, i) => (
              <li key={c.id}>
                <button
                  onMouseEnter={() => setActive(i)}
                  onClick={() => exec(c)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm [&_svg]:size-4",
                    i === active ? "bg-elevated text-fg" : "text-muted",
                  )}
                >
                  <span className={cn(i === active ? "text-brand" : "text-subtle")}>{c.icon}</span>
                  <span className="flex-1 truncate">{c.label}</span>
                  {c.hint && <span className="text-xs text-subtle">{c.hint}</span>}
                  {i === active && <CornerDownLeft className="text-subtle" />}
                </button>
              </li>
            ))}
          </ul>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
