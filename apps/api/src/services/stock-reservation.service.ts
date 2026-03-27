import { prisma } from "../config/prisma.client.js";
import { CreateStockReservationDto } from "../shared/index.js";
import { PgBoss } from "pg-boss";
import { JOB_STOCK_REPLENISHMENT } from "../jobs/stock-reservation.job.js";
import { emailService } from "./email.service.js";

export class StockReservationService {
    constructor(private readonly boss: PgBoss) { }

    async create(data: CreateStockReservationDto) {
        const { email, name, phoneNumber, items } = data;

        // 1. Find or create Lead (Reuse existing lead by email)
        const lead = await prisma.lead.findFirst({
            where: { email }
        });

        const leadId = lead ? lead.id : (await prisma.lead.create({
            data: {
                email,
                name: name || undefined,
                phoneNumber: phoneNumber || undefined
            }
        })).id;

        // If lead exists but phone/name is missing, update them
        if (lead && (phoneNumber || name)) {
            await prisma.lead.update({
                where: { id: lead.id },
                data: {
                    phoneNumber: phoneNumber || lead.phoneNumber,
                    name: name || lead.name
                }
            });
        }

        // 2. Create reservations for each variant
        const results = [];
        for (const item of items) {
            // Check for existing active reservation (notifiedAt is null)
            const existing = await prisma.stockReservation.findFirst({
                where: {
                    leadId,
                    variantId: item.variantId,
                    notifiedAt: null
                }
            });

            if (existing) {
                // If same quantity, throw error (as user requested)
                if (existing.desiredQuantity === item.quantity) {
                    throw new Error("Ya tienes una reserva para este producto por esa cantidad.");
                }

                // If different quantity, update it
                const updated = await prisma.stockReservation.update({
                    where: { id: existing.id },
                    data: { desiredQuantity: item.quantity }
                });
                results.push(updated);
            } else {
                // Create new reservation
                const created = await prisma.stockReservation.create({
                    data: {
                        leadId,
                        variantId: item.variantId,
                        desiredQuantity: item.quantity
                    }
                });
                results.push(created);
            }
        }

        // 3. Send confirmation email
        try {
            // Fetch product and variant names for the email
            const variantDetails = await prisma.productVariant.findMany({
                where: {
                    id: { in: items.map(item => item.variantId) }
                },
                include: {
                    product: {
                        select: { name: true }
                    }
                }
            });

            const reservedItems = variantDetails.map(v => ({
                productName: v.product.name,
                variantName: v.name,
                quantity: items.find(i => i.variantId === v.id)?.quantity || 1
            }));

            await emailService.sendStockReservationConfirmationEmail(
                email,
                name || lead?.name || undefined,
                reservedItems
            );
            console.log(`✅ Stock reservation confirmation email sent to: ${email}`);
        } catch (error) {
            console.error("❌ Failed to send stock reservation confirmation email:", error);
            // Don't throw error to avoid failing the whole request
        }

        return { leadId, count: results.length };
    }

    async processReplenishment(variantId: string) {
        // Find all pending reservations for this variant
        const pending = await prisma.stockReservation.findMany({
            where: {
                variantId,
                notifiedAt: null
            },
            select: { id: true }
        });

        if (pending.length === 0) return;

        // Queue notification jobs
        for (const reservation of pending) {
            // singletonKey previene jobs duplicados si processReplenishment se llama
            // dos veces para la misma variante (ej: dos admins actualizan stock simultáneamente)
            await this.boss.send(
                JOB_STOCK_REPLENISHMENT,
                { reservationId: reservation.id },
                { singletonKey: `replenishment:${reservation.id}` }
            );
        }

        console.log(`🚀 Queued ${pending.length} replenishment notifications for variant ${variantId}`);
    }
}
