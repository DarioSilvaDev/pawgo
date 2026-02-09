import { PrismaClient, Prisma, InfluencerPaymentStatus } from "@prisma/client";
import {
  CreateInfluencerPaymentDto,
  UpdateInfluencerPaymentDto,
  InfluencerPaymentWithDetails,
} from "../../../../packages/shared/dist/index.js";
import { emailService } from "./email.service.js";
import { prismaDecimal, prismaNumber, n } from "../utils/decimal.js";
import { StorageService } from "./storage.service.js";

const prisma = new PrismaClient();

export class InfluencerPaymentService {
  /**
   * Create a new influencer payment request
   */

  constructor(private readonly storageService: StorageService) { }

  async create(
    data: CreateInfluencerPaymentDto
  ): Promise<InfluencerPaymentWithDetails> {
    // Validate influencer exists
    const influencer = await prisma.influencer.findUnique({
      where: { id: data.influencerId },
      include: {
        auth: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!influencer) {
      throw new Error("Influencer no encontrado");
    }

    // Validate commissions exist and belong to influencer
    const commissions = await prisma.commission.findMany({
      where: {
        id: { in: data.commissionIds },
        influencerId: data.influencerId,
        status: "pending",
      },
    });

    if (commissions.length !== data.commissionIds.length) {
      throw new Error(
        "Algunas comisiones no existen o no pertenecen al influencer"
      );
    }

    // Calculate total amount
    const totalAmount = commissions.reduce(
      (sum, commission) => sum.add(prismaDecimal(commission.commissionAmount)),
      prismaDecimal(0)
    );

    // Get payment details from influencer profile
    const paymentDetails: {
      accountNumber?: string;
      cvu?: string;
      bankName?: string;
      mercadopagoEmail?: string;
    } = {};

    if (data.paymentMethod === "transfer") {
      paymentDetails.accountNumber = influencer.accountNumber || undefined;
      paymentDetails.cvu = influencer.cvu || undefined;
      paymentDetails.bankName = influencer.bankName || undefined;
    } else if (data.paymentMethod === "mercadopago") {
      paymentDetails.mercadopagoEmail =
        influencer.mercadopagoEmail || undefined;
    }

    // Create payment
    const payment = await prisma.influencerPayment.create({
      data: {
        influencerId: data.influencerId,
        totalAmount: prismaNumber(prismaDecimal(totalAmount)),
        currency: "ARS",
        paymentMethod: data.paymentMethod,
        status: "pending",
        accountNumber: paymentDetails.accountNumber ?? undefined,
        cvu: paymentDetails.cvu ?? undefined,
        bankName: paymentDetails.bankName ?? undefined,
        mercadopagoEmail: paymentDetails.mercadopagoEmail ?? undefined,
      },
      include: {
        influencer: {
          include: {
            auth: {
              select: {
                email: true,
              },
            },
          },
        },
      },
    });

    // Link commissions to the payment (single source of truth)
    await prisma.commission.updateMany({
      where: {
        id: { in: data.commissionIds },
        influencerId: data.influencerId,
        status: "pending",
        influencerPaymentId: null,
      },
      data: {
        influencerPaymentId: payment.id,
      },
    });

    // Get commissions with details
    const commissionsWithDetails = await prisma.commission.findMany({
      where: {
        influencerPaymentId: payment.id,
      },
      include: {
        discountCode: {
          select: {
            code: true,
          },
        },
      },
    });

    // Send notification email to influencer (async, don't wait)
    try {
      if (influencer.auth?.email && influencer.name) {
        await emailService.sendPaymentRequestNotification(
          influencer.auth.email,
          influencer.name,
          prismaNumber(totalAmount),
          "ARS"
        );
      }
    } catch (error) {
      console.error("Error sending payment request email:", error);
    }

    return {
      id: payment.id,
      influencerId: payment.influencerId,
      totalAmount: prismaNumber(prismaDecimal(payment.totalAmount)),
      currency: payment.currency,
      paymentMethod: payment.paymentMethod as "transfer" | "mercadopago",
      status: payment.status as
        | "pending"
        | "invoice_uploaded"
        | "invoice_rejected"
        | "approved"
        | "paid"
        | "cancelled",
      accountNumber: payment.accountNumber ?? undefined,
      cvu: payment.cvu ?? undefined,
      bankName: payment.bankName ?? undefined,
      mercadopagoEmail: payment.mercadopagoEmail ?? undefined,
      invoiceUrl: payment.invoiceUrl ?? undefined,
      invoiceRejectionReason: undefined,
      paymentProofUrl: payment.paymentProofUrl ?? undefined,
      invoiceUploadedAt: payment.invoiceUploadedAt ?? undefined,
      invoiceRejectedAt: undefined,
      approvedAt: payment.approvedAt ?? undefined,
      paidAt: payment.paidAt ?? undefined,
      cancelledAt: payment.cancelledAt ?? undefined,
      latestInvoice: undefined,
      influencer: {
        id: influencer.id,
        name: influencer.name,
        email: influencer.auth?.email || "",
      },
      commissions: commissionsWithDetails.map((c) => ({
        id: c.id,
        commissionAmount: prismaNumber(c.commissionAmount),
        orderId: c.orderId,
        discountCode: {
          code: c.discountCode?.code || "",
        },
      })),
      contentLinks: (payment.contentLinks as string[]) || [],
      requestedAt: payment.requestedAt,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }

  /**
   * Get payment by ID
   */
  async getById(id: string): Promise<InfluencerPaymentWithDetails | null> {
    const payment = await prisma.influencerPayment.findUnique({
      where: { id },
      include: {
        influencer: {
          include: {
            auth: {
              select: {
                email: true,
              },
            },
          },
        },
        invoices: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
    });

    if (!payment) {
      return null;
    }

    // Get commissions
    const commissions = await prisma.commission.findMany({
      where: {
        influencerPaymentId: payment.id,
      },
      include: {
        discountCode: {
          select: {
            code: true,
          },
        },
      },
    });

    return {
      ...payment,
      paymentMethod: payment.paymentMethod as "transfer" | "mercadopago",
      status: payment.status as
        | "pending"
        | "invoice_uploaded"
        | "invoice_rejected"
        | "approved"
        | "paid"
        | "cancelled",
      accountNumber: payment.accountNumber ?? undefined,
      cvu: payment.cvu ?? undefined,
      bankName: payment.bankName ?? undefined,
      mercadopagoEmail: payment.mercadopagoEmail ?? undefined,
      invoiceUrl: payment.invoices?.[0]?.url ? await this.storageService.getSignedUrl(payment.invoices?.[0]?.url) : payment.invoiceUrl ? await this.storageService.getSignedUrl(payment.invoiceUrl) : undefined,
      invoiceRejectionReason:
        payment.invoices?.[0]?.status === "rejected"
          ? payment.invoices?.[0]?.observation ?? undefined
          : payment.invoiceRejectionReason ?? undefined,
      paymentProofUrl: payment.paymentProofUrl ? await this.storageService.getSignedUrl(payment.paymentProofUrl) : undefined,
      invoiceUploadedAt: payment.invoiceUploadedAt ?? undefined,
      invoiceRejectedAt:
        payment.invoices?.[0]?.status === "rejected"
          ? payment.invoices?.[0]?.statusChangedAt ?? undefined
          : payment.invoiceRejectedAt ?? undefined,
      approvedAt: payment.approvedAt ?? undefined,
      paidAt: payment.paidAt ?? undefined,
      cancelledAt: payment.cancelledAt ?? undefined,
      latestInvoice: payment.invoices?.[0]
        ? {
          id: payment.invoices[0].id,
          influencerPaymentId: payment.invoices[0].influencerPaymentId,
          status: payment.invoices[0].status as
            | "uploaded"
            | "approved"
            | "rejected",
          url: payment.invoices[0].url,
          observation: payment.invoices[0].observation ?? undefined,
          enabled: payment.invoices[0].enabled,
          uploadedByAuthId: payment.invoices[0].uploadedByAuthId,
          statusChangedByAuthId:
            payment.invoices[0].statusChangedByAuthId ?? undefined,
          statusChangedAt: payment.invoices[0].statusChangedAt ?? undefined,
          createdAt: payment.invoices[0].createdAt,
          updatedAt: payment.invoices[0].updatedAt,
        }
        : undefined,
      influencer: {
        id: payment.influencer.id,
        name: payment.influencer.name,
        email: payment.influencer.auth?.email || "",
      },
      commissions: commissions.map((c) => ({
        id: c.id,
        commissionAmount: n(c.commissionAmount),
        orderId: c.orderId,
        discountCode: {
          code: c.discountCode?.code || "",
        },
      })),
      contentLinks: (payment.contentLinks as string[]) || [],
      totalAmount: n(payment.totalAmount),
    };
  }

  /**
   * Get all payments (admin)
   */
  async getAll(filters?: {
    influencerId?: string;
    status?: InfluencerPaymentStatus;
  }): Promise<InfluencerPaymentWithDetails[]> {
    const where: {
      influencerId?: string;
      status?: InfluencerPaymentStatus;
    } = {};

    if (filters?.influencerId) {
      where.influencerId = filters.influencerId;
      console.log(
        `[InfluencerPaymentService] getAll filtering by influencerId: ${filters.influencerId}`
      );
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    console.log(
      `[InfluencerPaymentService] getAll where clause:`,
      JSON.stringify(where)
    );
    const payments = await prisma.influencerPayment.findMany({
      where,
      include: {
        influencer: {
          include: {
            auth: {
              select: {
                email: true,
              },
            },
          },
        },
        invoices: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log(
      `[InfluencerPaymentService] getAll found ${payments.length} payments from database`
    );

    // Get commissions for each payment
    const paymentsWithCommissions = await Promise.all(
      payments.map(async (payment) => {
        const commissions = await prisma.commission.findMany({
          where: {
            influencerPaymentId: payment.id,
          },
          include: {
            discountCode: {
              select: {
                code: true,
              },
            },
          },
        });

        return {
          ...payment,
          paymentMethod: payment.paymentMethod as "transfer" | "mercadopago",
          status: payment.status as
            | "pending"
            | "invoice_uploaded"
            | "invoice_rejected"
            | "approved"
            | "paid"
            | "cancelled",
          accountNumber: payment.accountNumber ?? undefined,
          cvu: payment.cvu ?? undefined,
          bankName: payment.bankName ?? undefined,
          mercadopagoEmail: payment.mercadopagoEmail ?? undefined,
          invoiceUrl:
            payment.invoices?.[0]?.url ?? payment.invoiceUrl ?? undefined,
          invoiceRejectionReason:
            payment.invoices?.[0]?.status === "rejected"
              ? payment.invoices?.[0]?.observation ?? undefined
              : payment.invoiceRejectionReason ?? undefined,
          paymentProofUrl: payment.paymentProofUrl ?? undefined,
          invoiceUploadedAt: payment.invoiceUploadedAt ?? undefined,
          invoiceRejectedAt:
            payment.invoices?.[0]?.status === "rejected"
              ? payment.invoices?.[0]?.statusChangedAt ?? undefined
              : payment.invoiceRejectedAt ?? undefined,
          approvedAt: payment.approvedAt ?? undefined,
          paidAt: payment.paidAt ?? undefined,
          cancelledAt: payment.cancelledAt ?? undefined,
          latestInvoice: payment.invoices?.[0]
            ? {
              id: payment.invoices[0].id,
              influencerPaymentId: payment.invoices[0].influencerPaymentId,
              status: payment.invoices[0].status as
                | "uploaded"
                | "approved"
                | "rejected",
              url: payment.invoices[0].url,
              observation: payment.invoices[0].observation ?? undefined,
              enabled: payment.invoices[0].enabled,
              uploadedByAuthId: payment.invoices[0].uploadedByAuthId,
              statusChangedByAuthId:
                payment.invoices[0].statusChangedByAuthId ?? undefined,
              statusChangedAt:
                payment.invoices[0].statusChangedAt ?? undefined,
              createdAt: payment.invoices[0].createdAt,
              updatedAt: payment.invoices[0].updatedAt,
            }
            : undefined,
          influencer: {
            id: payment.influencer.id,
            name: payment.influencer.name,
            email: payment.influencer.auth?.email || "",
          },
          commissions: commissions.map((c) => ({
            id: c.id,
            commissionAmount: n(c.commissionAmount),
            orderId: c.orderId,
            discountCode: {
              code: c.discountCode?.code || "",
            },
          })),
          contentLinks: (payment.contentLinks as string[]) || [],
          totalAmount: n(payment.totalAmount),
        };
      })
    );

    return paymentsWithCommissions;
  }

  /**
   * Get payments by influencer
   */
  async getByInfluencer(
    influencerId: string
  ): Promise<InfluencerPaymentWithDetails[]> {
    console.log(
      `[InfluencerPaymentService] getByInfluencer called with influencerId: ${influencerId}`
    );
    const result = await this.getAll({ influencerId });
    console.log(
      `[InfluencerPaymentService] getByInfluencer found ${result.length} payments`
    );
    return result;
  }

  /**
   * Update payment (for uploading invoice, proof, etc.)
   */
  async update(
    id: string,
    data: UpdateInfluencerPaymentDto,
    userId?: string,
    userRole?: string,
    authId?: string
  ): Promise<InfluencerPaymentWithDetails> {
    const payment = await prisma.influencerPayment.findUnique({
      where: { id },
      include: {
        influencer: {
          include: {
            auth: {
              select: {
                email: true,
              },
            },
          },
        },
        invoices: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
    });

    if (!payment) {
      throw new Error("Pago no encontrado");
    }

    // Validate permissions
    if (userRole === "influencer" && payment.influencerId !== userId) {
      throw new Error("No tienes permiso para modificar este pago");
    }

    const updateData: Prisma.InfluencerPaymentUpdateInput = {};

    const oldStatus = payment.status as InfluencerPaymentStatus;
    const uploadedByAuthId = authId || payment.influencer.authId;
    let invoiceAction:
      | { type: "upload"; url: string }
      | { type: "reject"; reason: string }
      | { type: "approve" }
      | null = null;

    if (data.invoiceUrl !== undefined) {
      updateData.invoiceUrl = data.invoiceUrl;
      if (data.invoiceUrl) {
        updateData.invoiceUploadedAt = new Date();
        // Si había un rechazo previo, limpiar motivo/fecha
        updateData.invoiceRejectionReason = null;
        updateData.invoiceRejectedAt = null;
        // Si estaba rechazado, cambiar a invoice_uploaded cuando se sube nueva factura
        if (
          payment.status === "invoice_rejected" ||
          payment.status === "pending"
        ) {
          updateData.status = "invoice_uploaded";
        }
        invoiceAction = { type: "upload", url: data.invoiceUrl };
      }
    }

    if (data.paymentProofUrl !== undefined) {
      updateData.paymentProofUrl = data.paymentProofUrl;
    }

    if (data.contentLinks !== undefined) {
      updateData.contentLinks =
        data.contentLinks as unknown as Prisma.InputJsonValue;
    }

    if (data.status) {
      // Validar transiciones de estado
      const validTransitions: Record<string, string[]> = {
        pending: ["invoice_uploaded", "cancelled"],
        invoice_uploaded: ["approved", "invoice_rejected", "cancelled"],
        invoice_rejected: ["invoice_uploaded", "cancelled"],
        approved: ["paid", "cancelled"],
        paid: [], // Estado final, no se puede cambiar
        cancelled: [], // Estado final, no se puede cambiar
      };

      const currentStatus = payment.status as string;
      const allowedTransitions = validTransitions[currentStatus] || [];
      if (!allowedTransitions.includes(data.status)) {
        throw new Error(
          `No se puede cambiar el estado de "${payment.status}" a "${data.status
          }". Transiciones permitidas: ${allowedTransitions.join(", ")}`
        );
      }

      updateData.status = data.status as InfluencerPaymentStatus;
      if (data.status === "approved" && !payment.approvedAt) {
        updateData.approvedAt = new Date();
        invoiceAction = { type: "approve" };
      } else if (data.status === "paid" && !payment.paidAt) {
        updateData.paidAt = new Date();
        // Mark commissions as paid
        await prisma.commission.updateMany({
          where: {
            influencerPaymentId: id,
            status: "pending",
          },
          data: {
            status: "paid",
            paidAt: new Date(),
          },
        });
        // Send payment completed notification
        try {
          await emailService.sendPaymentCompletedNotification(
            payment.influencer.auth?.email || "",
            payment.influencer.name,
            n(payment.totalAmount),
            payment.currency
          );
        } catch (error) {
          console.warn("Failed to send payment completed notification:", error);
        }
      } else if (data.status === "cancelled" && !payment.cancelledAt) {
        updateData.cancelledAt = new Date();
      } else if (data.status === "invoice_rejected") {
        // Solo admin puede rechazar una factura y setear motivo
        if (userRole !== "admin") {
          throw new Error("Solo un administrador puede rechazar la factura");
        }

        const reason = data.invoiceRejectionReason?.trim();
        if (!reason) {
          throw new Error(
            "Debes indicar un motivo/observación para rechazar la factura"
          );
        }

        updateData.invoiceRejectionReason = reason;
        updateData.invoiceRejectedAt = new Date();
        // Cuando se rechaza la factura, limpiar la URL para que el influencer pueda subir una nueva
        updateData.invoiceUrl = null;
        updateData.invoiceUploadedAt = null;
        invoiceAction = { type: "reject", reason };
      }
    }

    const updatedPayment = await prisma.$transaction(async (tx) => {
      const now = new Date();

      if (invoiceAction?.type === "upload") {
        if (!uploadedByAuthId) {
          throw new Error("No se pudo determinar quién cargó la factura");
        }
        await tx.influencerInvoice.updateMany({
          where: {
            influencerPaymentId: id,
            enabled: true,
          },
          data: {
            enabled: false,
          },
        });
        await tx.influencerInvoice.create({
          data: {
            influencerPaymentId: id,
            status: "uploaded",
            url: invoiceAction.url,
            enabled: true,
            uploadedByAuthId,
          },
        });
      } else if (invoiceAction?.type === "reject") {
        const latest = await tx.influencerInvoice.findFirst({
          where: { influencerPaymentId: id },
          orderBy: { createdAt: "desc" },
        });
        if (!latest) {
          throw new Error("No hay factura para rechazar");
        }
        await tx.influencerInvoice.update({
          where: { id: latest.id },
          data: {
            status: "rejected",
            observation: invoiceAction.reason,
            enabled: false,
            statusChangedByAuthId: authId ?? null,
            statusChangedAt: now,
          },
        });
      } else if (invoiceAction?.type === "approve") {
        const latest = await tx.influencerInvoice.findFirst({
          where: { influencerPaymentId: id },
          orderBy: { createdAt: "desc" },
        });
        if (!latest) {
          throw new Error("No hay factura para aprobar");
        }
        await tx.influencerInvoice.update({
          where: { id: latest.id },
          data: {
            status: "approved",
            statusChangedByAuthId: authId ?? null,
            statusChangedAt: now,
          },
        });
      }

      return tx.influencerPayment.update({
        where: { id },
        data: updateData,
        include: {
          influencer: {
            include: {
              auth: {
                select: {
                  email: true,
                },
              },
            },
          },
          invoices: {
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
          },
        },
      });
    });

    // Get commissions
    const commissions = await prisma.commission.findMany({
      where: {
        influencerPaymentId: updatedPayment.id,
      },
      include: {
        discountCode: {
          select: {
            code: true,
          },
        },
      },
    });

    // Send email notifications based on status changes (don't fail the update if email fails)
    if (
      data.status &&
      updatedPayment.influencer.auth?.email &&
      (data.status as InfluencerPaymentStatus) !== oldStatus
    ) {
      try {
        if (data.status === "approved") {
          await emailService.sendInvoiceApprovedNotification(
            updatedPayment.influencer.auth.email,
            updatedPayment.influencer.name,
            n(updatedPayment.totalAmount),
            updatedPayment.currency
          );
        } else if (data.status === "paid") {
          await emailService.sendPaymentCompletedNotification(
            updatedPayment.influencer.auth.email,
            updatedPayment.influencer.name,
            n(updatedPayment.totalAmount),
            updatedPayment.currency
          );
        } else if (data.status === "invoice_rejected") {
          await emailService.sendInvoiceRejectedNotification(
            updatedPayment.influencer.auth.email,
            updatedPayment.influencer.name,
            updatedPayment.invoiceRejectionReason || undefined
          );
        }
      } catch (error) {
        console.error("Error sending email notification:", error);
      }
    }

    return {
      ...updatedPayment,
      paymentMethod: updatedPayment.paymentMethod as "transfer" | "mercadopago",
      status: updatedPayment.status as
        | "pending"
        | "invoice_uploaded"
        | "invoice_rejected"
        | "approved"
        | "paid"
        | "cancelled",
      accountNumber: updatedPayment.accountNumber ?? undefined,
      cvu: updatedPayment.cvu ?? undefined,
      bankName: updatedPayment.bankName ?? undefined,
      mercadopagoEmail: updatedPayment.mercadopagoEmail ?? undefined,
      invoiceUrl:
        updatedPayment.invoices?.[0]?.url ??
        updatedPayment.invoiceUrl ??
        undefined,
      invoiceRejectionReason:
        updatedPayment.invoices?.[0]?.status === "rejected"
          ? updatedPayment.invoices?.[0]?.observation ?? undefined
          : updatedPayment.invoiceRejectionReason ?? undefined,
      paymentProofUrl: updatedPayment.paymentProofUrl ?? undefined,
      invoiceUploadedAt: updatedPayment.invoiceUploadedAt ?? undefined,
      invoiceRejectedAt:
        updatedPayment.invoices?.[0]?.status === "rejected"
          ? updatedPayment.invoices?.[0]?.statusChangedAt ?? undefined
          : updatedPayment.invoiceRejectedAt ?? undefined,
      approvedAt: updatedPayment.approvedAt ?? undefined,
      paidAt: updatedPayment.paidAt ?? undefined,
      cancelledAt: updatedPayment.cancelledAt ?? undefined,
      latestInvoice: updatedPayment.invoices?.[0]
        ? {
          id: updatedPayment.invoices[0].id,
          influencerPaymentId: updatedPayment.invoices[0].influencerPaymentId,
          status: updatedPayment.invoices[0].status as
            | "uploaded"
            | "approved"
            | "rejected",
          url: updatedPayment.invoices[0].url,
          observation: updatedPayment.invoices[0].observation ?? undefined,
          enabled: updatedPayment.invoices[0].enabled,
          uploadedByAuthId: updatedPayment.invoices[0].uploadedByAuthId,
          statusChangedByAuthId:
            updatedPayment.invoices[0].statusChangedByAuthId ?? undefined,
          statusChangedAt:
            updatedPayment.invoices[0].statusChangedAt ?? undefined,
          createdAt: updatedPayment.invoices[0].createdAt,
          updatedAt: updatedPayment.invoices[0].updatedAt,
        }
        : undefined,
      influencer: {
        id: updatedPayment.influencer.id,
        name: updatedPayment.influencer.name,
        email: updatedPayment.influencer.auth?.email || "",
      },
      commissions: commissions.map((c) => ({
        id: c.id,
        commissionAmount: n(c.commissionAmount),
        orderId: c.orderId,
        discountCode: {
          code: c.discountCode?.code || "",
        },
      })),
      contentLinks: (updatedPayment.contentLinks as string[]) || [],
      totalAmount: n(updatedPayment.totalAmount),
    };
  }

  /**
   * Cancel payment
   */
  async cancel(id: string): Promise<InfluencerPaymentWithDetails> {
    return this.update(id, {
      status: "cancelled",
    });
  }
}
