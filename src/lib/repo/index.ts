import { env } from "@/lib/env";
import { LocalRepository } from "./local";
import { SupabaseRepository } from "./supabase";
import type { Repository } from "./types";

let repo: Repository | null = null;

export function getRepository(): Repository {
  if (!repo) repo = env.authMode === "supabase" ? new SupabaseRepository() : new LocalRepository();
  return repo;
}

export type { Repository, Snapshot } from "./types";
