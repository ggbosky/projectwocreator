import { Brain, KanbanSquare, LayoutDashboard, Radar, Settings, Sparkles } from "lucide-react";

export const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/radar", label: "Viral Radar", icon: Radar, end: false },
  { to: "/studio", label: "AI Content Studio", icon: Sparkles, end: false },
  { to: "/pipeline", label: "Pipeline & Kalendář", icon: KanbanSquare, end: false },
  { to: "/brand", label: "Brand Brain", icon: Brain, end: false },
  { to: "/settings", label: "Nastavení", icon: Settings, end: false },
];
