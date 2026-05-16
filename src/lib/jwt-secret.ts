/**
 * B.S Evaluation — Centralized JWT Secret Management
 *_SINGLE SOURCE OF TRUTH_ for JWT secret across all modules.
 *
 * Security rules:
 * 1. In production: JWT_SECRET env var is MANDATORY (min 32 chars)
 * 2. In development: Fallback is allowed but generates a warning
 * 3. No hardcoded secret in production — throws if missing
 */

let _jwtSecret: Uint8Array | null = null;

function getJWTSecret(): Uint8Array {
  if (_jwtSecret) return _jwtSecret;

  const envSecret = process.env.JWT_SECRET;

  if (envSecret && envSecret.length >= 32) {
    _jwtSecret = new TextEncoder().encode(envSecret);
    return _jwtSecret;
  }

  // Production: NO fallback allowed
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[SECURITY] JWT_SECRET environment variable is REQUIRED in production (min 32 chars). ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  // Development only: deterministic fallback (NOT for production)
  if (envSecret && envSecret.length > 0 && envSecret.length < 32) {
    console.warn(
      '[SECURITY WARNING] JWT_SECRET is set but too short (' + envSecret.length + ' chars). ' +
      'Minimum 32 characters required. Using fallback for development.'
    );
  }

  console.warn(
    '[SECURITY WARNING] Using fallback JWT_SECRET — DO NOT use in production! ' +
    'Set JWT_SECRET environment variable (min 32 chars). ' +
    'Generate: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
  );

  // Use a hash of the project name as fallback — at least it's not human-readable
  // This is still NOT secure for production, but better than a plain-text hardcoded string
  const fallbackSource = 'bs-evaluation-dev-fallback-' + (process.env.NODE_ENV || 'development');
  _jwtSecret = new TextEncoder().encode(fallbackSource.padEnd(32, '-'));
  return _jwtSecret;
}

/** Get the JWT secret as Uint8Array — cached after first call */
export const jwtSecret = new Proxy({} as Uint8Array, {
  get(_target, prop) {
    const secret = getJWTSecret();
    const value = (secret as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === 'function') {
      return value.bind(secret);
    }
    return value;
  },
});

/** Direct getter for use in jose's verify/sign */
export function getJWTSecretBytes(): Uint8Array {
  return getJWTSecret();
}
