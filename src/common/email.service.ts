import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('email.sendgridApiKey');
    if (apiKey) {
      sgMail.setApiKey(apiKey);
    } else {
      this.logger.warn('SendGrid API key not configured. Email functionality will be disabled.');
    }
  }

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    try {
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
      const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

      const msg = {
        to: email,
        from: {
          email: this.configService.get<string>('email.fromEmail')!,
          name: this.configService.get<string>('email.fromName')!,
        },
        subject: 'Reset Your PLEarn Password',
        html: this.getPasswordResetTemplate(resetLink),
      };

      await sgMail.send(msg);
      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${email}:`, error);
      throw new Error('Failed to send password reset email');
    }
  }

  async sendProfileCompletionEmail(email: string, username: string): Promise<void> {
    try {
      const msg = {
        to: email,
        from: {
          email: this.configService.get<string>('email.fromEmail')!,
          name: this.configService.get<string>('email.fromName')!,
        },
        subject: 'Your PLEarn Profile is Complete! 🎉',
        html: this.getProfileCompletionTemplate(username),
      };

      await sgMail.send(msg);
      this.logger.log(`Profile completion email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send profile completion email to ${email}:`, error);
      throw new Error('Failed to send profile completion email');
    }
  }

  private getPasswordResetTemplate(resetLink: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Reset Your Password</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #007bff; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f8f9fa; }
        .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #007bff;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
        }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>PLEarn Platform</h1>
        </div>
        <div class="content">
            <h2>Password Reset Request</h2>
            <p>We received a request to reset your password. If you didn't make this request, you can safely ignore this email.</p>
            <p>To reset your password, click the button below:</p>
            <div style="text-align: center;">
                <a href="${resetLink}" class="button">Reset Password</a>
            </div>
            <p>This link will expire in 1 hour for security reasons.</p>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background-color: #e9ecef; padding: 10px; border-radius: 3px;">
                ${resetLink}
            </p>
        </div>
        <div class="footer">
            <p>This is an automated email. Please do not reply to this message.</p>
            <p>&copy; ${new Date().getFullYear()} PLEarn Platform. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  private getProfileCompletionTemplate(username: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Profile Complete</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #28a745; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f8f9fa; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>PLEarn Platform</h1>
        </div>
        <div class="content">
            <h2>Nice work, ${username}!</h2>
            <p>You've completed 100% of your PLEarn profile. We've added a bonus to your score as a thank you.</p>
            <p>Keep learning and earning to unlock more rewards.</p>
        </div>
        <div class="footer">
            <p>This is an automated email. Please do not reply to this message.</p>
            <p>&copy; ${new Date().getFullYear()} PLEarn Platform. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `;
  }
}
