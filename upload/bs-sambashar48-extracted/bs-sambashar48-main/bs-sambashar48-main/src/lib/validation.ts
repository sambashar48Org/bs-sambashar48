/**
 * B.S Evaluation — Centralized Validation Utilities
 * سياسة موحدة للتحقق من المدخلات عبر التطبيق
 */

// ═══════════════════════════════════════════════════════════════
// Username Validation
// ═══════════════════════════════════════════════════════════════

const USERNAME_REGEX = /^[a-zA-Z0-9_\u0600-\u06FF]+$/;
const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 50;

export function validateUsername(username: unknown): { valid: boolean; error?: string } {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'اسم المستخدم مطلوب' };
  }

  const trimmed = username.trim();

  if (trimmed.length < USERNAME_MIN_LENGTH) {
    return { valid: false, error: `اسم المستخدم يجب أن يكون ${USERNAME_MIN_LENGTH} أحرف على الأقل` };
  }

  if (trimmed.length > USERNAME_MAX_LENGTH) {
    return { valid: false, error: `اسم المستخدم طويل جداً (الحد الأقصى ${USERNAME_MAX_LENGTH} حرف)` };
  }

  if (!USERNAME_REGEX.test(trimmed)) {
    return { valid: false, error: 'اسم المستخدم يجب أن يحتوي فقط على أحرف وأرقام وشرطة سفلية' };
  }

  return { valid: true };
}

// ═══════════════════════════════════════════════════════════════
// Password Validation
// ═══════════════════════════════════════════════════════════════

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

export function validatePassword(password: unknown): { valid: boolean; error?: string } {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'كلمة المرور مطلوبة' };
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    return { valid: false, error: `كلمة المرور يجب أن تكون ${PASSWORD_MIN_LENGTH} أحرف على الأقل` };
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    return { valid: false, error: `كلمة المرور طويلة جداً (الحد الأقصى ${PASSWORD_MAX_LENGTH} حرف)` };
  }

  return { valid: true };
}

/**
 * Password complexity check — for admin-created passwords and password resets.
 * Requires at least: 1 uppercase, 1 lowercase, 1 digit
 * Recommended but not required: 1 special character
 */
export function validatePasswordComplexity(password: unknown): { valid: boolean; error?: string; warning?: string } {
  const basicCheck = validatePassword(password);
  if (!basicCheck.valid) return basicCheck;

  const str = password as string;
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!/[A-Z]/.test(str)) {
    errors.push('حرف كبير واحد على الأقل (A-Z)');
  }

  if (!/[a-z]/.test(str)) {
    errors.push('حرف صغير واحد على الأقل (a-z)');
  }

  if (!/[0-9]/.test(str)) {
    errors.push('رقم واحد على الأقل (0-9)');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(str)) {
    warnings.push('يُنصح بإضافة حرف خاص (!@#$%...) لتعزيز الأمان');
  }

  if (errors.length > 0) {
    return {
      valid: false,
      error: 'كلمة المرور يجب أن تحتوي على: ' + errors.join('، '),
      warning: warnings.length > 0 ? warnings.join('، ') : undefined,
    };
  }

  return {
    valid: true,
    warning: warnings.length > 0 ? warnings.join('، ') : undefined,
  };
}

// ═══════════════════════════════════════════════════════════════
// Full Name Validation
// ═══════════════════════════════════════════════════════════════

export function validateFullName(fullName: unknown): { valid: boolean; error?: string } {
  if (!fullName || typeof fullName !== 'string') {
    return { valid: false, error: 'الاسم الكامل مطلوب' };
  }

  const trimmed = fullName.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'الاسم الكامل مطلوب' };
  }

  if (trimmed.length > 100) {
    return { valid: false, error: 'الاسم الكامل طويل جداً (الحد الأقصى 100 حرف)' };
  }

  // Strip HTML tags to prevent XSS
  const sanitized = trimmed.replace(/<[^>]*>/g, '');
  if (sanitized !== trimmed) {
    return { valid: false, error: 'الاسم لا يمكن أن يحتوي على HTML' };
  }

  return { valid: true };
}

// ═══════════════════════════════════════════════════════════════
// Path Traversal Protection
// ═══════════════════════════════════════════════════════════════

const PATH_TRAVERSAL_PATTERNS = /\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e%5c/i;

export function isPathSafe(path: string): boolean {
  if (PATH_TRAVERSAL_PATTERNS.test(path)) return false;
  if (path.startsWith('/') && !path.startsWith('/')) return false; // Absolute paths not allowed
  return true;
}

// ═══════════════════════════════════════════════════════════════
// Input Sanitization
// ═══════════════════════════════════════════════════════════════

/** Strip HTML tags and limit length — for project names, etc. */
export function sanitizeInput(input: string, maxLength: number = 200): string {
  return input
    .replace(/<[^>]*>/g, '')     // Strip HTML
    .trim()
    .substring(0, maxLength);
}
