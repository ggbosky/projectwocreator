import type { GeneratedContent } from "./types";
import { FORMAT_LABEL, PLATFORM_LABEL } from "./utils";

export function hooksText(o: GeneratedContent) {
  return o.hooks.map((h, i) => `Hook ${i + 1} (${h.pattern})\nNa obrazovce: ${h.onScreen}\nMluvené: ${h.spoken}`).join("\n\n");
}

export function scriptText(o: GeneratedContent) {
  return o.script.map((b) => `[${b.time}] ${b.label}\n🎙 ${b.spoken}\n🔤 ${b.onScreen}\n🎬 ${b.visual}`).join("\n\n");
}

export function slidesText(o: GeneratedContent) {
  return o.slides.map((s) => `Slide ${s.index}: ${s.headline}\n${s.body}\n(Vizuál: ${s.visual})`).join("\n\n");
}

export function visualText(o: GeneratedContent) {
  const v = o.visualDirection;
  return [
    "KAMERA",
    ...v.camera.map((x) => `• ${x}`),
    "",
    "B-ROLL",
    ...v.broll.map((x) => `• ${x}`),
    "",
    "STŘIH",
    ...v.editing.map((x) => `• ${x}`),
    "",
    `TITULKY: ${v.captions}`,
  ].join("\n");
}

export function captionText(o: GeneratedContent) {
  return `${o.caption}\n\n${o.hashtags.join(" ")}`;
}

export function postText(o: GeneratedContent) {
  return o.post.body;
}

export function fullText(o: GeneratedContent) {
  const parts = [`# ${o.title}`, `${FORMAT_LABEL[o.format]} · ${PLATFORM_LABEL[o.platform]}`, "", "## Hooky", hooksText(o)];
  if (o.script.length) parts.push("", "## Scénář", scriptText(o), "", "## Vizuální pokyny", visualText(o));
  if (o.slides.length) parts.push("", "## Slidy", slidesText(o));
  if (o.format === "linkedin" || o.format === "x_thread" || o.format === "ig_post") parts.push("", "## Text postu", postText(o));
  parts.push("", "## Popisek", captionText(o));
  return parts.join("\n");
}
