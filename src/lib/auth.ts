import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import { db } from "@/db"
import { users } from "@/db/schema"
import { eq } from "drizzle-orm"
import type { UserRole } from "@/db/schema"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      name: "Email/Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null
        const user = await db.query.users.findFirst({
          where: eq(users.email, credentials.email as string),
        })
        if (!user) {
          const newUser = {
            id: crypto.randomUUID(),
            email: credentials.email as string,
            name: null,
            image: null,
            role: "student" as const,
            createdAt: new Date(),
          }
          await db.insert(users).values(newUser)
          return { id: newUser.id, email: newUser.email, name: newUser.name }
        }
        return { id: user.id, email: user.email, name: user.name }
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (user.email) {
        const existingUser = await db.query.users.findFirst({
          where: eq(users.email, user.email),
        })
        if (!existingUser) {
          await db.insert(users).values({
            id: crypto.randomUUID(),
            email: user.email,
            name: user.name,
            image: user.image,
            role: "student",
            createdAt: new Date(),
          })
        }
      }
      return true
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub
        const dbUser = await db.query.users.findFirst({
          where: eq(users.id, token.sub),
        })
        session.user.role = (dbUser?.role || "student") as UserRole
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.AUTH_SECRET,
})