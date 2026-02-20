import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { LoginDto, RegisterDto, RefreshTokenDto } from "../../shared/index.js";
import { AuthService } from "../services/auth.service.js";

// Validation schemas
const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "La contraseña es requerida"),
  otp: z.string().optional(),
  deviceInfo: z.string().optional(),
});

// Base register schema
const baseRegisterSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  deviceInfo: z.string().optional(),
});

// Admin register schema
const registerAdminSchema = baseRegisterSchema.extend({
  userType: z.literal("admin"),
  name: z.string().min(1, "El nombre es requerido"),
});

// Influencer register schema
const registerInfluencerSchema = baseRegisterSchema.extend({
  userType: z.literal("influencer"),
  name: z.string().min(1, "El nombre es requerido"),
  phone: z.string().optional(),
  socialMedia: z
    .object({
      instagram: z.string().optional(),
      tiktok: z.string().optional(),
      youtube: z.string().optional(),
    })
    .optional(),
});

// Union schema for registration
const registerSchema = z.discriminatedUnion("userType", [
  registerAdminSchema,
  registerInfluencerSchema,
]);

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token es requerido"),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Email inválido"),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token es requerido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

const verifyEmailSchema = z.object({
  token: z.string().min(1, "Token es requerido"),
});

type RequestWithAuthUser = FastifyRequest & {
  authUser?: { authId?: string };
  user?: { authId?: string };
};

export function createAuthController(authService: AuthService) {
  return {
    async register(request: FastifyRequest, reply: FastifyReply) {
      try {
        const body = registerSchema.parse(request.body);

        const result = await authService.register(body as RegisterDto);

        reply.status(201).send(result);
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.status(400).send({
            error: "Error de validación",
            details: error.errors,
          });
          return;
        }

        if (error instanceof Error) {
          reply.status(400).send({
            error: error.message,
          });
          return;
        }

        throw error;
      }
    },

    async login(request: FastifyRequest, reply: FastifyReply) {
      try {
        const body = loginSchema.parse(request.body);
        const ipAddress = request.ip || request.socket.remoteAddress;

        const result = await authService.login(body as LoginDto, ipAddress);

        reply.send(result);
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.status(400).send({
            error: "Error de validación",
            details: error.errors,
          });
          return;
        }

        if (error instanceof Error) {
          reply.status(401).send({
            error: error.message,
          });
          return;
        }

        throw error;
      }
    },

    async refreshToken(request: FastifyRequest, reply: FastifyReply) {
      try {
        const body = refreshTokenSchema.parse(request.body);

        const result = await authService.refreshToken(
          (body as RefreshTokenDto).refreshToken
        );

        reply.send(result);
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.status(400).send({
            error: "Error de validación",
            details: error.errors,
          });
          return;
        }

        if (error instanceof Error) {
          reply.status(401).send({
            error: error.message,
          });
          return;
        }

        throw error;
      }
    },

    async logout(request: FastifyRequest, reply: FastifyReply) {
      try {
        const body = refreshTokenSchema.parse(request.body);

        await authService.logout((body as RefreshTokenDto).refreshToken);

        reply.status(204).send();
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.status(400).send({
            error: "Error de validación",
            details: error.errors,
          });
          return;
        }

        if (error instanceof Error) {
          reply.status(401).send({
            error: error.message,
          });
          return;
        }

        throw error;
      }
    },

    async getMe(request: FastifyRequest, reply: FastifyReply) {
      try {
        const req = request as RequestWithAuthUser;
        const user = req.authUser;
        if (!user) {
          reply.status(401).send({
            error: "No autenticado",
          });
          return;
        }

        // Get user data from database
        const authData = await authService.getAuthData(user.authId || "");
        if (!authData) {
          reply.status(404).send({
            error: "Usuario no encontrado",
          });
          return;
        }

        reply.send(authData);
      } catch (error) {
        if (error instanceof Error) {
          reply.status(401).send({
            error: error.message,
          });
          return;
        }

        throw error;
      }
    },

    async logoutAll(request: FastifyRequest, reply: FastifyReply) {
      try {
        const req = request as RequestWithAuthUser;
        const authId = req.authUser?.authId ?? req.user?.authId;
        if (!authId) {
          reply.status(401).send({
            error: "No autenticado",
          });
          return;
        }

        await authService.logoutAll(authId);

        reply.status(204).send();
      } catch (error) {
        if (error instanceof Error) {
          reply.status(401).send({
            error: error.message,
          });
          return;
        }

        throw error;
      }
    },

    // Password reset
    async forgotPassword(request: FastifyRequest, reply: FastifyReply) {
      try {
        const { email } = forgotPasswordSchema.parse(request.body);

        await authService.forgotPassword(email);

        reply.status(200).send({
          message:
            "Si el email existe, recibirás un enlace para restablecer tu contraseña",
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.status(400).send({
            error: "Error de validación",
            details: error.errors,
          });
          return;
        }

        if (error instanceof Error) {
          reply.status(400).send({
            error: error.message,
          });
          return;
        }

        throw error;
      }
    },

    async resetPassword(request: FastifyRequest, reply: FastifyReply) {
      try {
        const { token, password } = resetPasswordSchema.parse(request.body);

        await authService.resetPassword(token, password);

        reply.status(200).send({
          message: "Contraseña restablecida correctamente",
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.status(400).send({
            error: "Error de validación",
            details: error.errors,
          });
          return;
        }

        if (error instanceof Error) {
          reply.status(400).send({
            error: error.message,
          });
          return;
        }

        throw error;
      }
    },

    async verifyEmail(request: FastifyRequest, reply: FastifyReply) {
      try {
        const { token } = verifyEmailSchema.parse(request.query);
        const ipAddress = request.ip || request.socket.remoteAddress;

        const result = await authService.verifyEmail(token, ipAddress);

        reply.status(200).send({
          message: "Email verificado correctamente",
          ...result,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.status(400).send({
            error: "Error de validación",
            details: error.errors,
          });
          return;
        }

        if (error instanceof Error) {
          reply.status(400).send({
            error: error.message,
          });
          return;
        }

        throw error;
      }
    },
  };
}
