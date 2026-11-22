import { useEffect, useState } from "react";
import { ENGINE_LABEL, resolveEngine, type Engine } from "./service";

/** Which AI engine is active (edge / claude / local), resolved once at runtime. */
export function useEngine(): { engine: Engine | null; label: string } {
  const [engine, setEngine] = useState<Engine | null>(null);
  useEffect(() => {
    let alive = true;
    void resolveEngine().then((e) => alive && setEngine(e));
    return () => {
      alive = false;
    };
  }, []);
  return { engine, label: engine ? ENGINE_LABEL[engine] : "Zjišťuji AI…" };
}
