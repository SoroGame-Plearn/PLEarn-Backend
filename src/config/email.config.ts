import { registerAs } from '@nestjs/config';

export default registerAs('email', () => ({
  sendgridApiKey: process.env.SENDGRID_API_KEY,
  fromEmail: process.env.FROM_EMAIL || 'noreply@plearn.com',
  fromName: process.env.FROM_NAME || 'PLEarn Platform',
}));
