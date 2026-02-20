import { FastifyRequest, FastifyReply } from "fastify";
import { StorageService } from "../services/storage.service.js";
import { InfluencerPaymentService } from "../services/influencer-payment.service.js";
import { prisma } from "../config/prisma.client.js";
import { JwtPayload } from "../shared/index.js";

/**
 * Datos extraídos de un archivo multipart
 */
interface FileData {
  buffer: Buffer;
  filename: string;
  mimetype: string;
}

/**
 * UploadController - Controlador para carga de archivos
 *
 * Responsabilidades:
 * - Manejar requests multipart de Fastify
 * - Validar permisos de acceso (RBAC)
 * - Coordinar con StorageService para la carga
 * - Aplicar lógica de negocio post-carga (actualizar DB)
 */
export class UploadController {
  private storageService: StorageService;
  private influencerPaymentService: InfluencerPaymentService;

  constructor(
    storageService: StorageService,
    influencerPaymentService: InfluencerPaymentService
  ) {
    this.storageService = storageService;
    this.influencerPaymentService = influencerPaymentService;
  }

  /**
   * Valida que el usuario esté autenticado
   */
  private validateAuth(request: FastifyRequest, reply: FastifyReply): JwtPayload | null {
    const user = request.authUser as JwtPayload | undefined;
    if (!user) {
      reply.status(401).send({ error: "No autenticado" });
      return null;
    }
    return user;
  }

  /**
   * Extrae el archivo de una request multipart
   */
  private async extractFile(request: FastifyRequest): Promise<FileData | null> {
    const data = await request.file();
    if (!data) {
      return null;
    }

    return {
      buffer: await data.toBuffer(),
      filename: data.filename,
      mimetype: data.mimetype,
    };
  }

  /**
   * Valida que un influencer tenga acceso a un pago específico
   */
  private async validatePaymentOwnership(
    paymentId: string,
    user: JwtPayload,
    reply: FastifyReply
  ): Promise<any | null> {
    const payment = await prisma.influencerPayment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      reply.status(404).send({ error: "Pago no encontrado" });
      return null;
    }

    // Admin puede acceder a cualquier pago
    if (user.role === "admin") {
      return payment;
    }

    // Influencer solo puede acceder a sus propios pagos
    if (user.role === "influencer" && payment.influencerId !== user.entityId) {
      reply.status(403).send({ error: "No tienes permiso para modificar este pago" });
      return null;
    }

    return payment;
  }

  /**
   * Subir factura (influencer o admin)
   * POST /api/influencer-payments/:id/upload-invoice
   */
  uploadInvoice = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = this.validateAuth(request, reply);
      if (!user) return;

      const { id } = request.params as { id: string };

      const payment = await this.validatePaymentOwnership(id, user, reply);
      if (!payment) return;

      // Verificar que el estado permite subir factura
      if (payment.status !== "pending" && payment.status !== "invoice_rejected") {
        reply.status(400).send({
          error: "Solo se pueden subir facturas cuando el pago está pendiente o rechazado",
        });
        return;
      }

      const fileData = await this.extractFile(request);
      if (!fileData) {
        reply.status(400).send({ error: "No se recibió ningún archivo" });
        return;
      }

      // Subir archivo usando el método genérico
      const result = await this.storageService.upload({
        buffer: fileData.buffer,
        originalName: fileData.filename,
        mimeType: fileData.mimetype,
        authId: user.authId,
        documentType: "INVOICES",
      });

      // Lógica de negocio: actualizar el pago con la URL de la factura
      await this.influencerPaymentService.update(
        id,
        { invoiceUrl: result.key },
        user.entityId,
        user.role,
        user.authId
      );

      reply.send({
        success: true,
        key: result.key,
        filename: result.filename,
      });
    } catch (error) {
      if (error instanceof Error) {
        reply.status(400).send({ error: error.message });
      } else {
        throw error;
      }
    }
  };

  /**
   * Subir comprobante de pago (solo admin)
   * POST /api/influencer-payments/:id/upload-payment-proof
   */
  uploadPaymentProof = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = this.validateAuth(request, reply);
      if (!user) return;

      const { id } = request.params as { id: string };

      const payment = await this.validatePaymentOwnership(id, user, reply);
      if (!payment) return;

      const fileData = await this.extractFile(request);
      if (!fileData) {
        reply.status(400).send({ error: "No se recibió ningún archivo" });
        return;
      }

      // Subir archivo
      const result = await this.storageService.upload({
        buffer: fileData.buffer,
        originalName: fileData.filename,
        mimeType: fileData.mimetype,
        authId: user.authId,
        documentType: "PAYMENT_PROOFS",
      });

      // Lógica de negocio: actualizar el pago con la URL del comprobante
      await this.influencerPaymentService.update(
        id,
        { paymentProofUrl: result.key },
        user.entityId,
        user.role,
        user.authId
      );

      reply.send({
        success: true,
        key: result.key,
        filename: result.filename,
      });
    } catch (error) {
      if (error instanceof Error) {
        reply.status(400).send({ error: error.message });
      } else {
        throw error;
      }
    }
  };

  /**
   * Subir contenido multimedia (influencer o admin)
   * POST /api/influencer-payments/:id/upload-content
   */
  uploadContent = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = this.validateAuth(request, reply);
      if (!user) return;

      const { id } = request.params as { id: string };

      const payment = await this.validatePaymentOwnership(id, user, reply);
      if (!payment) return;

      // Verificar que el estado permite subir contenido
      if (payment.status !== "approved" && payment.status !== "paid") {
        reply.status(400).send({
          error: "Solo se pueden subir contenidos cuando el pago está aprobado o pagado",
        });
        return;
      }

      const fileData = await this.extractFile(request);
      if (!fileData) {
        reply.status(400).send({ error: "No se recibió ningún archivo" });
        return;
      }

      // Subir archivo
      const result = await this.storageService.upload({
        buffer: fileData.buffer,
        originalName: fileData.filename,
        mimeType: fileData.mimetype,
        authId: user.authId,
        documentType: "CONTENT",
      });

      // Lógica de negocio: agregar el link al array de contenidos
      const currentPayment = await this.influencerPaymentService.getById(id);
      const currentLinks = currentPayment?.contentLinks || [];
      const newLinks = [...currentLinks, result.key];

      await this.influencerPaymentService.update(
        id,
        { contentLinks: newLinks },
        user.entityId,
        user.role,
        user.authId
      );

      reply.send({
        success: true,
        key: result.key,
        filename: result.filename,
        links: newLinks,
      });
    } catch (error) {
      if (error instanceof Error) {
        reply.status(400).send({ error: error.message });
      } else {
        throw error;
      }
    }
  };

  /**
   * Subir imagen de producto (solo admin)
   * POST /api/upload/product-image
   */
  uploadProductImage = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = this.validateAuth(request, reply)
      if (!user) return;

      const { productId } = request.query as { productId: string };

      const fileData = await this.extractFile(request);
      if (!fileData) {
        reply.status(400).send({ error: "No se recibió ningún archivo" });
        return;
      }

      // Subir archivo
      const result = await this.storageService.upload({
        buffer: fileData.buffer,
        originalName: fileData.filename,
        mimeType: fileData.mimetype,
        authId: user.authId,
        documentType: "PRODUCTS",
      });

      // Lógica de negocio: si se proporciona productId, actualizar el producto
      console.log("🚀 ~ UploadController ~ productId:", productId)
      if (productId) {
        const product = await prisma.product.findUnique({
          where: { id: productId },
        });

        if (product) {
          await prisma.product.update({
            where: { id: product.id },
            data: { images: [...(product.images || []), result.key] },
          });
        }
      }

      reply.send({
        success: true,
        key: result.key,
        filename: result.filename,
      });
    } catch (error) {
      if (error instanceof Error) {
        reply.status(400).send({ error: error.message });
      } else {
        throw error;
      }
    }
  };

  /**
   * Descargar archivo
   * GET /api/upload/download?key=key
   */
  download = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { key } = request.query as { key: string };

      const url = await this.storageService.getSignedUrl(key);

      reply.send({ url });
    } catch (error) {
      if (error instanceof Error) {
        reply.status(400).send({ error: error.message });
      } else {
        throw error;
      }
    }
  }
}

