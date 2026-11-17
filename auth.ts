import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";

interface DbUser {
  id: number;
  email: string;
  name: string | null;
  password_hash: string | null;
  google_id: string | null;
  plan: string;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string;
        const password = credentials?.password as string;
        if (!email || !password) return null;

        const db = getDb();
        const user = db
          .prepare("SELECT * FROM users WHERE email = ?")
          .get(email) as DbUser | undefined;

        if (!user || !user.password_hash) return null;

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return null;

        return {
          id: String(user.id),
          email: user.email,
          name: user.name ?? undefined,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Handle Google OAuth — find or create user in DB
      if (account?.provider === "google") {
        const db = getDb();
        const googleId = account.providerAccountId;
        const email = user.email!;
        const name = user.name ?? null;

        let dbUser = db
          .prepare("SELECT * FROM users WHERE email = ?")
          .get(email) as DbUser | undefined;

        if (!dbUser) {
          db.prepare(
            "INSERT INTO users (email, name, google_id) VALUES (?, ?, ?)"
          ).run(email, name, googleId);
          dbUser = db
            .prepare("SELECT * FROM users WHERE email = ?")
            .get(email) as DbUser;
        } else if (!dbUser.google_id) {
          db.prepare("UPDATE users SET google_id = ? WHERE id = ?").run(
            googleId,
            dbUser.id
          );
        }

        // Store db user id in user object for jwt callback
        (user as { id: string }).id = String(dbUser.id);
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
      }
      return session;
    },
  },
});
