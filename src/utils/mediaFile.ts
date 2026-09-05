/** Espelha MediaService no backend: JPEG/PNG/HEIC + MP4/MOV/WebM, 10 MB / 50 MB. */

export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

export const ALLOWED_PHOTO_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
]);

export const ALLOWED_VIDEO_TYPES = new Set([
  'video/mp4',
  'video/quicktime',
  'video/webm',
]);

export const ACCEPT_PHOTO = 'image/jpeg,image/png,image/heic,image/heif,.jpg,.jpeg,.png,.heic,.heif';
export const ACCEPT_VIDEO = 'video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm';
export const ACCEPT_MEDIA = `${ACCEPT_PHOTO},${ACCEPT_VIDEO}`;

const EXT_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  heic: 'image/heic',
  heif: 'image/heif',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
};

const UNSUPPORTED_MESSAGE =
  'Formato não suportado. Fotos: JPEG, PNG, HEIC. Vídeos: MP4, MOV, WebM.';

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
  return /\.(mp4|mov|webm)$/i.test(file.name);
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
    return 'Vídeos devem ter no máximo 50 MB.';
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
      return 'Arquivo muito grande para o servidor. Tamanho máximo: 50 MB.';
    }
    if (axiosLike.code === 'ECONNABORTED' || /timeout/i.test(axiosLike.message ?? '')) {
      return 'O envio demorou demais. Tente um arquivo menor.';
    }
  }
  return 'Falha no envio. Tente novamente.';
}
