import { NitroModules, getHostComponent, type HybridRef } from 'react-native-nitro-modules';
import PhotoViewConfig from '../nitrogen/generated/shared/json/PhotoViewConfig.json';
import type {
  LedgerCamera,
  Photo,
  PhotoSource,
  PhotoViewMethods,
  PhotoViewProps,
} from './specs/LedgerCamera.nitro';

export type { LedgerCamera, Photo, PhotoSource, PhotoViewProps };
export * from './analysis';

let camera: LedgerCamera | undefined;

/**
 * Returns the native camera module. The module is created on first use, so
 * importing this file costs nothing at app start.
 */
export function getLedgerCamera(): LedgerCamera {
  camera ??= NitroModules.createHybridObject<LedgerCamera>('LedgerCamera');
  return camera;
}

/**
 * Native image view. Give it a `Photo` from `takePhoto()`. The view draws the
 * shared native pixels directly; the image data does not cross the JS bridge.
 */
export const PhotoView = getHostComponent<PhotoViewProps, PhotoViewMethods>(
  'PhotoView',
  () => PhotoViewConfig,
);

export type PhotoViewRef = HybridRef<PhotoViewProps, PhotoViewMethods>;
