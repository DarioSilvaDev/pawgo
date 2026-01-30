import { PrismaClient, Prisma } from '@prisma/client';
import { CreateLeadDto, Lead, DogSize } from '../../../../packages/shared/dist/index.js';

const prisma = new PrismaClient();

export const leadService = {
  async create(data: CreateLeadDto): Promise<Lead> {
    const lead = await prisma.lead.create({
      data: {
        email: data.email,
        name: data.name,
        dogSize: data.dogSize,
      },
    });

    return {
      id: lead.id,
      email: lead.email,
      name: lead.name || undefined,
      dogSize: lead.dogSize as DogSize | undefined,
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt,
    };
  },

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
  },

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
  },

  async delete(id: string): Promise<void> {
    await prisma.lead.delete({
      where: { id },
    });
  },
};

