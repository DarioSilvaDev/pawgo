import { randomBytes } from 'crypto';

/**
 * Generate a random token for password reset, email verification, etc.
 */
export function generateRandomToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

/**
 * Generate backup codes for OTP (8 digits each)
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    // Generate 8-digit code
    const code = Math.floor(10000000 + Math.random() * 90000000).toString();
    codes.push(code);
  }
  return codes;
}

