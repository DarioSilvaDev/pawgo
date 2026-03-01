import nodemailer from "nodemailer";
import { envs } from "../config/envs.js";
import { Resend } from "resend";

const resend = new Resend(envs.RESEND_API_KEY);

// Email configuration from environment variables
const SMTP_HOST = envs.SMTP_HOST;
const SMTP_PORT = envs.SMTP_PORT;
const SMTP_SOPORTE_USER = envs.SMTP_SOPORTE_USER;
const SMTP_SOPORTE_PASS = envs.SMTP_SOPORTE_PASS;
const SMTP_VENTAS_USER = envs.SMTP_VENTAS_USER;
const SMTP_VENTAS_PASS = envs.SMTP_VENTAS_PASS;
const FRONTEND_URL = envs.FRONTEND_URL;

// Create transporters with optimized configuration
const soporteTransporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465, // true for 465, false for 587
  // Connection pooling for better performance
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
  // Timeouts optimized for cloud environments
  connectionTimeout: 30000, // 30 seconds (default is 2 minutes)
  greetingTimeout: 30000,   // 30 seconds
  socketTimeout: 60000,     // 60 seconds
  // TLS configuration
  tls: {
    rejectUnauthorized: true,
    minVersion: 'TLSv1.2' as const,
  },
  // Retry configuration
  requireTLS: SMTP_PORT === 587, // Require TLS for port 587
  auth:
    SMTP_SOPORTE_USER && SMTP_SOPORTE_PASS
      ? {
        user: SMTP_SOPORTE_USER,
        pass: SMTP_SOPORTE_PASS,
      }
      : undefined,
});

const ventasTransporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
  connectionTimeout: 30000,
  greetingTimeout: 30000,
  socketTimeout: 60000,
  tls: {
    rejectUnauthorized: true,
    minVersion: 'TLSv1.2' as const,
  },
  requireTLS: SMTP_PORT === 587,
  auth:
    SMTP_VENTAS_USER && SMTP_VENTAS_PASS
      ? {
        user: SMTP_VENTAS_USER,
        pass: SMTP_VENTAS_PASS,
      }
      : undefined,
});

// Track verification status
let soporteVerified = false;
let ventasVerified = false;

// Lazy verification - only verify when first email is sent
// This prevents blocking server startup and handles transient network issues
if (SMTP_SOPORTE_USER && SMTP_SOPORTE_PASS) {
  console.log(`📧 SMTP soporte configured (${SMTP_HOST}:${SMTP_PORT}) - will verify on first use`);
} else {
  console.warn("⚠️ SMTP soporte credentials not configured. Manual emails will not be sent.");
}

if (SMTP_VENTAS_USER && SMTP_VENTAS_PASS) {
  console.log(`📧 SMTP ventas configured (${SMTP_HOST}:${SMTP_PORT}) - will verify on first use`);
} else {
  console.warn("⚠️ SMTP ventas credentials not configured. Manual emails will not be sent.");
}

/**
 * Generate email header with PawGo logo
 */
function getEmailHeader(): string {
  const logoUrl = envs.LOGO_URL;
  return `
    <div class="header" style="background-color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
      <img src="${logoUrl}" alt="PawGo Logo" style="max-width: 200px; height: auto;" />
    </div>
  `;
}

import { prisma } from "../config/prisma.client.js";

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
  private async sendViaResend(params: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    try {
      const { error } = await resend.emails.send({
        from: `PawGo <no-reply@noreply.pawgo-pet.com>`,
        to: params.to,
        subject: params.subject,
        html: params.html,
        replyTo: 'soporte@pawgo-pet.com',
        tags: [{ name: 'category', value: 'transactional' }]
      });
      if (error) {
        console.error("❌ Error sending email:", error);
        throw new Error(
          `Resend error: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
      console.log(`✅ Email sent via Resend to ${params.to}: ${params.subject}`);
    } catch (error) {
      console.error("❌ Error sending email via Resend:", error);
      throw new Error(
        `Failed to send email via Resend: ${error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Verify transporter connection (lazy verification)
   */
  private async verifyTransporter(
    transporter: nodemailer.Transporter,
    name: string,
    isVerified: boolean
  ): Promise<boolean> {
    if (isVerified) return true;

    try {
      await transporter.verify();
      console.log(`✅ ${name} transporter verified successfully`);
      return true;
    } catch (error) {
      console.error(`❌ ${name} transporter verification failed:`, error);
      throw new Error(
        `SMTP ${name} not available: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  private async sendViaNodemailer(params: {
    from: "soporte" | "ventas";
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    const transporter = params.from === "soporte" ? soporteTransporter : ventasTransporter;
    const fromEmail = params.from === "soporte" ? SMTP_SOPORTE_USER : SMTP_VENTAS_USER;
    const isVerified = params.from === "soporte" ? soporteVerified : ventasVerified;

    try {
      // Lazy verification on first use
      if (!isVerified) {
        const verified = await this.verifyTransporter(transporter, params.from, isVerified);
        if (params.from === "soporte") {
          soporteVerified = verified;
        } else {
          ventasVerified = verified;
        }
      }

      await transporter.sendMail({
        from: `PawGo <${fromEmail}>`,
        to: params.to,
        subject: params.subject,
        html: params.html,
      });

      console.log(`✅ Email sent via Nodemailer (${params.from}) to ${params.to}`);
    } catch (error) {
      console.error(`❌ Error sending email via Nodemailer (${params.from}):`, error);

      // Reset verification status on error to retry next time
      if (params.from === "soporte") {
        soporteVerified = false;
      } else {
        ventasVerified = false;
      }

      throw new Error(
        `Failed to send email via Nodemailer: ${error instanceof Error ? error.message : "Unknown error"}`
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

    await this.sendViaResend({
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

    await this.sendViaResend({
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

    await this.sendViaResend({
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

    await this.sendViaResend({
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

    await this.sendViaResend({
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

    await this.sendViaResend({
      to: email,
      subject: "Pago completado - PawGo",
      html,
    });
  }

  /**
   * Send welcome email to new lead
   */
  async sendLeadWelcomeEmail(
    email: string,
    name?: string,
    dogSize?: string
  ): Promise<void> {
    const dogSizeText = dogSize
      ? {
        small: "pequeño",
        medium: "mediano",
        large: "grande",
        extra_large: "extra grande",
      }[dogSize] || ""
      : "";

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
            .info-box { background-color: #e7f3ff; border-left: 4px solid #00CED1; padding: 12px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            .paw-emoji { font-size: 24px; }
          </style>
        </head>
        <body>
          <div class="container">
            ${getEmailHeader()}
            <div class="content">
              <h2>🐾 ¡Gracias por tu interés en PawGo!</h2>
              <p>Hola${name ? ` ${name}` : ""},</p>
              <div class="success-box">
                <p style="margin: 0;"><strong>✅ Tu solicitud ha sido recibida exitosamente</strong></p>
              </div>
              <p>Nos emociona saber que quieres formar parte de la familia PawGo. ${dogSizeText
        ? `Hemos registrado tu interés en el pretal de tamaño <strong>${dogSizeText}</strong>.`
        : "Hemos registrado tu interés en nuestros pretal."
      }</p>
              <div class="info-box">
                <p style="margin: 0;">📧 Te avisaremos por email cuando tu producto esté disponible.</p>
              </div>
              <p>Estamos trabajando arduamente para ofrecerte la mejor experiencia y los mejores productos para tu mejor amigo de cuatro patas.</p>
              <p><strong>Gracias por confiar en nosotros.</strong> 💙</p>
              <p>Si tienes alguna pregunta mientras tanto, no dudes en contactarnos respondiendo a este email.</p>
              <p style="margin-top: 30px;">¡Nos vemos pronto!</p>
              <p><strong>El equipo de PawGo</strong> 🐕</p>
            </div>
            <div class="footer">
              <p>© 2026 PawGo. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendViaResend({
      to: email,
      subject: "¡Gracias por tu interés en PawGo! 🐾",
      html,
    });
  }

  /**
   * Send product availability notification to lead with unique discount code (24h validity)
   */
  async sendProductAvailabilityNotification(
    email: string,
    discountCode: string,
    name?: string,
    dogSize?: string
  ): Promise<void> {
    const shopUrl = `${FRONTEND_URL}/shop`;
    const expirationDate = new Date();
    expirationDate.setHours(expirationDate.getHours() + 24);

    const dogSizeText = dogSize
      ? {
        small: "pequeño",
        medium: "mediano",
        large: "grande",
        extra_large: "extra grande",
      }[dogSize] || ""
      : "";

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
            .code-box { background-color: #e7f3ff; border: 2px dashed #00CED1; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
            .discount-code { font-size: 24px; font-weight: bold; color: #00CED1; letter-spacing: 2px; }
            .warning-box { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; }
            .button { display: inline-block; padding: 12px 24px; background-color: #00CED1; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            ${getEmailHeader()}
            <div class="content">
              <h2>🎉 ¡Tu producto ya está disponible!</h2>
              <p>Hola${name ? ` ${name}` : ""},</p>
              <div class="success-box">
                <p style="margin: 0;"><strong>¡Tenemos excelentes noticias! Los productos que esperabas ya están disponibles.</strong></p>
              </div>
              <p>Nos complace informarte que nuestros productos ${dogSizeText
        ? `para perros de tamaño <strong>${dogSizeText}</strong> `
        : ""
      }ya están listos para ti.</p>
              <div class="code-box">
                <p style="margin: 0 0 10px 0;"><strong>🎁 Tu código de descuento exclusivo</strong></p>
                <p class="discount-code">${discountCode}</p>
                <p style="margin: 10px 0 0 0; font-size: 14px; color: #666;">Copia este código y úsalo al finalizar tu compra para obtener un <strong>15% de descuento</strong></p>
              </div>
              <div class="warning-box">
                <p style="margin: 0;"><strong>⏰ Válido por 24 horas</strong></p>
                <p style="margin: 5px 0 0 0;">Tu código y reserva son válidos hasta el <strong>${expirationDate.toLocaleDateString(
        "es-AR",
        {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      )}</strong>. ¡No te lo pierdas!</p>
              </div>
              <div style="text-align: center;">
                <a href="${shopUrl}" class="button">Comprar Ahora 🛒</a>
              </div>
              <p>Gracias por tu paciencia y por confiar en PawGo. Estamos emocionados de que finalmente puedas disfrutar de nuestros productos junto a tu mejor amigo. 🐾</p>
              <p style="margin-top: 30px;">¡Te esperamos!</p>
              <p><strong>El equipo de PawGo</strong> 💙</p>
            </div>
            <div class="footer">
              <p>© 2026 PawGo. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendViaResend({
      to: email,
      subject: `🎉 ¡Tu producto PawGo ya está disponible! Código: ${discountCode}`,
      html,
    });
  }

  /**
   * Send order confirmation to customer (pago aprobado)
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
              <p><strong>Gracias por confiar en nosotros.</strong> 💙</p>
            </div>
            <div class="footer">
              <p>© 2026 PawGo. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendViaResend({
      to: email,
      subject: `Orden confirmada #${orderId.slice(0, 8)} - PawGo`,
      html,
    });
  }

  /**
   * Send order payment problem / cancellation notification to customer
   */
  async sendOrderPaymentProblem(
    email: string,
    name: string,
    orderId: string,
    reason?: string
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
            .warning-box { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            ${getEmailHeader()}
            <div class="content">
              <h2>Problema con tu pago</h2>
              <p>Hola ${name},</p>
              <div class="warning-box">
                <p style="margin: 0;"><strong>Hubo un problema al procesar el pago de tu orden.</strong></p>
              </div>
              <p><strong>Número de orden:</strong> ${orderId}</p>
              ${reason ? `<p><strong>Detalle:</strong> ${reason}</p>` : ""}
              <p>Tu pedido fue cancelado automáticamente. Si crees que se trata de un error o querés volver a intentarlo, podes realizar una nueva compra desde nuestra web.</p>
              <p>Si tenés alguna duda, respondé a este email y te ayudamos.</p>
            </div>
            <div class="footer">
              <p>© 2026 PawGo. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendViaResend({
      to: email,
      subject: `Problema con tu pago - Orden #${orderId.slice(0, 8)} - PawGo`,
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
        this.sendViaResend({
          to,
          subject: `Código expirado procesado: ${params.code}`,
          html,
        }).catch((err) => {
          console.warn("Failed to notify admin:", to, err);
        })
      )
    );
  }
  /**
   * ──────────────────────────────────────────────────────────────
   * IDEMPOTENT SENDING — uses EmailLog table as deduplication
   * ──────────────────────────────────────────────────────────────
   * Pattern: check EmailLog → skip if exists → send → insert log
   */
  private async sendIdempotent(
    idempotencyKey: string,
    event: string,
    recipient: string,
    sendFn: () => Promise<void>
  ): Promise<void> {
    const existing = await prisma.emailLog.findUnique({
      where: { idempotencyKey },
    });

    if (existing) {
      console.log(`[EmailService] Idempotency: ${idempotencyKey} already sent — skipping`);
      return;
    }

    await sendFn();

    // Persist after successful send
    await prisma.emailLog.create({
      data: { idempotencyKey, event, recipient },
    }).catch((err: unknown) => {
      // Log but don't fail — email was already sent
      console.warn(`[EmailService] Failed to persist EmailLog for ${idempotencyKey}:`, err);
    });
  }

  /**
   * Idempotent order confirmation (PAYMENT_APPROVED)
   */
  async sendOrderConfirmationIdempotent(params: {
    idempotencyKey: string;
    email: string;
    name: string;
    orderId: string;
    total: number;
    currency: string;
  }): Promise<void> {
    await this.sendIdempotent(
      params.idempotencyKey,
      "PAYMENT_APPROVED",
      params.email,
      () => this.sendOrderConfirmation(params.email, params.name, params.orderId, params.total, params.currency)
    );
  }

  /**
   * Idempotent payment problem email (PAYMENT_REJECTED)
   */
  async sendOrderPaymentProblemIdempotent(params: {
    idempotencyKey: string;
    email: string;
    name: string;
    orderId: string;
    reason?: string;
  }): Promise<void> {
    await this.sendIdempotent(
      params.idempotencyKey,
      "PAYMENT_REJECTED",
      params.email,
      () => this.sendOrderPaymentProblem(params.email, params.name, params.orderId, params.reason)
    );
  }

  /**
   * Idempotent shipment created email (SHIPMENT_CREATED)
   */
  async sendShipmentCreatedIdempotent(params: {
    idempotencyKey: string;
    email: string;
    name: string;
    orderId: string;
    trackingNumber: string;
  }): Promise<void> {
    await this.sendIdempotent(
      params.idempotencyKey,
      "SHIPMENT_CREATED",
      params.email,
      () => this.sendShipmentCreated(params.email, params.name, params.orderId, params.trackingNumber)
    );
  }

  /**
   * Idempotent shipment delivered email (SHIPMENT_DELIVERED)
   */
  async sendShipmentDeliveredIdempotent(params: {
    idempotencyKey: string;
    email: string;
    name: string;
    orderId: string;
    trackingNumber: string;
  }): Promise<void> {
    await this.sendIdempotent(
      params.idempotencyKey,
      "SHIPMENT_DELIVERED",
      params.email,
      () => this.sendShipmentDelivered(params.email, params.name, params.orderId, params.trackingNumber)
    );
  }

  /**
   * Shipment created / label generated notification
   */
  async sendShipmentCreated(
    email: string,
    name: string,
    orderId: string,
    trackingNumber: string
  ): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .info-box { background-color: #e7f3ff; border-left: 4px solid #00CED1; padding: 16px; margin: 20px 0; border-radius: 4px; }
            .tracking-code { font-size: 18px; font-weight: bold; color: #00CED1; letter-spacing: 1px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            ${getEmailHeader()}
            <div class="content">
              <h2>📦 Tu pedido está en camino</h2>
              <p>Hola ${name},</p>
              <p>Tu pedido #<strong>${orderId.slice(0, 10)}</strong> fue despachado a través de <strong>Correo Argentino</strong>.</p>
              <div class="info-box">
                <p style="margin: 0 0 8px 0;"><strong>Número de seguimiento:</strong></p>
                <p class="tracking-code">${trackingNumber}</p>
              </div>
              <p>Podés realizar el seguimiento de tu envío en <a href="https://www.correoargentino.com.ar/formularios/me" style="color:#00CED1;">el sitio de Correo Argentino</a> usando ese número.</p>
              <p>¡Gracias por confiar en PawGo! 🐾</p>
            </div>
            <div class="footer">
              <p>© 2026 PawGo. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendViaResend({
      to: email,
      subject: `Tu pedido fue despachado 📦 — PawGo`,
      html,
    });
  }

  /**
   * Shipment delivered notification
   */
  async sendShipmentDelivered(
    email: string,
    name: string,
    orderId: string,
    trackingNumber: string
  ): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .success-box { background-color: #d4edda; border-left: 4px solid #28a745; padding: 16px; margin: 20px 0; border-radius: 4px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            ${getEmailHeader()}
            <div class="content">
              <h2>✅ Tu pedido fue entregado</h2>
              <p>Hola ${name},</p>
              <div class="success-box">
                <p style="margin: 0;"><strong>¡Tu pedido fue entregado exitosamente!</strong></p>
              </div>
              <p>Tu pedido #<strong>${orderId.slice(0, 10)}</strong> (seguimiento: ${trackingNumber}) fue entregado.</p>
              <p>Esperamos que disfrutes tu compra junto a tu mejor amigo 🐕</p>
              <p>Si tenés alguna consulta, respondé a este email y te ayudamos.</p>
              <p><strong>¡Gracias por comprar en PawGo!</strong> 💙</p>
            </div>
            <div class="footer">
              <p>© 2026 PawGo. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendViaResend({
      to: email,
      subject: `¡Tu pedido fue entregado! ✅ — PawGo`,
      html,
    });
  }
}

// Export singleton instance
export const emailService = new EmailService();
