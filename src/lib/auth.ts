import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { db, users } from '@/db';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

// ─── Password hashing (demo: SHA-256) ─────────────────────────────────────────

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
  return crypto.createHash('sha256').update(password).digest('hex') === hash;
}

// ─── Auth options ──────────────────────────────────────────────────────────────

// ─── Safe session helper ──────────────────────────────────────────────────────────

export async function safeGetSession() {
  try {
    const { getServerSession } = await import('next-auth');
    return await getServerSession(authOptions);
  } catch {
    // Session decryption failed (e.g. old cookie with different secret)
    return null;
  }
}

// ─── Auth options ──────────────────────────────────────────────────────────────────

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const [user] = await db.select().from(users).where(eq(users.email, credentials.email)).limit(1);

        if (!user) return null;
        if (user.status !== 'active') return null;

        const valid = verifyPassword(credentials.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          image: user.avatarUrl,
        };
      },
    }),
  ],

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  pages: {
    signIn: '/login',
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? 'member';
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string; role?: string }).id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET ?? 'dev-secret-change-in-production',
  debug: process.env.NODE_ENV === 'development',
};

// ─── Typed extensions ──────────────────────────────────────────────────────────

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
    };
  }

  interface User {
    id: string;
    role: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
  }
}