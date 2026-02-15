import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { MiCorreoService } from "../../services/micorreo/micorreo.service.js";
import type { GetRatesRequest } from "../../services/micorreo/micorreo.types.js";

interface RatesRouteOptions {
    miCorreoService: MiCorreoService;
}

export async function getRatesRoute(
    fastify: FastifyInstance,
    options: RatesRouteOptions
) {
    const { miCorreoService } = options;

    fastify.post<{
        Body: GetRatesRequest;
    }>(
        "/rates",
        {
            schema: {
                body: {
                    type: "object",
                    required: [
                        "customerId",
                        "postalCodeOrigin",
                        "postalCodeDestination",
                        "dimensions",
                    ],
                    properties: {
                        customerId: { type: "string" },
                        postalCodeOrigin: { type: "string" },
                        postalCodeDestination: { type: "string" },
                        deliveredType: { type: "string", enum: ["D", "S"] },
                        dimensions: {
                            type: "object",
                            required: ["weight", "height", "width", "length"],
                            properties: {
                                weight: { type: "integer", minimum: 1, maximum: 25000 },
                                height: { type: "integer", maximum: 150 },
                                width: { type: "integer", maximum: 150 },
                                length: { type: "integer", maximum: 150 },
                            },
                        },
                    },
                },
                response: {
                    200: {
                        type: "object",
                        properties: {
                            customerId: { type: "string" },
                            validTo: { type: "string" },
                            rates: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        deliveredType: { type: "string" },
                                        productType: { type: "string" },
                                        productName: { type: "string" },
                                        price: { type: "number" },
                                        deliveryTimeMin: { type: "string" },
                                        deliveryTimeMax: { type: "string" },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        async (request: FastifyRequest<{ Body: GetRatesRequest }>, reply: FastifyReply) => {
            try {
                const result = await miCorreoService.getRates(request.body);
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
