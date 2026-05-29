import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

const handler = NextAuth(authOptions);

export async function GET(...args: Parameters<typeof handler>) {
  return handler(...args);
}

export async function POST(...args: Parameters<typeof handler>) {
  return handler(...args);
}
