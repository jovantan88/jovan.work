import { writeField } from "./logoField";

/*
 * The hero name as a signed distance field, so the stage can draw it in 3D ASCII exactly where
 * the (now transparent) DOM text sits. Every character is drawn where the browser laid it out,
 * in its own computed font, so kerning, letter-spacing and the italic all match the page.
 * Distances are in line heights (the element's height); <em> text is marked rust.
 */

export type NameField = {
  data: Float32Array;
  width: number;
  height: number;
  frame: [number, number];   // the field's size, in line heights, centred on the element
  box: { width: number; height: number };   // the element's size when it was baked
};

const PAD = 0.35;            // room round the line box for descenders, overhangs and the extrusion

export async function buildNameField(el: HTMLElement): Promise<NameField | null> {
  await document.fonts.ready;
  const box = el.getBoundingClientRect();
  if (box.width < 1 || box.height < 1) return null;
  const unit = box.height;
  const pad = unit * PAD;
  const fw = box.width + 2 * pad, fh = box.height + 2 * pad;
  const scale = Math.min(3, 1600 / fw, 420 / fh);
  const W = Math.ceil(fw * scale), H = Math.ceil(fh * scale);

  const layer = () => {
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx?.setTransform(scale, 0, 0, scale, (pad - box.left) * scale, (pad - box.top) * scale);
    return ctx;
  };
  const ink = layer(), rust = layer();
  if (!ink || !rust) return null;

  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent ?? "";
    const parent = node.parentElement;
    if (!parent || !text.trim()) continue;
    const style = getComputedStyle(parent);
    const targets = parent.closest("em") ? [ink, rust] : [ink];
    for (const ctx of targets) {
      ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = "#fff";
    }
    const m = ink.measureText("Hg");
    const ascent = m.fontBoundingBoxAscent, descent = m.fontBoundingBoxDescent;
    for (let i = 0; i < text.length; i++) {
      if (/\s/.test(text[i])) continue;
      range.setStart(node, i);
      range.setEnd(node, i + 1);
      const r = range.getBoundingClientRect();
      // a character's box is its font's content area, so the baseline is `ascent` below its top
      const baseline = r.top + (r.height - ascent - descent) / 2 + ascent;
      for (const ctx of targets) ctx.fillText(text[i], r.left, baseline);
    }
  }

  const inkPx = ink.getImageData(0, 0, W, H).data, rustPx = rust.getImageData(0, 0, W, H).data;
  const inkMask = new Uint8Array(W * H), rustMask = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    inkMask[i] = inkPx[i * 4 + 3] > 127 ? 1 : 0;
    rustMask[i] = rustPx[i * 4 + 3] > 127 ? 1 : 0;
  }
  const data = new Float32Array(W * H * 4);
  writeField(inkMask, rustMask, W, H, unit * scale, data, 0);
  return { data, width: W, height: H, frame: [fw / unit, fh / unit], box: { width: box.width, height: box.height } };
}
