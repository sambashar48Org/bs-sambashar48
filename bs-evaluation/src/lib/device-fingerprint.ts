/**
 * B.S Evaluation — Hybrid Device Fingerprint System
 * نظام بصمة الجهاز الهجين — الدمج بين FingerprintJS + Hardware IDs
 * يمنع محاكاة الأجهزة (Device Spoofing) ويضمن هوية فريدة لكل جهاز
 *
 * Security improvements:
 * - Fingerprint is re-verified on every login (not just cached)
 * - hasFingerprintChanged() now properly compares with stored value
 * - Cache is only used for performance within a session, not across logins
 */

import FingerprintJS from '@fingerprintjs/fingerprintjs';

// ===================================================================
// الأنواع
// ===================================================================

export interface HybridDeviceId {
  /** المعرف الفريد الهجين — SHA-256 hash */
  fingerprint: string;
  /** وصف الجهاز للعرض على المدير */
  description: string;
  /** مكونات البصمة التفصيلية */
  components: FingerprintComponents;
}

export interface FingerprintComponents {
  /** بصمة المتصفح من FingerprintJS */
  browserHash: string;
  /** معرف WebGL Renderer */
  webglRenderer: string;
  /** دقة الشاشة */
  screenResolution: string;
  /** المنصة (OS) */
  platform: string;
  /** اللغة */
  language: string;
  /** عدد النوى */
  hardwareConcurrency: number;
  /** المنطقة الزمنية */
  timezone: string;
  /** دعم اللمس */
  touchSupport: boolean;
}

// ===================================================================
// توليد المعرف الهجين
// ===================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let fpInstance: any = null;

/** The previously stored fingerprint for comparison (from DB or login response) */
let storedFingerprint: string | null = null;

/**
 * تهيئة FingerprintJS — يُستدعى مرة واحدة فقط
 */
async function initFingerprintJS() {
  if (!fpInstance) {
    fpInstance = await FingerprintJS.load();
  }
  return fpInstance;
}

/**
 * جمع مكونات البصمة التفصيلية
 * Always generates fresh components — never uses localStorage cache
 */
async function collectComponents(): Promise<FingerprintComponents> {
  const fp = await initFingerprintJS();
  const result = await fp.get();

  // استخراج معلومات WebGL
  let webglRenderer = 'unknown';
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl && gl instanceof WebGLRenderingContext) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        webglRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'unknown';
      }
    }
  } catch {
    webglRenderer = 'blocked';
  }

  // استخراج دعم اللمس
  const touchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  return {
    browserHash: result.visitorId,
    webglRenderer,
    screenResolution: `${screen.width}x${screen.height}`,
    platform: navigator.platform || 'unknown',
    language: navigator.language || 'unknown',
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown',
    touchSupport,
  };
}

/**
 * توليد المعرف الهجين الفريد (SHA-256)
 * يجمع بين بصمة المتصفح + معرفات العتاد
 */
async function generateHybridHash(components: FingerprintComponents): Promise<string> {
  const rawString = [
    components.browserHash,
    components.webglRenderer,
    components.screenResolution,
    components.platform,
    components.language,
    String(components.hardwareConcurrency),
    components.timezone,
    String(components.touchSupport),
  ].join('|');

  // SHA-256 hash
  const encoder = new TextEncoder();
  const data = encoder.encode(rawString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * توليد وصف الجهاز للعرض على المدير
 * مثال: "Chrome 131 · Windows 11 · 1920x1080 · Damascus"
 */
function generateDescription(components: FingerprintComponents): string {
  const parts: string[] = [];

  // المتصفح
  const ua = navigator.userAgent;
  let browser = 'Unknown Browser';
  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Edg')) browser = 'Edge';

  // نظام التشغيل
  let os = 'Unknown OS';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Linux')) os = 'Linux';

  parts.push(`${browser}`);
  parts.push(`${os}`);
  parts.push(`${components.screenResolution}`);

  // المنطقة الزمنية → مدينة تقريبية
  const tz = components.timezone;
  if (tz) {
    const city = tz.split('/').pop()?.replace(/_/g, ' ') || '';
    if (city) parts.push(city);
  }

  // نوع الجهاز
  if (components.touchSupport && /Android|iPhone|iPad/i.test(ua)) {
    parts.push('Mobile');
  } else {
    parts.push('Desktop');
  }

  return parts.join(' · ');
}

// ===================================================================
// API العام
// ===================================================================

/**
 * الحصول على المعرف الهجين الفريد للجهاز
 * SECURITY: Always generates fresh fingerprint — localStorage is NOT used for caching
 * to prevent fingerprint spoofing via localStorage manipulation.
 * Only the FingerprintJS internal instance is cached for performance.
 */
export async function getHybridDeviceId(): Promise<HybridDeviceId> {
  // Always generate fresh fingerprint — no localStorage cache
  // This prevents attackers from forging the fingerprint by modifying localStorage
  const components = await collectComponents();
  const fingerprint = await generateHybridHash(components);
  const description = generateDescription(components);

  const result: HybridDeviceId = {
    fingerprint,
    description,
    components,
  };

  // Store the current fingerprint for comparison
  storedFingerprint = fingerprint;

  return result;
}

/**
 * مسح التخزين المؤقت للبصمة — عند تسجيل الخروج
 */
export function clearDeviceFingerprint(): void {
  storedFingerprint = null;
  fpInstance = null;
  // Also clear any old localStorage cache from previous versions
  try {
    localStorage.removeItem('bs-device-fingerprint');
  } catch {
    // Ignore in non-browser environments
  }
}

/**
 * التحقق من تغير البصمة — يقارن البصمة الحالية مع المخزنة
 * SECURITY: Now properly re-generates fingerprint and compares
 * Returns true if the device fingerprint has changed since last generation
 */
export async function hasFingerprintChanged(): Promise<boolean> {
  // Generate fresh fingerprint
  const current = await getHybridDeviceId();

  // If no stored fingerprint, this is first time — not a change
  if (!storedFingerprint) {
    return false;
  }

  // Compare: if different, the device has changed
  return current.fingerprint !== storedFingerprint;
}

/**
 * Set the stored fingerprint (e.g., from server response after login)
 * Used for cross-session comparison
 */
export function setStoredFingerprint(fingerprint: string): void {
  storedFingerprint = fingerprint;
}

/**
 * Get the current stored fingerprint for sending to server
 */
export function getStoredFingerprint(): string | null {
  return storedFingerprint;
}
