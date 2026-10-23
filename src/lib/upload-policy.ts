export const UPLOAD_ADMIN_EMAIL = "lightstarrecord@gmail.com";

export function canUploadMedia(account: { email?: string; emailVerified?: boolean; disabled?: boolean } | undefined): boolean {
  return account?.email === UPLOAD_ADMIN_EMAIL && account.emailVerified === true && account.disabled !== true;
}

export function usesDirectVideoPlayer(source: string | undefined): boolean {
  if (!source) return false;
  try {
    const url = new URL(source);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    if (/(^|\.)(google\.com|googleusercontent\.com)$/.test(url.hostname)) return false;
    return /\.(mp4|m4v|webm|m3u8|mov)(?:$)/i.test(url.pathname) || url.hostname.endsWith(".r2.dev");
  } catch {
    return false;
  }
}