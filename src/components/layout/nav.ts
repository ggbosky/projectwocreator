import { Brain, Clapperboard, Flame, KanbanSquare, LayoutDashboard, LibraryBig, Palette, Radar, Settings, Sparkles } from "lucide-react";

export const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/trends", label: "Trend Radar", icon: Flame, end: false },
  { to: "/radar", label: "Viral Radar", icon: Radar, end: false },
  { to: "/studio", label: "AI Content Studio", icon: Sparkles, end: false },
  { to: "/video", label: "Video Studio", icon: Clapperboard, end: false },
  { to: "/graphics", label: "Grafika", icon: Palette, end: false },
  { to: "/media", label: "Knihovna médií", icon: LibraryBig, end: false },
  { to: "/pipeline", label: "Pipeline & Kalendář", icon: KanbanSquare, end: false },
  { to: "/brand", label: "Brand Brain", icon: Brain, end: false },
  { to: "/settings", label: "Nastavení", icon: Settings, end: false },
];
