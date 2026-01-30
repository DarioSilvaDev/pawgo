import { PrismaClient, Prisma, AuthRole } from "@prisma/client";
import {
  LoginDto,
  RegisterDto,
  RegisterAdminDto,
  RegisterInfluencerDto,
  AuthResponse,
} from "../../../../packages/shared/dist/index.js";
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
} from "../utils/password.util.js";
import { TokenService } from "./token.service.js";
import { generateRandomToken } from "../utils/token.util.js";
import { emailService } from "../../services/email.service.js";

const prisma = new PrismaClient();

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

export class AuthService {
  private tokenService: TokenService;

  constructor(tokenService: TokenService) {
    this.tokenService = tokenService;
  }

  /**
   * Register a new user
   * Creates both Auth and the corresponding entity (Admin/Influencer) in a transaction
   * Does NOT return tokens - user must verify email first
   */
  async register(data: RegisterDto): Promise<{
    message: string;
    email: string;
  }> {
    // Validate password strength
    const passwordValidation = validatePasswordStrength(data.password);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.errors.join(", "));
    }

    // Check if email already exists
    const existingAuth = await prisma.auth.findUnique({
      where: { email: data.email },
    });

    if (existingAuth && existingAuth.isActive === false) {
      throw new Error("Cuenta inactiva");
    }
    if (existingAuth && existingAuth.isActive === true) {
      throw new Error("Ya está registrado");
    }

    // Hash password
    const passwordHash = await hashPassword(data.password);

    // Determine role based on userType
    const role =
      data.userType === "admin" ? AuthRole.admin : AuthRole.influencer;

    // Create Auth and entity in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create Auth first
      const auth = await tx.auth.create({
        data: {
          email: data.email,
          passwordHash,
          role,
          emailVerificationToken: generateRandomToken(),
          emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        } as Prisma.AuthUncheckedCreateInput,
      });

      let entityId: string;
      let entityType: "admin" | "influencer";

      // Create corresponding entity
      if (data.userType === "admin") {
        const adminData = data as RegisterAdminDto;
        const admin = await tx.admin.create({
          data: {
            name: adminData.name,
            authId: auth.id,
          } as Prisma.AdminUncheckedCreateInput,
        });
        entityId = admin.id;
        entityType = "admin";
      } else if (data.userType === "influencer") {
        const influencerData = data as RegisterInfluencerDto;
        const influencer = await tx.influencer.create({
          data: {
            name: influencerData.name,
            phone: influencerData.phone || undefined,
            socialMedia: influencerData.socialMedia
              ? (influencerData.socialMedia as Prisma.InputJsonValue)
              : Prisma.JsonNull,
            authId: auth.id,
          } as Prisma.InfluencerUncheckedCreateInput,
        });
        entityId = influencer.id;
        entityType = "influencer";
      } else {
        // This should never happen due to discriminated union validation
        const invalidData = data as { userType?: string };
        throw new Error(
          `Tipo de usuario inválido: ${invalidData.userType || "desconocido"}`
        );
      }

      return { auth, entityId, entityType };
    });

    // Get entity name for email
    let entityName: string | undefined;
    if (result.entityType === "admin") {
      const admin = await prisma.admin.findUnique({
        where: { id: result.entityId },
      });
      entityName = admin?.name;
    } else {
      const influencer = await prisma.influencer.findUnique({
        where: { id: result.entityId },
      });
      entityName = influencer?.name;
    }

    // Send verification email (async, don't wait)
    if (result.auth.emailVerificationToken) {
      emailService
        .sendVerificationEmail(
          result.auth.email,
          result.auth.emailVerificationToken,
          entityName
        )
        .catch((error) => {
          console.error("Error sending verification email:", error);
        });
    }

    // Return only message - no tokens until email is verified
    return {
      message: "Registro exitoso. Por favor verifica tu email para continuar.",
      email: result.auth.email,
    };
  }

  /**
   * Login user
   */
  async login(data: LoginDto, ipAddress?: string): Promise<AuthResponse> {
    const auth = await prisma.auth.findUnique({
      where: { email: data.email },
    });

    if (!auth) {
      throw new Error("Credenciales inválidas");
    }

    // Check if account is locked
    if (auth.lockedUntil && auth.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil(
        (auth.lockedUntil.getTime() - Date.now()) / (1000 * 60)
      );
      throw new Error(
        `Cuenta bloqueada. Intenta nuevamente en ${minutesLeft} minutos`
      );
    }

    // Check if account is active
    if (!auth.isActive) {
      throw new Error("Cuenta inactiva");
    }

    // Check if email is verified
    if (!auth.emailVerified) {
      throw new Error(
        "Por favor verifica tu email antes de iniciar sesión. Revisa tu bandeja de entrada."
      );
    }

    // Verify password
    const passwordValid = await verifyPassword(
      data.password,
      auth.passwordHash
    );
    if (!passwordValid) {
      await this.handleFailedLogin(auth.id);
      throw new Error("Credenciales inválidas");
    }

    // If OTP is enabled, verify OTP
    if (auth.otpEnabled) {
      if (!data.otp) {
        throw new Error("Se requiere código OTP");
      }
      // OTP verification will be implemented later
      // For now, we'll skip it
    }

    // Reset failed login attempts
    await prisma.auth.update({
      where: { id: auth.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
      },
    });

    // Get entity info for token
    const entityInfo = await this.getEntityInfo(auth.id);

    // Generate tokens
    const accessToken = this.tokenService.generateAccessToken({
      authId: auth.id,
      email: auth.email,
      role: auth.role,
      entityId: entityInfo?.id,
      entityType: entityInfo?.type,
    });

    const { token: refreshToken } =
      await this.tokenService.generateRefreshToken(
        auth.id,
        data.deviceInfo,
        ipAddress
      );

    return {
      accessToken,
      refreshToken,
      expiresIn: 120 * 60, // 2 hours
      user: {
        id: auth.id,
        email: auth.email,
        role: auth.role,
        otpEnabled: auth.otpEnabled,
        emailVerified: auth.emailVerified,
        entityId: entityInfo?.id,
        entityType: entityInfo?.type,
        name: entityInfo?.name,
      },
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    const tokenData = await this.tokenService.verifyRefreshToken(refreshToken);
    if (!tokenData) {
      throw new Error("Token de refresco inválido o expirado");
    }

    // Get auth user
    const auth = await prisma.auth.findUnique({
      where: { id: tokenData.authId },
    });

    if (!auth || !auth.isActive) {
      throw new Error("Usuario no encontrado o inactivo");
    }

    // Get entity info for token
    const entityInfo = await this.getEntityInfo(auth.id);

    // Generate new access token
    const accessToken = this.tokenService.generateAccessToken({
      authId: auth.id,
      email: auth.email,
      role: auth.role,
      entityId: entityInfo?.id,
      entityType: entityInfo?.type,
    });

    // Optionally rotate refresh token (security best practice)
    await this.tokenService.revokeRefreshToken(refreshToken);
    const { token: newRefreshToken } =
      await this.tokenService.generateRefreshToken(auth.id);

    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: 120 * 60, // 2 hours
    };
  }

  /**
   * Logout (revoke refresh token)
   */
  async logout(refreshToken: string): Promise<void> {
    await this.tokenService.revokeRefreshToken(refreshToken);
  }

  /**
   * Logout from all devices
   */
  async logoutAll(authId: string): Promise<void> {
    await this.tokenService.revokeAllRefreshTokens(authId);
  }

  /**
   * Handle failed login attempt
   */
  private async handleFailedLogin(authId: string): Promise<void> {
    const auth = await prisma.auth.findUnique({
      where: { id: authId },
      select: { failedLoginAttempts: true },
    });

    if (!auth) return;

    const newAttempts = auth.failedLoginAttempts + 1;
    const updateData: { failedLoginAttempts: number; lockedUntil?: Date } = {
      failedLoginAttempts: newAttempts,
    };

    // Lock account after max attempts
    if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
      const lockedUntil = new Date();
      lockedUntil.setMinutes(
        lockedUntil.getMinutes() + LOCKOUT_DURATION_MINUTES
      );
      updateData.lockedUntil = lockedUntil;
    }

    await prisma.auth.update({
      where: { id: authId },
      data: updateData,
    });
  }

  /**
   * Get entity info (Admin or Influencer) from authId
   */
  private async getEntityInfo(authId: string): Promise<{
    id: string;
    type: "admin" | "influencer";
    name: string;
  } | null> {
    // Try Admin first
    const admin = await prisma.admin.findUnique({
      where: { authId },
      select: { id: true, name: true },
    });

    if (admin) {
      return {
        id: admin.id,
        type: "admin",
        name: admin.name,
      };
    }

    // Try Influencer
    const influencer = await prisma.influencer.findUnique({
      where: { authId },
      select: { id: true, name: true },
    });

    if (influencer) {
      return {
        id: influencer.id,
        type: "influencer",
        name: influencer.name,
      };
    }

    return null;
  }

  /**
   * Get auth by ID
   */
  async getAuthById(authId: string) {
    return prisma.auth.findUnique({
      where: { id: authId },
    });
  }

  /**
   * Get auth by email
   */
  async getAuthByEmail(email: string) {
    return prisma.auth.findUnique({
      where: { email },
    });
  }

  /**
   * Forgot password - send reset email
   */
  async forgotPassword(email: string): Promise<void> {
    const auth = await prisma.auth.findUnique({
      where: { email },
      include: {
        admin: { select: { name: true } },
        influencer: { select: { name: true } },
      },
    });

    if (!auth) {
      // Don't reveal if email exists for security
      return;
    }

    // Generate reset token
    const resetToken = generateRandomToken();
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.auth.update({
      where: { id: auth.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      },
    });

    // Get name for email
    const name = auth.admin?.name || auth.influencer?.name;

    // Send reset email (async, don't wait)
    emailService
      .sendPasswordResetEmail(email, resetToken, name)
      .catch((error) => {
        console.error("Error sending password reset email:", error);
      });
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Validate password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.errors.join(", "));
    }

    const auth = await prisma.auth.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: {
          gt: new Date(),
        },
      },
    });

    if (!auth) {
      throw new Error("Token inválido o expirado");
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update password and clear reset token
    await prisma.auth.update({
      where: { id: auth.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
  }

  /**
   * Verify email with token
   * Returns AuthResponse with tokens so user can login automatically
   */
  async verifyEmail(token: string, ipAddress?: string): Promise<AuthResponse> {
    const auth = await prisma.auth.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: {
          gt: new Date(),
        },
      },
    });

    if (!auth) {
      throw new Error("Token inválido o expirado");
    }

    // Update email as verified
    await prisma.auth.update({
      where: { id: auth.id },
      data: {
        emailVerified: true,
        isActive: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });

    // Get entity info for token
    const entityInfo = await this.getEntityInfo(auth.id);

    // Generate tokens so user can login automatically
    const accessToken = this.tokenService.generateAccessToken({
      authId: auth.id,
      email: auth.email,
      role: auth.role,
      entityId: entityInfo?.id,
      entityType: entityInfo?.type,
    });

    const { token: refreshToken } =
      await this.tokenService.generateRefreshToken(
        auth.id,
        undefined,
        ipAddress
      );

    return {
      accessToken,
      refreshToken,
      expiresIn: 120 * 60, // 2 hours
      user: {
        id: auth.id,
        email: auth.email,
        role: auth.role,
        otpEnabled: auth.otpEnabled,
        emailVerified: true,
        entityId: entityInfo?.id,
        entityType: entityInfo?.type,
        name: entityInfo?.name,
      },
    };
  }

  /**
   * Get auth data for /me endpoint
   */
  async getAuthData(authId: string): Promise<AuthResponse["user"] | null> {
    const auth = await prisma.auth.findUnique({
      where: { id: authId },
      include: {
        admin: true,
        influencer: true,
      },
    });

    if (!auth) {
      return null;
    }

    let name: string | undefined;
    let entityId: string | undefined;
    let entityType: "admin" | "influencer" | undefined;

    if (auth.admin) {
      name = auth.admin.name;
      entityId = auth.admin.id;
      entityType = "admin";
    } else if (auth.influencer) {
      name = auth.influencer.name;
      entityId = auth.influencer.id;
      entityType = "influencer";
    }

    return {
      id: auth.id,
      email: auth.email,
      role: auth.role,
      otpEnabled: auth.otpEnabled,
      emailVerified: auth.emailVerified,
      entityId,
      entityType,
      name,
    };
  }
}
