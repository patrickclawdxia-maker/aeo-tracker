import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Facebook from "next-auth/providers/facebook";
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
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID ?? "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
    }),
    Facebook({
      clientId: process.env.FACEBOOK_CLIENT_ID ?? "",
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET ?? "",
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
      // Handle OAuth providers — find or create user in DB
      const oauthProviders = ["google", "github", "facebook"];
      if (account?.provider && oauthProviders.includes(account.provider)) {
        const providerId = account.providerAccountId;
        const email = user.email!;
        const name = user.name ?? null;
        const providerCol = `${account.provider}_id`;

        const { rows } = await pool.query(
          "SELECT * FROM users WHERE email = $1",
          [email]
        );
        let dbUser = rows[0] as DbUser | undefined;

        if (!dbUser) {
          // New user — insert, with google_id col for google, otherwise just email+name
          if (account.provider === "google") {
            await pool.query(
              "INSERT INTO users (email, name, google_id) VALUES ($1, $2, $3)",
              [email, name, providerId]
            );
          } else {
            // github/facebook don't have dedicated columns yet — store in google_id as fallback
            // or just create without provider id (email is the key)
            await pool.query(
              "INSERT INTO users (email, name) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING",
              [email, name]
            );
          }
          const { rows: newRows } = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
          );
          dbUser = newRows[0] as DbUser;
        } else if (account.provider === "google" && !dbUser.google_id) {
          await pool.query(
            "UPDATE users SET google_id = $1 WHERE id = $2",
            [providerId, dbUser.id]
          );
        }

        // Store db user id in user object for jwt callback
        (user as { id: string }).id = String(dbUser.id);

        await track("user_signed_in", "auth", { provider: account.provider }, dbUser.id);
        void providerCol; // suppress unused var warning
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
