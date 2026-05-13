import FingerprintJS from '@fingerprintjs/fingerprintjs';

let cachedFingerprint: string | null = null;

export async function getDeviceFingerprint(): Promise<string> {
  // Support mock fingerprint for local testing
  if (typeof globalThis !== 'undefined' && (globalThis as any).MOCK_FINGERPRINT) {
    return (globalThis as any).MOCK_FINGERPRINT;
  }

  // Cache it so FingerprintJS doesn't re-run on every call
  if (cachedFingerprint) return cachedFingerprint;

  if (typeof window === 'undefined') {
    return 'node-server-fingerprint';
  }

  const fp = await FingerprintJS.load();
  const result = await fp.get();
  cachedFingerprint = result.visitorId;
  return cachedFingerprint;
}
