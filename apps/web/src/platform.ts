import type { PickedImage, PlatformServices } from '@ledger/features';

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
/** Longest side of the stored image. Smaller images keep the request small. */
const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.7;

/** Opens the browser file dialog and resolves with the selected file, or null. */
function chooseFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = ACCEPTED_TYPES.join(',');
    input.addEventListener('change', () => resolve(input.files?.[0] ?? null), { once: true });
    input.addEventListener('cancel', () => resolve(null), { once: true });
    input.click();
  });
}

/** Makes the image smaller and converts it to a JPEG data URI. */
async function toCompressedDataUri(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D is not available.');
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

export const webPlatformServices: PlatformServices = {
  async pickImage(): Promise<PickedImage | null> {
    const file = await chooseFile();
    if (!file) return null;
    if (!ACCEPTED_TYPES.includes(file.type)) throw new Error(`Unsupported file type: ${file.type}`);
    return { dataUri: await toCompressedDataUri(file) };
  },
};
