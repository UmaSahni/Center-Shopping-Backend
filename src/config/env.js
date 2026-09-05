import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  DATABASE_URL: process.env.DATABASE_URL || 'mysql://root:@localhost:3306/ecom_db',
  JWT_SECRET: process.env.JWT_SECRET || 'ecom_enterprise_super_secret_jwt_key_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  NODE_ENV: process.env.NODE_ENV || 'development',
  NMI_SECURITY_KEY: process.env.NMI_SECURITY_KEY || '73CagW4s72aK4AS5WjsDh23bb6s78eus',
  NMI_GATEWAY_URL: process.env.NMI_GATEWAY_URL || 'https://sandbox.nmi.com/api/transact.php',
  NMI_CURRENCY: process.env.NMI_CURRENCY || 'USD',
};
