// Tipos para la configuración del CTA
export type CTAAction = "SHOW_MODAL" | "REDIRECT";

export interface CTAConfig {
    action: CTAAction;
    modalType?: "WAITLIST" | "BUY_INTENT";
    url?: string;
}

export interface PublicConfig {
    cta: CTAConfig;
}
