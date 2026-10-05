import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

/**
 * scrypt parameters. N=2^15 with r=8 costs roughly 100–200ms per hash on a
 * typical server, which is a reasonable brake on offline cracking without
 * making a legitimate login feel slow. maxmem must be raised above the Node
 * default (32MB) because 2^15 * 8 * 128 ≈ 33.5MB.
 */
const PARAMS = { N: 32768, r: 8, p: 1, maxmem: 96 * 1024 * 1024 };
const KEYLEN = 64;
const SALT_BYTES = 16;

/** Encoded as scrypt$N$r$p$saltB64$hashB64 so parameters can change over time. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await scrypt(password.normalize('NFKC'), salt, KEYLEN, PARAMS);
  return [
    'scrypt',
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString('base64'),
    key.toString('base64'),
  ].join('$');
}

/**
 * Constant-time verification. Returns false for malformed records rather than
 * throwing, so a corrupted row cannot be distinguished from a wrong password.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const parts = stored.split('$');
    if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

    const N = Number(parts[1]);
    const r = Number(parts[2]);
    const p = Number(parts[3]);
    if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) return false;
    // Refuse absurd parameters that could be used to force a memory blow-up.
    if (N > 1 << 20 || r > 32 || p > 16) return false;

    const salt = Buffer.from(parts[4], 'base64');
    const expected = Buffer.from(parts[5], 'base64');
    const actual = await scrypt(password.normalize('NFKC'), salt, expected.length, {
      N, r, p, maxmem: 256 * 1024 * 1024,
    });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export interface PasswordCheck {
  ok: boolean;
  errors: string[];
}

/**
 * Password policy for administrator accounts. Length is weighted over
 * composition rules, but a minimum of three character classes is required to
 * stop trivially guessable long strings.
 */
export function checkPasswordStrength(password: string): PasswordCheck {
  const errors: string[] = [];
  if (password.length < 12) errors.push('Must be at least 12 characters.');
  if (password.length > 200) errors.push('Must be 200 characters or fewer.');

  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length;
  if (classes < 3) {
    errors.push('Must combine at least three of: lowercase, uppercase, numbers, symbols.');
  }
  if (/^(.)\1+$/.test(password)) errors.push('Must not be a single repeated character.');

  return { ok: errors.length === 0, errors };
}

/** URL-safe random token used for session secrets and one-time values. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}
