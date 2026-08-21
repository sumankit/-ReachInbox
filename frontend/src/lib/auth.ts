import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import jwt from "jsonwebtoken";

/**
 * NextAuth owns the real Google OAuth flow. Once a user signs in, we mint
 * our own short-lived JWT (signed with NEXTAUTH_SECRET, which the backend
 * has as JWT_SHARED_SECRET) and hand it to the client as
 * `session.backendToken`. The backend only ever verifies this token — it
 * never talks to Google itself.
 */
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.picture = (user as { image?: string }).image ?? token.picture;
      }
      return token;
    },
    async session({ session, token }) {
      const backendToken = jwt.sign(
        {
          sub: token.sub,
          email: token.email,
          name: token.name,
          picture: token.picture,
        },
        process.env.NEXTAUTH_SECRET as string,
        { expiresIn: "7d" }
      );
      return { ...session, backendToken };
    },
  },
  pages: {
    signIn: "/",
  },
};
