import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { MiCorreoService } from "../../services/micorreo/micorreo.service.js";
import type { ValidateUserRequest } from "../../services/micorreo/micorreo.types.js";

interface ValidateRouteOptions {
    miCorreoService: MiCorreoService;
}

export async function validateUserRoute(
    fastify: FastifyInstance,
    options: ValidateRouteOptions
) {
    const { miCorreoService } = options;

    fastify.post<{
        Body: ValidateUserRequest;
    }>(
        "/validate",
        {
            schema: {
                body: {
                    type: "object",
                    required: ["email", "password"],
                    properties: {
                        email: { type: "string", format: "email" },
                        password: { type: "string" },
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
        async (request: FastifyRequest<{ Body: ValidateUserRequest }>, reply: FastifyReply) => {
            try {
                const result = await miCorreoService.validateUser(request.body);
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
