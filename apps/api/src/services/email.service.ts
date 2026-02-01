import nodemailer from "nodemailer";
import { envs } from "../config/envs";

// Email configuration from environment variables
const SMTP_HOST = envs.SMTP_HOST;
// Normalize SMTP_HOST - remove protocol if present (nodemailer only needs hostname)
const SMTP_PORT = envs.SMTP_PORT;
const SMTP_USER = envs.SMTP_USER;
const SMTP_PASS = envs.SMTP_PASS;
const SMTP_FROM = envs.SMTP_FROM || SMTP_USER || "noreply@pawgo.com";
const FRONTEND_URL = envs.FRONTEND_URL;

// Create transporter
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465, // true for 465, false for other ports
  auth:
    SMTP_USER && SMTP_PASS
      ? {
        user: SMTP_USER,
        pass: SMTP_PASS,
      }
      : undefined,
});

// Verify transporter configuration (async, don't block startup)
if (SMTP_USER && SMTP_PASS) {
  // Validate SMTP_HOST format 
  // Verify asynchronously to avoid blocking server startup
  setImmediate(() => {
    transporter
      .verify()
      .then(() => {
        console.log(`✅ Email service configured and ready (SMTP: ${SMTP_HOST}:${SMTP_PORT})`);
      })
      .catch((error) => {
        console.warn("⚠️ Email service configuration error:", error.message);
        console.warn(
          "⚠️ Emails will not be sent until SMTP is properly configured"
        );
        // Don't throw - allow server to start even if email is misconfigured
      });
  });
} else {
  console.warn("⚠️ SMTP credentials not configured. Emails will not be sent.");
}

/**
 * Generate email header with PawGo logo
 */
function getEmailHeader(): string {
  const logoUrl = `${process.env.PUBLIC_URL}/images/logo-170x50.jpeg`;
  return `
    <div class="header" style="background-color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
      <img src="${logoUrl}" alt="PawGo Logo" style="max-width: 200px; height: auto;" />
    </div>
  `;
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  /**
   * Send email
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    if (!SMTP_USER || !SMTP_PASS) {
      console.warn(
        "⚠️ Email not sent (SMTP not configured):",
        options.to,
        options.subject
      );
      return;
    }

    try {
      await transporter.sendMail({
        from: `PawGo <${SMTP_FROM}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>/g, ""), // Strip HTML for text version
      });
      console.log(`✅ Email sent to ${options.to}: ${options.subject}`);
    } catch (error) {
      console.error("❌ Error sending email:", error);
      throw new Error(
        `Failed to send email: ${error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Send email verification
   */
  async sendVerificationEmail(
    email: string,
    token: string,
    name?: string
  ): Promise<void> {
    const verificationUrl = `${FRONTEND_URL}/verify-email?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .header img { max-width: 200px; height: auto; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #00CED1; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            ${getEmailHeader()}
            <div class="content">
              <h2>Verifica tu email</h2>
              <p>Hola${name ? ` ${name}` : ""},</p>
              <p>Gracias por registrarte en PawGo. Por favor, verifica tu dirección de email haciendo clic en el siguiente botón:</p>
              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verificar Email</a>
              </div>
              <p>O copia y pega este enlace en tu navegador:</p>
              <p style="word-break: break-all; color: #00CED1;">${verificationUrl}</p>
              <p>Este enlace expirará en 24 horas.</p>
              <p>Si no creaste una cuenta en PawGo, puedes ignorar este email.</p>
            </div>
            <div class="footer">
              <p>© 2026 PawGo. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: "Verifica tu email - PawGo",
      html,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    email: string,
    token: string,
    name?: string
  ): Promise<void> {
    const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .header img { max-width: 200px; height: auto; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #00CED1; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            ${getEmailHeader()}
            <div class="content">
              <h2>Restablecer contraseña</h2>
              <p>Hola${name ? ` ${name}` : ""},</p>
              <p>Recibimos una solicitud para restablecer tu contraseña. Haz clic en el siguiente botón para continuar:</p>
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Restablecer Contraseña</a>
              </div>
              <p>O copia y pega este enlace en tu navegador:</p>
              <p style="word-break: break-all; color: #00CED1;">${resetUrl}</p>
              <div class="warning">
                <p><strong>⚠️ Importante:</strong> Este enlace expirará en 1 hora. Si no solicitaste este cambio, puedes ignorar este email.</p>
              </div>
            </div>
            <div class="footer">
              <p>© 2026 PawGo. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: "Restablecer contraseña - PawGo",
      html,
    });
  }

  /**
   * Send payment request notification to influencer
   */
  async sendPaymentRequestNotification(
    email: string,
    name: string,
    amount: number,
    currency: string = "ARS"
  ): Promise<void> {
    const dashboardUrl = `${FRONTEND_URL}/dashboard/influencer/payments`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .header img { max-width: 200px; height: auto; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #00CED1; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .amount-box { background-color: white; border: 2px solid #00CED1; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
            .amount { font-size: 32px; font-weight: bold; color: #00CED1; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            ${getEmailHeader()}
            <div class="content">
              <h2>Nueva solicitud de pago</h2>
              <p>Hola ${name},</p>
              <p>Se ha creado una nueva solicitud de pago para ti. Por favor, sube tu factura para continuar con el proceso.</p>
              <div class="amount-box">
                <p style="margin: 0; color: #666;">Monto a recibir:</p>
                <p class="amount">${currency} ${amount.toLocaleString(
      "es-AR"
    )}</p>
              </div>
              <div style="text-align: center;">
                <a href="${dashboardUrl}" class="button">Ver Solicitud de Pago</a>
              </div>
              <p>Recuerda que debes subir tu factura para que el pago pueda ser procesado.</p>
            </div>
            <div class="footer">
              <p>© 2026 PawGo. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: "Nueva solicitud de pago - PawGo",
      html,
    });
  }

  /**
   * Send invoice approved notification
   */
  async sendInvoiceApprovedNotification(
    email: string,
    name: string,
    amount: number,
    currency: string = "ARS"
  ): Promise<void> {
    const dashboardUrl = `${FRONTEND_URL}/dashboard/influencer/payments`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .header img { max-width: 200px; height: auto; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #00CED1; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .success-box { background-color: #d4edda; border-left: 4px solid #28a745; padding: 12px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            ${getEmailHeader()}
            <div class="content">
              <h2>✅ Factura aprobada</h2>
              <p>Hola ${name},</p>
              <div class="success-box">
                <p style="margin: 0;"><strong>¡Tu factura ha sido aprobada!</strong></p>
              </div>
              <p>Tu factura por <strong>${currency} ${amount.toLocaleString(
      "es-AR"
    )}</strong> ha sido aprobada y el pago será procesado próximamente.</p>
              <div style="text-align: center;">
                <a href="${dashboardUrl}" class="button">Ver Detalles</a>
              </div>
              <p>Recibirás una notificación cuando el pago haya sido completado.</p>
            </div>
            <div class="footer">
              <p>© 2026 PawGo. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: "Factura aprobada - PawGo",
      html,
    });
  }

  /**
   * Send invoice rejected notification
   */
  async sendInvoiceRejectedNotification(
    email: string,
    name: string,
    reason?: string
  ): Promise<void> {
    const dashboardUrl = `${FRONTEND_URL}/dashboard/influencer/payments`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .header img { max-width: 200px; height: auto; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #00CED1; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .warning-box { background-color: #f8d7da; border-left: 4px solid #dc3545; padding: 12px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            ${getEmailHeader()}
            <div class="content">
              <h2>⚠️ Factura rechazada</h2>
              <p>Hola ${name},</p>
              <div class="warning-box">
                <p style="margin: 0;"><strong>Tu factura ha sido rechazada.</strong></p>
              </div>
              ${reason ? `<p><strong>Motivo:</strong> ${reason}</p>` : ""}
              <p>Por favor, sube una nueva factura corregida para continuar con el proceso de pago.</p>
              <div style="text-align: center;">
                <a href="${dashboardUrl}" class="button">Subir Nueva Factura</a>
              </div>
              <p>Si tienes dudas, por favor contacta con el administrador.</p>
            </div>
            <div class="footer">
              <p>© 2026 PawGo. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: "Factura rechazada - PawGo",
      html,
    });
  }

  /**
   * Send payment completed notification
   */
  async sendPaymentCompletedNotification(
    email: string,
    name: string,
    amount: number,
    currency: string = "ARS"
  ): Promise<void> {
    const dashboardUrl = `${FRONTEND_URL}/dashboard/influencer/payments`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .header img { max-width: 200px; height: auto; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #00CED1; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .success-box { background-color: #d4edda; border-left: 4px solid #28a745; padding: 12px; margin: 20px 0; }
            .amount-box { background-color: white; border: 2px solid #28a745; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
            .amount { font-size: 32px; font-weight: bold; color: #28a745; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            ${getEmailHeader()}
            <div class="content">
              <h2>💰 Pago completado</h2>
              <p>Hola ${name},</p>
              <div class="success-box">
                <p style="margin: 0;"><strong>¡Tu pago ha sido completado!</strong></p>
              </div>
              <div class="amount-box">
                <p style="margin: 0; color: #666;">Monto recibido:</p>
                <p class="amount">${currency} ${amount.toLocaleString(
      "es-AR"
    )}</p>
              </div>
              <p>El pago ha sido procesado exitosamente. Ya puedes ver los detalles en tu dashboard.</p>
              <div style="text-align: center;">
                <a href="${dashboardUrl}" class="button">Ver Detalles</a>
              </div>
              <p>Recuerda subir los links o capturas del contenido publicado si aún no lo has hecho.</p>
            </div>
            <div class="footer">
              <p>© 2026 PawGo. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: "Pago completado - PawGo",
      html,
    });
  }

  /**
   * Send order confirmation to customer
   */
  async sendOrderConfirmation(
    email: string,
    name: string,
    orderId: string,
    total: number,
    currency: string = "ARS"
  ): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .header img { max-width: 200px; height: auto; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .success-box { background-color: #d4edda; border-left: 4px solid #28a745; padding: 12px; margin: 20px 0; }
            .order-box { background-color: white; border: 2px solid #00CED1; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            ${getEmailHeader()}
            <div class="content">
              <h2>✅ Orden confirmada</h2>
              <p>Hola ${name},</p>
              <div class="success-box">
                <p style="margin: 0;"><strong>¡Gracias por tu compra!</strong></p>
              </div>
              <div class="order-box">
                <p><strong>Número de orden:</strong> ${orderId}</p>
                <p><strong>Total:</strong> ${currency} ${total.toLocaleString(
      "es-AR"
    )}</p>
              </div>
              <p>Tu orden ha sido confirmada y será procesada próximamente. Te notificaremos cuando sea enviada.</p>
            </div>
            <div class="footer">
              <p>© 2026 PawGo. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: `Orden confirmada #${orderId.slice(0, 8)} - PawGo`,
      html,
    });
  }

  /**
   * Notify admins when an expired discount code has been processed (settled)
   */
  async sendDiscountCodeSettlementAdminNotification(params: {
    to: string[];
    code: string;
    influencerName: string;
    influencerEmail?: string;
    totalAmount: string;
    currency: string;
    commissionsCount: number;
    influencerPaymentId?: string;
  }): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 700px; margin: 0 auto; padding: 20px; }
            .content { background-color: #f9f9f9; padding: 24px; border-radius: 8px; }
            .box { background: white; border: 1px solid #e5e7eb; padding: 16px; border-radius: 8px; }
            .k { color: #6b7280; font-size: 12px; }
            .v { font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="container">
            ${getEmailHeader()}
            <div class="content">
              <h2>🧾 Código expirado procesado</h2>
              <p>Se procesó automáticamente un código de descuento expirado.</p>
              <div class="box">
                <p><span class="k">Código:</span> <span class="v">${params.code
      }</span></p>
                <p><span class="k">Influencer:</span> <span class="v">${params.influencerName
      }</span></p>
                ${params.influencerEmail
        ? `<p><span class="k">Email influencer:</span> <span class="v">${params.influencerEmail}</span></p>`
        : ""
      }
                <p><span class="k">Total:</span> <span class="v">${params.currency
      } ${params.totalAmount}</span></p>
                <p><span class="k">Comisiones incluidas:</span> <span class="v">${params.commissionsCount
      }</span></p>
                ${params.influencerPaymentId
        ? `<p><span class="k">InfluencerPayment:</span> <span class="v">${params.influencerPaymentId}</span></p>`
        : ""
      }
              </div>
              <p style="margin-top: 16px;">Este email es informativo (no requiere acción).</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send to all admins (best-effort)
    await Promise.all(
      params.to.map((to) =>
        this.sendEmail({
          to,
          subject: `Código expirado procesado: ${params.code}`,
          html,
        }).catch((err) => {
          console.warn("Failed to notify admin:", to, err);
        })
      )
    );
  }
}

// Export singleton instance
export const emailService = new EmailService();
