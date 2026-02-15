import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { MiCorreoService } from "../../services/micorreo/micorreo.service.js";
import type { RegisterCustomerRequest } from "../../services/micorreo/micorreo.types.js";

interface RegisterRouteOptions {
    miCorreoService: MiCorreoService;
}

export async function registerCustomerRoute(
    fastify: FastifyInstance,
    options: RegisterRouteOptions
) {
    const { miCorreoService } = options;

    fastify.post<{
        Body: RegisterCustomerRequest & { leadId?: string };
    }>(
        "/register",
        {
            schema: {
                body: {
                    type: "object",
                    required: [
                        "firstName",
                        "lastName",
                        "email",
                        "password",
                        "documentType",
                        "documentId",
                        "address",
                    ],
                    properties: {
                        firstName: { type: "string" },
                        lastName: { type: "string" },
                        email: { type: "string", format: "email" },
                        password: { type: "string", minLength: 6 },
                        documentType: { type: "string", enum: ["DNI", "CUIT"] },
                        documentId: { type: "string" },
                        phone: { type: "string" },
                        cellPhone: { type: "string" },
                        leadId: { type: "string" },
                        address: {
                            type: "object",
                            required: ["streetName", "streetNumber", "city", "provinceCode", "postalCode"],
                            properties: {
                                streetName: { type: "string" },
                                streetNumber: { type: "string" },
                                floor: { type: "string" },
                                apartment: { type: "string" },
                                locality: { type: "string" },
                                city: { type: "string" },
                                provinceCode: { type: "string", pattern: "^[A-Z]$" },
                                postalCode: { type: "string" },
                            },
                        },
                    },
                },
                response: {
                    200: {
                        type: "object",
                        properties: {
                            customerId: { type: "string" },
                            createdAt: { type: "string" },
                        },
                    },
                },
            },
        },
        async (request: FastifyRequest<{ Body: RegisterCustomerRequest & { leadId?: string } }>, reply: FastifyReply) => {
            try {
                const { leadId, ...customerData } = request.body;
                const result = await miCorreoService.registerCustomer(customerData, leadId);
                return reply.code(200).send(result);
            } catch (error: any) {
                fastify.log.error(error);
                return reply.code(error.statusCode || 500).send({
                    error: error.message,
                    code: error.code,
                });
            }
        }
    );
}
