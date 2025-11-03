import nodemailer, { TransportOptions, SendMailOptions } from "nodemailer";
import { IUser } from "../models/User";

export class Email {
  private to: string;
  private from: string;
  private firstName: string;
  private url: string;

  constructor(user: IUser, url: string) {
    this.to = user.email;
    this.firstName = user.full_name.split(" ")[0]!;
    this.url = url;
    this.from = `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`;
  }

  /**
   * Create and configure nodemailer transporter
   */
  private createTransport() {
    // 🏭 Production (e.g., SendGrid or any cloud email service)
    if (process.env.NODE_ENV === "production") {
      return nodemailer.createTransport({
        service: "SendGrid",
        auth: {
          user: process.env.SENDGRID_USERNAME,
          pass: process.env.SENDGRID_PASSWORD,
        },
      } as TransportOptions);
    }

    // 💻 Development (e.g., Mailtrap or local SMTP)
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    } as TransportOptions);
  }

  /**
   * Generic send method for text + HTML emails
   */
  private async send(subject: string, text: string, html: string): Promise<void> {
    const transporter = this.createTransport();

    const mailOptions: SendMailOptions = {
      from: this.from,
      to: this.to,
      subject,
      text,
      html,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${this.to} - ${subject}`);
  }

  /**
   * Send welcome email
   */
  async sendWelcome(): Promise<void> {
    const subject = "Welcome to our clinic!";
    const text = `Hello ${this.firstName}, welcome to our clinic!`;
    const html = `
      <div style="font-family:Arial,sans-serif;">
        <h2>Welcome, ${this.firstName}!</h2>
        <p>We’re thrilled to have you on board.</p>
        <p><a href="${this.url}" style="color:#007bff;">Visit your dashboard</a></p>
      </div>
    `;
    await this.send(subject, text, html);
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(): Promise<void> {
    const subject = "Your password reset token (valid for 15 min)";
    const text = `Forgot your password? Reset it here: ${this.url}`;
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;">
        <h2>Password Reset Request</h2>
        <p>Hello ${this.firstName},</p>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <a href="${this.url}" 
          style="display:inline-block;background:#007bff;color:#fff;
                 padding:10px 16px;border-radius:6px;text-decoration:none;">
          Reset Password
        </a>
        <p>This link will expire in 15 minutes.</p>
        <p>If you did not request this, you can safely ignore this email.</p>
      </div>
    `;
    await this.send(subject, text, html);
  }
}

