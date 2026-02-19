import { PrismaClient, DiscountType } from '@prisma/client';
import { customAlphabet } from 'nanoid';

const prisma = new PrismaClient();

// Alfabeto sin caracteres ambiguos (sin 0, O, I, 1, l)
const nanoid = customAlphabet('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 8);

export class DiscountCodeGeneratorService {
    /**
     * Generate a unique discount code for lead reservation (24h validity)
     */
    async generateLeadReservationCode(leadId: string): Promise<string> {
        const lead = await prisma.lead.findUnique({
            where: { id: leadId },
            select: { email: true, reservationDiscountCodeId: true },
        });

        if (!lead) {
            throw new Error('Lead not found');
        }

        // If lead already has a reservation code, check if it's still valid
        if (lead.reservationDiscountCodeId) {
            const existingCode = await prisma.discountCode.findUnique({
                where: { id: lead.reservationDiscountCodeId },
                select: { code: true, validUntil: true, isActive: true },
            });

            // Return existing code if still valid
            if (
                existingCode &&
                existingCode.isActive &&
                existingCode.validUntil &&
                existingCode.validUntil > new Date()
            ) {
                console.log(`♻️ Reusing existing valid code for lead ${leadId}`);
                return existingCode.code;
            }
        }

        // Generate unique code
        let code: string = '';
        let isUnique = false;

        while (!isUnique) {
            code = nanoid();
            const existing = await prisma.discountCode.findUnique({
                where: { code },
            });
            if (!existing) {
                isUnique = true;
            }
        }

        // Create discount code with 24h expiration
        const validUntil = new Date();
        validUntil.setHours(validUntil.getHours() + 24);

        const discountCode = await prisma.discountCode.create({
            data: {
                code,
                influencerId: null, // No influencer for lead reservation codes
                discountType: DiscountType.percentage,
                discountValue: 15, // 15% discount for early access
                minPurchase: null,
                maxUses: 1, // Single use only
                usedCount: 0,
                isActive: true,
                validFrom: new Date(),
                validUntil,
                codeType: 'lead_reservation',
            },
        });

        // Link code to lead
        await prisma.lead.update({
            where: { id: leadId },
            data: {
                reservationDiscountCodeId: discountCode.id,
            },
        });

        console.log(`✅ Generated new reservation code ${code} for lead ${leadId}`);
        return discountCode.code;
    }
}

export const discountCodeGeneratorService = new DiscountCodeGeneratorService();
