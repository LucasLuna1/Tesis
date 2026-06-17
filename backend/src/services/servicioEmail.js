/**
 * Servicio de Email para recuperación de contraseña
 * Se puede integrar con SendGrid, Nodemailer, AWS SES, etc.
 */

const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    // Configuración para desarrollo (Gmail)
    if (process.env.NODE_ENV === 'development') {
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
        });
      } else {
        this.transporter = null;
      }
    } else {
      // Configuración para producción (SendGrid, AWS SES, etc.)
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });
      } else {
        this.transporter = null;
      }
    }
  }

  async sendPasswordResetEmail(email, resetLink, userName = 'Usuario') {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@kani-deportes.com',
        to: email,
        subject: 'Recuperación de Contraseña - Kani Deportes',
        html: this.getPasswordResetEmailTemplate(userName, resetLink),
        text: this.getPasswordResetEmailText(userName, resetLink)
      };

      if (!this.transporter) {
        return { success: false, message: 'Servicio de email no configurado' };
      }

      // Verificar que las credenciales estén configuradas
      if (process.env.NODE_ENV === 'development' && (!process.env.EMAIL_USER || !process.env.EMAIL_PASS)) {
        return { success: false, message: 'Credenciales de email no configuradas' };
      }

      if (process.env.NODE_ENV !== 'development' && (!process.env.SMTP_USER || !process.env.SMTP_PASS)) {
        return { success: false, message: 'Credenciales SMTP no configuradas' };
      }

      const result = await this.transporter.sendMail(mailOptions);
      return { success: true, messageId: result.messageId };

    } catch (error) {
      console.error('Error enviando email:', error.message);
      return { success: false, error: error.message, code: error.code };
    }
  }

  getPasswordResetEmailTemplate(userName, resetLink) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Recuperación de Contraseña</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1976d2; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏆 Kani Deportes</h1>
            <p>Sistema de Gestión de Torneos</p>
          </div>
          
          <div class="content">
            <h2>Hola ${userName}!</h2>
            
            <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en Kani Deportes.</p>
            
            <p>Si solicitaste este cambio, haz clic en el botón de abajo para crear una nueva contraseña:</p>
            
            <div style="text-align: center;">
              <a href="${resetLink}" class="button">Restablecer Contraseña</a>
            </div>
            
            <div class="warning">
              <strong>⚠️ Importante:</strong>
              <ul>
                <li>Este link expira en 1 hora por seguridad</li>
                <li>Si no solicitaste este cambio, ignora este email</li>
                <li>Tu contraseña actual seguirá siendo válida hasta que la cambies</li>
              </ul>
            </div>
            
            <p>¿Necesitas ayuda? Contáctanos en kanideportes2000@gmail.com</p>
          </div>
          
          <div class="footer">
            <p>Este email fue enviado automáticamente, por favor no respondas.</p>
            <p>&copy; 2024 Kani Deportes. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getPasswordResetEmailText(userName, resetLink) {
    return `
      Kani Deportes - Recuperación de Contraseña
      
      Hola ${userName}!
      
      Recibimos una solicitud para restablecer la contraseña de tu cuenta en Kani Deportes.
      
      Si solicitaste este cambio, visita el siguiente enlace para crear una nueva contraseña:
      
      ${resetLink}
      
      IMPORTANTE:
      - Este link expira en 1 hora por seguridad
      - Si no solicitaste este cambio, ignora este email
      - Tu contraseña actual seguirá siendo válida hasta que la cambies
      
      ¿Necesitas ayuda? Contáctanos en kanideportes2000@gmail.com
      
      ---
      Este email fue enviado automáticamente, por favor no respondas.
      © 2024 Kani Deportes. Todos los derechos reservados.
    `;
  }

}

module.exports = new EmailService();

