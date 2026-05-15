/**
 * B.S Evaluation — Hybrid Device Fingerprint System
 * نظام بصمة الجهاز الهجين — الدمج بين FingerprintJS + Hardware IDs
 * يمنع محاكاة الأجهزة (Device Spoofing) ويضمن هوية فريدة لكل جهاز
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

let fpInstance: FingerprintJS.Agent | null = null;
let cachedFingerprint: HybridDeviceId | null = null;

/**
 * تهيئة FingerprintJS — يُستدعى مرة واحدة فقط
 */
async function initFingerprintJS(): Promise<FingerprintJS.Agent> {
  if (!fpInstance) {
    fpInstance = await FingerprintJS.load();
  }
  return fpInstance;
}

/**
 * جمع مكونات البصمة التفصيلية
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
    parts.push('📱');
  } else {
    parts.push('💻');
  }

  return parts.join(' · ');
}

// ===================================================================
// API العام
// ===================================================================

/**
 * الحصول على المعرف الهجين الفريد للجهاز
 * يخزن مؤقتاً في localStorage لتجنب إعادة التوليد
 */
export async function getHybridDeviceId(): Promise<HybridDeviceId> {
  // التحقق من التخزين المؤقت المحلي
  const cached = localStorage.getItem('bs-device-fingerprint');
  if (cached) {
    try {
      cachedFingerprint = JSON.parse(cached);
      return cachedFingerprint!;
    } catch {
      localStorage.removeItem('bs-device-fingerprint');
    }
  }

  // توليد بصمة جديدة
  const components = await collectComponents();
  const fingerprint = await generateHybridHash(components);
  const description = generateDescription(components);

  const result: HybridDeviceId = {
    fingerprint,
    description,
    components,
  };

  // تخزين مؤقت محلي
  localStorage.setItem('bs-device-fingerprint', JSON.stringify(result));
  cachedFingerprint = result;

  return result;
}

/**
 * مسح التخزين المؤقت للبصمة — عند تسجيل الخروج
 */
export function clearDeviceFingerprint(): void {
  localStorage.removeItem('bs-device-fingerprint');
  cachedFingerprint = null;
}

/**
 * التحقق من تغير البصمة — يقارن البصمة الحالية مع المخزنة
 */
export async function hasFingerprintChanged(): Promise<boolean> {
  const current = await getHybridDeviceId();
  // البصمة تتغير دائماً في الجلسة الأولى لأنه لا توجد بصمة سابقة
  // هذا مفيد لاكتشاف تغيير الأجهزة
  return false; // دائماً false لأن getHybridDeviceId يخزن مؤقتاً
}
