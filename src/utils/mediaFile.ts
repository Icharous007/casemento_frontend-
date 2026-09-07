/** Espelha MediaService no backend: JPEG/PNG/HEIC + MP4, 10 MB / 200 MB. */

export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
export const MAX_VIDEO_DURATION_SECONDS = 60;
const PHOTO_MAX_DIMENSION = 2000;
const PHOTO_JPEG_QUALITY = 0.85;

export const ALLOWED_PHOTO_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
]);

export const ALLOWED_VIDEO_TYPES = new Set(['video/mp4']);

export const ACCEPT_PHOTO = 'image/jpeg,image/png,image/heic,image/heif,.jpg,.jpeg,.png,.heic,.heif';
export const ACCEPT_VIDEO = 'video/mp4,.mp4';
export const ACCEPT_MEDIA = `${ACCEPT_PHOTO},${ACCEPT_VIDEO}`;

const EXT_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  heic: 'image/heic',
  heif: 'image/heif',
  mp4: 'video/mp4',
};

const UNSUPPORTED_MESSAGE =
  'Formato não suportado. Fotos: JPEG, PNG, HEIC. Vídeos: MP4.';

export function inferMediaContentType(file: File): string {
  const type = file.type?.toLowerCase().trim() ?? '';
  if (type === 'image/jpg') return 'image/jpeg';
  if (type && type !== 'application/octet-stream') return type;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return EXT_TO_MIME[ext] ?? '';
}

export function isPhotoFile(file: File): boolean {
  const mime = inferMediaContentType(file);
  if (ALLOWED_PHOTO_TYPES.has(mime)) return true;
  return /\.(jpe?g|png|heic|heif)$/i.test(file.name);
}

export function isVideoFile(file: File): boolean {
  const mime = inferMediaContentType(file);
  if (ALLOWED_VIDEO_TYPES.has(mime)) return true;
  return /\.mp4$/i.test(file.name);
}

export function prepareMediaFile(file: File): File {
  const mime = inferMediaContentType(file);
  if (mime && mime !== file.type) {
    return new File([file], file.name, { type: mime, lastModified: file.lastModified });
  }
  return file;
}

export function validateMediaFile(file: File): string | null {
  const photo = isPhotoFile(file);
  const video = isVideoFile(file);
  if (!photo && !video) return UNSUPPORTED_MESSAGE;
  if (photo && file.size > MAX_PHOTO_BYTES) {
    return 'Fotos devem ter no máximo 10 MB.';
  }
  if (video && file.size > MAX_VIDEO_BYTES) {
    return 'Vídeos devem ter no máximo 200 MB.';
  }
  return null;
}

/**
 * Downscales/re-encodes a photo client-side (canvas) before upload so large phone
 * photos don't have to travel over the network at full resolution. Falls back to the
 * original file whenever compression isn't possible or doesn't shrink it (HEIC decode
 * support is unreliable across browsers, so those are always left untouched).
 */
export async function compressImage(file: File): Promise<File> {
  const mime = inferMediaContentType(file);
  if (mime === 'image/heic' || mime === 'image/heif') return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, PHOTO_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    if (scale >= 1) {
      bitmap.close();
      return file;
    }
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', PHOTO_JPEG_QUALITY));
    if (!blob || blob.size === 0 || blob.size >= file.size) return file;
    const newName = `${file.name.replace(/\.[^./\\]+$/, '')}.jpg`;
    return new File([blob], newName, { type: 'image/jpeg', lastModified: file.lastModified });
  } catch {
    return file;
  }
}

function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    const cleanup = () => {
      clearTimeout(timeoutId);
      video.onloadedmetadata = null;
      video.onerror = null;
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(url);
    };
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error('video_metadata_timeout'));
    }, 3000);
    video.onloadedmetadata = () => {
      const duration = video.duration;
      cleanup();
      resolve(duration);
    };
    video.onerror = () => {
      cleanup();
      reject(new Error('video_metadata_failed'));
    };
    video.src = url;
  });
}

/** Returns an error message if the video is longer than MAX_VIDEO_DURATION_SECONDS, or null if OK/unknown. */
export async function validateVideoDuration(file: File): Promise<string | null> {
  try {
    const duration = await readVideoDuration(file);
    if (Number.isFinite(duration) && duration > MAX_VIDEO_DURATION_SECONDS) {
      return `Vídeos devem ter no máximo ${MAX_VIDEO_DURATION_SECONDS} segundos.`;
    }
  } catch {
    // couldn't read metadata (unsupported codec/browser) - let the server validate instead
  }
  return null;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

export function uploadErrorMessage(err: unknown): string {
  if (typeof err === 'object' && err !== null) {
    const axiosLike = err as {
      code?: string;
      message?: string;
      response?: { status?: number; data?: { message?: unknown } };
    };
    const response = axiosLike.response;
    if (typeof response?.data?.message === 'string' && response.data.message.trim()) {
      return response.data.message;
    }
    if (response?.status === 413) {
      return 'Arquivo muito grande para o servidor. Tamanho máximo: 200 MB.';
    }
    if (axiosLike.code === 'ECONNABORTED' || /timeout/i.test(axiosLike.message ?? '')) {
      return 'O envio demorou demais. Tente um arquivo menor.';
    }
  }
  return 'Falha no envio. Tente novamente.';
}
