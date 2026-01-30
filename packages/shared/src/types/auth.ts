export interface Auth {
  id: string;
  email: string;
  passwordHash: string;
  userType: 'admin' | 'influencer' | 'customer';
  userId: string;
  role: string;
  otpSecret?: string;
  otpEnabled: boolean;
  otpBackupCodes: string[];
  failedLoginAttempts: number;
  lockedUntil?: Date;
  lastLoginAt?: Date;
  lastLoginIp?: string;
  emailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RefreshToken {
  id: string;
  authId: string;
  token: string;
  expiresAt: Date;
  deviceInfo?: string;
  ipAddress?: string;
  revoked: boolean;
  revokedAt?: Date;
  createdAt: Date;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    role: string;
    otpEnabled: boolean;
    emailVerified: boolean;
    // User entity data
    entityId?: string; // ID de Admin o Influencer
    entityType?: 'admin' | 'influencer';
    name?: string;
  };
}

export interface LoginDto {
  email: string;
  password: string;
  otp?: string; // Opcional si OTP está habilitado
  deviceInfo?: string;
}

// Base DTO for registration
export interface BaseRegisterDto {
  email: string;
  password: string;
  deviceInfo?: string;
}

// Admin registration DTO
export interface RegisterAdminDto extends BaseRegisterDto {
  userType: 'admin';
  name: string;
}

// Influencer registration DTO
export interface RegisterInfluencerDto extends BaseRegisterDto {
  userType: 'influencer';
  name: string;
  phone?: string;
  socialMedia?: {
    instagram?: string;
    tiktok?: string;
    youtube?: string;
    [key: string]: string | undefined;
  };
}

// Union type for registration
export type RegisterDto = RegisterAdminDto | RegisterInfluencerDto;

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  password: string;
}

export interface VerifyEmailDto {
  token: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface EnableOtpDto {
  token: string; // TOTP token del authenticator app
}

export interface DisableOtpDto {
  password: string;
  backupCode?: string; // Si perdió acceso al authenticator
}

export interface VerifyOtpDto {
  token: string;
}

export interface JwtPayload {
  authId: string;
  email: string;
  role: string;
  entityId?: string; // ID de Admin o Influencer
  entityType?: 'admin' | 'influencer';
  iat?: number;
  exp?: number;
}

