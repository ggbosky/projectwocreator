/**
 * Project Two CRM bridge. Produces a stable, versioned JSON payload that the
 * CRM (https://ggbosky.github.io/projectwodashboard/) or any automation tool
 * (Make, n8n, Zapier) can consume via webhook.
 */
import { env } from "./env";
import { invokeFunction } from "./supabase";
import type { BrandProfile, ContentItem } from "./types";

export interface CrmPayload {
  schema: "projectwo.creator.content/v1";
  source: "projectwo-creator-studio";
  sentAt: string;
  brand: { name: string; website: string };
  items: Array<{
    id: string;
    title: string;
    format: ContentItem["format"];
    platform: ContentItem["platform"];
    status: ContentItem["status"];
    scheduledFor: string | null;
    topic: string;
    hooks: string[];
    caption: string;
    hashtags: string[];
    script: Array<{ time: string; spoken: string; onScreen: string; visual: string }>;
    slides: Array<{ index: number; headline: string; body: string }>;
    notes: string;
    createdAt: string;
    updatedAt: string;
  }>;
}

export function buildCrmPayload(items: ContentItem[], brand: BrandProfile): CrmPayload {
  return {
    schema: "projectwo.creator.content/v1",
    source: "projectwo-creator-studio",
    sentAt: new Date().toISOString(),
    brand: { name: brand.name, website: brand.website },
    items: items.map((i) => ({
      id: i.id,
      title: i.title,
      format: i.format,
      platform: i.platform,
      status: i.status,
      scheduledFor: i.scheduledFor ?? null,
      topic: i.topic,
      hooks: i.output?.hooks.map((h) => h.spoken) ?? [],
      caption: i.output?.caption ?? "",
      hashtags: i.output?.hashtags ?? [],
      script: i.output?.script.map(({ time, spoken, onScreen, visual }) => ({ time, spoken, onScreen, visual })) ?? [],
      slides: i.output?.slides.map(({ index, headline, body }) => ({ index, headline, body })) ?? [],
      notes: i.notes,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
    })),
  };
}

export type CrmResult = { delivered: boolean; via: "edge" | "webhook" | "none"; message: string };

export async function sendToCrm(payload: CrmPayload): Promise<CrmResult> {
  if (env.authMode === "supabase") {
    const r = await invokeFunction<{ delivered: boolean; status: number }>("crm-sync", { payload });
    return {
      delivered: r.delivered,
      via: "edge",
      message: r.delivered ? "Odesláno do Project Two CRM" : `CRM odpovědělo stavem ${r.status}`,
    };
  }
  if (env.crmWebhookUrl) {
    const res = await fetch(env.crmWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return {
      delivered: res.ok,
      via: "webhook",
      message: res.ok ? "Odesláno na CRM webhook" : `Webhook vrátil ${res.status}`,
    };
  }
  return { delivered: false, via: "none", message: "Webhook není nastaven — payload je připraven ke stažení." };
}
