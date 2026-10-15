import { describe, expect, it } from 'vitest';
import { analyzePixels } from '../src/analysis';

/** Creates an RGBA buffer, the same layout as the native module gives. */
function solidImage(width: number, height: number, rgb: [number, number, number], padding = 0) {
  const bytesPerRow = width * 4 + padding;
  const buffer = new ArrayBuffer(bytesPerRow * height);
  const bytes = new Uint8Array(buffer);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = y * bytesPerRow + x * 4;
      bytes.set([...rgb, 255], offset);
    }
  }
  return { buffer, bytesPerRow };
}

describe('analyzePixels', () => {
  it('finds a white image bright and a black image too dark', () => {
    const white = solidImage(64, 48, [255, 255, 255]);
    expect(analyzePixels(white.buffer, 64, 48, white.bytesPerRow)).toMatchObject({
      meanLuminance: 255,
      darkRatio: 0,
      isTooDark: false,
    });
    const black = solidImage(64, 48, [0, 0, 0]);
    expect(analyzePixels(black.buffer, 64, 48, black.bytesPerRow)).toMatchObject({
      meanLuminance: 0,
      darkRatio: 1,
      isTooDark: true,
    });
  });

  it('uses the Rec. 709 weights (green is brighter than blue)', () => {
    const green = solidImage(8, 8, [0, 255, 0]);
    const blue = solidImage(8, 8, [0, 0, 255]);
    expect(analyzePixels(green.buffer, 8, 8, green.bytesPerRow, 1).meanLuminance).toBeCloseTo(
      182.4,
      1,
    );
    expect(analyzePixels(blue.buffer, 8, 8, blue.bytesPerRow, 1).meanLuminance).toBeCloseTo(
      18.4,
      1,
    );
  });

  it('respects row padding (bytesPerRow more than width × 4)', () => {
    const padded = solidImage(10, 10, [255, 255, 255], 24);
    expect(analyzePixels(padded.buffer, 10, 10, padded.bytesPerRow, 1).meanLuminance).toBe(255);
  });

  it('samples one pixel per step × step block', () => {
    const image = solidImage(64, 32, [128, 128, 128]);
    expect(analyzePixels(image.buffer, 64, 32, image.bytesPerRow, 8).sampledPixels).toBe(8 * 4);
  });

  it('refuses a buffer that is smaller than the image', () => {
    expect(() => analyzePixels(new ArrayBuffer(10), 4, 4, 16)).toThrow(RangeError);
  });
});
