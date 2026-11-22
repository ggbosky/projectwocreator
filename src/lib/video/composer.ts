/**
 * ReelComposer — assembles a VideoProject into a finished vertical video in the
 * browser: AI clips (or animated motion-graphics when a shot has no clip yet),
 * on-screen text, karaoke subtitles, transitions, progress bar, music and
 * voiceover. Export records the canvas with MediaRecorder (MP4 where the
 * browser supports it, otherwise WebM).
 */
import type { CaptionStyle, Shot, VideoProject, VideoStyle } from "@/lib/types";

export const ASPECT_SIZE: Record<VideoProject["aspect"], [number, number]> = {
  "9:16": [1080, 1920],
  "1:1": [1080, 1080],
  "16:9": [1920, 1080],
};

const PALETTES: Record<VideoStyle, [string, string, string]> = {
  ugc: ["#1f1410", "#3a2418", "#ff7a3d"],
  cinematic: ["#06131a", "#0f2a33", "#ff8c42"],
  meme_edit: ["#1b0b2e", "#4a148c", "#ffd400"],
  game: ["#2b0f3a", "#ff3d7f", "#ffb000"],
  retro_vhs: ["#14213d", "#3d2c8d", "#00e5ff"],
  product_3d: ["#0b0b0e", "#1c1c24", "#ff5a0f"],
  kinetic_text: ["#09090b", "#1a1a1f", "#ff5a0f"],
};

interface Media {
  video?: HTMLVideoElement;
  image?: HTMLImageElement;
}

export interface ComposerOptions {
  brandName: string;
  showProgress: boolean;
  watermark: boolean;
}

export class ReelComposer {
  readonly width: number;
  readonly height: number;
  private ctx: CanvasRenderingContext2D;
  private media = new Map<string, Media>();
  private starts: number[] = [];
  readonly total: number;
  private raf = 0;
  private playing = false;
  private t0 = 0;
  private offset = 0;
  private activeVideo: HTMLVideoElement | null = null;
  private music?: HTMLAudioElement;
  private voice?: HTMLAudioElement;
  onTime?: (t: number) => void;
  onEnd?: () => void;

  constructor(
    private canvas: HTMLCanvasElement,
    private project: VideoProject,
    private opts: ComposerOptions,
  ) {
    [this.width, this.height] = ASPECT_SIZE[project.aspect];
    canvas.width = this.width;
    canvas.height = this.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas není podporován");
    this.ctx = ctx;
    let acc = 0;
    for (const s of project.shots) {
      this.starts.push(acc);
      acc += s.duration;
    }
    this.total = acc;
    for (const s of project.shots) this.load(s);
    if (project.musicUrl) this.music = this.audio(project.musicUrl, 0.35);
    if (project.voiceoverUrl) this.voice = this.audio(project.voiceoverUrl, 1);
    this.draw(0);
  }

  private audio(src: string, volume: number) {
    const a = new Audio();
    a.crossOrigin = "anonymous";
    a.src = src;
    a.volume = volume;
    a.preload = "auto";
    return a;
  }

  private load(s: Shot) {
    const m: Media = {};
    if (s.videoUrl) {
      const v = document.createElement("video");
      v.crossOrigin = "anonymous";
      v.muted = true;
      v.playsInline = true;
      v.preload = "auto";
      v.src = s.videoUrl;
      v.addEventListener("loadeddata", () => !this.playing && this.draw(this.offset));
      m.video = v;
    } else if (s.imageUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => !this.playing && this.draw(this.offset);
      img.src = s.imageUrl;
      m.image = img;
    }
    this.media.set(s.id, m);
  }

  destroy() {
    this.pause();
    this.media.forEach((m) => {
      m.video?.removeAttribute("src");
      m.video?.load();
    });
    this.music?.pause();
    this.voice?.pause();
  }

  shotAt(t: number) {
    let i = this.starts.length - 1;
    while (i > 0 && this.starts[i] > t) i--;
    return { index: Math.max(0, i), local: t - (this.starts[i] ?? 0) };
  }

  /* -------------------------------- playback ------------------------------- */

  play() {
    if (this.playing || !this.project.shots.length) return;
    if (this.offset >= this.total - 0.05) this.offset = 0;
    this.playing = true;
    this.t0 = performance.now() - this.offset * 1000;
    for (const a of [this.music, this.voice]) {
      if (!a) continue;
      a.currentTime = Math.min(this.offset, (a.duration || Infinity) - 0.1);
      void a.play().catch(() => undefined);
    }
    const tick = () => {
      if (!this.playing) return;
      const t = (performance.now() - this.t0) / 1000;
      if (t >= this.total) {
        this.offset = this.total;
        this.draw(this.total - 0.001);
        this.pause();
        this.onEnd?.();
        return;
      }
      this.offset = t;
      this.syncVideo(t);
      this.draw(t);
      this.onTime?.(t);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  pause() {
    this.playing = false;
    cancelAnimationFrame(this.raf);
    this.activeVideo?.pause();
    this.music?.pause();
    this.voice?.pause();
  }

  get isPlaying() {
    return this.playing;
  }

  seek(t: number) {
    this.offset = Math.max(0, Math.min(this.total, t));
    if (this.playing) this.t0 = performance.now() - this.offset * 1000;
    const { index, local } = this.shotAt(this.offset);
    const v = this.media.get(this.project.shots[index]?.id ?? "")?.video;
    if (v && v.readyState > 0) {
      v.currentTime = Math.min(local, (v.duration || local) - 0.05);
      v.addEventListener("seeked", () => this.draw(this.offset), { once: true });
    }
    this.draw(this.offset);
    this.onTime?.(this.offset);
  }

  private syncVideo(t: number) {
    const { index, local } = this.shotAt(t);
    const v = this.media.get(this.project.shots[index]?.id ?? "")?.video ?? null;
    if (v !== this.activeVideo) {
      this.activeVideo?.pause();
      this.activeVideo = v;
      if (v) {
        v.currentTime = Math.min(local, Math.max(0, (v.duration || 1) - 0.05));
        void v.play().catch(() => undefined);
      }
    } else if (v && v.paused && local < (v.duration || 0)) {
      void v.play().catch(() => undefined);
    }
  }

  /* --------------------------------- export -------------------------------- */

  static pickMime(): { mime: string; ext: "mp4" | "webm" } {
    const candidates: Array<[string, "mp4" | "webm"]> = [
      ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "mp4"],
      ["video/mp4", "mp4"],
      ["video/webm;codecs=vp9,opus", "webm"],
      ["video/webm;codecs=vp8,opus", "webm"],
      ["video/webm", "webm"],
    ];
    for (const [m, e] of candidates) if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) return { mime: m, ext: e };
    return { mime: "video/webm", ext: "webm" };
  }

  /** Records the whole reel in real time. Resolves with the finished file. */
  async export(onProgress?: (p: number) => void): Promise<{ blob: Blob; ext: "mp4" | "webm" }> {
    if (typeof MediaRecorder === "undefined") throw new Error("Tento prohlížeč neumí nahrávat video (MediaRecorder).");
    let stream: MediaStream;
    try {
      stream = this.canvas.captureStream(30);
    } catch {
      throw new Error("Některý klip nepovoluje export (chybí CORS). Nahrajte ho jako soubor a zkuste to znovu.");
    }
    let audioCtx: AudioContext | null = null;
    const tracks = [...stream.getVideoTracks()];
    if (this.music || this.voice) {
      audioCtx = new AudioContext();
      const dest = audioCtx.createMediaStreamDestination();
      for (const a of [this.music, this.voice]) {
        if (!a) continue;
        const src = audioCtx.createMediaElementSource(a);
        src.connect(dest);
        src.connect(audioCtx.destination);
      }
      tracks.push(...dest.stream.getAudioTracks());
    }
    const { mime, ext } = ReelComposer.pickMime();
    const rec = new MediaRecorder(new MediaStream(tracks), { mimeType: mime, videoBitsPerSecond: 8_000_000 });
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const done = new Promise<Blob>((resolve) => {
      rec.onstop = () => resolve(new Blob(chunks, { type: mime.split(";")[0] }));
    });
    this.pause();
    this.seek(0);
    const prevTime = this.onTime;
    const prevEnd = this.onEnd;
    this.onTime = (t) => {
      prevTime?.(t);
      onProgress?.(t / this.total);
    };
    rec.start(250);
    await new Promise<void>((resolve) => {
      this.onEnd = () => resolve();
      this.play();
    });
    await new Promise((r) => setTimeout(r, 200));
    rec.stop();
    const blob = await done;
    this.onTime = prevTime;
    this.onEnd = prevEnd;
    void audioCtx?.close();
    onProgress?.(1);
    return { blob, ext };
  }

  /* -------------------------------- drawing -------------------------------- */

  draw(t: number) {
    const { ctx, width: W, height: H } = this;
    const shots = this.project.shots;
    ctx.save();
    ctx.clearRect(0, 0, W, H);
    if (!shots.length) {
      this.background(t, 0);
      ctx.restore();
      return;
    }
    const { index, local } = this.shotAt(t);
    const shot = shots[index];
    const k = Math.min(1, local / 0.3); // transition progress 0→1

    ctx.save();
    if (index > 0 && shot.transition === "zoom" && k < 1) {
      const s = 1.18 - 0.18 * easeOut(k);
      ctx.translate(W / 2, H / 2);
      ctx.scale(s, s);
      ctx.translate(-W / 2, -H / 2);
    }
    if (index > 0 && shot.transition === "whip" && k < 1) {
      ctx.translate(W * (1 - easeOut(k)) * 0.6, 0);
      ctx.filter = `blur(${Math.round((1 - k) * 18)}px)`;
    }
    this.drawShot(shot, index, local, t);
    ctx.restore();
    ctx.filter = "none";

    if (index > 0 && shot.transition === "flash" && k < 1) {
      ctx.fillStyle = `rgba(255,255,255,${0.85 * (1 - k)})`;
      ctx.fillRect(0, 0, W, H);
    }

    this.overlayText(shot, index, local);
    this.subtitles(shot, local);
    if (this.opts.showProgress) this.progress(t);
    if (this.opts.watermark) this.watermark();
    ctx.restore();
  }

  private drawShot(shot: Shot, index: number, local: number, t: number) {
    const m = this.media.get(shot.id);
    const v = m?.video;
    if (v && v.readyState >= 2) {
      this.cover(v, v.videoWidth, v.videoHeight, local, shot.duration);
      this.grade();
      return;
    }
    if (m?.image && m.image.complete && m.image.naturalWidth) {
      this.cover(m.image, m.image.naturalWidth, m.image.naturalHeight, local, shot.duration, true);
      this.grade();
      return;
    }
    this.background(t, index);
    this.motionGraphic(shot, index, local);
  }

  /** Draws media covering the frame; stills get a slow Ken Burns push. */
  private cover(src: CanvasImageSource, w: number, h: number, local: number, dur: number, kenBurns = false) {
    const { ctx, width: W, height: H } = this;
    const scale = Math.max(W / w, H / h) * (kenBurns ? 1 + 0.08 * (local / Math.max(dur, 0.1)) : 1);
    const dw = w * scale;
    const dh = h * scale;
    ctx.drawImage(src, (W - dw) / 2, (H - dh) / 2, dw, dh);
  }

  private grade() {
    const { ctx, width: W, height: H } = this;
    const style = this.project.style;
    if (style === "retro_vhs") {
      ctx.fillStyle = "rgba(255,0,128,0.06)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "rgba(0,0,0,0.12)";
      for (let y = 0; y < H; y += 6) ctx.fillRect(0, y, W, 2);
    }
    if (style === "game") {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "rgba(255,61,127,0.10)");
      g.addColorStop(1, "rgba(255,176,0,0.12)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
    // Readability gradient behind text areas
    const v = ctx.createLinearGradient(0, 0, 0, H);
    v.addColorStop(0, "rgba(0,0,0,0.45)");
    v.addColorStop(0.35, "rgba(0,0,0,0)");
    v.addColorStop(0.65, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }

  private background(t: number, index: number) {
    const { ctx, width: W, height: H } = this;
    const [a, b, c] = PALETTES[this.project.style];
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, a);
    g.addColorStop(1, b);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // Drifting glow blobs
    for (let i = 0; i < 3; i++) {
      const x = W * (0.5 + 0.38 * Math.sin(t * 0.6 + i * 2.1 + index));
      const y = H * (0.5 + 0.32 * Math.cos(t * 0.5 + i * 1.7));
      const r = Math.max(W, H) * (0.35 + 0.08 * i);
      const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, hexA(c, 0.28 - i * 0.07));
      rg.addColorStop(1, hexA(c, 0));
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, W, H);
    }
    if (this.project.style === "retro_vhs") {
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      for (let y = (t * 120) % 6; y < H; y += 6) ctx.fillRect(0, y, W, 2);
    }
  }

  /** Placeholder visual for a shot without a clip: the shot description as a styled card. */
  private motionGraphic(shot: Shot, index: number, local: number) {
    const { ctx, width: W, height: H } = this;
    const accent = PALETTES[this.project.style][2];
    const p = easeOut(Math.min(1, local / 0.6));
    ctx.save();
    ctx.globalAlpha = 0.9 * p;
    const boxW = W * 0.78;
    const boxH = H * 0.2;
    const x = (W - boxW) / 2;
    const y = H * 0.42 + (1 - p) * 40;
    roundRect(ctx, x, y, boxW, boxH, 36);
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fill();
    ctx.strokeStyle = hexA(accent, 0.5);
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = hexA(accent, 1);
    ctx.font = `700 ${Math.round(W * 0.026)}px Inter, system-ui, sans-serif`;
    ctx.fillText(`ZÁBĚR ${index + 1} · ${shot.camera || "kamera"}`.toUpperCase(), x + 40, y + 70);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = `500 ${Math.round(W * 0.03)}px Inter, system-ui, sans-serif`;
    wrap(ctx, shot.description || "Popis záběru", boxW - 80).slice(0, 3).forEach((line, i) => ctx.fillText(line, x + 40, y + 130 + i * W * 0.042));
    ctx.restore();
  }

  private overlayText(shot: Shot, index: number, local: number) {
    const text = (index === 0 && this.project.hookText ? this.project.hookText : shot.onScreenText).trim();
    if (!text) return;
    const { ctx, width: W, height: H } = this;
    const accent = PALETTES[this.project.style][2];
    const pop = Math.min(1, local / 0.18);
    const scale = 0.85 + 0.15 * easeOutBack(pop);
    const game = this.project.captionStyle === "game";
    const size = Math.round(W * (index === 0 ? 0.075 : 0.062));
    ctx.save();
    ctx.translate(W / 2, H * (this.project.aspect === "16:9" ? 0.2 : 0.24));
    ctx.scale(scale, scale);
    ctx.textAlign = "center";
    ctx.font = `${game ? "italic 900" : "800"} ${size}px Inter, system-ui, sans-serif`;
    const lines = wrap(ctx, game ? text.toUpperCase() : text, W * 0.84);
    lines.forEach((line, i) => {
      const y = i * size * 1.12;
      ctx.lineJoin = "round";
      ctx.lineWidth = size * (game ? 0.2 : 0.16);
      ctx.strokeStyle = "rgba(0,0,0,0.9)";
      ctx.strokeText(line, 0, y);
      ctx.fillStyle = game ? accent : i === 0 && index === 0 ? "#ffffff" : "#ffffff";
      ctx.fillText(line, 0, y);
    });
    // Highlight the last word of the hook in brand colour
    if (!game && index === 0 && lines.length) {
      const last = lines[lines.length - 1];
      const words = last.split(" ");
      const lw = words.pop() ?? "";
      const before = words.join(" ");
      const full = ctx.measureText(last).width;
      const pre = before ? ctx.measureText(before + " ").width : 0;
      ctx.textAlign = "left";
      ctx.fillStyle = accent;
      ctx.fillText(lw, -full / 2 + pre, (lines.length - 1) * size * 1.12);
    }
    ctx.restore();
  }

  private subtitles(shot: Shot, local: number) {
    const vo = shot.voiceover.trim();
    if (!vo) return;
    const style: CaptionStyle = this.project.captionStyle;
    const { ctx, width: W, height: H } = this;
    const accent = PALETTES[this.project.style][2];
    const words = vo.split(/\s+/);
    const progress = Math.min(1, local / Math.max(0.5, shot.duration * 0.92));
    const spoken = Math.ceil(words.length * progress);
    const size = Math.round(W * (style === "minimal" ? 0.036 : 0.05));
    ctx.save();
    ctx.font = `${style === "game" ? "italic 900" : "800"} ${size}px Inter, system-ui, sans-serif`;
    ctx.textAlign = "center";
    // Show a rolling window of ~6 words around the current one (karaoke / bold)
    const windowSize = style === "minimal" ? 12 : 5;
    const start = Math.max(0, Math.min(spoken - 1, words.length - 1) - Math.floor(windowSize / 2));
    const chunk = style === "minimal" ? words : words.slice(start, start + windowSize);
    const offset = style === "minimal" ? 0 : start;
    const lines = wrapWords(ctx, chunk, W * 0.8);
    const baseY = H * (style === "minimal" ? 0.88 : 0.72);
    let wi = 0;
    lines.forEach((line, li) => {
      const lineW = ctx.measureText(line.join(" ")).width;
      let x = W / 2 - lineW / 2;
      ctx.textAlign = "left";
      for (const w of line) {
        const absolute = offset + wi;
        const active = absolute === spoken - 1;
        const visible = style === "bold" || style === "minimal" ? true : absolute < spoken;
        const ww = ctx.measureText(w + " ").width;
        if (visible) {
          ctx.lineWidth = size * 0.18;
          ctx.strokeStyle = "rgba(0,0,0,0.92)";
          ctx.strokeText(w, x, baseY + li * size * 1.2);
          ctx.fillStyle = style !== "minimal" && active ? accent : style === "minimal" && absolute >= spoken ? "rgba(255,255,255,0.55)" : "#ffffff";
          ctx.fillText(w, x, baseY + li * size * 1.2);
        }
        x += ww;
        wi++;
      }
    });
    ctx.restore();
  }

  private progress(t: number) {
    const { ctx, width: W } = this;
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(0, 0, W, 10);
    ctx.fillStyle = PALETTES[this.project.style][2];
    ctx.fillRect(0, 0, W * Math.min(1, t / Math.max(this.total, 0.01)), 10);
  }

  private watermark() {
    const { ctx, width: W, height: H } = this;
    ctx.save();
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = "#ffffff";
    ctx.font = `700 ${Math.round(W * 0.026)}px Inter, system-ui, sans-serif`;
    ctx.textAlign = "right";
    ctx.fillText(this.opts.brandName, W - 40, H - 44);
    ctx.restore();
  }
}

/* --------------------------------- helpers --------------------------------- */

function easeOut(x: number) {
  return 1 - Math.pow(1 - x, 3);
}
function easeOutBack(x: number) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}
function hexA(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
export function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  return wrapWords(ctx, text.split(/\s+/).filter(Boolean), maxW).map((l) => l.join(" "));
}
function wrapWords(ctx: CanvasRenderingContext2D, words: string[], maxW: number): string[][] {
  const lines: string[][] = [];
  let cur: string[] = [];
  for (const w of words) {
    const test = [...cur, w].join(" ");
    if (ctx.measureText(test).width > maxW && cur.length) {
      lines.push(cur);
      cur = [w];
    } else cur.push(w);
  }
  if (cur.length) lines.push(cur);
  return lines;
}
