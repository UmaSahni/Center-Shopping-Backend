import { PrismaClient } from '@prisma/client';
import { ENV } from './env.js';

export const prisma = new PrismaClient({
  log: ENV.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});
