import { FastifyRequest, FastifyReply } from 'fastify';
import { PgBoss } from 'pg-boss';
import { prisma } from '../config/prisma.client.js';
import { JOB_LEAD_NOTIFICATION } from '../jobs/lead-notification.job.js';

export class LeadNotificationController {
    private boss: PgBoss;

    constructor(boss: PgBoss) {
        this.boss = boss;
    }

    /**
     * Notify all leads that haven't been notified yet
     */
    notifyAll = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            // Get all leads that haven't been notified
            const leads = await prisma.lead.findMany({
                where: {
                    notifiedAt: null,
                },
                select: { id: true, email: true },
            });

            if (leads.length === 0) {
                reply.send({
                    message: 'No leads to notify',
                    count: 0,
                });
                return;
            }

            // Queue notification jobs
            const jobIds = await Promise.all(
                leads.map((lead) =>
                    this.boss.send(
                        JOB_LEAD_NOTIFICATION,
                        { leadId: lead.id },
                        {
                            singletonKey: `lead-notification:${lead.id}`,
                            singletonSeconds: 60 * 60, // 1h dedupe window
                        }
                    )
                )
            );

            reply.send({
                message: 'Notification jobs queued successfully',
                count: leads.length,
                jobIds,
            });
        } catch (error) {
            console.error('Error queuing lead notifications:', error);
            reply.status(500).send({
                error: 'Failed to queue notifications',
            });
        }
    };
}
