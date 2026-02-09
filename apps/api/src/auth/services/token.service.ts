import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { JwtPayload } from "../../../../../packages/shared/dist/index.js";
import { randomUUID } from "crypto";

import { prisma } from "../../config/prisma.client.js";

// Token expiration times (in seconds)
const ACCESS_TOKEN_EXPIRES_IN = 2 * 60 * 60; // 2 hours
const REFRESH_TOKEN_EXPIRES_IN = 7 * 24 * 60 * 60; // 7 days

export class TokenService {
  private fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
  }

  /**
   * Generate access token (JWT)
   */
  generateAccessToken(payload: Omit<JwtPayload, "iat" | "exp">): string {
    return this.fastify.jwt.sign(payload, {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    });
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token: string): JwtPayload {
    return this.fastify.jwt.verify<JwtPayload>(token);
  }

  /**
   * Generate and save refresh token
   */
  async generateRefreshToken(
    authId: string,
    deviceInfo?: string,
    ipAddress?: string
  ): Promise<{ token: string; expiresAt: Date }> {
    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + REFRESH_TOKEN_EXPIRES_IN);

    await prisma.refreshToken.create({
      data: {
        authId,
        token,
        expiresAt,
        deviceInfo,
        ipAddress,
      },
    });

    return { token, expiresAt };
  }

  /**
   * Verify and get refresh token
   */
  async verifyRefreshToken(token: string): Promise<{
    id: string;
    authId: string;
    expiresAt: Date;
  } | null> {
    const refreshToken = await prisma.refreshToken.findUnique({
      where: { token },
      select: {
        id: true,
        authId: true,
        expiresAt: true,
        revoked: true,
      },
    });

    if (!refreshToken) {
      return null;
    }

    if (refreshToken.revoked) {
      return null;
    }

    if (refreshToken.expiresAt < new Date()) {
      return null;
    }

    return refreshToken;
  }

  /**
   * Revoke refresh token
   */
  async revokeRefreshToken(token: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { token, revoked: false },
      data: {
        revoked: true,
        revokedAt: new Date(),
      },
    });
  }

  /**
   * Revoke all refresh tokens for an auth user
   */
  async revokeAllRefreshTokens(authId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: {
        authId,
        revoked: false,
      },
      data: {
        revoked: true,
        revokedAt: new Date(),
      },
    });
  }

  /**
   * Clean up expired refresh tokens (cron job)
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await prisma.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return result.count;
  }

  /**
   * Get all active refresh tokens for an auth user
   */
  async getActiveRefreshTokens(authId: string) {
    return prisma.refreshToken.findMany({
      where: {
        authId,
        revoked: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
