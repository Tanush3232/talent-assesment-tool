import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: string;
      designation?: string;
      department?: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role?: string;
    designation?: string;
    department?: string;
  }
}
