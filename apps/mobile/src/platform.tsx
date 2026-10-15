import * as ImagePicker from 'expo-image-picker';
import { View } from 'react-native';
import { PhotoView, analyzePixels, getLedgerCamera, type Photo } from '@ledger/native-camera';
import type { CameraService, CapturedPhoto, PickedImage, PlatformServices } from '@ledger/features';

const SUPPORTED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp']);

/** Longest side of the photo in pixels. 1280 px is enough to read a receipt. */
const PHOTO_MAX_DIMENSION = 1280;
/** JPEG quality for the upload. The server limit is 1.5 MB of base64 text. */
const UPLOAD_JPEG_QUALITY = 0.6;

/**
 * Converts the Nitro `Photo` (native memory) to the platform-neutral
 * `CapturedPhoto` that the shared screens use.
 */
function toCapturedPhoto(photo: Photo): CapturedPhoto {
  // `photo.pixels` is the native pixel memory. `analyzePixels` reads it through
  // a Uint8Array view: JavaScript does not copy one byte.
  const start = performance.now();
  const stats = analyzePixels(photo.pixels, photo.width, photo.height, photo.bytesPerRow);
  const analysisMs = performance.now() - start;

  return {
    width: photo.width,
    height: photo.height,
    byteLength: photo.pixels.byteLength,
    source: photo.source,
    decodeMs: photo.decodeMs,
    analysisMs,
    meanLuminance: stats.meanLuminance,
    isTooDark: stats.isTooDark,
    renderPreview: (accessibilityLabel) => (
      // The wrapper is the accessible element. The native view only draws pixels.
      <View accessible role="img" accessibilityLabel={accessibilityLabel} style={{ flex: 1 }}>
        <PhotoView photo={photo} style={{ flex: 1 }} />
      </View>
    ),
    toDataUri: () => photo.toJpegDataUri(UPLOAD_JPEG_QUALITY),
  };
}

const camera: CameraService = {
  async takePhoto() {
    const photo = await getLedgerCamera().takePhoto(PHOTO_MAX_DIMENSION);
    return photo ? toCapturedPhoto(photo) : null;
  },
};

/**
 * Native implementation of PlatformServices.
 * - `pickImage`: the system photo picker (PHPicker on iOS, Photo Picker on
 *   Android). It needs no runtime permission for the selected photo.
 * - `camera`: the Nitro module in packages/native-camera.
 */
export const mobilePlatformServices: PlatformServices = {
  async pickImage(): Promise<PickedImage | null> {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      // A quality below 1 makes iOS and Android encode the result as JPEG
      // (also for HEIC sources) and keeps the request small.
      quality: 0.4,
      base64: true,
    });
    if (result.canceled) return null;
    const asset = result.assets[0];
    if (!asset?.base64) throw new Error('The picker did not return image data.');
    const mime =
      asset.mimeType && SUPPORTED_MIME.has(asset.mimeType) ? asset.mimeType : 'image/jpeg';
    return { dataUri: `data:${mime};base64,${asset.base64}` };
  },
  camera,
};
