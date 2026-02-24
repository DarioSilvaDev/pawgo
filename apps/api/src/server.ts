import "./config/envs.js";

import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import { envs } from "./config/envs.js";
import { leadRoutes } from "./routes/lead.routes.js";
import { eventRoutes } from "./routes/event.routes.js";
import { authRoutes } from "./auth/routes/auth.routes.js";
import { influencerRoutes } from "./routes/influencer.routes.js";
import { discountCodeRoutes } from "./routes/discount-code.routes.js";
import { orderRoutes } from "./routes/order.routes.js";
import { webhookRoutes } from "./routes/webhook.routes.js";
import { influencerPaymentRoutes } from "./routes/influencer-payment.routes.js";
import { uploadRoutes } from "./routes/upload.routes.js";
import { analyticsRoutes } from "./routes/analytics.routes.js";
import { productRoutes } from "./routes/product.routes.js";
import { geoRoutes } from "./routes/geo.routes.js";
import { configRoutes } from "./routes/config.routes.js";
import { miCorreoRoutes } from "./routes/micorreo/index.js";
import { leadNotificationRoutes } from "./routes/lead-notification.routes.js";
import { TokenService } from "./auth/services/token.service.js";
import { AuthService } from "./auth/services/auth.service.js";
import { DiscountCodeService } from "./services/discount-code.service.js";
import { OrderService } from "./services/order.service.js";
import { CommissionService } from "./services/commission.service.js";
import { MercadoPagoService } from "./services/mercadopago.service.js";
import { InfluencerPaymentService } from "./services/influencer-payment.service.js";
import { StorageService } from "./services/storage.service.js";
import { AnalyticsService } from "./services/analytics.service.js";
import { MiCorreoService } from "./services/micorreo/micorreo.service.js";
import multipart from "@fastify/multipart";
import { LeadService } from "./services/lead.service.js";
import { LeadController } from "./controllers/lead.controller.js";
import { LeadNotificationController } from "./controllers/lead-notification.controller.js";
import { UploadController } from "./controllers/upload.controller.js";
import { PgBoss } from "pg-boss";

const fastify = Fastify({
  logger: {
    level: envs.NODE_ENV === "development" ? "info" : "debug",
  },
});

// Plugins
// Configure helmet to work with CORS
await fastify.register(helmet, {
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
});
await fastify.register(cors, {
  origin:
    envs.NODE_ENV === "production"
      ? [envs.FRONTEND_URL]
      : [
        "https://pawgo-ashy.vercel.app",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
      ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

// JWT Plugin
await fastify.register(jwt, {
  secret: envs.JWT_SECRET,
  sign: {
    expiresIn: "120m",
  },
});

// Multipart Plugin (for file uploads)
await fastify.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// Initialize services
const tokenService = new TokenService(fastify);
const authService = new AuthService(tokenService);
const leadService = new LeadService();
const discountCodeService = new DiscountCodeService();
const commissionService = new CommissionService();
const miCorreoService = new MiCorreoService();
const orderService = new OrderService(discountCodeService, commissionService, miCorreoService);
const mercadoPagoService = new MercadoPagoService();
const storageService = new StorageService();
const influencerPaymentService = new InfluencerPaymentService(storageService);
const analyticsService = new AnalyticsService();

const leadController = new LeadController(leadService);
const uploadController = new UploadController(
  storageService,
  influencerPaymentService
);

// Initialize pg-boss for background jobs
const boss = new PgBoss({
  connectionString: process.env.DATABASE_URL!,
  application_name: "pawgo-api",
});

boss.on("error", (err) => {
  console.error("[api] pg-boss error:", err);
});

await boss.start();
console.log("[api] pg-boss started");

const leadNotificationController = new LeadNotificationController(boss);

// Initialize storage directories
await storageService.initialize();

// Health check
fastify.get("/health", async () => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

// Root endpoint
fastify.get("/", async () => {
  return {
    status: "ok",
    service: "PawGo API",
    version: "1.0.0",
    timestamp: new Date().toISOString()
  };
});

// Routes
await fastify.register(leadRoutes, {
  prefix: "/api",
  tokenService,
  leadController,
});
await fastify.register(eventRoutes, { prefix: "/api" });
await fastify.register(authRoutes, {
  prefix: "/api",
  authService,
  tokenService,
});
await fastify.register(influencerRoutes, {
  prefix: "/api",
  tokenService,
});
await fastify.register(discountCodeRoutes, {
  prefix: "/api",
  discountCodeService,
  tokenService,
});
await fastify.register(orderRoutes, {
  prefix: "/api",
  orderService,
  mercadoPagoService,
  tokenService,
});
await fastify.register(webhookRoutes, {
  prefix: "/api",
  mercadoPagoService,
  orderService,
});
await fastify.register(influencerPaymentRoutes, {
  prefix: "/api",
  tokenService,
});
await fastify.register(uploadRoutes, {
  prefix: "/api",
  storageService,
  influencerPaymentService,
  tokenService,
  uploadController,
});

await fastify.register(analyticsRoutes, {
  prefix: "/api",
  analyticsService,
  tokenService,
});
await fastify.register(productRoutes, {
  prefix: "/api",
  tokenService,
});
await fastify.register(geoRoutes, {
  prefix: "/api",
  tokenService,
});
await fastify.register(configRoutes, {
  prefix: "/api",
  tokenService,
});
await fastify.register(miCorreoRoutes, {
  prefix: "/api",
  miCorreoService,
  tokenService,
});
await fastify.register(leadNotificationRoutes, {
  prefix: "/api/admin/leads",
  controller: leadNotificationController,
  tokenService,
});

// Note: Files are now served from Backblaze B2, not from local filesystem
// Static file serving is disabled as files are stored in cloud storage

// Error handler
// eslint-disable-next-line @typescript-eslint/no-explicit-any
fastify.setErrorHandler((error: any, request: any, reply: any) => {
  fastify.log.error(error);

  reply.status(error.statusCode || 500).send({
    error: {
      message: error.message || "Internal server error",
      statusCode: error.statusCode || 500,
    },
  });
});

const start = async () => {
  try {
    const port = envs.PORT;
    const host = envs.HOST;

    await fastify.listen({ port, host });
    console.info(`🚀 Server running`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async () => {
  await fastify.close();
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

start();
