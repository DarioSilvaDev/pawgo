import { FastifyRequest, FastifyReply } from "fastify";
import { StorageService } from "../services/storage.service.js";
import { InfluencerPaymentService } from "../services/influencer-payment.service.js";
import { PrismaClient } from "@prisma/client";
import { JwtPayload } from "../../../../packages/shared/dist/index.js";

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
          user.authId,
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
          user.authId,
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
          user.authId,
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

    async uploadProductImage(request: FastifyRequest, reply: FastifyReply) {
      console.log("\n" + "=".repeat(60));
      console.log("🖼️ [uploadProductImage] Nueva request recibida");
      console.log("=".repeat(60));

      try {
        const user = request.authUser as JwtPayload | undefined;
        console.log("👤 [uploadProductImage] Usuario:", user ? `${user.email} (${user.role})` : "undefined");

        if (!user || user.role !== "admin") {
          console.error("❌ [uploadProductImage] Acceso denegado - no es admin");
          reply.status(403).send({
            error: "Solo los administradores pueden subir imágenes de productos",
          });
          return;
        }
        console.log("✅ [uploadProductImage] Usuario autenticado y autorizado");

        // Extract productId from multipart form data
        console.log("🔍 [uploadProductImage] Extrayendo datos del multipart...");
        let productId: string | undefined;
        let fileData: Awaited<ReturnType<typeof request.file>> | null = null;

        // Iterate through parts to find both file and productId
        console.log("🔄 [uploadProductImage] Iterando sobre partes del multipart...");
        const parts = request.parts();
        let partCount = 0;

        try {
          for await (const part of parts) {
            partCount++;
            const partFieldname = 'fieldname' in part ? (part as { fieldname: string }).fieldname : 'N/A';
            console.log(`  📦 Parte ${partCount}: tipo=${part.type}, fieldname=${partFieldname}`);

            if (part.type === "file") {
              fileData = part;
              console.log("  ✅ Archivo encontrado:");
              console.log("    - Filename:", fileData.filename);
              console.log("    - MIME type:", fileData.mimetype);
              console.log("    - Encoding:", fileData.encoding);
            } else if (part.type === "field") {
              const fieldPart = part as { fieldname: string; value: string };
              console.log(`  📝 Campo encontrado: ${fieldPart.fieldname} = ${fieldPart.value}`);
              if (fieldPart.fieldname === "productId") {
                productId = fieldPart.value;
                console.log("  ✅ productId encontrado:", productId);
              }
            }
          }
          console.log(`✅ [uploadProductImage] Iteración completada. Total de partes: ${partCount}`);
        } catch (error) {
          console.error("❌ [uploadProductImage] Error al iterar sobre partes:");
          console.error("  - Tipo:", error instanceof Error ? error.constructor.name : typeof error);
          console.error("  - Mensaje:", error instanceof Error ? error.message : String(error));
          if (error instanceof Error && error.stack) {
            console.error("  - Stack:", error.stack);
          }
          throw error;
        }

        console.log(`📊 [uploadProductImage] Resumen de extracción:`);
        console.log(`  - Total de partes procesadas: ${partCount}`);
        console.log(`  - Archivo encontrado: ${fileData ? 'Sí' : 'No'}`);
        console.log(`  - ProductId encontrado: ${productId ? `Sí (${productId})` : 'No'}`);

        if (!fileData) {
          console.error("❌ [uploadProductImage] No se encontró archivo en la request");
          reply.status(400).send({ error: "No se recibió ningún archivo" });
          return;
        }

        // Read file buffer
        console.log("📖 [uploadProductImage] Leyendo buffer del archivo...");
        console.log("  - Filename:", fileData.filename);
        console.log("  - MIME type:", fileData.mimetype);
        console.log("  - Encoding:", fileData.encoding);

        const bufferStartTime = Date.now();
        let buffer: Buffer;
        try {
          buffer = await fileData.toBuffer();
          const bufferTime = Date.now() - bufferStartTime;
          console.log(`✅ [uploadProductImage] Buffer leído en ${bufferTime}ms (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
        } catch (bufferError) {
          console.error("❌ [uploadProductImage] Error al leer buffer:");
          console.error("  - Tipo:", bufferError instanceof Error ? bufferError.constructor.name : typeof bufferError);
          console.error("  - Mensaje:", bufferError instanceof Error ? bufferError.message : String(bufferError));
          if (bufferError instanceof Error && bufferError.stack) {
            console.error("  - Stack:", bufferError.stack);
          }
          throw bufferError;
        }

        // Upload file
        console.log("☁️ [uploadProductImage] Subiendo archivo a Backblaze B2...");
        const uploadStartTime = Date.now();
        const result = await storageService.uploadProductImage(
          buffer,
          user.authId,
          fileData.filename,
          fileData.mimetype
        );
        const uploadTime = Date.now() - uploadStartTime;
        console.log(`✅ [uploadProductImage] Archivo subido a B2 en ${uploadTime}ms`);
        console.log("  - URL:", result.url);
        console.log("  - Path:", result.path);
        console.log("  - Filename:", result.filename);

        // If productId is provided, update the product with the new image
        if (productId) {
          console.log("🔄 [uploadProductImage] Actualizando producto en base de datos...");
          console.log("  - ProductId:", productId);

          const product = await prisma.product.findUnique({
            where: { id: productId },
          });

          if (product) {
            console.log("  ✅ Producto encontrado:", product.name);
            console.log("  📋 Imágenes actuales:", product.images?.length || 0);

            await prisma.product.update({
              where: { id: product.id },
              data: { images: [...(product.images || []), result.url] },
            });

            console.log("  ✅ Producto actualizado con nueva imagen");
            console.log("  📋 Total de imágenes ahora:", (product.images?.length || 0) + 1);
          } else {
            console.warn("  ⚠️ Producto no encontrado con ID:", productId);
          }
        } else {
          console.log("ℹ️ [uploadProductImage] No se proporcionó productId - solo retornando URL");
        }

        console.log("✅ [uploadProductImage] Request completada exitosamente");
        console.log("=".repeat(60) + "\n");

        reply.send({
          success: true,
          url: result.url,
          filename: result.filename,
        });

      } catch (error) {
        console.error("❌ [uploadProductImage] Error en el proceso:");
        console.error("  - Tipo:", error instanceof Error ? error.constructor.name : typeof error);
        console.error("  - Mensaje:", error instanceof Error ? error.message : String(error));
        if (error instanceof Error && error.stack) {
          console.error("  - Stack:", error.stack);
        }
        console.log("=".repeat(60) + "\n");

        if (error instanceof Error) {
          reply.status(400).send({ error: error.message });
          return;
        }
        throw error;
      }
    },
  };
}
