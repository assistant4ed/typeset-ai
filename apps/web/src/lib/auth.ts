import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { createServerClient } from "@/lib/supabase/server";
import type { DbUser, UserRole } from "@/lib/supabase/types";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      authorization: {
        params: {
          access_type: "offline",
          prompt: "consent",
          scope: "openid email profile",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email || account?.provider !== "google") return false;

      const db = createServerClient();

      const { data: existingUserRaw } = await db
        .from("users")
        .select("id, is_active")
        .eq("email", user.email)
        .single();

      const existingUser = existingUserRaw as any;

      if (existingUser) {
        if (!existingUser.is_active) return false;

        await (db.from("users") as any)
          .update({
            name: user.name ?? undefined,
            avatar_url: user.image ?? undefined,
            google_id: account.providerAccountId,
            google_refresh_token: account.refresh_token ?? undefined,
          })
          .eq("id", existingUser.id);

        return true;
      }

      // Auto-provision first user as admin; subsequent users as viewers
      const { count } = await db
        .from("users")
        .select("id", { count: "exact", head: true });

      const role: UserRole = count === 0 ? "admin" : "viewer";

      const { error } = await (db.from("users") as any).insert({
        email: user.email,
        name: user.name ?? null,
        avatar_url: user.image ?? null,
        role,
        google_id: account.providerAccountId,
        google_refresh_token: account.refresh_token ?? null,
        is_active: true,
      });

      if (error) {
        console.error("Failed to create user on sign-in", { cause: error });
        return false;
      }

      return true;
    },

    async session({ session }) {
      if (!session.user?.email) return session;

      const db = createServerClient();
      const { data: dbUserRaw } = await db
        .from("users")
        .select("id, role, is_active")
        .eq("email", session.user.email)
        .single();

      const dbUser = dbUserRaw as any;

      if (!dbUser || !dbUser.is_active) {
        // Force sign-out by returning an empty session
        return { ...session, user: undefined as never };
      }

      return {
        ...session,
        user: {
          ...session.user,
          id: dbUser.id,
          role: dbUser.role,
        },
      };
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
      image: string | null;
      role: UserRole;
    };
  }
}
