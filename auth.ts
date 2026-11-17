import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { Pool } from "pg";
import { track } from "@/lib/analytics";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

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

        const { rows } = await pool.query(
          "SELECT * FROM users WHERE email = $1",
          [email]
        );
        const user = rows[0] as DbUser | undefined;

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
        const googleId = account.providerAccountId;
        const email = user.email!;
        const name = user.name ?? null;

        const { rows } = await pool.query(
          "SELECT * FROM users WHERE email = $1",
          [email]
        );
        let dbUser = rows[0] as DbUser | undefined;

        if (!dbUser) {
          await pool.query(
            "INSERT INTO users (email, name, google_id) VALUES ($1, $2, $3)",
            [email, name, googleId]
          );
          const { rows: newRows } = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
          );
          dbUser = newRows[0] as DbUser;
        } else if (!dbUser.google_id) {
          await pool.query(
            "UPDATE users SET google_id = $1 WHERE id = $2",
            [googleId, dbUser.id]
          );
        }

        // Store db user id in user object for jwt callback
        (user as { id: string }).id = String(dbUser.id);

        await track("user_signed_in", "auth", { provider: "google" }, dbUser.id);
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
