import { PrismaClient, Prisma } from '@prisma/client';
import { CreateLeadDto, Lead, DogSize, EventType } from '../../../../packages/shared/dist/index.js';

import { prisma } from "../config/prisma.client.js";
import { eventService } from './event.service.js';
import { emailService } from './email.service.js';

export class LeadService {
  async create(data: CreateLeadDto): Promise<Lead> {
    const lead = await prisma.lead.create({
      data: {
        email: data.email,
        name: data.name,
        dogSize: data.dogSize,
      },
    });

    // Emitir evento de lead enviado automáticamente
    try {
      await eventService.create({
        type: EventType.LEAD_SUBMITTED,
        metadata: {
          leadId: lead.id,
          email: lead.email,
          hasName: !!lead.name,
          hasDogSize: !!lead.dogSize,
          incentive: data.incentive || 'unknown',
        },
      });
    } catch (error) {
      // Log error but don't fail lead creation
      console.error('Failed to track LEAD_SUBMITTED event:', error);
    }

    // Enviar email de bienvenida al lead
    try {
      await emailService.sendLeadWelcomeEmail(
        lead.email,
        lead.name || undefined,
        lead.dogSize || undefined
      );
      console.log(`✅ Welcome email sent to lead: ${lead.email}`);
    } catch (error) {
      // Log error but don't fail lead creation
      console.error('Failed to send welcome email to lead:', error);
    }

    return {
      id: lead.id,
      email: lead.email,
      name: lead.name || undefined,
      dogSize: lead.dogSize as DogSize | undefined,
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt,
    };
  }

  async getAll(filters?: {
    search?: string;
    dogSize?: DogSize;
    startDate?: Date;
    endDate?: Date;
  }): Promise<Lead[]> {
    const where: any = {};

    if (filters?.search) {
      where.OR = [
        { email: { contains: filters.search, mode: "insensitive" } },
        { name: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    if (filters?.dogSize) {
      where.dogSize = filters.dogSize as string;
    }

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    const leads = await prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return leads.map((lead) => ({
      id: lead.id,
      email: lead.email,
      name: lead.name || undefined,
      dogSize: lead.dogSize as DogSize | undefined,
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt,
    }));
  }

  async getById(id: string): Promise<Lead | null> {
    const lead = await prisma.lead.findUnique({
      where: { id },
    });

    if (!lead) {
      return null;
    }

    return {
      id: lead.id,
      email: lead.email,
      name: lead.name || undefined,
      dogSize: lead.dogSize as DogSize | undefined,
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt,
    };
  }

  async delete(id: string): Promise<void> {
    await prisma.lead.delete({
      where: { id },
    });
  }
}

