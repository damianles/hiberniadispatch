import type { NextAuthConfig } from "next-auth";

export type AppRole = "ADMIN" | "DISPATCHER";

declare module "next-auth" {
  interface User {
    role: AppRole;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: AppRole;
    };
  }
}

/**
 * Edge-safe Auth.js options only — no Prisma, bcrypt, or Node-only deps.
 * Used by middleware so the Edge bundle stays under Vercel's size limit.
 */
const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as AppRole;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

export default authConfig;
