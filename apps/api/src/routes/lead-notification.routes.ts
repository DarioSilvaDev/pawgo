import { FastifyInstance } from 'fastify';
import { LeadNotificationController } from '../controllers/lead-notification.controller.js';
import { createAuthMiddleware, requireRole } from '../auth/middleware/auth.middleware.js';
import { TokenService } from '../auth/services/token.service.js';

interface LeadNotificationRoutesOptions {
    controller: LeadNotificationController;
    tokenService: TokenService;
}

export async function leadNotificationRoutes(
    fastify: FastifyInstance,
    options: LeadNotificationRoutesOptions
) {
    const { controller, tokenService } = options;
    const authMiddleware = createAuthMiddleware(tokenService);
    const adminMiddleware = requireRole('admin');

    // Admin only - notify all leads about product availability
    fastify.post(
        '/notify-availability',
        { preHandler: [authMiddleware, adminMiddleware] },
        controller.notifyAll
    );
}
