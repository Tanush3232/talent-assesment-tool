import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { prisma } from "@/lib/prisma";
import { SESSION_MAX_AGE } from "@/lib/constants";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID!,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!,
      // issuer is auto-read from AUTH_MICROSOFT_ENTRA_ID_ISSUER env var
      // which forces single-tenant (org-only) login
    }),
    CredentialsProvider({
      name: "Dummy Login",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || credentials.password !== "1234") return null;
        
        const uname = typeof credentials.username === "string" ? credentials.username.toLowerCase() : "";
        let email = "";
        if (uname === "admin") email = "admin@adventz.com";
        else if (uname === "hr") email = "hr@adventz.com";
        else if (uname === "manager") email = "sandeep.sharma@adventz.com";
        else return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.isActive) return null;
        
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      }
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE, // 12 hours
  },
  trustHost: true,
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;

      // Check if user exists in our DB
      const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
      });

      if (!dbUser) {
        // Not registered — deny access
        return "/login?error=not_registered";
      }

      if (!dbUser.isActive) {
        return "/login?error=suspended";
      }

      // Update Azure OID on first login for Microsoft Entra ID
      if (account?.provider === "microsoft-entra-id" && account.providerAccountId && !dbUser.azureOid) {
        await prisma.user.update({
          where: { id: dbUser.id },
          data: { azureOid: account.providerAccountId },
        });
      }

      return true;
    },

    async jwt({ token, user, account }) {
      if (account && user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
        });
        if (dbUser) {
          token.userId = dbUser.id;
          token.role = dbUser.role;
          token.name = dbUser.name;
          token.email = dbUser.email;
          token.designation = dbUser.designation;
          token.department = dbUser.department;
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId as string;
        session.user.role = token.role as string;
        session.user.designation = token.designation as string;
        session.user.department = token.department as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
