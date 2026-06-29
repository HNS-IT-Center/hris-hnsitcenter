export async function generateFingerprint(): Promise<string> {
  const data = [
    navigator.userAgent,
    window.screen.width,
    window.screen.height,
    window.screen.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.hardwareConcurrency || 'unknown',
    navigator.deviceMemory || 'unknown',
    navigator.language
  ].join('|');

  // Simple and fast hashing function using Web Crypto API
  const msgBuffer = new TextEncoder().encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  // Return the first 16 characters for brevity but sufficient uniqueness
  return hashHex.substring(0, 16);
}
