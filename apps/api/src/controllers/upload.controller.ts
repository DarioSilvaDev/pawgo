import { FastifyRequest, FastifyReply } from "fastify";
import { StorageService } from "../services/storage.service.js";
import { InfluencerPaymentService } from "../services/influencer-payment.service.js";
import { PrismaClient } from "@prisma/client";
import { JwtPayload } from "@pawgo/shared";

const prisma = new PrismaClient();

export function createUploadController(
  storageService: StorageService,
  influencerPaymentService: InfluencerPaymentService
) {
  return {
    async uploadInvoice(request: FastifyRequest, reply: FastifyReply) {
      try {
        const user = request.authUser as JwtPayload | undefined;
        if (!user) {
          reply.status(401).send({ error: "No autenticado" });
          return;
        }

        const { id } = request.params as { id: string };

        // Verify payment exists and belongs to user
        const payment = await prisma.influencerPayment.findUnique({
          where: { id },
        });

        if (!payment) {
          reply.status(404).send({ error: "Pago no encontrado" });
          return;
        }

        // Verify permissions
        if (
          user.role === "influencer" &&
          payment.influencerId !== user.entityId
        ) {
          reply
            .status(403)
            .send({ error: "No tienes permiso para modificar este pago" });
          return;
        }

        // Verify status allows invoice upload
        if (
          payment.status !== "pending" &&
          payment.status !== "invoice_rejected"
        ) {
          reply.status(400).send({
            error:
              "Solo se pueden subir facturas cuando el pago está pendiente o rechazado",
          });
          return;
        }

        const data = await request.file();

        if (!data) {
          reply.status(400).send({ error: "No se recibió ningún archivo" });
          return;
        }

        // Read file buffer
        const buffer = await data.toBuffer();

        // Upload file
        const result = await storageService.uploadInvoice(
          buffer,
          data.filename,
          data.mimetype
        );

        // Update payment with invoice URL
        await influencerPaymentService.update(
          id,
          { invoiceUrl: result.url },
          user.entityId,
          user.role,
          user.authId
        );

        reply.send({
          success: true,
          url: result.url,
          filename: result.filename,
        });
      } catch (error) {
        if (error instanceof Error) {
          reply.status(400).send({ error: error.message });
          return;
        }
        throw error;
      }
    },

    async uploadPaymentProof(request: FastifyRequest, reply: FastifyReply) {
      try {
        const user = request.authUser as JwtPayload | undefined;
        if (!user || user.role !== "admin") {
          reply.status(403).send({
            error: "Solo los administradores pueden subir comprobantes",
          });
          return;
        }

        const { id } = request.params as { id: string };

        // Verify payment exists
        const payment = await prisma.influencerPayment.findUnique({
          where: { id },
        });

        if (!payment) {
          reply.status(404).send({ error: "Pago no encontrado" });
          return;
        }

        const data = await request.file();

        if (!data) {
          reply.status(400).send({ error: "No se recibió ningún archivo" });
          return;
        }

        // Read file buffer
        const buffer = await data.toBuffer();

        // Upload file
        const result = await storageService.uploadPaymentProof(
          buffer,
          data.filename,
          data.mimetype
        );

        // Update payment with proof URL
        await influencerPaymentService.update(
          id,
          { paymentProofUrl: result.url },
          user.entityId,
          user.role,
          user.authId
        );

        reply.send({
          success: true,
          url: result.url,
          filename: result.filename,
        });
      } catch (error) {
        if (error instanceof Error) {
          reply.status(400).send({ error: error.message });
          return;
        }
        throw error;
      }
    },

    async uploadContent(request: FastifyRequest, reply: FastifyReply) {
      try {
        const user = request.authUser as JwtPayload | undefined;
        if (!user) {
          reply.status(401).send({ error: "No autenticado" });
          return;
        }

        const { id } = request.params as { id: string };

        // Verify payment exists and belongs to user
        const payment = await prisma.influencerPayment.findUnique({
          where: { id },
        });

        if (!payment) {
          reply.status(404).send({ error: "Pago no encontrado" });
          return;
        }

        // Verify permissions
        if (
          user.role === "influencer" &&
          payment.influencerId !== user.entityId
        ) {
          reply
            .status(403)
            .send({ error: "No tienes permiso para modificar este pago" });
          return;
        }

        // Verify status allows content upload
        if (payment.status !== "approved" && payment.status !== "paid") {
          reply.status(400).send({
            error:
              "Solo se pueden subir contenidos cuando el pago está aprobado o pagado",
          });
          return;
        }

        const data = await request.file();

        if (!data) {
          reply.status(400).send({ error: "No se recibió ningún archivo" });
          return;
        }

        // Read file buffer
        const buffer = await data.toBuffer();

        // Upload file
        const result = await storageService.uploadContent(
          buffer,
          data.filename,
          data.mimetype
        );

        // Get current content links
        const currentPayment = await influencerPaymentService.getById(id);
        const currentLinks = currentPayment?.contentLinks || [];

        // Add new link
        const newLinks = [...currentLinks, result.url];

        // Update payment with new content link
        await influencerPaymentService.update(
          id,
          { contentLinks: newLinks },
          user.entityId,
          user.role,
          user.authId
        );

        reply.send({
          success: true,
          url: result.url,
          filename: result.filename,
          links: newLinks,
        });
      } catch (error) {
        if (error instanceof Error) {
          reply.status(400).send({ error: error.message });
          return;
        }
        throw error;
      }
    },
  };
}
