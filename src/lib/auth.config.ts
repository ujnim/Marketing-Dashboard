import { Domain, NextAuthConfig, Role } from 'next-auth';
import CredentialProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

const authConfig = {
  providers: [
    CredentialProvider({
      credentials: {
        email: { type: 'email' },
        password: { type: 'password' }
      },
      async authorize(credentials): Promise<any> {
        if (!credentials?.email || !credentials.password) {
          throw new Error('Email and password are required');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials?.email as string },
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            password: true,
            role: true,
            domain: true
          }
        });

        if (
          !user ||
          !(await bcrypt.compare(
            credentials?.password as string,
            user?.password
          ))
        ) {
          throw new Error('Invalid email or password');
        }

        return {
          id: user?.id,
          email: user?.email,
          name: user?.name,
          username: user?.username,
          role: user?.role,
          domain: user?.domain
        };
      }
    })
  ],
  pages: {
    signIn: '/'
  },
  secret: process.env.JWT_SECRET,
  session: {
    strategy: 'jwt'
  },
  jwt: {
    maxAge: 60 * 60 * 24
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.username = user.username;
        token.role = user.role;
        token.domain = user.domain;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        id: String(token.id),
        email: token.email ?? '',
        name: (token.name as string) ?? '',
        username: token.username as string,
        role: token.role as Role,
        domain: token.domain as Domain,
        emailVerified: null
      };
      return session;
    }
  },
  debug: false,
  trustHost: true
} satisfies NextAuthConfig;

export default authConfig;
