/**
 * Pixel analysis in JavaScript, directly on the native memory.
 *
 * `new Uint8Array(photo.pixels)` creates a *view* on the ArrayBuffer that the
 * native module wraps. No byte is copied: JavaScript reads the camera pixels in place.
 * This file has no React Native import, so Vitest can test it in Node.js.
 */

export interface PixelStats {
  /** Mean luminance, 0 (black) to 255 (white). */
  meanLuminance: number;
  /** Part of the sampled pixels (0 to 1) with a luminance below 40. */
  darkRatio: number;
  /** True when the photo is probably too dark to read a receipt. */
  isTooDark: boolean;
  sampledPixels: number;
}

/** Below this mean luminance, receipt text is usually hard to read. */
export const TOO_DARK_LUMINANCE = 60;
const DARK_PIXEL_LUMINANCE = 40;

/**
 * Samples one pixel in every `step` × `step` block (RGBA, 8 bits per channel)
 * and computes the luminance with the Rec. 709 weights.
 */
export function analyzePixels(
  pixels: ArrayBuffer,
  width: number,
  height: number,
  bytesPerRow: number,
  step = 8,
): PixelStats {
  if (width <= 0 || height <= 0) throw new RangeError('width and height must be more than 0.');
  if (bytesPerRow < width * 4) throw new RangeError('bytesPerRow must be at least width × 4.');
  if (pixels.byteLength < bytesPerRow * height)
    throw new RangeError('The buffer is smaller than the image.');

  const bytes = new Uint8Array(pixels); // a view on native memory, not a copy
  let sum = 0;
  let dark = 0;
  let count = 0;
  for (let y = 0; y < height; y += step) {
    const row = y * bytesPerRow;
    for (let x = 0; x < width; x += step) {
      const offset = row + x * 4;
      const luminance =
        0.2126 * (bytes[offset] ?? 0) +
        0.7152 * (bytes[offset + 1] ?? 0) +
        0.0722 * (bytes[offset + 2] ?? 0);
      sum += luminance;
      if (luminance < DARK_PIXEL_LUMINANCE) dark += 1;
      count += 1;
    }
  }
  const meanLuminance = sum / count;
  return {
    meanLuminance: Math.round(meanLuminance * 10) / 10,
    darkRatio: Math.round((dark / count) * 1000) / 1000,
    isTooDark: meanLuminance < TOO_DARK_LUMINANCE,
    sampledPixels: count,
  };
}
