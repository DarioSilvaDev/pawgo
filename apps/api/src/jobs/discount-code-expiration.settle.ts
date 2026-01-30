import { PgBoss, Job } from "pg-boss";
import { PrismaClient } from "@prisma/client";
import { emailService } from "../services/email.service.js";
import { d } from "../utils/decimal.js";
import { JOB_DISCOUNT_CODE_SETTLE } from "./discount-code-expiration.scan.js";

const prisma = new PrismaClient();

function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_NOTIFICATION_EMAILS || "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function registerDiscountCodeSettlementWorker(boss: PgBoss) {
  const concurrency = Number(
    process.env.JOB_DISCOUNT_CODE_SETTLE_CONCURRENCY || 2
  );

  boss.work(
    JOB_DISCOUNT_CODE_SETTLE,
    { batchSize: concurrency },
    async (jobs: Job<{ discountCodeId: string }>[]) => {
      const results = await Promise.all(
        jobs.map(async (job) => {
          const { discountCodeId } = job.data;

          const result = await prisma.$transaction(async (tx) => {
            // TransactionClient typing can lag behind generated model delegates in some IDE setups.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const txAny = tx as any;
            const code = await tx.discountCode.findUnique({
              where: { id: discountCodeId },
              include: {
                influencer: { include: { auth: { select: { email: true } } } },
              },
            });

            if (!code) {
              return { status: "not_found" as const };
            }

            // If already settled, exit idempotently
            const existing = await txAny.discountCodeSettlement.findUnique({
              where: { discountCodeId },
            });
            if (existing) {
              return {
                status: "already_settled" as const,
                settlementId: existing.id,
              };
            }

            // Only process if expired and active (avoid unexpected deactivation cases)
            // validUntil is end-of-day Argentina time (UTC timestamp). Inclusive until validUntil.
            const now = new Date();
            if (!code.validUntil || now <= code.validUntil) {
              return { status: "not_expired" as const };
            }

            // Aggregate payable commissions for this code that haven't been linked to a payment yet
            const agg = await tx.commission.aggregate({
              where: {
                discountCodeId,
                status: "pending",
                influencerPaymentId: null,
              },
              _sum: { commissionAmount: true },
              _count: { _all: true },
            });

            const totalAmount = d(agg._sum.commissionAmount);
            const commissionsCount = agg._count._all;

            let influencerPaymentId: string | undefined;

            if (commissionsCount > 0 && totalAmount.gt(0)) {
              const paymentMethod = code.influencer.paymentMethod || "transfer";

              const payment = await tx.influencerPayment.create({
                data: {
                  influencerId: code.influencerId,
                  // Prisma accepts number here; round to 2 decimals for financial safety.
                  totalAmount: Number(totalAmount.toFixed(2)),
                  currency: "ARS",
                  paymentMethod,
                  status: "pending",
                  accountNumber: code.influencer.accountNumber,
                  cvu: code.influencer.cvu,
                  bankName: code.influencer.bankName,
                  mercadopagoEmail: code.influencer.mercadopagoEmail,
                },
              });

              influencerPaymentId = payment.id;

              // Link commissions to the influencer payment (prevents re-processing)
              await tx.commission.updateMany({
                where: {
                  discountCodeId,
                  status: "pending",
                  influencerPaymentId: null,
                },
                data: {
                  influencerPaymentId: payment.id,
                },
              });
            }

            // Create settlement record (hard idempotency boundary)
            const settlement = await txAny.discountCodeSettlement.create({
              data: {
                discountCodeId,
                influencerId: code.influencerId,
                totalAmount: Number(totalAmount.toFixed(2)),
                currency: "ARS",
                commissionsCount,
                influencerPaymentId: influencerPaymentId ?? null,
                processedAt: new Date(),
              },
            });

            // Deactivate code to avoid future use (business rule)
            await tx.discountCode.update({
              where: { id: discountCodeId },
              data: { isActive: false },
            });

            return {
              status: "settled" as const,
              settlementId: settlement.id,
              code: code.code,
              influencerName: code.influencer.name,
              influencerEmail: code.influencer.auth?.email,
              totalAmount: totalAmount.toFixed(2),
              commissionsCount,
              influencerPaymentId,
            };
          });

          const admins = getAdminEmails();
          if (admins.length > 0 && result.status === "settled") {
            await emailService.sendDiscountCodeSettlementAdminNotification({
              to: admins,
              code: result.code,
              influencerName: result.influencerName,
              influencerEmail: result.influencerEmail,
              totalAmount: result.totalAmount,
              currency: "ARS",
              commissionsCount: result.commissionsCount,
              influencerPaymentId: result.influencerPaymentId,
            });
          }

          return result;
        })
      );

      return results;
    }
  );
}
