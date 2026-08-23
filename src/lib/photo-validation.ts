// Upload rules for parking photos. Kept in one place so the client picker and
// any server-side checks agree.
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_IMAGES_PER_LISTING = 10;

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export interface PhotoValidationError {
  type?: string;
  size?: string;
  count?: string;
}

export function validateFileType(mime: string): boolean {
  return ACCEPTED_TYPES.includes(mime);
}

export function validateFileSize(bytes: number): boolean {
  return bytes > 0 && bytes <= MAX_IMAGE_BYTES;
}

// Checks a whole file list before upload.
export function validatePhotos(
  files: { name: string; type: string; size: number }[],
): PhotoValidationError {
  const error: PhotoValidationError = {};

  if (files.length > MAX_IMAGES_PER_LISTING) {
    error.count = `You can upload at most ${MAX_IMAGES_PER_LISTING} photos.`;
    return error;
  }

  for (const file of files) {
    if (!validateFileType(file.type)) {
      error.type = `${file.name} isn't a supported image (jpg, png, or webp).`;
      break;
    }
    if (!validateFileSize(file.size)) {
      error.size = `${file.name} is over the 5 MB limit.`;
      break;
    }
  }

  return error;
}
