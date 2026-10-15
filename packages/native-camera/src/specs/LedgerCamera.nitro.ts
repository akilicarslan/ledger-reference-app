import type {
  HybridObject,
  HybridView,
  HybridViewMethods,
  HybridViewProps,
} from 'react-native-nitro-modules';

/**
 * Nitro specs. `nitrogen` reads this file and generates the C++, Swift and
 * Kotlin bindings in ../../nitrogen/generated. Run `pnpm codegen` after a change.
 */

/** Where the photo comes from. `sample` is a generated test image (devices without a camera). */
export type PhotoSource = 'camera' | 'sample';

/**
 * One photo in native memory.
 *
 * `pixels` is an ArrayBuffer that wraps the native pixel memory (RGBA,
 * 8 bits per channel, premultiplied alpha). JavaScript reads the same memory:
 * there is no copy and no base64 conversion.
 */
export interface Photo extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  readonly width: number;
  readonly height: number;
  /** Bytes in one row of `pixels`. It can be more than width × 4 (row padding). */
  readonly bytesPerRow: number;
  readonly source: PhotoSource;
  /** Time in milliseconds from the shutter to pixels ready in memory. */
  readonly decodeMs: number;
  /** RGBA pixels. Native memory shared with JavaScript (zero-copy). */
  readonly pixels: ArrayBuffer;
  /** Encodes the pixels as a JPEG data URI on a background thread. Use it only to upload. */
  toJpegDataUri(quality: number): Promise<string>;
}

export interface LedgerCamera extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  /** False on most simulators. `takePhoto` then returns a generated sample photo. */
  readonly isCameraAvailable: boolean;
  /**
   * Opens the system camera and resolves with the photo, downscaled so that
   * its longest side is `maxDimension` or less. Resolves with `undefined` when
   * the user cancels.
   */
  takePhoto(maxDimension: number): Promise<Photo | undefined>;
}

export interface PhotoViewProps extends HybridViewProps {
  /** The native view draws this photo from the shared native memory. */
  photo?: Photo;
}

export type PhotoViewMethods = HybridViewMethods;

/** Native image view that renders a `Photo` directly, without a JS round trip. */
export type PhotoView = HybridView<
  PhotoViewProps,
  PhotoViewMethods,
  { ios: 'swift'; android: 'kotlin' }
>;
