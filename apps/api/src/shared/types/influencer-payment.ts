// SHARED: Este archivo se mantiene sincronizado manualmente entre api y web.
// Si lo modificás, actualizá también la copia en la otra app.
export interface InfluencerPayment {
    id: string;
    influencerId: string;
    totalAmount: number;
    currency: string;
    paymentMethod: "transfer" | "mercadopago";
    status: "pending" | "invoice_uploaded" | "invoice_rejected" | "approved" | "paid" | "cancelled";

    // Datos bancarios/MercadoPago
    accountNumber?: string;
    cvu?: string;
    bankName?: string;
    mercadopagoEmail?: string;

    // Documentos
    invoiceUrl?: string;
    invoiceRejectionReason?: string;
    paymentProofUrl?: string;
    contentLinks?: string[];

    // Tracking
    requestedAt: Date;
    invoiceUploadedAt?: Date;
    invoiceRejectedAt?: Date;
    approvedAt?: Date;
    paidAt?: Date;
    cancelledAt?: Date;

    createdAt: Date;
    updatedAt: Date;
}

export interface InfluencerInvoice {
    id: string;
    influencerPaymentId: string;
    status: "uploaded" | "approved" | "rejected";
    url: string;
    observation?: string;
    enabled: boolean;
    uploadedByAuthId: string;
    statusChangedByAuthId?: string;
    statusChangedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateInfluencerPaymentDto {
    influencerId: string;
    commissionIds: string[];
    paymentMethod: "transfer" | "mercadopago";
}

export interface UpdateInfluencerPaymentDto {
    invoiceUrl?: string;
    paymentProofUrl?: string;
    contentLinks?: string[];
    invoiceRejectionReason?: string;
    status?: "pending" | "invoice_uploaded" | "invoice_rejected" | "approved" | "paid" | "cancelled";
}

export interface InfluencerPaymentWithDetails extends InfluencerPayment {
    influencer: {
        id: string;
        name: string;
        email: string;
    };
    latestInvoice?: InfluencerInvoice;
    commissions: Array<{
        id: string;
        commissionAmount: number;
        orderId: string;
        discountCode: {
            code: string;
        };
    }>;
}
