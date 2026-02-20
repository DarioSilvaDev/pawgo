// SHARED: Este archivo se mantiene sincronizado manualmente entre api y web.
// Si lo modificás, actualizá también la copia en la otra app.
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
        entityId?: string;
        entityType?: 'admin' | 'influencer';
        name?: string;
    };
}

export interface LoginDto {
    email: string;
    password: string;
    otp?: string;
    deviceInfo?: string;
}

export interface BaseRegisterDto {
    email: string;
    password: string;
    deviceInfo?: string;
}

export interface RegisterAdminDto extends BaseRegisterDto {
    userType: 'admin';
    name: string;
}

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
    token: string;
}

export interface DisableOtpDto {
    password: string;
    backupCode?: string;
}

export interface VerifyOtpDto {
    token: string;
}

export interface JwtPayload {
    authId: string;
    email: string;
    role: string;
    entityId?: string;
    entityType?: 'admin' | 'influencer';
    iat?: number;
    exp?: number;
}
