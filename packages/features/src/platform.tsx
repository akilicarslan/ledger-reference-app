import { createContext, useContext, type ReactNode } from 'react';

export interface PickedImage {
  /** Base64 data URI, for example "data:image/jpeg;base64,...". */
  dataUri: string;
}

/**
 * A photo from the native camera module. The pixels stay in native memory;
 * the screen gets only a preview element, numbers and an encoder.
 */
export interface CapturedPhoto {
  width: number;
  height: number;
  /** Size of the pixel buffer that native code shares with JavaScript. */
  byteLength: number;
  /** `sample` = generated image on a device without a camera (simulator). */
  source: 'camera' | 'sample';
  /** Native time from image data to RGBA pixels in memory. */
  decodeMs: number;
  /** JavaScript time to analyze the shared pixels (no copy). */
  analysisMs: number;
  meanLuminance: number;
  isTooDark: boolean;
  /** Renders the native preview. The element has `role="img"` and the given name. */
  renderPreview(accessibilityLabel: string): ReactNode;
  /** Encodes a JPEG data URI on a native background thread (for the upload only). */
  toDataUri(): Promise<string>;
}

export interface CameraService {
  /** Opens the camera. Returns `null` when the user cancels. */
  takePhoto(): Promise<CapturedPhoto | null>;
}

/**
 * Features that each platform implements in a different way. The shared
 * screens call this interface; each app gives its own implementation
 * (dependency inversion). Mobile uses expo-image-picker and the Nitro camera
 * module. Web uses a file input and has no camera service.
 */
export interface PlatformServices {
  /** Opens the photo library. Returns `null` when the user cancels. */
  pickImage(): Promise<PickedImage | null>;
  /** Optional: only platforms with the native camera module give it. */
  camera?: CameraService;
}

const PlatformServicesContext = createContext<PlatformServices | null>(null);

export function PlatformServicesProvider({
  services,
  children,
}: {
  services: PlatformServices;
  children: ReactNode;
}) {
  return (
    <PlatformServicesContext.Provider value={services}>{children}</PlatformServicesContext.Provider>
  );
}

export function usePlatformServices(): PlatformServices {
  const services = useContext(PlatformServicesContext);
  if (!services)
    throw new Error('usePlatformServices() must be used inside <PlatformServicesProvider>.');
  return services;
}
