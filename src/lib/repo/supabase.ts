import { SEED_BRAND, SEED_CONTENT, SEED_CREATORS, SEED_POSTS } from "@/data/seed";
import { SEED_TRENDS } from "@/data/trends";
import { requireSupabase } from "@/lib/supabase";
import type { BrandProfile, ContentItem, Creator, MediaItem, Trend, VideoProject, ViralPost } from "@/lib/types";
import type { Repository, Snapshot } from "./types";

/* ----------------------------- row mappers ------------------------------ */

type Row = Record<string, unknown>;
const s = (v: unknown, d = "") => (typeof v === "string" ? v : d);
const n = (v: unknown) => (typeof v === "number" ? v : Number(v ?? 0));
const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const opt = (v: unknown) => (typeof v === "string" && v.length ? v : undefined);

const brandFromRow = (r: Row): BrandProfile => ({
  id: s(r.id),
  name: s(r.name),
  website: s(r.website),
  description: s(r.description),
  products: arr(r.products),
  usps: arr(r.usps),
  personas: arr(r.personas),
  tone: arr(r.tone),
  toneNotes: s(r.tone_notes),
  forbiddenWords: arr(r.forbidden_words),
  defaultCta: s(r.default_cta),
  hashtags: arr(r.hashtags),
  keywords: arr(r.keywords),
  referencePosts: arr(r.reference_posts),
  language: (s(r.language, "cs") as "cs" | "en") ?? "cs",
  updatedAt: s(r.updated_at),
});

const brandToRow = (b: BrandProfile, userId: string) => ({
  ...(isUuid(b.id) ? { id: b.id } : {}),
  name: b.name,
  website: b.website,
  description: b.description,
  products: b.products,
  usps: b.usps,
  personas: b.personas,
  tone: b.tone,
  tone_notes: b.toneNotes,
  forbidden_words: b.forbiddenWords,
  default_cta: b.defaultCta,
  hashtags: b.hashtags,
  keywords: b.keywords,
  reference_posts: b.referencePosts,
  language: b.language,
  updated_by: userId,
});

const creatorFromRow = (r: Row): Creator => ({
  id: s(r.id),
  name: s(r.name),
  handle: s(r.handle),
  platform: s(r.platform) as Creator["platform"],
  niche: arr(r.niche),
  followers: n(r.followers),
  avgViews: n(r.avg_views),
  engagementRate: n(r.engagement_rate),
  growth30d: n(r.growth_30d),
  language: s(r.language, "cs") as Creator["language"],
  avatarColor: s(r.avatar_color, "from-orange-500 to-rose-500"),
  profileUrl: opt(r.profile_url),
  whyFollow: s(r.why_follow),
  source: s(r.source, "manual") as Creator["source"],
});

const creatorToRow = (c: Creator, userId: string) => ({
  id: c.id,
  name: c.name,
  handle: c.handle,
  platform: c.platform,
  niche: c.niche,
  followers: Math.round(c.followers),
  avg_views: Math.round(c.avgViews),
  engagement_rate: c.engagementRate,
  growth_30d: c.growth30d,
  language: c.language,
  avatar_color: c.avatarColor,
  profile_url: c.profileUrl ?? null,
  why_follow: c.whyFollow,
  source: c.source,
  created_by: userId,
});

const postFromRow = (r: Row): ViralPost => ({
  id: s(r.id),
  creatorId: opt(r.creator_id),
  platform: s(r.platform) as ViralPost["platform"],
  format: s(r.format) as ViralPost["format"],
  url: opt(r.url),
  title: s(r.title),
  hookText: s(r.hook_text),
  caption: s(r.caption),
  transcript: opt(r.transcript),
  thumbnailGradient: s(r.thumbnail_gradient, "from-zinc-600/80 via-zinc-800/60 to-zinc-900"),
  views: n(r.views),
  likes: n(r.likes),
  comments: n(r.comments),
  shares: n(r.shares),
  saves: n(r.saves),
  durationSec: r.duration_sec == null ? undefined : n(r.duration_sec),
  postedAt: s(r.posted_at, s(r.created_at)),
  tags: arr(r.tags),
  viralScore: n(r.viral_score),
  analysis: (r.analysis as ViralPost["analysis"]) ?? undefined,
  savedToSwipe: Boolean(r.saved_to_swipe),
  source: s(r.source, "manual") as ViralPost["source"],
});

const postToRow = (p: ViralPost, userId: string) => ({
  id: p.id,
  creator_id: p.creatorId && isUuid(p.creatorId) ? p.creatorId : null,
  platform: p.platform,
  format: p.format,
  url: p.url ?? null,
  title: p.title,
  hook_text: p.hookText,
  caption: p.caption,
  transcript: p.transcript ?? null,
  thumbnail_gradient: p.thumbnailGradient,
  views: Math.round(p.views),
  likes: Math.round(p.likes),
  comments: Math.round(p.comments),
  shares: Math.round(p.shares),
  saves: Math.round(p.saves),
  duration_sec: p.durationSec ?? null,
  posted_at: p.postedAt || null,
  tags: p.tags,
  viral_score: Math.max(0, Math.min(100, Math.round(p.viralScore))),
  analysis: p.analysis ?? null,
  saved_to_swipe: p.savedToSwipe,
  source: p.source,
  created_by: userId,
});

const contentFromRow = (r: Row): ContentItem => ({
  id: s(r.id),
  title: s(r.title),
  format: s(r.format) as ContentItem["format"],
  platform: s(r.platform) as ContentItem["platform"],
  status: s(r.status) as ContentItem["status"],
  topic: s(r.topic),
  referencePostId: opt(r.reference_post_id),
  output: (r.output as ContentItem["output"]) ?? undefined,
  notes: s(r.notes),
  scheduledFor: opt(r.scheduled_for),
  position: n(r.position),
  crmSyncedAt: opt(r.crm_synced_at),
  createdAt: s(r.created_at),
  updatedAt: s(r.updated_at),
});

const contentToRow = (i: ContentItem, userId: string) => ({
  id: i.id,
  title: i.title,
  format: i.format,
  platform: i.platform,
  status: i.status,
  topic: i.topic,
  reference_post_id: i.referencePostId && isUuid(i.referencePostId) ? i.referencePostId : null,
  output: i.output ?? null,
  notes: i.notes,
  scheduled_for: i.scheduledFor ?? null,
  position: i.position,
  crm_synced_at: i.crmSyncedAt ?? null,
  created_by: userId,
});

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

/* ------------------------------ repository ------------------------------ */

export class SupabaseRepository implements Repository {
  readonly kind = "supabase" as const;
  private readonly sb = requireSupabase();

  private async userId() {
    const { data } = await this.sb.auth.getUser();
    if (!data.user) throw new Error("Nejste přihlášeni.");
    return data.user.id;
  }

  private async ensureBrand(): Promise<BrandProfile> {
    const rows = check(await this.sb.from("brand_profiles").select("*").order("created_at").limit(1));
    if (rows && rows.length) return brandFromRow(rows[0] as Row);
    // First run: create the Projectwo brand from defaults.
    const uidv = await this.userId();
    const created = check(await this.sb.from("brand_profiles").insert(brandToRow(SEED_BRAND, uidv)).select().single());
    return brandFromRow(created as unknown as Row);
  }

  async loadAll(): Promise<Snapshot> {
    const [brand, creators, posts, content, trends, videos, media] = await Promise.all([
      this.ensureBrand(),
      this.sb.from("creators").select("*").order("avg_views", { ascending: false }),
      this.sb.from("viral_posts").select("*").order("viral_score", { ascending: false }).limit(500),
      this.sb.from("content_items").select("*").order("position"),
      this.sb.from("trends").select("id, data, saved").order("created_at", { ascending: false }).limit(300),
      this.sb.from("video_projects").select("id, data").order("updated_at", { ascending: false }),
      this.sb.from("media_assets").select("id, data").order("created_at", { ascending: false }).limit(500),
    ]);
    return {
      brand,
      creators: (check(creators) ?? []).map((r) => creatorFromRow(r as Row)),
      posts: (check(posts) ?? []).map((r) => postFromRow(r as Row)),
      content: (check(content) ?? []).map((r) => contentFromRow(r as Row)),
      trends: (check(trends) ?? []).map((r) => ({ ...((r as Row).data as Trend), id: s((r as Row).id), saved: Boolean((r as Row).saved) })),
      videos: (check(videos) ?? []).map((r) => ({ ...((r as Row).data as VideoProject), id: s((r as Row).id) })),
      media: (check(media) ?? []).map((r) => ({ ...((r as Row).data as MediaItem), id: s((r as Row).id) })),
    };
  }

  async saveBrand(brand: BrandProfile) {
    const uidv = await this.userId();
    const row = brandToRow(brand, uidv);
    const res = isUuid(brand.id)
      ? await this.sb.from("brand_profiles").update(row).eq("id", brand.id).select().single()
      : await this.sb.from("brand_profiles").insert(row).select().single();
    return brandFromRow(check(res) as unknown as Row);
  }

  async upsertCreators(creators: Creator[]) {
    if (!creators.length) return [];
    const uidv = await this.userId();
    const rows = check(
      await this.sb
        .from("creators")
        .upsert(creators.map((c) => creatorToRow(c, uidv)), { onConflict: "platform,handle" })
        .select(),
    );
    return (rows ?? []).map((r) => creatorFromRow(r as Row));
  }

  async deleteCreator(id: string) {
    check(await this.sb.from("creators").delete().eq("id", id));
  }

  async upsertPosts(posts: ViralPost[]) {
    if (!posts.length) return [];
    const uidv = await this.userId();
    const rows = check(await this.sb.from("viral_posts").upsert(posts.map((p) => postToRow(p, uidv))).select());
    return (rows ?? []).map((r) => postFromRow(r as Row));
  }

  async deletePost(id: string) {
    check(await this.sb.from("viral_posts").delete().eq("id", id));
  }

  async upsertContent(items: ContentItem[]) {
    if (!items.length) return [];
    const uidv = await this.userId();
    const rows = check(await this.sb.from("content_items").upsert(items.map((i) => contentToRow(i, uidv))).select());
    return (rows ?? []).map((r) => contentFromRow(r as Row));
  }

  async deleteContent(id: string) {
    check(await this.sb.from("content_items").delete().eq("id", id));
  }

  async upsertTrends(trends: Trend[]) {
    if (!trends.length) return [];
    const uidv = await this.userId();
    const rows = trends.map((t) => {
      const id = isUuid(t.id) ? t.id : crypto.randomUUID();
      return { id, name: t.name, saved: t.saved, data: { ...t, id }, created_by: uidv };
    });
    const res = check(await this.sb.from("trends").upsert(rows).select("id, data, saved"));
    return (res ?? []).map((r) => ({ ...((r as Row).data as Trend), id: s((r as Row).id), saved: Boolean((r as Row).saved) }));
  }

  async deleteTrend(id: string) {
    check(await this.sb.from("trends").delete().eq("id", id));
  }

  async upsertVideos(videos: VideoProject[]) {
    if (!videos.length) return [];
    const uidv = await this.userId();
    const now = new Date().toISOString();
    const rows = videos.map((v) => ({
      id: v.id,
      title: v.title,
      content_item_id: v.contentItemId && isUuid(v.contentItemId) ? v.contentItemId : null,
      data: { ...v, updatedAt: now },
      created_by: uidv,
    }));
    const res = check(await this.sb.from("video_projects").upsert(rows).select("id, data"));
    return (res ?? []).map((r) => ({ ...((r as Row).data as VideoProject), id: s((r as Row).id) }));
  }

  async deleteVideo(id: string) {
    check(await this.sb.from("video_projects").delete().eq("id", id));
  }

  async upsertMedia(items: MediaItem[]) {
    if (!items.length) return [];
    const uidv = await this.userId();
    const rows = items.map((m) => ({ id: isUuid(m.id) ? m.id : crypto.randomUUID(), name: m.name, kind: m.kind, data: m, created_by: uidv }));
    const res = check(await this.sb.from("media_assets").upsert(rows.map((r) => ({ ...r, data: { ...r.data, id: r.id } }))).select("id, data"));
    return (res ?? []).map((r) => ({ ...((r as Row).data as MediaItem), id: s((r as Row).id) }));
  }

  async deleteMedia(id: string) {
    check(await this.sb.from("media_assets").delete().eq("id", id));
  }

  /** Inserts seed data, remapping the readable seed ids to UUIDs. */
  async seedSample(): Promise<Snapshot> {
    const idMap = new Map<string, string>();
    const map = (id?: string) => {
      if (!id) return undefined;
      if (!idMap.has(id)) idMap.set(id, crypto.randomUUID());
      return idMap.get(id);
    };
    const creators = SEED_CREATORS.map((c) => ({ ...c, id: map(c.id)! }));
    const savedCreators = await this.upsertCreators(creators);
    // Creators may already exist (unique platform+handle): use the stored ids.
    for (const sc of savedCreators) {
      const orig = SEED_CREATORS.find((c) => c.handle === sc.handle && c.platform === sc.platform);
      if (orig) idMap.set(orig.id, sc.id);
    }
    await this.upsertPosts(SEED_POSTS.map((p) => ({ ...p, id: map(p.id)!, creatorId: map(p.creatorId) })));
    await this.upsertContent(
      SEED_CONTENT.map((i) => ({ ...i, id: crypto.randomUUID(), referencePostId: map(i.referencePostId) })),
    );
    await this.upsertTrends(SEED_TRENDS.map((t) => ({ ...t, id: crypto.randomUUID() })));
    return this.loadAll();
  }

  async reset(): Promise<Snapshot> {
    const none = "00000000-0000-0000-0000-000000000000";
    check(await this.sb.from("content_items").delete().neq("id", none));
    check(await this.sb.from("viral_posts").delete().neq("id", none));
    check(await this.sb.from("creators").delete().neq("id", none));
    check(await this.sb.from("trends").delete().neq("id", none));
    check(await this.sb.from("video_projects").delete().neq("id", none));
    return this.loadAll();
  }
}
