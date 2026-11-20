/**
 * Resolves avatar image URLs safely for all environments (dev & production).
 * Supports:
 * 1. Base64 data URLs (data:image/...)
 * 2. Absolute external URLs (http:// or https://)
 * 3. Relative server uploaded paths (/uploads/...) with backend origin fallback
 */
export const getAvatarUrl = (avatarUrl) => {
  if (!avatarUrl || typeof avatarUrl !== 'string') return '';
  const trimmed = avatarUrl.trim();
  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  // Prepend backend base host for relative uploaded assets
  const backendBase =
    import.meta.env.VITE_SOCKET_URL ||
    (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') : '') ||
    'http://localhost:5000';

  const cleanBase = backendBase.replace(/\/$/, '');
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${cleanBase}${cleanPath}`;
};
